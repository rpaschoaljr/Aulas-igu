package add

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/hub"
	"radio20/backend/internal/model"
	"radio20/backend/internal/repository/queue/item"
)

type QueueAdder interface {
	AddToQueue(ctx context.Context, roomID string, track model.Track, userID *string) (*model.QueueItem, error)
	CountUserActiveTracks(ctx context.Context, roomID string, userID string) (int, error)
}

type Broadcaster interface {
	BroadcastToRoom(roomID string, msg hub.Message)
}

type RoomResolver interface {
	GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error)
}

type Handler struct {
	repo       QueueAdder
	jwtService *auth.JWTService
	hub        Broadcaster
	roomRepo   RoomResolver
}

func NewHandler(repo QueueAdder, jwtService *auth.JWTService, hub Broadcaster, roomRepo RoomResolver) *Handler {
	return &Handler{
		repo:       repo,
		jwtService: jwtService,
		hub:        hub,
		roomRepo:   roomRepo,
	}
}

type AddRequest struct {
	RoomSlug string      `json:"room_slug"`
	Track    model.Track `json:"track"`
}

type BatchRequest struct {
	RoomSlug string        `json:"room_slug"`
	Tracks   []model.Track `json:"tracks"`
}

// HandleAdd trata POST /api/radio/queue
func (h *Handler) HandleAdd(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.authenticate(r)
	if err != nil {
		http.Error(w, "Não autorizado: faça login para pedir músicas", http.StatusUnauthorized)
		return
	}
	if claims.IsGuest {
		http.Error(w, "Somente ouvintes cadastrados podem pedir músicas", http.StatusForbidden)
		return
	}

	var req AddRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "payload JSON inválido", http.StatusBadRequest)
		return
	}

	if req.Track.YouTubeID == "" || req.Track.Title == "" {
		http.Error(w, "dados da faixa incompletos", http.StatusBadRequest)
		return
	}

	if req.Track.DurationSeconds > 600 || req.Track.DurationSeconds <= 0 {
		http.Error(w, "duração máxima permitida é de 10 minutos (600s)", http.StatusBadRequest)
		return
	}

	roomID := req.RoomSlug
	if roomID == "" {
		roomID = "radio-six-nine"
	}

	createdItem, err := h.repo.AddToQueue(r.Context(), roomID, req.Track, &claims.UserID)
	if err != nil {
		if err == item.ErrDuplicateTrack || err == item.ErrRecentlyPlayed || err == item.ErrUserQuotaExceeded {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if h.hub != nil {
		targetRoom := roomID
		if h.roomRepo != nil {
			if rm, err := h.roomRepo.GetRoomBySlug(r.Context(), roomID); err == nil && rm != nil {
				targetRoom = rm.ID
			}
		}
		msg := hub.Message{
			Type:      "queue_updated",
			RoomID:    targetRoom,
			Payload:   createdItem,
			Timestamp: time.Now().UnixMilli(),
		}
		h.hub.BroadcastToRoom(targetRoom, msg)
		if targetRoom != roomID {
			h.hub.BroadcastToRoom(roomID, msg)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createdItem)
}

// HandleBatch trata POST /api/radio/queue/batch
func (h *Handler) HandleBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.authenticate(r)
	if err != nil {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}
	if claims.IsGuest {
		http.Error(w, "Visitantes não podem pedir músicas", http.StatusForbidden)
		return
	}

	var req BatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "payload JSON inválido", http.StatusBadRequest)
		return
	}

	if len(req.Tracks) == 0 {
		http.Error(w, "nenhuma música enviada no lote", http.StatusBadRequest)
		return
	}
	if len(req.Tracks) > 5 {
		http.Error(w, "limite máximo de 5 músicas por lote excedido", http.StatusBadRequest)
		return
	}

	roomID := req.RoomSlug
	if roomID == "" {
		roomID = "radio-six-nine"
	}

	var enqueued []model.QueueItem
	var rejected []map[string]string

	for _, track := range req.Tracks {
		if track.DurationSeconds > 600 || track.DurationSeconds <= 0 {
			rejected = append(rejected, map[string]string{"id": track.YouTubeID, "reason": "duração excede 10 minutos"})
			continue
		}

		qi, err := h.repo.AddToQueue(r.Context(), roomID, track, &claims.UserID)
		if err != nil {
			rejected = append(rejected, map[string]string{"id": track.YouTubeID, "reason": err.Error()})
			continue
		}
		enqueued = append(enqueued, *qi)
	}

	if h.hub != nil && len(enqueued) > 0 {
		targetRoom := roomID
		if h.roomRepo != nil {
			if rm, err := h.roomRepo.GetRoomBySlug(r.Context(), roomID); err == nil && rm != nil {
				targetRoom = rm.ID
			}
		}
		msg := hub.Message{
			Type:   "queue_updated",
			RoomID: targetRoom,
			Payload: map[string]interface{}{
				"action":         "batch_add",
				"count":          len(enqueued),
				"enqueued_items": enqueued,
			},
			Timestamp: time.Now().UnixMilli(),
		}
		h.hub.BroadcastToRoom(targetRoom, msg)
		if targetRoom != roomID {
			h.hub.BroadcastToRoom(roomID, msg)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success_count":  len(enqueued),
		"failed_count":   len(rejected),
		"enqueued_items": enqueued,
		"rejected":       rejected,
	})
}

func (h *Handler) authenticate(r *http.Request) (*auth.UserClaims, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, auth.ErrInvalidToken
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	return h.jwtService.ValidateToken(tokenStr)
}

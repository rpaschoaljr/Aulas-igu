package manage

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type QueueManager interface {
	RemoveQueueItem(ctx context.Context, roomID string, queueID string, userID string) error
	SwapQueueItem(ctx context.Context, roomID string, queueID string, newTrack model.Track, userID string) (*model.QueueItem, error)
}

type Handler struct {
	repo       QueueManager
	jwtService *auth.JWTService
}

func NewHandler(repo QueueManager, jwtService *auth.JWTService) *Handler {
	return &Handler{
		repo:       repo,
		jwtService: jwtService,
	}
}

type RemoveRequest struct {
	RoomSlug string `json:"room_slug"`
	QueueID  string `json:"queue_id"`
}

type SwapRequest struct {
	RoomSlug string      `json:"room_slug"`
	QueueID  string      `json:"queue_id"`
	NewTrack model.Track `json:"new_track"`
}

func (h *Handler) HandleRemove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.authenticate(r)
	if err != nil {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var req RemoveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.QueueID == "" {
		http.Error(w, "queue_id é obrigatório", http.StatusBadRequest)
		return
	}

	roomID := req.RoomSlug
	if roomID == "" {
		roomID = "radio-six-nine"
	}

	if err := h.repo.RemoveQueueItem(r.Context(), roomID, req.QueueID, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleSwap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.authenticate(r)
	if err != nil {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var req SwapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.QueueID == "" || req.NewTrack.YouTubeID == "" {
		http.Error(w, "dados de substituição inválidos", http.StatusBadRequest)
		return
	}

	if req.NewTrack.DurationSeconds > 600 || req.NewTrack.DurationSeconds <= 0 {
		http.Error(w, "duração máxima permitida é de 10 minutos (600s)", http.StatusBadRequest)
		return
	}

	roomID := req.RoomSlug
	if roomID == "" {
		roomID = "radio-six-nine"
	}

	swapped, err := h.repo.SwapQueueItem(r.Context(), roomID, req.QueueID, req.NewTrack, claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(swapped)
}

func (h *Handler) authenticate(r *http.Request) (*auth.UserClaims, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, auth.ErrInvalidToken
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	return h.jwtService.ValidateToken(tokenStr)
}

package quota

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"radio20/backend/internal/auth"
)

type QuotaCounter interface {
	CountUserActiveTracks(ctx context.Context, roomID string, userID string) (int, error)
}

type TrackCurrentChecker interface {
	IsUserCurrentTrack(roomID string, userID string) bool
}

type Handler struct {
	repo       QuotaCounter
	engine     TrackCurrentChecker
	jwtService *auth.JWTService
}

func NewHandler(repo QuotaCounter, engine TrackCurrentChecker, jwtService *auth.JWTService) *Handler {
	return &Handler{
		repo:       repo,
		engine:     engine,
		jwtService: jwtService,
	}
}

type UserQuotaResponse struct {
	RoomSlug      string `json:"room_slug"`
	UserID        string `json:"user_id"`
	ActiveTracks  int    `json:"active_tracks"`
	MaxQuota      int    `json:"max_quota"`
	CanRequest    bool   `json:"can_request"`
	Authenticated bool   `json:"authenticated"`
}

func (h *Handler) HandleGetUserQuota(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	roomSlug := r.URL.Query().Get("room")
	if roomSlug == "" {
		roomSlug = "radio-six-nine"
	}

	authHeader := r.Header.Get("Authorization")
	var tokenStr string
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	}

	claims, err := h.jwtService.ValidateToken(tokenStr)
	if err != nil || claims == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(UserQuotaResponse{
			RoomSlug:      roomSlug,
			UserID:        "",
			ActiveTracks:  0,
			MaxQuota:      5,
			CanRequest:    false,
			Authenticated: false,
		})
		return
	}

	activeCount, err := h.repo.CountUserActiveTracks(r.Context(), roomSlug, claims.UserID)
	if err != nil {
		activeCount = 0
	}

	if h.engine != nil && h.engine.IsUserCurrentTrack(roomSlug, claims.UserID) {
		activeCount++
	}

	canRequest := !claims.IsGuest && activeCount < 5

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(UserQuotaResponse{
		RoomSlug:      roomSlug,
		UserID:        claims.UserID,
		ActiveTracks:  activeCount,
		MaxQuota:      5,
		CanRequest:    canRequest,
		Authenticated: true,
	})
}

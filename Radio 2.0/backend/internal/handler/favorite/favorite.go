package favorite

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type FavoriteManager interface {
	ToggleFavorite(ctx context.Context, userID string, track model.Track) (bool, error)
	GetUserFavorites(ctx context.Context, userID string) ([]model.FavoriteTrack, error)
}

type Handler struct {
	repo       FavoriteManager
	jwtService *auth.JWTService
}

func NewHandler(repo FavoriteManager, jwtService *auth.JWTService) *Handler {
	return &Handler{
		repo:       repo,
		jwtService: jwtService,
	}
}

type ToggleRequest struct {
	Track model.Track `json:"track"`
}

func (h *Handler) HandleToggle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.authenticate(r)
	if err != nil {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var req ToggleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Track.YouTubeID == "" {
		http.Error(w, "dados de música inválidos", http.StatusBadRequest)
		return
	}

	isFav, err := h.repo.ToggleFavorite(r.Context(), claims.UserID, req.Track)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"is_favorite": isFav,
		"youtube_id":  req.Track.YouTubeID,
	})
}

func (h *Handler) HandleGetFavorites(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.authenticate(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]model.FavoriteTrack{})
		return
	}

	favs, err := h.repo.GetUserFavorites(r.Context(), claims.UserID)
	if err != nil {
		favs = []model.FavoriteTrack{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(favs)
}

func (h *Handler) authenticate(r *http.Request) (*auth.UserClaims, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, auth.ErrInvalidToken
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	return h.jwtService.ValidateToken(tokenStr)
}

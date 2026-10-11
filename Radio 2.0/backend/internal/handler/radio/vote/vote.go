package vote

import (
	"encoding/json"
	"net/http"
	"strings"

	"radio20/backend/internal/auth"
)

type VoteEngine interface {
	VoteSkip(roomID string, userID string) (int, int, bool)
}

type Handler struct {
	engine     VoteEngine
	jwtService *auth.JWTService
}

func NewHandler(engine VoteEngine, jwtService *auth.JWTService) *Handler {
	return &Handler{
		engine:     engine,
		jwtService: jwtService,
	}
}

type VoteRequest struct {
	RoomSlug string `json:"room_slug"`
}

func (h *Handler) HandleVoteSkip(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := h.jwtService.ValidateToken(tokenStr)
	if err != nil || claims == nil {
		http.Error(w, "Token inválido", http.StatusUnauthorized)
		return
	}

	if claims.IsGuest {
		http.Error(w, "Visitantes não podem votar para pular músicas", http.StatusForbidden)
		return
	}

	var req VoteRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	roomID := req.RoomSlug
	if roomID == "" {
		roomID = "radio-six-nine"
	}

	current, required, skipped := h.engine.VoteSkip(roomID, claims.UserID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"current_votes":  current,
		"required_votes": required,
		"was_skipped":    skipped,
	})
}

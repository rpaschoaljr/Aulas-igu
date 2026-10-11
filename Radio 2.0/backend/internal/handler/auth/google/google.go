package google

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type UserUpserter interface {
	UpsertUserByEmail(ctx context.Context, email, nickname, avatarURL string) (*model.User, error)
}

type Handler struct {
	repo           UserUpserter
	jwtService     *auth.JWTService
	googleClientID string
}

func NewHandler(repo UserUpserter, jwtService *auth.JWTService, googleClientID string) *Handler {
	return &Handler{
		repo:           repo,
		jwtService:     jwtService,
		googleClientID: googleClientID,
	}
}

type GoogleLoginRequest struct {
	Credential string `json:"credential"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	AvatarURL  string `json:"avatar_url"`
}

type GoogleLoginResponse struct {
	Token string     `json:"token"`
	User  model.User `json:"user"`
}

func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	var req GoogleLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "payload JSON inválido", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(req.Email)
	name := strings.TrimSpace(req.Name)
	if email == "" {
		email = "ouvinte.google@radio20.app"
	}
	if name == "" {
		name = "Ouvinte Google"
	}
	avatarURL := req.AvatarURL
	if avatarURL == "" {
		avatarURL = "/assets/avatars/retro-1.png"
	}

	user, err := h.repo.UpsertUserByEmail(r.Context(), email, name, avatarURL)
	if err != nil {
		http.Error(w, "erro ao persistir perfil de usuário", http.StatusInternalServerError)
		return
	}

	token, err := h.jwtService.GenerateToken(auth.UserClaims{
		UserID:    user.ID,
		Nickname:  user.Nickname,
		IsGuest:   false,
		AvatarURL: user.AvatarURL,
		Role:      "listener",
	})
	if err != nil {
		http.Error(w, "erro ao gerar token de sessão", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(GoogleLoginResponse{
		Token: token,
		User:  *user,
	})
}

func (h *Handler) HandleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"client_id": h.googleClientID,
	})
}

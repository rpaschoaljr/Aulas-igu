package guest

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/hub"
)

type Handler struct {
	sessions   *hub.SessionManager
	jwtService *auth.JWTService
}

func NewHandler(sessions *hub.SessionManager, jwtService *auth.JWTService) *Handler {
	return &Handler{
		sessions:   sessions,
		jwtService: jwtService,
	}
}

type GuestLoginRequest struct {
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

type GuestLoginResponse struct {
	Token string    `json:"token"`
	User  GuestUser `json:"user"`
}

type GuestUser struct {
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
	IsGuest   bool   `json:"is_guest"`
}

func (h *Handler) HandleGuestLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	var req GuestLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "payload JSON inválido", http.StatusBadRequest)
		return
	}

	cleanNickname := strings.TrimSpace(req.Nickname)
	if len(cleanNickname) < 2 {
		http.Error(w, "o apelido deve ter no mínimo 2 caracteres", http.StatusBadRequest)
		return
	}

	avatarURL := strings.TrimSpace(req.AvatarURL)
	if avatarURL == "" {
		avatarURL = "🎧"
	}

	guestID := fmt.Sprintf("guest_%d", time.Now().UnixNano())

	displayNick := cleanNickname
	var normNick string
	if h.sessions != nil {
		var ok bool
		displayNick, normNick, ok = h.sessions.AcquireNickname(cleanNickname, guestID)
		if !ok {
			http.Error(w, "Este apelido já está em uso por outro ouvinte online. Escolha outro apelido.", http.StatusConflict)
			return
		}
	}

	token, err := h.jwtService.GenerateToken(auth.UserClaims{
		UserID:    guestID,
		Nickname:  displayNick,
		IsGuest:   true,
		AvatarURL: avatarURL,
		Role:      "guest",
	})
	if err != nil {
		if h.sessions != nil {
			h.sessions.ReleaseNickname(normNick)
		}
		http.Error(w, "erro ao gerar sessão de convidado", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(GuestLoginResponse{
		Token: token,
		User: GuestUser{
			ID:        guestID,
			Nickname:  displayNick,
			AvatarURL: avatarURL,
			IsGuest:   true,
		},
	})
}

func (h *Handler) HandleCheckNickname(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	nick := strings.TrimSpace(r.URL.Query().Get("nickname"))
	if len(nick) < 2 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"available": false})
		return
	}

	available := true
	if h.sessions != nil {
		available = !h.sessions.IsNicknameActive(nick)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"available": available})
}

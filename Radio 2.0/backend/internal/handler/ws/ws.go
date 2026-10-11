package ws

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"radio20/backend/internal/auth"
	"radio20/backend/internal/hub"
	"radio20/backend/internal/model"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Configurado para permitir origens do frontend local
	},
}

type RoomChecker interface {
	GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error)
}

type Handler struct {
	hub        *hub.Hub
	roomRepo   RoomChecker
	jwtService *auth.JWTService
}

func NewHandler(hub *hub.Hub, roomRepo RoomChecker, jwtService *auth.JWTService) *Handler {
	return &Handler{
		hub:        hub,
		roomRepo:   roomRepo,
		jwtService: jwtService,
	}
}

func (h *Handler) HandleWS(w http.ResponseWriter, r *http.Request) {
	roomSlug := r.URL.Query().Get("room")
	if roomSlug == "" {
		roomSlug = "radio-six-nine"
	}

	tokenStr := r.URL.Query().Get("token")
	var userID, nickname string

	if tokenStr != "" {
		if claims, err := h.jwtService.ValidateToken(tokenStr); err == nil && claims != nil {
			userID = claims.UserID
			nickname = claims.Nickname
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] erro no upgrade: %v", err)
		return
	}

	roomID := roomSlug
	if h.roomRepo != nil {
		if rm, err := h.roomRepo.GetRoomBySlug(r.Context(), roomSlug); err == nil && rm != nil {
			roomID = rm.ID
		}
	}

	cleanNick := strings.TrimSpace(nickname)
	if h.hub != nil {
		client := &hub.WebSocketClient{
			Hub:    h.hub,
			Conn:   conn,
			SendCh: make(chan hub.Message, 256),
			RoomID: roomID,
			UserID: userID,
		}

		if h.hub.GetSessionManager() != nil && cleanNick != "" {
			h.hub.GetSessionManager().RegisterConnection(client, cleanNick)
		}

		h.hub.Register(client)

		go client.WritePump()
		go client.ReadPump()
	}
}

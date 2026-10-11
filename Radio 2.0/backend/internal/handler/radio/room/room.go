package room

import (
	"context"
	"encoding/json"
	"net/http"

	"radio20/backend/internal/model"
)

type RoomReader interface {
	GetAllRooms(ctx context.Context) ([]model.Room, error)
	GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error)
}

type StateReader interface {
	GetRoomState(roomID string) (any, bool)
}

type Handler struct {
	roomRepo RoomReader
	engine   StateReader
}

func NewHandler(roomRepo RoomReader, engine StateReader) *Handler {
	return &Handler{
		roomRepo: roomRepo,
		engine:   engine,
	}
}

// HandleRooms trata GET /api/radio/rooms
func (h *Handler) HandleRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	rooms, err := h.roomRepo.GetAllRooms(r.Context())
	if err != nil {
		http.Error(w, "erro ao listar salas", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(rooms)
}

// HandleStatus trata GET /api/radio/status
func (h *Handler) HandleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	roomSlug := r.URL.Query().Get("room")
	if roomSlug == "" {
		roomSlug = "radio-six-nine"
	}

	rm, err := h.roomRepo.GetRoomBySlug(r.Context(), roomSlug)
	if err != nil || rm == nil {
		http.Error(w, "sala não encontrada", http.StatusNotFound)
		return
	}

	state, ok := h.engine.GetRoomState(rm.ID)
	if !ok {
		http.Error(w, "sala inativa no motor", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(state)
}

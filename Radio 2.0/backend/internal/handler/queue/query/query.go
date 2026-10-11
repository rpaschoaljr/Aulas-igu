package query

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"radio20/backend/internal/model"
)

type QueueReader interface {
	GetActiveQueue(ctx context.Context, roomID string) ([]model.QueueItem, error)
}

type DJEnsurer interface {
	EnsureDJTrackInQueue(ctx context.Context, roomID string) (*model.QueueItem, error)
}

type Handler struct {
	queueRepo  QueueReader
	djRepo     DJEnsurer
}

func NewHandler(queueRepo QueueReader, djRepo DJEnsurer) *Handler {
	return &Handler{
		queueRepo: queueRepo,
		djRepo:    djRepo,
	}
}

// HandleGetQueue trata GET /api/radio/queue
func (h *Handler) HandleGetQueue(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	roomSlug := r.URL.Query().Get("room")
	if roomSlug == "" {
		roomSlug = "radio-six-nine"
	}

	// Garante que o DJ insira de verdade na tabela se estiver vazia
	if h.djRepo != nil {
		_, _ = h.djRepo.EnsureDJTrackInQueue(r.Context(), roomSlug)
	}

	items, err := h.queueRepo.GetActiveQueue(r.Context(), roomSlug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	limit := 20
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	if offset >= len(items) {
		items = []model.QueueItem{}
	} else {
		end := offset + limit
		if end > len(items) {
			end = len(items)
		}
		items = items[offset:end]
	}

	if items == nil {
		items = []model.QueueItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

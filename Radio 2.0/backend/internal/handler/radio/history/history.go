package history

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
)

type HistoryReader interface {
	GetHistory(ctx context.Context, roomID string, limit int, offset int) (any, error)
}

type Handler struct {
	repo HistoryReader
}

func NewHandler(repo HistoryReader) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) HandleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	roomSlug := r.URL.Query().Get("room")
	if roomSlug == "" {
		roomSlug = "radio-six-nine"
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

	items, err := h.repo.GetHistory(r.Context(), roomSlug, limit, offset)
	if err != nil {
		http.Error(w, "erro ao buscar histórico", http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

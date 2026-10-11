package search

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"radio20/backend/internal/model"
)

type YouTubeSearcher interface {
	Search(ctx context.Context, query string) ([]model.Track, error)
}

type BlockedChecker interface {
	IsBlocked(ctx context.Context, youtubeID string) (bool, error)
}

type Handler struct {
	searcher       YouTubeSearcher
	blockedChecker BlockedChecker
}

func NewHandler(searcher YouTubeSearcher, blockedChecker BlockedChecker) *Handler {
	return &Handler{
		searcher:       searcher,
		blockedChecker: blockedChecker,
	}
}

// HandleSearch trata GET /api/youtube/search
func (h *Handler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		http.Error(w, "parâmetro de busca 'q' é obrigatório", http.StatusBadRequest)
		return
	}

	rawTracks, err := h.searcher.Search(r.Context(), q)
	if err != nil {
		http.Error(w, "erro ao pesquisar faixas no YouTube", http.StatusInternalServerError)
		return
	}

	// Filtro soberano do backend:
	// 1. Duração estritamente <= 600 segundos (10 minutos)
	// 2. Não estar na lista de músicas bloqueadas (erro 150/101/100/2)
	var validTracks []model.Track
	for _, track := range rawTracks {
		if track.DurationSeconds > 600 || track.DurationSeconds <= 0 {
			continue // Descarta sets longos e durações inválidas
		}

		if h.blockedChecker != nil {
			blocked, err := h.blockedChecker.IsBlocked(r.Context(), track.YouTubeID)
			if err == nil && blocked {
				continue // Descarta músicas em quarentena
			}
		}

		validTracks = append(validTracks, model.Track{
			ID:              track.YouTubeID,
			YouTubeID:       track.YouTubeID,
			Title:           track.Title,
			NormalizedTitle: track.NormalizedTitle,
			ChannelTitle:    track.ChannelTitle,
			DurationSeconds: track.DurationSeconds,
			ThumbnailURL:    track.ThumbnailURL,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(validTracks)
}

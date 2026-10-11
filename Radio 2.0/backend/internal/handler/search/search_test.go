package search

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"radio20/backend/internal/model"
)

type mockSearcher struct {
	tracks []model.Track
}

func (m *mockSearcher) Search(ctx context.Context, query string) ([]model.Track, error) {
	return m.tracks, nil
}

type mockBlockedChecker struct {
	blockedIDs map[string]bool
}

func (m *mockBlockedChecker) IsBlocked(ctx context.Context, youtubeID string) (bool, error) {
	return m.blockedIDs[youtubeID], nil
}

func TestSearchFilter(t *testing.T) {
	searcher := &mockSearcher{
		tracks: []model.Track{
			{YouTubeID: "ok1", Title: "Musica Boa", DurationSeconds: 210},
			{YouTubeID: "too_long", Title: "Set 1 hora", DurationSeconds: 3600}, // > 600s
			{YouTubeID: "blocked_150", Title: "Bloqueada", DurationSeconds: 180},
		},
	}
	blocked := &mockBlockedChecker{
		blockedIDs: map[string]bool{"blocked_150": true},
	}

	h := NewHandler(searcher, blocked)

	// 1. Rejeita sem query
	req := httptest.NewRequest(http.MethodGet, "/api/youtube/search", nil)
	rr := httptest.NewRecorder()
	h.HandleSearch(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty q, got %d", rr.Code)
	}

	// 2. Filtra vídeos longos e bloqueados
	req = httptest.NewRequest(http.MethodGet, "/api/youtube/search?q=rock", nil)
	rr = httptest.NewRecorder()
	h.HandleSearch(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var results []model.Track
	_ = json.NewDecoder(rr.Body).Decode(&results)

	if len(results) != 1 {
		t.Fatalf("expected 1 track after filter, got %d", len(results))
	}
	if results[0].YouTubeID != "ok1" {
		t.Errorf("expected ok1, got %s", results[0].YouTubeID)
	}
}

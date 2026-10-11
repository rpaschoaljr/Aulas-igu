package query

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"radio20/backend/internal/model"
)

type mockReader struct {
	items []model.QueueItem
}

func (m *mockReader) GetActiveQueue(ctx context.Context, roomID string) ([]model.QueueItem, error) {
	return m.items, nil
}

type mockDJ struct{}

func (m *mockDJ) EnsureDJTrackInQueue(ctx context.Context, roomID string) (*model.QueueItem, error) {
	return nil, nil
}

func TestHandleGetQueue(t *testing.T) {
	reader := &mockReader{
		items: []model.QueueItem{
			{ID: "1", Position: 1},
			{ID: "2", Position: 2},
		},
	}
	h := NewHandler(reader, &mockDJ{})

	// 1. Rejeita POST
	req := httptest.NewRequest(http.MethodPost, "/api/radio/queue", nil)
	rr := httptest.NewRecorder()
	h.HandleGetQueue(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Retorna lista com sucesso
	req = httptest.NewRequest(http.MethodGet, "/api/radio/queue?room=radio-six-nine&limit=1&offset=0", nil)
	rr = httptest.NewRecorder()
	h.HandleGetQueue(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var res []model.QueueItem
	_ = json.NewDecoder(rr.Body).Decode(&res)
	if len(res) != 1 {
		t.Errorf("expected 1 item, got %d", len(res))
	}
}

package history

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

type mockHistoryRepo struct{}

func (m *mockHistoryRepo) GetHistory(ctx context.Context, roomID string, limit int, offset int) (any, error) {
	return []string{"song1", "song2"}, nil
}

func TestHistoryHandler(t *testing.T) {
	h := NewHandler(&mockHistoryRepo{})

	// 1. Rejeita POST
	req := httptest.NewRequest(http.MethodPost, "/api/radio/history", nil)
	rr := httptest.NewRecorder()
	h.HandleHistory(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. GET 200
	req = httptest.NewRequest(http.MethodGet, "/api/radio/history?room=radio-six-nine&limit=10&offset=0", nil)
	rr = httptest.NewRecorder()
	h.HandleHistory(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

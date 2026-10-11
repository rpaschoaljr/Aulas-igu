package manage

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type mockManager struct{}

func (m *mockManager) RemoveQueueItem(ctx context.Context, roomID string, queueID string, userID string) error {
	return nil
}

func (m *mockManager) SwapQueueItem(ctx context.Context, roomID string, queueID string, newTrack model.Track, userID string) (*model.QueueItem, error) {
	return &model.QueueItem{ID: queueID, Track: newTrack}, nil
}

func TestManageValidation(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	h := NewHandler(&mockManager{}, jwtSvc)

	// 1. Rejeita GET em Remove
	req := httptest.NewRequest(http.MethodGet, "/api/radio/queue/remove", nil)
	rr := httptest.NewRecorder()
	h.HandleRemove(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Rejeita sem auth
	req = httptest.NewRequest(http.MethodDelete, "/api/radio/queue/remove", bytes.NewBufferString(`{"queue_id":"q1"}`))
	rr = httptest.NewRecorder()
	h.HandleRemove(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

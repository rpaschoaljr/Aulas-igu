package add

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type mockAdder struct {
	addedCount int
}

func (m *mockAdder) AddToQueue(ctx context.Context, roomID string, track model.Track, userID *string) (*model.QueueItem, error) {
	m.addedCount++
	return &model.QueueItem{ID: "q1", Track: track}, nil
}

func (m *mockAdder) CountUserActiveTracks(ctx context.Context, roomID string, userID string) (int, error) {
	return 0, nil
}

func TestHandleAddValidation(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	mock := &mockAdder{}
	h := NewHandler(mock, jwtSvc)

	// 1. Rejeita GET
	req := httptest.NewRequest(http.MethodGet, "/api/radio/queue", nil)
	rr := httptest.NewRecorder()
	h.HandleAdd(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Rejeita não autenticado
	req = httptest.NewRequest(http.MethodPost, "/api/radio/queue", bytes.NewBufferString(`{}`))
	rr = httptest.NewRecorder()
	h.HandleAdd(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}

	// 3. Rejeita faixa > 600s
	token, _ := jwtSvc.GenerateToken(auth.UserClaims{UserID: "u1", Nickname: "Ricardo", IsGuest: false})
	body, _ := json.Marshal(AddRequest{
		RoomSlug: "radio-six-nine",
		Track: model.Track{
			YouTubeID:       "yt1",
			Title:           "Long Video",
			DurationSeconds: 601, // > 10 min
		},
	})
	req = httptest.NewRequest(http.MethodPost, "/api/radio/queue", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	rr = httptest.NewRecorder()
	h.HandleAdd(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for track > 600s, got %d", rr.Code)
	}
}

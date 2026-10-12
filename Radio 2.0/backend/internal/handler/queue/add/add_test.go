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
	"radio20/backend/internal/hub"
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

type mockBroadcaster struct {
	messages []hub.Message
}

func (b *mockBroadcaster) BroadcastToRoom(roomID string, msg hub.Message) {
	b.messages = append(b.messages, msg)
}

type mockRoomResolver struct{}

func (r *mockRoomResolver) GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error) {
	return &model.Room{ID: "pop-hits", Slug: "radio-six-nine"}, nil
}

func TestHandleAddValidation(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	mock := &mockAdder{}
	broadcaster := &mockBroadcaster{}
	resolver := &mockRoomResolver{}
	h := NewHandler(mock, jwtSvc, broadcaster, resolver)

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

	// 4. Aceita faixa válida e dispara broadcast
	bodyValid, _ := json.Marshal(AddRequest{
		RoomSlug: "radio-six-nine",
		Track: model.Track{
			YouTubeID:       "yt1",
			Title:           "Good Song",
			DurationSeconds: 200,
		},
	})
	req = httptest.NewRequest(http.MethodPost, "/api/radio/queue", bytes.NewBuffer(bodyValid))
	req.Header.Set("Authorization", "Bearer "+token)
	rr = httptest.NewRecorder()
	h.HandleAdd(rr, req)
	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rr.Code)
	}
	if len(broadcaster.messages) == 0 {
		t.Errorf("expected WebSocket broadcast on HandleAdd")
	}

	// 5. Aceita batch e dispara broadcast
	batchBody, _ := json.Marshal(BatchRequest{
		RoomSlug: "radio-six-nine",
		Tracks: []model.Track{
			{YouTubeID: "yt2", Title: "Song 2", DurationSeconds: 180},
		},
	})
	req = httptest.NewRequest(http.MethodPost, "/api/radio/queue/batch", bytes.NewBuffer(batchBody))
	req.Header.Set("Authorization", "Bearer "+token)
	rr = httptest.NewRecorder()
	h.HandleBatch(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 on batch, got %d", rr.Code)
	}
}

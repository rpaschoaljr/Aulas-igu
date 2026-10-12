package manage

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/hub"
	"radio20/backend/internal/model"
)

type mockManager struct{}

func (m *mockManager) RemoveQueueItem(ctx context.Context, roomID string, queueID string, userID string) error {
	return nil
}

func (m *mockManager) SwapQueueItem(ctx context.Context, roomID string, queueID string, newTrack model.Track, userID string) (*model.QueueItem, error) {
	return &model.QueueItem{ID: queueID, Track: newTrack}, nil
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

func TestManageValidation(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	broadcaster := &mockBroadcaster{}
	resolver := &mockRoomResolver{}
	h := NewHandler(&mockManager{}, jwtSvc, broadcaster, resolver)

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

	// 3. Remove com sucesso e dispara broadcast
	token, _ := jwtSvc.GenerateToken(auth.UserClaims{UserID: "u1", Nickname: "Ricardo", IsGuest: false})
	req = httptest.NewRequest(http.MethodDelete, "/api/radio/queue/remove", bytes.NewBufferString(`{"queue_id":"q1","room_slug":"radio-six-nine"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	rr = httptest.NewRecorder()
	h.HandleRemove(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}
	if len(broadcaster.messages) == 0 {
		t.Errorf("expected broadcast on remove")
	}

	// 4. Swap com sucesso e dispara broadcast
	swapBody := `{"queue_id":"q1","room_slug":"radio-six-nine","new_track":{"youtube_id":"yt2","title":"New","duration_seconds":180}}`
	req = httptest.NewRequest(http.MethodPost, "/api/radio/queue/swap", bytes.NewBufferString(swapBody))
	req.Header.Set("Authorization", "Bearer "+token)
	rr = httptest.NewRecorder()
	h.HandleSwap(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 on swap, got %d", rr.Code)
	}
}

package room

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"radio20/backend/internal/model"
)

type mockRoomRepo struct{}

func (m *mockRoomRepo) GetAllRooms(ctx context.Context) ([]model.Room, error) {
	return []model.Room{{ID: "pop-hits", Name: "Radio Six-Nine"}}, nil
}

func (m *mockRoomRepo) GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error) {
	return &model.Room{ID: "pop-hits", Name: "Radio Six-Nine"}, nil
}

type mockEngine struct{}

func (m *mockEngine) GetRoomState(roomID string) (any, bool) {
	return map[string]string{"status": "playing"}, true
}

func TestRoomHandler(t *testing.T) {
	h := NewHandler(&mockRoomRepo{}, &mockEngine{})

	// 1. Rejeita POST
	req := httptest.NewRequest(http.MethodPost, "/api/radio/rooms", nil)
	rr := httptest.NewRecorder()
	h.HandleRooms(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. GET Rooms 200
	req = httptest.NewRequest(http.MethodGet, "/api/radio/rooms", nil)
	rr = httptest.NewRecorder()
	h.HandleRooms(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	// 3. GET Status 200
	req = httptest.NewRequest(http.MethodGet, "/api/radio/status?room=radio-six-nine", nil)
	rr = httptest.NewRecorder()
	h.HandleStatus(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

package ws

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type mockRoomCheck struct{}

func (m *mockRoomCheck) GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error) {
	return &model.Room{ID: "pop-hits", Slug: "radio-six-nine"}, nil
}

func TestWSHandlerInit(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	h := NewHandler(nil, &mockRoomCheck{}, jwtSvc)

	// Requisição HTTP comum (não é handshake WebSocket) deve retornar erro de upgrade sem panic
	req := httptest.NewRequest(http.MethodGet, "/ws?room=radio-six-nine", nil)
	rr := httptest.NewRecorder()
	h.HandleWS(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 bad request for non-websocket request, got %d", rr.Code)
	}
}

package google

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

type mockUserUpserter struct{}

func (m *mockUserUpserter) UpsertUserByEmail(ctx context.Context, email, nickname, avatarURL string) (*model.User, error) {
	return &model.User{ID: "u_google", Nickname: nickname, AvatarURL: avatarURL}, nil
}

func TestGoogleHandler(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	h := NewHandler(&mockUserUpserter{}, jwtSvc, "test-client-id-123.apps.googleusercontent.com")

	// 1. Rejeita GET em login
	req := httptest.NewRequest(http.MethodGet, "/api/auth/google", nil)
	rr := httptest.NewRecorder()
	h.HandleLogin(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Login com sucesso
	req = httptest.NewRequest(http.MethodPost, "/api/auth/google", bytes.NewBufferString(`{"email":"teste@gmail.com","name":"Tester"}`))
	rr = httptest.NewRecorder()
	h.HandleLogin(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	// 3. Client ID config 200
	req = httptest.NewRequest(http.MethodGet, "/api/auth/google/client-id", nil)
	rr = httptest.NewRecorder()
	h.HandleConfig(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

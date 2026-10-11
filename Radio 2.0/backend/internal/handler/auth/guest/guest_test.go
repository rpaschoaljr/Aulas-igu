package guest

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/hub"
)

func TestGuestHandler(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	sm := hub.NewSessionManager()
	h := NewHandler(sm, jwtSvc)

	// 1. Rejeita GET em login
	req := httptest.NewRequest(http.MethodGet, "/api/auth/guest", nil)
	rr := httptest.NewRecorder()
	h.HandleGuestLogin(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Login com sucesso
	req = httptest.NewRequest(http.MethodPost, "/api/auth/guest", bytes.NewBufferString(`{"nickname":"Paschoal"}`))
	rr = httptest.NewRecorder()
	h.HandleGuestLogin(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	// 3. Bloqueia mesmo nickname online (409)
	req = httptest.NewRequest(http.MethodPost, "/api/auth/guest", bytes.NewBufferString(`{"nickname":"Paschoal"}`))
	rr = httptest.NewRecorder()
	h.HandleGuestLogin(rr, req)
	if rr.Code != http.StatusConflict {
		t.Errorf("expected 409 conflict for duplicate online nick, got %d", rr.Code)
	}

	// 4. Check nickname endpoint
	req = httptest.NewRequest(http.MethodGet, "/api/auth/check-nickname?nickname=NovoNick", nil)
	rr = httptest.NewRecorder()
	h.HandleCheckNickname(rr, req)
	var res map[string]bool
	_ = json.NewDecoder(rr.Body).Decode(&res)
	if !res["available"] {
		t.Error("expected NovoNick to be available")
	}
}

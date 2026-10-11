package vote

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
)

type mockVoteEngine struct{}

func (m *mockVoteEngine) VoteSkip(roomID string, userID string) (int, int, bool) {
	return 1, 2, false
}

func TestVoteSkipValidation(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	h := NewHandler(&mockVoteEngine{}, jwtSvc)

	// 1. Rejeita GET
	req := httptest.NewRequest(http.MethodGet, "/api/radio/vote-skip", nil)
	rr := httptest.NewRecorder()
	h.HandleVoteSkip(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Rejeita sem auth
	req = httptest.NewRequest(http.MethodPost, "/api/radio/vote-skip", bytes.NewBufferString(`{}`))
	rr = httptest.NewRecorder()
	h.HandleVoteSkip(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}

	// 3. Rejeita Guest com 403
	guestToken, _ := jwtSvc.GenerateToken(auth.UserClaims{UserID: "g1", Nickname: "Visitante", IsGuest: true})
	req = httptest.NewRequest(http.MethodPost, "/api/radio/vote-skip", bytes.NewBufferString(`{}`))
	req.Header.Set("Authorization", "Bearer "+guestToken)
	rr = httptest.NewRecorder()
	h.HandleVoteSkip(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403 for guest, got %d", rr.Code)
	}
}

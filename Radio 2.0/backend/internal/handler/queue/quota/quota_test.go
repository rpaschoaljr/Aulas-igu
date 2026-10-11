package quota

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
)

type mockQuotaRepo struct{}

func (m *mockQuotaRepo) CountUserActiveTracks(ctx context.Context, roomID string, userID string) (int, error) {
	return 2, nil
}

type mockEngineChecker struct{}

func (m *mockEngineChecker) IsUserCurrentTrack(roomID string, userID string) bool {
	return false
}

func TestQuotaHandler(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	h := NewHandler(&mockQuotaRepo{}, &mockEngineChecker{}, jwtSvc)

	// 1. Rejeita POST
	req := httptest.NewRequest(http.MethodPost, "/api/radio/user-quota", nil)
	rr := httptest.NewRecorder()
	h.HandleGetUserQuota(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Não autenticado retorna defaults
	req = httptest.NewRequest(http.MethodGet, "/api/radio/user-quota", nil)
	rr = httptest.NewRecorder()
	h.HandleGetUserQuota(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var res UserQuotaResponse
	_ = json.NewDecoder(rr.Body).Decode(&res)
	if res.Authenticated {
		t.Error("expected Authenticated=false")
	}
}

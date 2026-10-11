package favorite

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

type mockFavManager struct{}

func (m *mockFavManager) ToggleFavorite(ctx context.Context, userID string, track model.Track) (bool, error) {
	return true, nil
}

func (m *mockFavManager) GetUserFavorites(ctx context.Context, userID string) ([]model.FavoriteTrack, error) {
	return []model.FavoriteTrack{{YouTubeID: "yt1"}}, nil
}

func TestFavoriteHandler(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	h := NewHandler(&mockFavManager{}, jwtSvc)

	// 1. Rejeita GET em toggle
	req := httptest.NewRequest(http.MethodGet, "/api/radio/favorites/toggle", nil)
	rr := httptest.NewRecorder()
	h.HandleToggle(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Rejeita toggle sem auth
	req = httptest.NewRequest(http.MethodPost, "/api/radio/favorites/toggle", bytes.NewBufferString(`{}`))
	rr = httptest.NewRecorder()
	h.HandleToggle(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}

	// 3. GET Favorites sem auth retorna array vazio 200
	req = httptest.NewRequest(http.MethodGet, "/api/radio/user-favorites", nil)
	rr = httptest.NewRecorder()
	h.HandleGetFavorites(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

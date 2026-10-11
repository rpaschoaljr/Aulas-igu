package favorite

import (
	"context"
	"testing"
	"radio20/backend/internal/model"
)

func TestFavoriteValidation(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	_, err := repo.ToggleFavorite(context.Background(), "", model.Track{})
	if err == nil {
		t.Error("expected error for empty user_id or track")
	}

	favs, err := repo.GetUserFavorites(context.Background(), "")
	if err != nil || len(favs) != 0 {
		t.Errorf("expected empty array for empty user_id, got %v, err: %v", favs, err)
	}
}

package blocked

import (
	"context"
	"testing"
)

func TestBlockedValidation(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	err := repo.BlockTrack(context.Background(), "", "Titulo", "Canal", 150, "Erro 150")
	if err == nil {
		t.Error("expected error for empty youtube_id")
	}

	isBlocked, err := repo.IsBlocked(context.Background(), "")
	if err != nil || isBlocked {
		t.Errorf("expected false for empty ID, got %v, err: %v", isBlocked, err)
	}
}

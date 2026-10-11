package room

import (
	"context"
	"testing"
)

func TestRoomRepositoryInit(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("unexpected panic in room repo: %v", r)
		}
	}()

	_, _ = repo.GetAllRooms(context.Background())
	_, _ = repo.GetRoomBySlug(context.Background(), "radio-six-nine")
}

package dj

import (
	"context"
	"testing"
)

func TestDJRepositoryInit(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	// Com pool nil, espera retorno de erro seguro sem panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("unexpected panic in repository: %v", r)
		}
	}()

	_, _ = repo.EnsureDJTrackInQueue(context.Background(), "radio-six-nine")
}

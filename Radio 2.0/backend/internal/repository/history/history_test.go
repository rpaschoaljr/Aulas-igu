package history

import (
	"context"
	"testing"
)

func TestHistoryRepositoryInit(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("unexpected panic in history repo: %v", r)
		}
	}()

	_, _ = repo.GetHistory(context.Background(), "radio-six-nine", 10, 0)
}

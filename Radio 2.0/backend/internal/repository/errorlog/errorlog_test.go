package errorlog

import (
	"context"
	"testing"
	"radio20/backend/internal/model"
)

func TestErrorLogRepositoryInit(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("unexpected panic in errorlog repo: %v", r)
		}
	}()

	_ = repo.SaveError(context.Background(), model.ErrorLog{Message: "Teste"})
	_, _ = repo.GetRecentErrors(context.Background(), 10, "")
}

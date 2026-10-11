package chat

import (
	"context"
	"testing"
)

func TestChatRepository_Validation(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatalf("esperava instância válida de Repository")
	}
}

func TestChatRepository_NilPoolBehavior(t *testing.T) {
	repo := NewRepository(nil)
	_, err := repo.GetRecentMessages(context.Background(), "invalid-room", 10)
	if err == nil {
		t.Fatalf("esperava erro ao tentar consultar com pool nil")
	}
}

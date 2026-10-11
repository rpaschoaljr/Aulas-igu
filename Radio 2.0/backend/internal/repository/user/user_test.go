package user

import (
	"context"
	"testing"
)

func TestUserRepositoryInit(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("expected repo instance")
	}

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("unexpected panic in user repo: %v", r)
		}
	}()

	_, _ = repo.GetUserByID(context.Background(), "u1")
}

func TestUserRepository_Validation(t *testing.T) {
	repo := NewRepository(nil)

	// Email vazio deve retornar erro antes de tocar no banco
	_, err := repo.UpsertUserByEmail(context.Background(), "", "Nick", "")
	if err == nil {
		t.Fatalf("esperava erro com email vazio")
	}

	// Com pool nil deve retornar erro
	_, err = repo.UpsertUserByEmail(context.Background(), "teste@gmail.com", "Nick", "")
	if err == nil {
		t.Fatalf("esperava erro com pool nil")
	}
}

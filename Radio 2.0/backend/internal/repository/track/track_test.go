package track

import (
	"context"
	"testing"

	"radio20/backend/internal/model"
)

func TestTrackRepository_EmptyBatch(t *testing.T) {
	repo := NewRepository(nil)
	err := repo.SaveTracksBatch(context.Background(), []model.Track{})
	if err != nil {
		t.Fatalf("esperava erro nil para lote vazio, obteve: %v", err)
	}
}

func TestTrackRepository_UpdateDuration_Validation(t *testing.T) {
	repo := NewRepository(nil)
	// Com ID vazio ou duração inválida deve retornar nil sem tocar no pool
	if err := repo.UpdateTrackDuration(context.Background(), "", 180); err != nil {
		t.Fatalf("esperava nil com ID vazio, obteve: %v", err)
	}
	if err := repo.UpdateTrackDuration(context.Background(), "test", 0); err != nil {
		t.Fatalf("esperava nil com duração zero, obteve: %v", err)
	}
}

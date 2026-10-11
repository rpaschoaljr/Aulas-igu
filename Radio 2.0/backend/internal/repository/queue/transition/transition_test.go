package transition

import (
	"context"
	"testing"
)

func TestTransitionRepository_NilPool(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatalf("esperava instância de Repository")
	}

	_, _, err := repo.GetNextInQueue(context.Background(), "test-room")
	if err == nil {
		t.Fatalf("esperava erro com pool nil em GetNextInQueue")
	}

	_, err = repo.GetFallbackDJTrack(context.Background(), "test-room")
	if err == nil {
		t.Fatalf("esperava erro com pool nil em GetFallbackDJTrack")
	}

	_, err = repo.GetHistoricalTrackForRoom(context.Background(), "test-room")
	if err == nil {
		t.Fatalf("esperava erro com pool nil em GetHistoricalTrackForRoom")
	}

	// RecordHistory com youtubeID vazio não deve emitir erro
	if err := repo.RecordHistory(context.Background(), "test-room", "", false); err != nil {
		t.Fatalf("esperava nil com youtubeID vazio, obteve: %v", err)
	}
}

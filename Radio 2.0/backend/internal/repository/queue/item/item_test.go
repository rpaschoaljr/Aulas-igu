package item

import (
	"context"
	"testing"
	"radio20/backend/internal/model"
)

func TestQueueItemDurationLimit(t *testing.T) {
	repo := NewRepository(nil)
	longTrack := model.Track{
		YouTubeID:       "long1",
		Title:           "Set de 2 horas",
		DurationSeconds: 7200, // > 600s
	}

	_, err := repo.AddToQueue(context.Background(), "radio-six-nine", longTrack, nil)
	if err != ErrMaxDuration {
		t.Errorf("expected ErrMaxDuration, got %v", err)
	}

	zeroTrack := model.Track{
		YouTubeID:       "zero1",
		Title:           "Zero",
		DurationSeconds: 0,
	}
	_, err = repo.AddToQueue(context.Background(), "radio-six-nine", zeroTrack, nil)
	if err != ErrMaxDuration {
		t.Errorf("expected ErrMaxDuration for 0s track, got %v", err)
	}
}

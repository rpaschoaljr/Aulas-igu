package dedup

import (
	"testing"

	"radio20/backend/internal/model"
)

func TestMergeAndDeduplicate(t *testing.T) {
	dbTracks := []model.Track{
		{YouTubeID: "yt-1", Title: "Musica 1", NormalizedTitle: "musica 1"},
	}
	apiTracks := []model.Track{
		{YouTubeID: "yt-1", Title: "Musica 1 Repetida", NormalizedTitle: "musica 1"},
		{YouTubeID: "yt-2", Title: "Musica 2 Nova", NormalizedTitle: "musica 2 nova"},
	}

	merged, newToSave := MergeAndDeduplicate(dbTracks, apiTracks)

	if len(merged) != 2 {
		t.Fatalf("esperava 2 músicas mescladas, obteve: %d", len(merged))
	}
	if len(newToSave) != 1 {
		t.Fatalf("esperava 1 nova música para salvar, obteve: %d", len(newToSave))
	}
	if newToSave[0].YouTubeID != "yt-2" {
		t.Fatalf("esperava yt-2 como nova, obteve: %s", newToSave[0].YouTubeID)
	}
}

func TestValidateTrackForQueue(t *testing.T) {
	queue := []model.Track{
		{YouTubeID: "yt-1", NormalizedTitle: "musica 1"},
	}

	err := ValidateTrackForQueue(queue, model.Track{YouTubeID: "yt-1"})
	if err != ErrTrackAlreadyInQueue {
		t.Fatalf("esperava ErrTrackAlreadyInQueue, obteve: %v", err)
	}

	err = ValidateTrackForQueue(queue, model.Track{YouTubeID: "yt-2", NormalizedTitle: "musica 1"})
	if err != ErrTrackAlreadyInQueue {
		t.Fatalf("esperava ErrTrackAlreadyInQueue para mesmo título normalizado, obteve: %v", err)
	}

	err = ValidateTrackForQueue(queue, model.Track{YouTubeID: "yt-2", NormalizedTitle: "musica 2"})
	if err != nil {
		t.Fatalf("esperava nil para faixa inédita, obteve: %v", err)
	}
}

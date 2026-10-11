package dedup

import (
	"errors"

	"radio20/backend/internal/model"
)

var (
	ErrTrackAlreadyInQueue = errors.New("música já presente na fila ou tocando atualmente")
)

type Track = model.Track

// MergeAndDeduplicate funde os resultados do banco com os da API do YouTube
func MergeAndDeduplicate(dbTracks []Track, apiTracks []Track) (merged []Track, newTracksToSave []Track) {
	seenIDs := make(map[string]bool)
	seenTitles := make(map[string]bool)

	merged = make([]Track, 0, len(dbTracks)+len(apiTracks))
	newTracksToSave = make([]Track, 0)

	// 1. Prioriza registros já existentes no banco de dados
	for _, track := range dbTracks {
		seenIDs[track.YouTubeID] = true
		if track.NormalizedTitle != "" {
			seenTitles[track.NormalizedTitle] = true
		}
		merged = append(merged, track)
	}

	// 2. Filtra da API apenas o que for inédito
	for _, track := range apiTracks {
		if seenIDs[track.YouTubeID] {
			continue
		}
		if track.NormalizedTitle != "" && seenTitles[track.NormalizedTitle] {
			continue
		}

		seenIDs[track.YouTubeID] = true
		if track.NormalizedTitle != "" {
			seenTitles[track.NormalizedTitle] = true
		}

		merged = append(merged, track)
		newTracksToSave = append(newTracksToSave, track)
	}

	return merged, newTracksToSave
}

// ValidateTrackForQueue verifica se a faixa já está na fila ativa
func ValidateTrackForQueue(currentQueue []Track, track Track) error {
	for _, item := range currentQueue {
		if item.YouTubeID == track.YouTubeID {
			return ErrTrackAlreadyInQueue
		}
		if item.NormalizedTitle != "" && track.NormalizedTitle != "" && item.NormalizedTitle == track.NormalizedTitle {
			return ErrTrackAlreadyInQueue
		}
	}
	return nil
}

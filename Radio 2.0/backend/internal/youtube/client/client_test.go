package client

import (
	"context"
	"testing"
)

func TestService_MockSearch(t *testing.T) {
	client := NewYouTubeApiClient("")
	service := NewService(nil, client)

	results, err := service.Search(context.Background(), "daft punk")
	if err != nil {
		t.Fatalf("esperava sucesso na busca mock, obteve: %v", err)
	}

	if len(results) == 0 {
		t.Fatalf("esperava ao menos um resultado na busca mock")
	}

	for _, track := range results {
		if track.DurationSeconds > 600 {
			t.Errorf("faixa excedeu 600s: %d", track.DurationSeconds)
		}
	}
}

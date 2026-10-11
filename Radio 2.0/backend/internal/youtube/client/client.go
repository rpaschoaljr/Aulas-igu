package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"radio20/backend/internal/model"
	"radio20/backend/internal/sanitizer"
	"radio20/backend/internal/youtube/dedup"
	"radio20/backend/internal/youtube/duration"
)

type Track = model.Track

type TrackRepositoryInterface interface {
	SearchTracks(ctx context.Context, query string, limit int) ([]Track, error)
	SaveTracksBatch(ctx context.Context, tracks []Track) error
}

type ExternalClient interface {
	Search(ctx context.Context, query string, maxResults int) ([]Track, error)
	FetchVideoDurations(ctx context.Context, videoIDs []string) (map[string]int, error)
}

type YouTubeApiClient struct {
	apiKey     string
	httpClient *http.Client
}

func NewYouTubeApiClient(apiKey string) *YouTubeApiClient {
	return &YouTubeApiClient{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

// FetchVideoDurations consulta a YouTube Data API v3 para obter a duração real dos vídeos
func (c *YouTubeApiClient) FetchVideoDurations(ctx context.Context, videoIDs []string) (map[string]int, error) {
	durations := make(map[string]int)
	if c.apiKey == "" || len(videoIDs) == 0 {
		return durations, nil
	}

	const chunkSize = 50
	for i := 0; i < len(videoIDs); i += chunkSize {
		end := i + chunkSize
		if end > len(videoIDs) {
			end = len(videoIDs)
		}
		chunk := videoIDs[i:end]

		apiURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=%s&key=%s",
			strings.Join(chunk, ","), c.apiKey)

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return durations, err
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return durations, err
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return durations, fmt.Errorf("youtube videos api error (%d): %s", resp.StatusCode, string(body))
		}

		var ytResp struct {
			Items []struct {
				ID             string `json:"id"`
				ContentDetails struct {
					Duration string `json:"duration"`
				} `json:"contentDetails"`
			} `json:"items"`
		}

		decodeErr := json.NewDecoder(resp.Body).Decode(&ytResp)
		resp.Body.Close()
		if decodeErr != nil {
			return durations, decodeErr
		}

		for _, item := range ytResp.Items {
			sec := duration.ParseISO8601Duration(item.ContentDetails.Duration)
			if sec > 0 {
				durations[item.ID] = sec
			}
		}
	}

	return durations, nil
}

// Search chama a YouTube Data API v3 se a chave estiver configurada
func (c *YouTubeApiClient) Search(ctx context.Context, query string, maxResults int) ([]Track, error) {
	if c.apiKey == "" {
		return c.mockSearch(query, maxResults), nil
	}

	searchURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=%d&q=%s&key=%s",
		maxResults, url.QueryEscape(query), c.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("youtube api error (%d): %s", resp.StatusCode, string(body))
	}

	var ytResp struct {
		Items []struct {
			ID struct {
				VideoID string `json:"videoId"`
			} `json:"id"`
			Snippet struct {
				Title        string `json:"title"`
				ChannelTitle string `json:"channelTitle"`
				Thumbnails   struct {
					Default struct {
						URL string `json:"url"`
					} `json:"default"`
					High struct {
						URL string `json:"url"`
					} `json:"high"`
				} `json:"thumbnails"`
			} `json:"snippet"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ytResp); err != nil {
		return nil, err
	}

	videoIDs := make([]string, 0, len(ytResp.Items))
	for _, item := range ytResp.Items {
		if item.ID.VideoID != "" {
			videoIDs = append(videoIDs, item.ID.VideoID)
		}
	}

	durations, _ := c.FetchVideoDurations(ctx, videoIDs)

	tracks := make([]Track, 0, len(ytResp.Items))
	for _, item := range ytResp.Items {
		thumb := item.Snippet.Thumbnails.High.URL
		if thumb == "" {
			thumb = item.Snippet.Thumbnails.Default.URL
		}
		rawBytes, _ := json.Marshal(item)
		titleDisplay, titleNorm := sanitizer.ProcessPair(item.Snippet.Title)

		dur := 210
		if realDur, ok := durations[item.ID.VideoID]; ok && realDur > 0 {
			dur = realDur
		}

		tracks = append(tracks, Track{
			YouTubeID:       item.ID.VideoID,
			Title:           titleDisplay,
			NormalizedTitle: titleNorm,
			ChannelTitle:    item.Snippet.ChannelTitle,
			DurationSeconds: dur,
			ThumbnailURL:    thumb,
			RawData:         rawBytes,
			Source:          "youtube_api",
		})
	}

	return tracks, nil
}

func (c *YouTubeApiClient) mockSearch(query string, maxResults int) []Track {
	displayTitle, normTitle := sanitizer.ProcessPair(query)
	results := make([]Track, 0, maxResults)
	for i := 1; i <= maxResults; i++ {
		tTitle := fmt.Sprintf("%s - Live Session %d", displayTitle, i)
		nTitle := sanitizer.Normalize(tTitle)
		results = append(results, Track{
			YouTubeID:       fmt.Sprintf("mock_%s_%d", strings.ReplaceAll(normTitle, " ", "_"), i),
			Title:           tTitle,
			NormalizedTitle: nTitle,
			ChannelTitle:    "Music Channel",
			DurationSeconds: 180 + (i * 15),
			ThumbnailURL:    "https://picsum.photos/320/180",
			RawData:         []byte(`{"mock": true}`),
			Source:          "youtube_api",
		})
	}
	return results
}

type Service struct {
	repo   TrackRepositoryInterface
	client ExternalClient
}

func NewService(repo TrackRepositoryInterface, client ExternalClient) *Service {
	if client == nil {
		apiKey := os.Getenv("YOUTUBE_API_KEY")
		client = NewYouTubeApiClient(apiKey)
	}
	return &Service{
		repo:   repo,
		client: client,
	}
}

// Search executa busca no banco e complementa via YouTube API
func (s *Service) Search(ctx context.Context, query string) ([]Track, error) {
	const targetCount = 20

	var dbTracks []Track
	if s.repo != nil {
		var err error
		dbTracks, err = s.repo.SearchTracks(ctx, query, targetCount)
		if err != nil {
			return nil, fmt.Errorf("erro na busca do banco: %w", err)
		}
	}

	if len(dbTracks) >= targetCount {
		return dbTracks, nil
	}

	neededFromApi := targetCount - len(dbTracks)
	apiTracks, err := s.client.Search(ctx, query, neededFromApi+5)
	if err != nil {
		return dbTracks, nil
	}

	merged, newToSave := dedup.MergeAndDeduplicate(dbTracks, apiTracks)

	if len(newToSave) > 0 && s.repo != nil {
		_ = s.repo.SaveTracksBatch(ctx, newToSave)
	}

	var filtered []Track
	for _, t := range merged {
		if t.DurationSeconds > 0 && t.DurationSeconds <= 600 {
			filtered = append(filtered, t)
		}
	}

	if len(filtered) > targetCount {
		filtered = filtered[:targetCount]
	}

	return filtered, nil
}

// FetchVideoDurations expõe a busca de durações pelo serviço
func (s *Service) FetchVideoDurations(ctx context.Context, videoIDs []string) (map[string]int, error) {
	if s.client == nil {
		return make(map[string]int), nil
	}
	return s.client.FetchVideoDurations(ctx, videoIDs)
}

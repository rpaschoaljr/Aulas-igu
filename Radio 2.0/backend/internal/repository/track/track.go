package track

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
	"radio20/backend/internal/sanitizer"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// SearchTracks busca faixas cacheadas no banco de dados por título ou canal
func (r *Repository) SearchTracks(ctx context.Context, query string, limit int) ([]model.Track, error) {
	_, normalized := sanitizer.ProcessPair(query)
	if normalized == "" {
		return []model.Track{}, nil
	}

	sql := `
		SELECT youtube_id, title, normalized_title, channel, duration_seconds, COALESCE(thumbnail_high, thumbnail_default, ''), raw_metadata
		FROM youtube_tracks
		WHERE normalized_title ILIKE '%' || $1 || '%' OR normalized_channel ILIKE '%' || $1 || '%'
		ORDER BY view_count DESC, created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, sql, normalized, limit)
	if err != nil {
		return nil, fmt.Errorf("falha ao pesquisar faixas no banco: %w", err)
	}
	defer rows.Close()

	var tracks []model.Track
	for rows.Next() {
		var t model.Track
		var rawBytes []byte
		err := rows.Scan(
			&t.YouTubeID, &t.Title, &t.NormalizedTitle,
			&t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL, &rawBytes,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao ler faixa do banco: %w", err)
		}
		t.ID = t.YouTubeID
		t.RawData = rawBytes
		t.Source = "database"
		tracks = append(tracks, t)
	}

	return tracks, nil
}

// SaveTracksBatch persiste um lote de faixas vindas da YouTube API com raw_metadata
func (r *Repository) SaveTracksBatch(ctx context.Context, tracks []model.Track) error {
	if len(tracks) == 0 {
		return nil
	}

	sql := `
		INSERT INTO youtube_tracks (
			youtube_id, title, normalized_title, channel, normalized_channel,
			duration_seconds, thumbnail_high, raw_metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (youtube_id) DO UPDATE
		SET title = EXCLUDED.title,
		    channel = EXCLUDED.channel,
		    raw_metadata = EXCLUDED.raw_metadata,
		    updated_at = CURRENT_TIMESTAMP
	`

	for _, t := range tracks {
		titleDisplay, titleNorm := sanitizer.ProcessPair(t.Title)
		chanDisplay, chanNorm := sanitizer.ProcessPair(t.ChannelTitle)

		rawJSON := t.RawData
		if len(rawJSON) == 0 {
			b, _ := json.Marshal(t)
			rawJSON = b
		}

		duration := t.DurationSeconds
		if duration <= 0 {
			duration = 180
		}

		_, err := r.pool.Exec(ctx, sql,
			t.YouTubeID, titleDisplay, titleNorm, chanDisplay, chanNorm,
			duration, t.ThumbnailURL, rawJSON,
		)
		if err != nil {
			return fmt.Errorf("erro ao salvar faixa %s: %w", t.YouTubeID, err)
		}
	}

	return nil
}

// UpdateTrackDuration atualiza a duração real da faixa no catálogo e na fila
func (r *Repository) UpdateTrackDuration(ctx context.Context, youtubeID string, durationSeconds int) error {
	if youtubeID == "" || durationSeconds <= 0 {
		return nil
	}

	sqlTrack := `
		UPDATE youtube_tracks
		SET duration_seconds = $1, updated_at = CURRENT_TIMESTAMP
		WHERE youtube_id = $2
	`
	if _, err := r.pool.Exec(ctx, sqlTrack, durationSeconds, youtubeID); err != nil {
		return fmt.Errorf("erro ao atualizar duração da faixa %s: %w", youtubeID, err)
	}

	sqlQueue := `
		UPDATE queue_items
		SET duration_seconds = $1
		WHERE youtube_id = $2
	`
	_, _ = r.pool.Exec(ctx, sqlQueue, durationSeconds, youtubeID)

	return nil
}

// GetTracksWithDefaultDuration busca IDs de faixas com duração padrão para enriquecimento
func (r *Repository) GetTracksWithDefaultDuration(ctx context.Context, limit int) ([]string, error) {
	sql := `
		SELECT youtube_id
		FROM youtube_tracks
		WHERE duration_seconds = 210 OR duration_seconds <= 0
		ORDER BY created_at DESC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, sql, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar faixas com duração padrão: %w", err)
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil && id != "" {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

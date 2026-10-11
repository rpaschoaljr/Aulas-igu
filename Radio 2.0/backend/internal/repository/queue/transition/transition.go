package transition

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetNextInQueue obtém a próxima música da fila atômica, remove da fila e a retorna para tocar
func (r *Repository) GetNextInQueue(ctx context.Context, roomID string) (*model.Track, *string, error) {
	if r.pool == nil {
		return nil, nil, fmt.Errorf("banco de dados não inicializado")
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	selectSQL := `
		SELECT id, youtube_id, title, normalized_title, channel, duration_seconds, cover_url, user_id
		FROM queue_items
		WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1))
		ORDER BY position ASC, created_at ASC
		LIMIT 1
		FOR UPDATE
	`
	var queueItemID string
	var t model.Track
	var userID *string
	err = tx.QueryRow(ctx, selectSQL, roomID).Scan(
		&queueItemID, &t.YouTubeID, &t.Title, &t.NormalizedTitle,
		&t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL, &userID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, nil // fila vazia
		}
		return nil, nil, err
	}

	// Remove da fila pendente pois passará a tocar
	_, err = tx.Exec(ctx, `DELETE FROM queue_items WHERE id = $1`, queueItemID)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	t.ID = t.YouTubeID
	return &t, userID, nil
}

// GetFallbackDJTrack busca uma música de reserva do DJ Bot para a sala
func (r *Repository) GetFallbackDJTrack(ctx context.Context, roomID string) (*model.Track, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("banco de dados não inicializado")
	}

	sql := `
		SELECT youtube_id, title, normalized_title, channel, duration_seconds, cover_url
		FROM dj_fallback_tracks
		WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND is_active = true
		ORDER BY RANDOM()
		LIMIT 1
	`
	var t model.Track
	err := r.pool.QueryRow(ctx, sql, roomID).Scan(
		&t.YouTubeID, &t.Title, &t.NormalizedTitle,
		&t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			fallbackCatalogSQL := `
				SELECT youtube_id, title, normalized_title, channel, duration_seconds, COALESCE(thumbnail_high, thumbnail_default, '')
				FROM youtube_tracks
				ORDER BY RANDOM()
				LIMIT 1
			`
			err = r.pool.QueryRow(ctx, fallbackCatalogSQL).Scan(
				&t.YouTubeID, &t.Title, &t.NormalizedTitle,
				&t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL,
			)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	t.ID = t.YouTubeID
	return &t, nil
}

// RecordHistory salva a faixa recém tocada no histórico
func (r *Repository) RecordHistory(ctx context.Context, roomID string, youtubeID string, wasSkipped bool) error {
	if r.pool == nil || youtubeID == "" {
		return nil
	}

	var title, normTitle, channel, normChannel, cover string
	var duration int
	queryTrack := `SELECT title, normalized_title, channel, normalized_channel, duration_seconds, COALESCE(thumbnail_high, '') FROM youtube_tracks WHERE youtube_id = $1`
	err := r.pool.QueryRow(ctx, queryTrack, youtubeID).Scan(&title, &normTitle, &channel, &normChannel, &duration, &cover)
	if err != nil {
		return nil
	}

	sql := `
		INSERT INTO playback_history (
			room_id, youtube_id, title, normalized_title, channel, normalized_channel,
			duration_seconds, cover_url, was_skipped, played_at
		)
		VALUES (COALESCE((SELECT id FROM radio_rooms WHERE id = $1 OR slug = $1), $1), $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
	`
	_, err = r.pool.Exec(ctx, sql, roomID, youtubeID, title, normTitle, channel, normChannel, duration, cover, wasSkipped)
	return err
}

// GetHistoricalTrackForRoom busca uma música do histórico de reprodução para manter a rádio contínua
func (r *Repository) GetHistoricalTrackForRoom(ctx context.Context, roomID string, excludeIDs ...string) (*model.Track, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("banco de dados não inicializado")
	}

	validExcludes := make([]string, 0, len(excludeIDs))
	for _, id := range excludeIDs {
		if id != "" {
			validExcludes = append(validExcludes, id)
		}
	}

	var sql string
	var args []any
	if len(validExcludes) > 0 {
		sql = `
			WITH track_plays AS (
				SELECT youtube_id, title, normalized_title, channel, duration_seconds,
				       COALESCE(cover_url, '') AS cover_url,
				       COUNT(*) AS play_count
				FROM playback_history
				WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND was_skipped = false
				GROUP BY youtube_id, title, normalized_title, channel, duration_seconds, cover_url
			),
			eligible_pool AS (
				SELECT * FROM track_plays WHERE NOT (youtube_id = ANY($2))
			),
			min_count AS (
				SELECT MIN(play_count) AS min_plays FROM eligible_pool
			)
			SELECT e.youtube_id, e.title, e.normalized_title, e.channel, e.duration_seconds, e.cover_url
			FROM eligible_pool e
			CROSS JOIN min_count m
			WHERE e.play_count = m.min_plays
			ORDER BY RANDOM()
			LIMIT 1
		`
		args = []any{roomID, validExcludes}
	} else {
		sql = `
			WITH track_plays AS (
				SELECT youtube_id, title, normalized_title, channel, duration_seconds,
				       COALESCE(cover_url, '') AS cover_url,
				       COUNT(*) AS play_count
				FROM playback_history
				WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND was_skipped = false
				GROUP BY youtube_id, title, normalized_title, channel, duration_seconds, cover_url
			),
			min_count AS (
				SELECT MIN(play_count) AS min_plays FROM track_plays
			)
			SELECT t.youtube_id, t.title, t.normalized_title, t.channel, t.duration_seconds, t.cover_url
			FROM track_plays t
			CROSS JOIN min_count m
			WHERE t.play_count = m.min_plays
			ORDER BY RANDOM()
			LIMIT 1
		`
		args = []any{roomID}
	}

	var t model.Track
	err := r.pool.QueryRow(ctx, sql, args...).Scan(
		&t.YouTubeID, &t.Title, &t.NormalizedTitle,
		&t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	t.ID = t.YouTubeID
	return &t, nil
}

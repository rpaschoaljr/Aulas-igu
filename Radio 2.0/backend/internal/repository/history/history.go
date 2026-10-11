package history

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HistoryItem struct {
	ID              string    `json:"id"`
	RoomID          string    `json:"room_id"`
	YouTubeID       string    `json:"youtube_id"`
	Title           string    `json:"title"`
	Channel         string    `json:"channel"`
	DurationSeconds int       `json:"duration_seconds"`
	CoverURL        string    `json:"cover_url"`
	WasSkipped      bool      `json:"was_skipped"`
	PlayedAt        time.Time `json:"played_at"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetHistory retorna o histórico paginado
func (r *Repository) GetHistory(ctx context.Context, roomID string, limit int, offset int) (any, error) {
	if r.pool == nil {
		return []HistoryItem{}, nil
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, room_id, youtube_id, title, channel, duration_seconds, cover_url, was_skipped, played_at
		FROM playback_history
		WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1))
		ORDER BY played_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, roomID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar histórico: %w", err)
	}
	defer rows.Close()

	items := make([]HistoryItem, 0)
	for rows.Next() {
		var item HistoryItem
		err := rows.Scan(
			&item.ID, &item.RoomID, &item.YouTubeID, &item.Title,
			&item.Channel, &item.DurationSeconds, &item.CoverURL,
			&item.WasSkipped, &item.PlayedAt,
		)
		if err == nil {
			items = append(items, item)
		}
	}
	return items, nil
}

// RecordHistory grava uma faixa no histórico
func (r *Repository) RecordHistory(ctx context.Context, roomID string, youtubeID string, wasSkipped bool) error {
	if r.pool == nil {
		return nil
	}
	query := `
		INSERT INTO playback_history (
			room_id, youtube_id, title, normalized_title, channel, normalized_channel,
			duration_seconds, cover_url, was_skipped
		)
		SELECT COALESCE((SELECT id FROM radio_rooms WHERE id = $1 OR slug = $1), $1), yt.youtube_id, yt.title, yt.normalized_title, yt.channel, yt.normalized_channel,
		       yt.duration_seconds, yt.thumbnail_high, $3
		FROM youtube_tracks yt
		WHERE yt.youtube_id = $2
	`
	_, err := r.pool.Exec(ctx, query, roomID, youtubeID, wasSkipped)
	return err
}

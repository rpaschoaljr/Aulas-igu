package dj

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// EnsureDJTrackInQueue garante que a fila nunca fique vazia, inserindo de verdade uma faixa do DJ no banco
func (r *Repository) EnsureDJTrackInQueue(ctx context.Context, roomID string) (*model.QueueItem, error) {
	if r.pool == nil {
		return nil, nil
	}
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(1) FROM queue_items WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1))`, roomID).Scan(&count)
	if err != nil {
		return nil, err
	}

	if count > 0 {
		return nil, nil // Fila já possui faixas
	}

	// 1. Busca faixa do histórico não pulada que não esteja bloqueada
	query := `
		SELECT p.youtube_id, p.title, p.normalized_title, p.channel, p.duration_seconds, COALESCE(p.cover_url, '')
		FROM playback_history p
		LEFT JOIN blocked_tracks b ON b.youtube_id = p.youtube_id
		WHERE (p.room_id = $1 OR p.room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND p.was_skipped = false AND b.youtube_id IS NULL AND p.duration_seconds <= 600
		GROUP BY p.youtube_id, p.title, p.normalized_title, p.channel, p.duration_seconds, p.cover_url
		ORDER BY RANDOM()
		LIMIT 1
	`
	var t model.Track
	err = r.pool.QueryRow(ctx, query, roomID).Scan(
		&t.YouTubeID, &t.Title, &t.NormalizedTitle, &t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL,
	)

	// 2. Fallback caso histórico esteja vazio
	if err != nil {
		fbQuery := `
			SELECT d.youtube_id, d.title, d.normalized_title, d.channel, d.duration_seconds, COALESCE(d.cover_url, '')
			FROM dj_fallback_tracks d
			LEFT JOIN blocked_tracks b ON b.youtube_id = d.youtube_id
			WHERE (d.room_id = $1 OR d.room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND d.is_active = true AND b.youtube_id IS NULL AND d.duration_seconds <= 600
			ORDER BY RANDOM()
			LIMIT 1
		`
		err = r.pool.QueryRow(ctx, fbQuery, roomID).Scan(
			&t.YouTubeID, &t.Title, &t.NormalizedTitle, &t.ChannelTitle, &t.DurationSeconds, &t.ThumbnailURL,
		)
		if err != nil {
			return nil, fmt.Errorf("nenhuma faixa de DJ disponível: %w", err)
		}
	}

	t.ID = t.YouTubeID

	// 3. Insere a faixa do DJ fisicamente na tabela queue_items
	var itemID string
	var createdAt time.Time
	insertSQL := `
		INSERT INTO queue_items (
			room_id, youtube_id, title, normalized_title, channel, normalized_channel,
			duration_seconds, cover_url, user_id, user_nickname, normalized_user_nickname,
			position, is_dj_track
		) VALUES (
			COALESCE((SELECT id FROM radio_rooms WHERE id = $1 OR slug = $1), $1),
			$2, $3, $4, $5, $6, $7, $8, NULL, 'DJ Six-Nine', 'dj six-nine', 1, true
		)
		RETURNING id, created_at
	`
	err = r.pool.QueryRow(ctx, insertSQL,
		roomID, t.YouTubeID, t.Title, t.NormalizedTitle, t.ChannelTitle, strings.ToLower(t.ChannelTitle),
		t.DurationSeconds, t.ThumbnailURL,
	).Scan(&itemID, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("erro ao persistir faixa do DJ na fila: %w", err)
	}

	return &model.QueueItem{
		ID:        itemID,
		RoomID:    roomID,
		Position:  1,
		Status:    "dj_upcoming",
		Track:     t,
		CreatedAt: createdAt,
		RequestedBy: &model.User{
			ID:        "dj-six-nine",
			Nickname:  "DJ Six-Nine",
			AvatarURL: "/assets/avatars/retro-1.png",
		},
	}, nil
}

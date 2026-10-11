package item

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
	"radio20/backend/internal/sanitizer"
)

var (
	ErrDuplicateTrack    = errors.New("música já está presente na fila")
	ErrRecentlyPlayed    = errors.New("música foi tocada recentemente nesta sala (cooldown ativo)")
	ErrUserQuotaExceeded = errors.New("você atingiu o limite máximo de 5 pedidos ativos")
	ErrMaxDuration       = errors.New("a faixa excede o limite máximo permitido de 10 minutos (600s)")
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetActiveQueue retorna todos os itens ativos na fila ordenados por posição
func (r *Repository) GetActiveQueue(ctx context.Context, roomID string) ([]model.QueueItem, error) {
	query := `
		SELECT q.id, q.room_id, q.position, q.created_at,
		       q.youtube_id, q.title, q.normalized_title,
		       q.channel, q.duration_seconds, q.cover_url,
		       q.user_id, q.user_nickname
		FROM queue_items q
		WHERE (q.room_id = $1 OR q.room_id = (SELECT id FROM radio_rooms WHERE slug = $1))
		ORDER BY q.position ASC, q.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, roomID)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar fila: %w", err)
	}
	defer rows.Close()

	items := make([]model.QueueItem, 0)
	for rows.Next() {
		var item model.QueueItem
		var reqUserID *string
		var reqNickname string

		err := rows.Scan(
			&item.ID, &item.RoomID, &item.Position, &item.CreatedAt,
			&item.Track.YouTubeID, &item.Track.Title, &item.Track.NormalizedTitle,
			&item.Track.ChannelTitle, &item.Track.DurationSeconds, &item.Track.ThumbnailURL,
			&reqUserID, &reqNickname,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao ler item da fila: %w", err)
		}

		item.Status = "pending"
		item.Track.ID = item.Track.YouTubeID
		if reqUserID != nil {
			item.RequestedBy = &model.User{
				ID:        *reqUserID,
				Nickname:  reqNickname,
				AvatarURL: "/assets/avatars/retro-1.png",
			}
		} else {
			item.RequestedBy = &model.User{
				ID:        "dj-six-nine",
				Nickname:  reqNickname,
				AvatarURL: "/assets/avatars/retro-1.png",
			}
		}

		items = append(items, item)
	}
	return items, nil
}

// AddToQueue adiciona uma faixa à fila com validação atômica de cota, cooldown e 600s
func (r *Repository) AddToQueue(ctx context.Context, roomID string, track model.Track, userID *string) (*model.QueueItem, error) {
	if track.DurationSeconds > 600 || track.DurationSeconds <= 0 {
		return nil, ErrMaxDuration
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	titleNorm := sanitizer.Normalize(track.Title)
	if titleNorm == "" {
		titleNorm = strings.ToLower(strings.TrimSpace(track.Title))
	}

	// 1. Duplicatas na fila
	var dupCount int
	err = tx.QueryRow(ctx, `SELECT COUNT(1) FROM queue_items WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND (youtube_id = $2 OR normalized_title = $3)`, roomID, track.YouTubeID, titleNorm).Scan(&dupCount)
	if err != nil {
		return nil, err
	}
	if dupCount > 0 {
		return nil, ErrDuplicateTrack
	}

	// 2. Cooldown
	var recentCount int
	err = tx.QueryRow(ctx, `
		SELECT COUNT(1) FROM (
			SELECT youtube_id, normalized_title FROM playback_history WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) ORDER BY played_at DESC LIMIT 5
		) recent WHERE recent.youtube_id = $2 OR recent.normalized_title = $3
	`, roomID, track.YouTubeID, titleNorm).Scan(&recentCount)
	if err != nil {
		return nil, err
	}
	if recentCount > 0 {
		return nil, ErrRecentlyPlayed
	}

	// 3. Cota
	if userID != nil && *userID != "" {
		var activeCount int
		err = tx.QueryRow(ctx, `SELECT COUNT(1) FROM queue_items WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND user_id = $2`, roomID, *userID).Scan(&activeCount)
		if err != nil {
			return nil, err
		}
		if activeCount >= 5 {
			return nil, ErrUserQuotaExceeded
		}
	}

	var userNick, userNormNick string
	if userID != nil {
		_ = tx.QueryRow(ctx, `SELECT nickname, normalized_nickname FROM users WHERE id = $1`, *userID).Scan(&userNick, &userNormNick)
	}
	if userNick == "" {
		userNick = "Ouvinte"
		userNormNick = "ouvinte"
	}

	var nextPos int
	err = tx.QueryRow(ctx, `SELECT COALESCE(MAX(position), 0) + 1 FROM queue_items WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1))`, roomID).Scan(&nextPos)
	if err != nil {
		return nil, err
	}

	var itemID string
	var createdAt time.Time
	insertSQL := `
		INSERT INTO queue_items (
			room_id, youtube_id, title, normalized_title, channel, normalized_channel,
			duration_seconds, cover_url, user_id, user_nickname, normalized_user_nickname, position
		) VALUES (
			COALESCE((SELECT id FROM radio_rooms WHERE id = $1 OR slug = $1), $1),
			$2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)
		RETURNING id, created_at
	`
	err = tx.QueryRow(ctx, insertSQL,
		roomID, track.YouTubeID, track.Title, titleNorm, track.ChannelTitle, strings.ToLower(track.ChannelTitle),
		track.DurationSeconds, track.ThumbnailURL, userID, userNick, userNormNick, nextPos,
	).Scan(&itemID, &createdAt)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &model.QueueItem{
		ID:        itemID,
		RoomID:    roomID,
		Position:  nextPos,
		Status:    "pending",
		Track:     track,
		CreatedAt: createdAt,
		RequestedBy: &model.User{
			ID:       func() string { if userID != nil { return *userID }; return "" }(),
			Nickname: userNick,
		},
	}, nil
}

// RemoveQueueItem remove um item da fila e renumera posições
func (r *Repository) RemoveQueueItem(ctx context.Context, roomID string, queueID string, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var ownerID *string
	err = tx.QueryRow(ctx, `SELECT user_id FROM queue_items WHERE id = $1 AND (room_id = $2 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $2))`, queueID, roomID).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("música não encontrada na fila")
		}
		return err
	}

	if ownerID == nil || *ownerID != userID {
		return errors.New("você só pode remover músicas solicitadas por você")
	}

	_, err = tx.Exec(ctx, `DELETE FROM queue_items WHERE id = $1`, queueID)
	if err != nil {
		return err
	}

	// Renumera
	rows, err := tx.Query(ctx, `SELECT id FROM queue_items WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) ORDER BY position ASC, created_at ASC`, roomID)
	if err != nil {
		return err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()

	for i, id := range ids {
		_, _ = tx.Exec(ctx, `UPDATE queue_items SET position = $1 WHERE id = $2`, i+1, id)
	}

	return tx.Commit(ctx)
}

// CountUserActiveTracks conta pedidos ativos do usuário
func (r *Repository) CountUserActiveTracks(ctx context.Context, roomID string, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(1) FROM queue_items WHERE (room_id = $1 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $1)) AND user_id = $2`, roomID, userID).Scan(&count)
	return count, err
}

// SwapQueueItem troca a faixa de um item da fila pertencente ao usuário mantendo a posição
func (r *Repository) SwapQueueItem(ctx context.Context, roomID string, queueID string, newTrack model.Track, userID string) (*model.QueueItem, error) {
	if newTrack.DurationSeconds > 600 || newTrack.DurationSeconds <= 0 {
		return nil, ErrMaxDuration
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var ownerID *string
	var pos int
	err = tx.QueryRow(ctx, `SELECT user_id, position FROM queue_items WHERE id = $1 AND (room_id = $2 OR room_id = (SELECT id FROM radio_rooms WHERE slug = $2))`, queueID, roomID).Scan(&ownerID, &pos)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("música não encontrada na fila")
		}
		return nil, err
	}

	if ownerID == nil || *ownerID != userID {
		return nil, errors.New("você só pode trocar músicas solicitadas por você")
	}

	titleNorm := sanitizer.Normalize(newTrack.Title)
	chanNorm := strings.ToLower(strings.TrimSpace(newTrack.ChannelTitle))

	query := `
		UPDATE queue_items
		SET youtube_id = $1, title = $2, normalized_title = $3,
		    channel = $4, normalized_channel = $5, duration_seconds = $6, cover_url = $7
		WHERE id = $8
		RETURNING created_at
	`
	var createdAt time.Time
	err = tx.QueryRow(ctx, query,
		newTrack.YouTubeID, newTrack.Title, titleNorm,
		newTrack.ChannelTitle, chanNorm, newTrack.DurationSeconds, newTrack.ThumbnailURL,
		queueID,
	).Scan(&createdAt)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &model.QueueItem{
		ID:        queueID,
		RoomID:    roomID,
		Position:  pos,
		Status:    "pending",
		Track:     newTrack,
		CreatedAt: createdAt,
		RequestedBy: &model.User{
			ID: userID,
		},
	}, nil
}


package blocked

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
)

// Repository gerencia a quarentena de músicas bloqueadas (erro 150/101/100/2)
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// BlockTrack registra uma faixa como bloqueada
func (r *Repository) BlockTrack(ctx context.Context, youtubeID, title, channel string, errorCode int, reason string) error {
	cleanID := strings.TrimSpace(youtubeID)
	if cleanID == "" {
		return fmt.Errorf("youtube_id não pode ser vazio")
	}

	query := `
		INSERT INTO blocked_tracks (youtube_id, title, channel, error_code, reason, blocked_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (youtube_id) DO UPDATE 
		SET error_code = EXCLUDED.error_code,
		    reason = EXCLUDED.reason,
		    blocked_at = EXCLUDED.blocked_at
	`
	_, err := r.pool.Exec(ctx, query, cleanID, strings.TrimSpace(title), strings.TrimSpace(channel), errorCode, strings.TrimSpace(reason), time.Now())
	if err != nil {
		return fmt.Errorf("erro ao bloquear música: %w", err)
	}
	return nil
}

// IsBlocked verifica se uma faixa está em quarentena
func (r *Repository) IsBlocked(ctx context.Context, youtubeID string) (bool, error) {
	cleanID := strings.TrimSpace(youtubeID)
	if cleanID == "" {
		return false, nil
	}

	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(1) FROM blocked_tracks WHERE youtube_id = $1`, cleanID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetBlockedTracks retorna todas as músicas bloqueadas
func (r *Repository) GetBlockedTracks(ctx context.Context, limit int) ([]model.BlockedTrack, error) {
	if limit <= 0 {
		limit = 100
	}

	query := `
		SELECT youtube_id, title, channel, error_code, reason, blocked_at
		FROM blocked_tracks
		ORDER BY blocked_at DESC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar faixas bloqueadas: %w", err)
	}
	defer rows.Close()

	var tracks []model.BlockedTrack
	for rows.Next() {
		var bt model.BlockedTrack
		if err := rows.Scan(&bt.YouTubeID, &bt.Title, &bt.Channel, &bt.ErrorCode, &bt.Reason, &bt.BlockedAt); err == nil {
			tracks = append(tracks, bt)
		}
	}
	return tracks, nil
}

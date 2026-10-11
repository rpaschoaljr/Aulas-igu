package favorite

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ToggleFavorite(ctx context.Context, userID string, track model.Track) (bool, error) {
	cleanUID := strings.TrimSpace(userID)
	cleanYTID := strings.TrimSpace(track.YouTubeID)
	if cleanUID == "" || cleanYTID == "" {
		return false, fmt.Errorf("user_id e youtube_id são obrigatórios")
	}

	var count int
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(1) FROM user_favorite_tracks WHERE user_id = $1 AND youtube_id = $2`, cleanUID, cleanYTID).Scan(&count)

	if count > 0 {
		_, err := r.pool.Exec(ctx, `DELETE FROM user_favorite_tracks WHERE user_id = $1 AND youtube_id = $2`, cleanUID, cleanYTID)
		return false, err
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_favorite_tracks (user_id, youtube_id, title, channel, duration_seconds, cover_url)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, cleanUID, cleanYTID, track.Title, track.ChannelTitle, track.DurationSeconds, track.ThumbnailURL)
	return true, err
}

func (r *Repository) GetUserFavorites(ctx context.Context, userID string) ([]model.FavoriteTrack, error) {
	cleanUID := strings.TrimSpace(userID)
	if cleanUID == "" {
		return []model.FavoriteTrack{}, nil
	}

	query := `
		SELECT id, user_id, youtube_id, title, channel, duration_seconds, cover_url, favorited_at
		FROM user_favorite_tracks
		WHERE user_id = $1
		ORDER BY favorited_at DESC
	`
	rows, err := r.pool.Query(ctx, query, cleanUID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar favoritos: %w", err)
	}
	defer rows.Close()

	var favs []model.FavoriteTrack
	for rows.Next() {
		var f model.FavoriteTrack
		if err := rows.Scan(&f.ID, &f.UserID, &f.YouTubeID, &f.Title, &f.Channel, &f.DurationSeconds, &f.CoverURL, &f.FavoritedAt); err == nil {
			favs = append(favs, f)
		}
	}
	return favs, nil
}

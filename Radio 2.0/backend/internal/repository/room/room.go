package room

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

func (r *Repository) GetAllRooms(ctx context.Context) ([]model.Room, error) {
	if r.pool == nil {
		return []model.Room{}, nil
	}
	query := `
		SELECT id, name, normalized_name, slug, COALESCE(description, ''), cover_url, is_live
		FROM radio_rooms
		WHERE is_live = true
		ORDER BY name ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar salas: %w", err)
	}
	defer rows.Close()

	var rooms []model.Room
	for rows.Next() {
		var rm model.Room
		if err := rows.Scan(&rm.ID, &rm.Name, &rm.NormalizedName, &rm.Slug, &rm.Description, &rm.CoverURL, &rm.IsActive); err == nil {
			rooms = append(rooms, rm)
		}
	}
	return rooms, nil
}

func (r *Repository) GetRoomBySlug(ctx context.Context, slug string) (*model.Room, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("db pool nil")
	}
	cleanSlug := strings.TrimSpace(slug)
	query := `
		SELECT id, name, normalized_name, slug, COALESCE(description, ''), cover_url, is_live
		FROM radio_rooms
		WHERE (slug = $1 OR id = $1 OR normalized_name = $1)
		LIMIT 1
	`
	var rm model.Room
	err := r.pool.QueryRow(ctx, query, cleanSlug).Scan(
		&rm.ID, &rm.Name, &rm.NormalizedName, &rm.Slug, &rm.Description, &rm.CoverURL, &rm.IsActive,
	)
	if err != nil {
		return nil, err
	}
	return &rm, nil
}

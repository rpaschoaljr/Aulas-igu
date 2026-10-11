package errorlog

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// SaveError persiste um log de erro ou telemetria em app_error_logs
func (r *Repository) SaveError(ctx context.Context, entry model.ErrorLog) error {
	if r.pool == nil {
		return fmt.Errorf("db pool não inicializado")
	}
	var payloadBytes []byte
	if entry.Payload != nil {
		payloadBytes, _ = json.Marshal(entry.Payload)
	}

	query := `
		INSERT INTO app_error_logs (
			source, error_type, message, stack_trace, user_id, room_id,
			endpoint, payload, user_agent, ip_address
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(
		ctx, query,
		entry.Source, entry.ErrorType, entry.Message, entry.StackTrace,
		entry.UserID, entry.RoomID, entry.Endpoint, payloadBytes,
		entry.UserAgent, entry.IPAddress,
	)
	return err
}

// GetRecentErrors retorna logs recentes para auditoria
func (r *Repository) GetRecentErrors(ctx context.Context, limit int, source string) ([]model.ErrorLog, error) {
	if r.pool == nil {
		return []model.ErrorLog{}, nil
	}
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, source, error_type, message, COALESCE(stack_trace, ''), user_id, room_id,
		       COALESCE(endpoint, ''), payload, COALESCE(user_agent, ''), COALESCE(ip_address, ''), created_at
		FROM app_error_logs
		WHERE ($1 = '' OR source = $1)
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, source, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar logs: %w", err)
	}
	defer rows.Close()

	var logs []model.ErrorLog
	for rows.Next() {
		var l model.ErrorLog
		var payloadBytes []byte
		err := rows.Scan(
			&l.ID, &l.Source, &l.ErrorType, &l.Message, &l.StackTrace,
			&l.UserID, &l.RoomID, &l.Endpoint, &payloadBytes,
			&l.UserAgent, &l.IPAddress, &l.CreatedAt,
		)
		if err == nil {
			if len(payloadBytes) > 0 {
				_ = json.Unmarshal(payloadBytes, &l.Payload)
			}
			logs = append(logs, l)
		}
	}
	return logs, nil
}

func (r *Repository) AutoMigrate(ctx context.Context) error {
	if r.pool == nil {
		return nil
	}
	query := `
		CREATE TABLE IF NOT EXISTS app_error_logs (
			id SERIAL PRIMARY KEY,
			source VARCHAR(20) NOT NULL,
			error_type VARCHAR(100) NOT NULL,
			message TEXT NOT NULL,
			stack_trace TEXT,
			user_id VARCHAR(100),
			room_id VARCHAR(100),
			endpoint VARCHAR(255),
			payload JSONB,
			user_agent TEXT,
			ip_address VARCHAR(45),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`
	_, err := r.pool.Exec(ctx, query)
	return err
}

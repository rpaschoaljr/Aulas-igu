package user

import (
	"context"
	"fmt"
	"strings"

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

func (r *Repository) UpsertUserByEmail(ctx context.Context, email, nickname, avatarURL string) (*model.User, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("db pool nil")
	}
	rawEmail := strings.TrimSpace(email)
	normEmail := strings.ToLower(rawEmail)
	if normEmail == "" {
		return nil, fmt.Errorf("email não pode ser vazio")
	}

	dispNick, normNick := sanitizer.ProcessPair(nickname)
	if dispNick == "" {
		dispNick = "Ouvinte Google"
		normNick = "ouvinte google"
	}

	cleanAvatar := strings.TrimSpace(avatarURL)
	if cleanAvatar == "" {
		cleanAvatar = "/assets/avatars/retro-1.png"
	}

	query := `
		INSERT INTO users (provider, email, normalized_email, nickname, normalized_nickname, avatar_url, role)
		VALUES ('google', $1, $2, $3, $4, $5, 'listener')
		ON CONFLICT (normalized_email) DO UPDATE 
		SET nickname = EXCLUDED.nickname,
		    normalized_nickname = EXCLUDED.normalized_nickname,
		    avatar_url = EXCLUDED.avatar_url,
		    last_login_at = NOW()
		RETURNING id, nickname, avatar_url
	`
	var u model.User
	err := r.pool.QueryRow(ctx, query, rawEmail, normEmail, dispNick, normNick, cleanAvatar).Scan(
		&u.ID, &u.Nickname, &u.AvatarURL,
	)
	if err != nil {
		// Se houver conflito de nickname com outro usuário existente, garante unicidade do apelido
		if strings.Contains(err.Error(), "uq_users_normalized_nickname") {
			parts := strings.Split(normEmail, "@")
			suffix := "g"
			if len(parts) > 0 && len(parts[0]) > 0 {
				suffix = parts[0]
			}
			uniqueNick := fmt.Sprintf("%s (%s)", dispNick, suffix)
			uniqueNorm := fmt.Sprintf("%s %s", normNick, suffix)
			err = r.pool.QueryRow(ctx, query, rawEmail, normEmail, uniqueNick, uniqueNorm, cleanAvatar).Scan(
				&u.ID, &u.Nickname, &u.AvatarURL,
			)
		}
	}

	if err != nil {
		return nil, fmt.Errorf("erro ao registrar usuário: %w", err)
	}
	return &u, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (*model.User, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("db pool nil")
	}
	var u model.User
	err := r.pool.QueryRow(ctx, `SELECT id, nickname, avatar_url FROM users WHERE id = $1`, id).Scan(
		&u.ID, &u.Nickname, &u.AvatarURL,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

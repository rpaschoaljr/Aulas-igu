package chat

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"radio20/backend/internal/sanitizer"
)

type MessageItem struct {
	ID                     string    `json:"id"`
	RoomID                 string    `json:"room_id"`
	UserID                 *string   `json:"user_id,omitempty"`
	UserNickname           string    `json:"user_nickname"`
	NormalizedUserNickname string    `json:"normalized_user_nickname"`
	UserAvatar             string    `json:"user_avatar"`
	MessageText            string    `json:"message_text"`
	CreatedAt              time.Time `json:"created_at"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// SaveMessage salva uma mensagem de chat com sanitização de apelido e texto
func (r *Repository) SaveMessage(ctx context.Context, roomID string, userID *string, rawNickname, avatarURL, text string) (*MessageItem, error) {
	dispNick, normNick := sanitizer.ProcessPair(rawNickname)
	dispText := sanitizer.CleanDisplay(text)

	if avatarURL == "" {
		avatarURL = "/assets/avatars/retro-1.png"
	}

	sql := `
		INSERT INTO chat_messages (
			room_id, user_id, user_nickname, normalized_user_nickname, user_avatar, message_text
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	if r.pool == nil {
		return nil, fmt.Errorf("banco de dados não inicializado")
	}

	var item MessageItem
	err := r.pool.QueryRow(ctx, sql, roomID, userID, dispNick, normNick, avatarURL, dispText).Scan(&item.ID, &item.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("erro ao salvar mensagem de chat: %w", err)
	}

	item.RoomID = roomID
	item.UserID = userID
	item.UserNickname = dispNick
	item.NormalizedUserNickname = normNick
	item.UserAvatar = avatarURL
	item.MessageText = dispText

	return &item, nil
}

// GetRecentMessages carrega histórico das últimas mensagens da sala
func (r *Repository) GetRecentMessages(ctx context.Context, roomID string, limit int) ([]MessageItem, error) {
	if limit <= 0 {
		limit = 50
	}

	sql := `
		SELECT id, room_id, user_id, user_nickname, normalized_user_nickname, user_avatar, message_text, created_at
		FROM chat_messages
		WHERE room_id = $1
		ORDER BY created_at ASC
		LIMIT $2
	`

	if r.pool == nil {
		return nil, fmt.Errorf("banco de dados não inicializado")
	}

	rows, err := r.pool.Query(ctx, sql, roomID, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar histórico de chat: %w", err)
	}
	defer rows.Close()

	var messages []MessageItem
	for rows.Next() {
		var m MessageItem
		var uid *string
		err := rows.Scan(
			&m.ID, &m.RoomID, &uid, &m.UserNickname,
			&m.NormalizedUserNickname, &m.UserAvatar, &m.MessageText, &m.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao ler mensagem de chat: %w", err)
		}
		m.UserID = uid
		messages = append(messages, m)
	}

	return messages, nil
}

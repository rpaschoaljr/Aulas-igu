package model

import (
	"time"
)

// User representa um ouvinte ou DJ do sistema
type User struct {
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

// Track representa os metadados canônicos de uma faixa de áudio
type Track struct {
	ID              string `json:"id"`
	YouTubeID       string `json:"youtube_id"`
	Title           string `json:"title"`
	NormalizedTitle string `json:"normalized_title"`
	ChannelTitle    string `json:"channel_title"`
	DurationSeconds int    `json:"duration_seconds"`
	ThumbnailURL    string `json:"thumbnail_url"`
	RawData         []byte `json:"raw_data,omitempty"`
	Source          string `json:"source,omitempty"`
}

// QueueItem representa uma faixa pendente ou em reprodução na fila
type QueueItem struct {
	ID          string    `json:"id"`
	RoomID      string    `json:"room_id"`
	Position    int       `json:"position"`
	Status      string    `json:"status"`
	RequestedBy *User     `json:"requested_by,omitempty"`
	Track       Track     `json:"track"`
	CreatedAt   time.Time `json:"created_at"`
}

// BlockedTrack representa uma música em quarentena com erro 150/101/100
type BlockedTrack struct {
	YouTubeID string    `json:"youtube_id"`
	Title     string    `json:"title"`
	Channel   string    `json:"channel"`
	ErrorCode int       `json:"error_code"`
	Reason    string    `json:"reason"`
	BlockedAt time.Time `json:"blocked_at"`
}

// Room representa uma sala de rádio
type Room struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	NormalizedName string `json:"normalized_name"`
	Slug           string `json:"slug"`
	Description    string `json:"description"`
	CoverURL       string `json:"cover_url"`
	IsActive       bool   `json:"is_active"`
}

// ErrorLog representa um registro de auditoria e telemetria
type ErrorLog struct {
	ID         string                 `json:"id"`
	Source     string                 `json:"source"`
	ErrorType  string                 `json:"error_type"`
	Message    string                 `json:"message"`
	StackTrace string                 `json:"stack_trace,omitempty"`
	UserID     *string                `json:"user_id,omitempty"`
	RoomID     *string                `json:"room_id,omitempty"`
	Endpoint   string                 `json:"endpoint,omitempty"`
	Payload    map[string]interface{} `json:"payload,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
	IPAddress  string                 `json:"ip_address,omitempty"`
	CreatedAt  time.Time              `json:"created_at"`
}

// FavoriteTrack representa uma música favoritada pelo ouvinte
type FavoriteTrack struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	YouTubeID       string    `json:"youtube_id"`
	Title           string    `json:"title"`
	Channel         string    `json:"channel"`
	DurationSeconds int       `json:"duration_seconds"`
	CoverURL        string    `json:"cover_url"`
	FavoritedAt     time.Time `json:"favorited_at"`
}

package session

import (
	"strings"
	"sync"
	"time"

	"radio20/backend/internal/sanitizer"
)

type GuestSession struct {
	UserID    string
	Nickname  string
	CreatedAt time.Time
}

// Manager gerencia apelidos efêmeros em memória RAM (sem gravação de convidados no banco).
type Manager struct {
	mu              sync.RWMutex
	activeNicknames map[string]GuestSession // normalized_nickname -> GuestSession
	clientNicknames map[any]string          // client handle -> normalized_nickname
}

func NewManager() *Manager {
	return &Manager{
		activeNicknames: make(map[string]GuestSession),
		clientNicknames: make(map[any]string),
	}
}

// AcquireNickname tenta reservar um apelido para o usuário se não estiver em uso ativo
func (sm *Manager) AcquireNickname(rawNickname, userID string) (display, normalized string, ok bool) {
	display, normalized = sanitizer.ProcessPair(rawNickname)
	if normalized == "" {
		return "", "", false
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	if existing, exists := sm.activeNicknames[normalized]; exists {
		if existing.UserID == userID {
			return display, normalized, true
		}
		return display, normalized, false
	}

	sm.activeNicknames[normalized] = GuestSession{
		UserID:    userID,
		Nickname:  display,
		CreatedAt: time.Now(),
	}

	return display, normalized, true
}

// ReleaseNickname libera o apelido para que qualquer ouvinte possa reutilizá-lo
func (sm *Manager) ReleaseNickname(normalized string) {
	norm := strings.ToLower(strings.TrimSpace(normalized))
	if norm == "" {
		return
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	delete(sm.activeNicknames, norm)
}

// IsNicknameActive verifica se o apelido está conectado e em uso no momento
func (sm *Manager) IsNicknameActive(rawNickname string) bool {
	_, normalized := sanitizer.ProcessPair(rawNickname)
	if normalized == "" {
		return false
	}

	sm.mu.RLock()
	defer sm.mu.RUnlock()

	_, exists := sm.activeNicknames[normalized]
	return exists
}

// RegisterConnection associa um cliente WebSocket conectado a um apelido normalizado
func (sm *Manager) RegisterConnection(client any, normalized string) {
	norm := strings.ToLower(strings.TrimSpace(normalized))
	if norm == "" || client == nil {
		return
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.clientNicknames[client] = norm
}

// UnregisterConnection remove a associação do cliente e libera o apelido
func (sm *Manager) UnregisterConnection(client any) {
	if client == nil {
		return
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	if norm, exists := sm.clientNicknames[client]; exists {
		delete(sm.clientNicknames, client)
		delete(sm.activeNicknames, norm)
	}
}

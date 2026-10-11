package radio

import (
	"context"
	"log"
	"math"
	"sync"
	"time"

	"radio20/backend/internal/hub"
	"radio20/backend/internal/model"
)

type EngineQueueRepo interface {
	GetNextInQueue(ctx context.Context, roomID string) (*model.Track, *string, error)
	GetHistoricalTrackForRoom(ctx context.Context, roomID string, excludeIDs ...string) (*model.Track, error)
	GetFallbackDJTrack(ctx context.Context, roomID string) (*model.Track, error)
	RecordHistory(ctx context.Context, roomID string, trackID string, wasSkipped bool) error
}

type RoomState struct {
	RoomID                        string      `json:"room_id"`
	CurrentTrack                  model.Track `json:"current_track"`
	CurrentTrackRequestedByUserID *string       `json:"current_track_requested_by_user_id,omitempty"`
	StartedAtUnixMilli            int64         `json:"started_at_unix_milli"`
	ServerTimestamp               int64         `json:"server_timestamp"`
	ElapsedSeconds                int           `json:"elapsed_seconds"`
	DurationSeconds               int           `json:"duration_seconds"`
	SkipVotesCount                int           `json:"skip_votes_count"`
	SkipVotesRequired             int           `json:"skip_votes_required"`
}

type Engine struct {
	hub       *hub.Hub
	repo      EngineQueueRepo
	roomsMu   sync.RWMutex
	states    map[string]*RoomState
	votes     map[string]map[string]bool // roomID -> userID -> bool
	stopChans map[string]chan struct{}
}

func NewEngine(h *hub.Hub, repo EngineQueueRepo) *Engine {
	return &Engine{
		hub:       h,
		repo:      repo,
		states:    make(map[string]*RoomState),
		votes:     make(map[string]map[string]bool),
		stopChans: make(map[string]chan struct{}),
	}
}

// InitRoom inicializa a execução ininterrupta da sala
func (e *Engine) InitRoom(ctx context.Context, roomID string) error {
	e.roomsMu.Lock()
	if _, exists := e.states[roomID]; exists {
		e.roomsMu.Unlock()
		return nil
	}
	e.votes[roomID] = make(map[string]bool)
	stopCh := make(chan struct{})
	e.stopChans[roomID] = stopCh
	e.roomsMu.Unlock()

	// Busca primeira faixa (fila ou fallback)
	track, trackUserID, err := e.fetchNextTrack(ctx, roomID)
	if err != nil {
		return err
	}

	now := time.Now().UnixMilli()
	state := &RoomState{
		RoomID:                        roomID,
		CurrentTrack:                  *track,
		CurrentTrackRequestedByUserID: trackUserID,
		StartedAtUnixMilli:            now,
		ServerTimestamp:               now,
		ElapsedSeconds:                0,
		DurationSeconds:               track.DurationSeconds,
		SkipVotesCount:                0,
		SkipVotesRequired:             1,
	}

	e.roomsMu.Lock()
	e.states[roomID] = state
	e.roomsMu.Unlock()

	go e.roomLoop(roomID, stopCh)
	return nil
}

func (e *Engine) roomLoop(roomID string, stopCh chan struct{}) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RECOVER] roomLoop panic for room %s: %v", roomID, r)
		}
	}()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-stopCh:
			return
		case <-ticker.C:
			e.tickRoom(roomID)
		}
	}
}

func (e *Engine) tickRoom(roomID string) {
	e.roomsMu.Lock()
	state, exists := e.states[roomID]
	if !exists {
		e.roomsMu.Unlock()
		return
	}

	now := time.Now().UnixMilli()
	elapsed := int((now - state.StartedAtUnixMilli) / 1000)
	state.ServerTimestamp = now
	state.ElapsedSeconds = elapsed

	listeners := e.hub.GetListenersCount(roomID)
	if listeners < 1 {
		listeners = 1
	}
	state.SkipVotesRequired = int(math.Ceil(float64(listeners) * 0.6))
	if state.SkipVotesRequired < 1 {
		state.SkipVotesRequired = 1
	}

	// Verifica se a música acabou
	if elapsed >= state.DurationSeconds {
		e.roomsMu.Unlock()
		e.advanceTrack(context.Background(), roomID, false)
		return
	}

	e.roomsMu.Unlock()
}

func (e *Engine) advanceTrack(ctx context.Context, roomID string, wasSkipped bool) {
	e.roomsMu.Lock()
	state := e.states[roomID]
	e.votes[roomID] = make(map[string]bool) // reseta votos
	e.roomsMu.Unlock()

	if state != nil && e.repo != nil {
		_ = e.repo.RecordHistory(ctx, roomID, state.CurrentTrack.ID, wasSkipped)
	}

	nextTrack, nextTrackUserID, err := e.fetchNextTrack(ctx, roomID)
	if err != nil {
		log.Printf("[RADIO] erro ao buscar proxima faixa para sala %s: %v", roomID, err)
		return
	}

	now := time.Now().UnixMilli()
	listeners := e.hub.GetListenersCount(roomID)
	if listeners < 1 {
		listeners = 1
	}
	reqVotes := int(math.Ceil(float64(listeners) * 0.6))
	if reqVotes < 1 {
		reqVotes = 1
	}

	newState := &RoomState{
		RoomID:                        roomID,
		CurrentTrack:                  *nextTrack,
		CurrentTrackRequestedByUserID: nextTrackUserID,
		StartedAtUnixMilli:            now,
		ServerTimestamp:               now,
		ElapsedSeconds:                0,
		DurationSeconds:               nextTrack.DurationSeconds,
		SkipVotesCount:                0,
		SkipVotesRequired:             reqVotes,
	}

	e.roomsMu.Lock()
	e.states[roomID] = newState
	e.roomsMu.Unlock()

	// Emite eventos via WebSocket: nova faixa, atualização da fila e atualização do histórico
	e.hub.BroadcastToRoom(roomID, hub.Message{
		Type:      "track_changed",
		RoomID:    roomID,
		Payload:   newState,
		Timestamp: now,
	})

	e.hub.BroadcastToRoom(roomID, hub.Message{
		Type:   "queue_updated",
		RoomID: roomID,
		Payload: map[string]interface{}{
			"action":  "advance",
			"trackId": nextTrack.ID,
		},
		Timestamp: now,
	})

	e.hub.BroadcastToRoom(roomID, hub.Message{
		Type:   "history_updated",
		RoomID: roomID,
		Payload: map[string]interface{}{
			"action":  "advance",
			"trackId": state.CurrentTrack.ID,
		},
		Timestamp: now,
	})
}

func (e *Engine) fetchNextTrack(ctx context.Context, roomID string) (*model.Track, *string, error) {
	if e.repo != nil {
		// 1. Prioridade máxima: Fila de pedidos ativos de ouvintes
		track, userID, err := e.repo.GetNextInQueue(ctx, roomID)
		if err == nil && track != nil {
			return track, userID, nil
		}

		// 2. Segunda prioridade: Acervo do histórico da sala (pedidos anteriores que os ouvintes curtiram e não pularam)
		var currentID string
		e.roomsMu.RLock()
		if state, ok := e.states[roomID]; ok && state != nil {
			currentID = state.CurrentTrack.YouTubeID
		}
		e.roomsMu.RUnlock()

		histTrack, err := e.repo.GetHistoricalTrackForRoom(ctx, roomID, currentID)
		if err == nil && histTrack != nil {
			return histTrack, nil, nil
		}

		// 3. Terceira prioridade: DJ Fallback temático da sala
		fallback, err := e.repo.GetFallbackDJTrack(ctx, roomID)
		if err == nil && fallback != nil {
			return fallback, nil, nil
		}
	}

	// 4. Fallback padrão de emergência para manter a rádio sempre viva no ar
	return &model.Track{
		YouTubeID:       "jfKfPfyJRdk",
		Title:           "Lofi Girl - Radio Live Stream",
		NormalizedTitle: "lofi girl - radio live stream",
		ChannelTitle:    "Lofi Girl",
		DurationSeconds: 300,
	}, nil, nil
}

// IsUserCurrentTrack verifica se a faixa no ar atualmente foi pedida pelo usuário
func (e *Engine) IsUserCurrentTrack(roomID, userID string) bool {
	if userID == "" {
		return false
	}
	e.roomsMu.RLock()
	defer e.roomsMu.RUnlock()
	state, ok := e.states[roomID]
	if !ok || state == nil {
		return false
	}
	return state.CurrentTrackRequestedByUserID != nil && *state.CurrentTrackRequestedByUserID == userID
}

func (e *Engine) RegisterSkipVote(roomID, userID string, listenersCount int) bool {
	e.roomsMu.Lock()
	defer e.roomsMu.Unlock()

	if _, exists := e.votes[roomID]; !exists {
		e.votes[roomID] = make(map[string]bool)
	}
	e.votes[roomID][userID] = true

	currentVotes := len(e.votes[roomID])
	required := int(math.Ceil(float64(listenersCount) * 0.6))
	if required < 1 {
		required = 1
	}

	if state, ok := e.states[roomID]; ok {
		state.SkipVotesCount = currentVotes
		state.SkipVotesRequired = required
	}

	return currentVotes >= required
}

func (e *Engine) SkipCurrentTrack(ctx context.Context, roomID string) {
	e.advanceTrack(ctx, roomID, true)
}

// VoteSkip computa voto de ouvinte, avança faixa se atingir quórum e notifica sala
func (e *Engine) VoteSkip(roomID, userID string) (int, int, bool) {
	listeners := 1
	if e.hub != nil {
		listeners = e.hub.GetListenersCount(roomID)
	}
	shouldSkip := e.RegisterSkipVote(roomID, userID, listeners)
	if shouldSkip {
		e.SkipCurrentTrack(context.Background(), roomID)
	}
	state := e.GetState(roomID)
	current := 0
	required := 1
	if state != nil {
		current = state.SkipVotesCount
		required = state.SkipVotesRequired
	}
	if e.hub != nil {
		e.hub.BroadcastToRoom(roomID, hub.Message{
			Type:      "vote_updated",
			RoomID:    roomID,
			Payload:   state,
			Timestamp: time.Now().UnixMilli(),
		})
	}
	return current, required, shouldSkip
}

// GetRoomState retorna o estado da sala para a interface StateReader
func (e *Engine) GetRoomState(roomID string) (any, bool) {
	st := e.GetState(roomID)
	return st, st != nil
}

// OnTrackEnded registra reporte de término vindo de cliente.
// O backend é a autoridade soberana sobre a duração e o término da música (tickRoom avança naturalmente quando elapsed >= DurationSeconds).
func (e *Engine) OnTrackEnded(ctx context.Context, roomID string, youtubeID string) {
	e.roomsMu.RLock()
	state, exists := e.states[roomID]
	e.roomsMu.RUnlock()

	if !exists || state == nil {
		return
	}

	if state.CurrentTrack.YouTubeID != youtubeID && state.CurrentTrack.ID != youtubeID {
		return
	}

	now := time.Now().UnixMilli()
	elapsed := int((now - state.StartedAtUnixMilli) / 1000)
	log.Printf("[RADIO] Reporte de track_ended recebido para %s na sala %s (elapsed %ds / dur %ds). Controle soberano do backend ativo.", youtubeID, roomID, elapsed, state.DurationSeconds)
}

// ReportTrackError registra reporte de erro de playback de clientes.
// O relógio do backend é soberano e NÃO interrompe a transmissão da sala por erros de clientes individuais.
func (e *Engine) ReportTrackError(ctx context.Context, roomID string, youtubeID string, errorCode int) {
	e.roomsMu.RLock()
	state, exists := e.states[roomID]
	e.roomsMu.RUnlock()

	if !exists || state == nil || state.CurrentTrack.YouTubeID != youtubeID {
		return
	}

	if errorCode == 150 || errorCode == 101 || errorCode == 100 || errorCode == 2 {
		log.Printf("[RADIO] Erro crítico %d recebido para a faixa %s na sala %s. Acionando Auto-Skip de Emergência!", errorCode, youtubeID, roomID)
		e.advanceTrack(ctx, roomID, true)
		return
	}

	log.Printf("[RADIO] Reporte de erro não-fatal recebido para a faixa %s (erro %d) na sala %s. O relógio soberano do backend mantém a transmissão ativa.", youtubeID, errorCode, roomID)
}

// UpdateCurrentTrackDuration atualiza a duração da faixa atual caso haja divergência reportada pelo player
func (e *Engine) UpdateCurrentTrackDuration(roomID string, youtubeID string, newDuration int) bool {
	e.roomsMu.Lock()
	defer e.roomsMu.Unlock()

	state, exists := e.states[roomID]
	if !exists || state == nil {
		return false
	}

	if state.CurrentTrack.YouTubeID != youtubeID && state.CurrentTrack.ID != youtubeID {
		return false
	}

	if newDuration <= 0 || state.DurationSeconds == newDuration {
		return false
	}

	state.DurationSeconds = newDuration
	state.CurrentTrack.DurationSeconds = newDuration

	log.Printf("[RADIO] Duração da faixa %s na sala %s sincronizada para %ds", youtubeID, roomID, newDuration)

	if e.hub != nil {
		e.hub.BroadcastToRoom(roomID, hub.Message{
			Type:   "track_duration_updated",
			RoomID: roomID,
			Payload: map[string]interface{}{
				"roomId":          roomID,
				"youtubeId":       youtubeID,
				"durationSeconds": newDuration,
			},
			Timestamp: time.Now().UnixMilli(),
		})
	}

	return true
}



func (e *Engine) GetState(roomID string) *RoomState {
	e.roomsMu.RLock()
	defer e.roomsMu.RUnlock()
	state, exists := e.states[roomID]
	if !exists {
		return nil
	}

	now := time.Now().UnixMilli()
	copied := *state
	copied.ServerTimestamp = now
	copied.ElapsedSeconds = int((now - state.StartedAtUnixMilli) / 1000)
	return &copied
}

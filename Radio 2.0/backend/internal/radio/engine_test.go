package radio_test

import (
	"context"
	"testing"
	"time"

	"radio20/backend/internal/hub"
	"radio20/backend/internal/model"
	"radio20/backend/internal/radio"
)

type mockQueueRepo struct {
	currentTrack    *model.Track
	historicalTrack *model.Track
	fallback        model.Track
	trackUserID     *string
	lastExcludedIDs []string
	recordedHistory []string
}

func (m *mockQueueRepo) GetNextInQueue(ctx context.Context, roomID string) (*model.Track, *string, error) {
	track := m.currentTrack
	m.currentTrack = nil
	return track, m.trackUserID, nil
}

func (m *mockQueueRepo) GetHistoricalTrackForRoom(ctx context.Context, roomID string, excludeIDs ...string) (*model.Track, error) {
	m.lastExcludedIDs = excludeIDs
	if m.historicalTrack != nil {
		for _, id := range excludeIDs {
			if id == m.historicalTrack.YouTubeID {
				return nil, nil // excluída para evitar repetição contínua
			}
		}
		return m.historicalTrack, nil
	}
	return nil, nil
}

func (m *mockQueueRepo) GetFallbackDJTrack(ctx context.Context, roomID string) (*model.Track, error) {
	return &m.fallback, nil
}

func (m *mockQueueRepo) RecordHistory(ctx context.Context, roomID string, trackID string, wasSkipped bool) error {
	m.recordedHistory = append(m.recordedHistory, trackID)
	return nil
}

func TestRadioEngineContinuousPlayback(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	fallbackTrack := model.Track{
		YouTubeID:       "dj_fallback_1",
		Title:           "Daft Punk - One More Time",
		DurationSeconds: 320,
	}

	repo := &mockQueueRepo{
		currentTrack: nil, // Fila vazia, deve acionar fallback do DJ
		fallback:     fallbackTrack,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-eletronica"

	// Inicializa a sala
	err := engine.InitRoom(context.Background(), roomID)
	if err != nil {
		t.Fatalf("failed to init room: %v", err)
	}

	state := engine.GetState(roomID)
	if state == nil {
		t.Fatalf("expected active state for room %s", roomID)
	}

	if state.CurrentTrack.YouTubeID != "dj_fallback_1" {
		t.Errorf("expected fallback track to play when queue is empty, got %s", state.CurrentTrack.YouTubeID)
	}

	if state.ServerTimestamp <= 0 {
		t.Errorf("expected valid server timestamp")
	}

	// Teste de Votação para Skip
	// Com 2 ouvintes, 60% = 2 votos
	canSkip := engine.RegisterSkipVote(roomID, "user_1", 2)
	if canSkip {
		t.Errorf("1 vote out of 2 should not trigger skip")
	}

	canSkip = engine.RegisterSkipVote(roomID, "user_2", 2)
	if !canSkip {
		t.Errorf("2 votes out of 2 should trigger skip")
	}

	// Teste de Resiliência: Erro crítico (150 - embedding bloqueado) aciona Auto-Skip de emergência
	nextFallback := model.Track{
		YouTubeID:       "dj_fallback_2",
		Title:           "Queen - Don't Stop Me Now",
		DurationSeconds: 210,
	}
	repo.fallback = nextFallback

	// Reporta erro crítico 150 da faixa atual
	engine.ReportTrackError(context.Background(), roomID, "dj_fallback_1", 150)

	// O motor aciona auto-skip de emergência e avança para dj_fallback_2 para a rádio não ficar muda
	newState := engine.GetState(roomID)
	if newState.CurrentTrack.YouTubeID != "dj_fallback_2" {
		t.Errorf("esperava auto-skip imediato para dj_fallback_2 em erro 150, obteve %s", newState.CurrentTrack.YouTubeID)
	}
}

func TestRadioEngineHistoryPriorityWhenQueueIsEmpty(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	historyTrack := model.Track{
		YouTubeID:       "listener_historical_1",
		Title:           "Arctic Monkeys - Do I Wanna Know",
		DurationSeconds: 270,
	}
	fallbackTrack := model.Track{
		YouTubeID:       "dj_fallback_generic",
		Title:           "DJ Fallback Generic",
		DurationSeconds: 180,
	}

	repo := &mockQueueRepo{
		currentTrack:    nil, // Fila vazia
		historicalTrack: &historyTrack,
		fallback:        fallbackTrack,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-indie"

	err := engine.InitRoom(context.Background(), roomID)
	if err != nil {
		t.Fatalf("failed to init room: %v", err)
	}

	state := engine.GetState(roomID)
	if state == nil {
		t.Fatalf("expected active state")
	}

	// Com fila vazia e histórico disponível, DEVE tocar a do histórico da sala
	if state.CurrentTrack.YouTubeID != "listener_historical_1" {
		t.Errorf("esperava tocar faixa do histórico listener_historical_1, obteve %s", state.CurrentTrack.YouTubeID)
	}
}

func TestRadioEngineQueuePriorityOverHistory(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	userRequestedTrack := model.Track{
		YouTubeID:       "user_requested_live",
		Title:           "The Strokes - Last Nite",
		DurationSeconds: 190,
	}
	historyTrack := model.Track{
		YouTubeID:       "historical_track_2",
		Title:           "Historical Track",
		DurationSeconds: 220,
	}
	fallbackTrack := model.Track{
		YouTubeID:       "dj_fallback",
		Title:           "DJ Fallback",
		DurationSeconds: 200,
	}

	repo := &mockQueueRepo{
		currentTrack:    &userRequestedTrack, // Usuário pediu
		historicalTrack: &historyTrack,
		fallback:        fallbackTrack,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-rock"

	err := engine.InitRoom(context.Background(), roomID)
	if err != nil {
		t.Fatalf("failed to init room: %v", err)
	}

	state := engine.GetState(roomID)
	if state == nil {
		t.Fatalf("expected active state")
	}

	// Fila tem prioridade máxima sobre o histórico
	if state.CurrentTrack.YouTubeID != "user_requested_live" {
		t.Errorf("esperava tocar faixa pedida pelo usuário user_requested_live, obteve %s", state.CurrentTrack.YouTubeID)
	}
}

func TestRadioEngineHistoryExcludesPlayingTrack(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	historyTrack := model.Track{
		YouTubeID:       "same_track_in_history",
		Title:           "Song Played Just Now",
		DurationSeconds: 200,
	}
	fallbackTrack := model.Track{
		YouTubeID:       "dj_fallback_relief",
		Title:           "DJ Fallback Relief",
		DurationSeconds: 180,
	}

	repo := &mockQueueRepo{
		currentTrack:    nil,
		historicalTrack: &historyTrack,
		fallback:        fallbackTrack,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-pop"

	_ = engine.InitRoom(context.Background(), roomID)

	state := engine.GetState(roomID)
	if state.CurrentTrack.YouTubeID != "same_track_in_history" {
		t.Fatalf("esperava tocar same_track_in_history, obteve %s", state.CurrentTrack.YouTubeID)
	}

	// Pula a faixa. O mockQueueRepo exclui a faixa tocada anteriormente.
	// Como a única faixa do histórico é a mesma, deve acionar o fallback para não repetir imediatamente.
	engine.SkipCurrentTrack(context.Background(), roomID)

	newState := engine.GetState(roomID)
	if newState.CurrentTrack.YouTubeID != "dj_fallback_relief" {
		t.Errorf("esperava avançar para dj_fallback_relief ao excluir repetição imediata, obteve %s", newState.CurrentTrack.YouTubeID)
	}
}

func TestEngineIsUserCurrentTrack(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	userID := "user-ana-123"
	trackUser := model.Track{
		YouTubeID:       "ana_fav_track",
		Title:           "Ana's Track",
		DurationSeconds: 200,
	}
	fallback := model.Track{
		YouTubeID:       "dj_next_track",
		Title:           "DJ Track",
		DurationSeconds: 180,
	}

	repo := &mockQueueRepo{
		currentTrack: &trackUser,
		trackUserID:  &userID,
		fallback:     fallback,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-quota-test"

	_ = engine.InitRoom(context.Background(), roomID)

	// A música da Ana foi para o ar
	if !engine.IsUserCurrentTrack(roomID, userID) {
		t.Fatalf("esperava que a música no ar pertencesse à Ana")
	}
	if engine.IsUserCurrentTrack(roomID, "other-user") {
		t.Fatalf("não deve pertencer a outro usuário")
	}

	// Quando a música é pulada ou termina, avança para a próxima
	engine.SkipCurrentTrack(context.Background(), roomID)

	// Agora a música no ar é do DJ (sem user ID)
	if engine.IsUserCurrentTrack(roomID, userID) {
		t.Fatalf("após avançar faixa, a música no ar não deve mais pertencer à Ana")
	}
}

func TestUpdateCurrentTrackDuration(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	fallback := model.Track{
		YouTubeID:       "metallica_one",
		Title:           "Metallica - One",
		DurationSeconds: 210, // Inicialmente 3:30 incorreto
	}

	repo := &mockQueueRepo{
		fallback: fallback,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-duration-test"

	_ = engine.InitRoom(context.Background(), roomID)

	state := engine.GetState(roomID)
	if state.DurationSeconds != 210 {
		t.Fatalf("esperava duração inicial de 210, obteve %d", state.DurationSeconds)
	}

	// 1. Atualização com ID incorreto deve falhar
	updated := engine.UpdateCurrentTrackDuration(roomID, "wrong_id", 446)
	if updated {
		t.Fatalf("não deveria atualizar com youtubeID incorreto")
	}

	// 2. Atualização com ID correto e duração real (ex: 446s para 7:26 de Metallica)
	updated = engine.UpdateCurrentTrackDuration(roomID, "metallica_one", 446)
	if !updated {
		t.Fatalf("deveria ter atualizado com sucesso")
	}

	newState := engine.GetState(roomID)
	if newState.DurationSeconds != 446 {
		t.Fatalf("esperava nova duração de 446s, obteve %d", newState.DurationSeconds)
	}
	if newState.CurrentTrack.DurationSeconds != 446 {
		t.Fatalf("esperava CurrentTrack.DurationSeconds de 446s, obteve %d", newState.CurrentTrack.DurationSeconds)
	}

	// 3. Atualização idêntica não deve disparar novamente
	updated = engine.UpdateCurrentTrackDuration(roomID, "metallica_one", 446)
	if updated {
		t.Fatalf("não deveria atualizar quando a duração já for idêntica")
	}
}

func TestQueueStrictPriorityOverHistory(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	userTrack := model.Track{
		YouTubeID:       "user_song_priority",
		Title:           "User Song",
		DurationSeconds: 200,
	}
	historyTrack := model.Track{
		YouTubeID:       "dj_history_song",
		Title:           "History Song",
		DurationSeconds: 180,
	}
	userID := "user_pedro"

	repo := &mockQueueRepo{
		currentTrack:    &userTrack,
		trackUserID:     &userID,
		historicalTrack: &historyTrack,
		fallback:        model.Track{YouTubeID: "fallback", DurationSeconds: 120},
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-priority-test"

	_ = engine.InitRoom(context.Background(), roomID)

	state := engine.GetState(roomID)
	// A faixa do usuário DEVE ter tocado primeiro
	if state.CurrentTrack.YouTubeID != "user_song_priority" {
		t.Fatalf("esperava que a música do usuário tivesse prioridade estrita, obteve %s", state.CurrentTrack.YouTubeID)
	}

	// Quando a faixa do usuário termina/avança, agora que a fila está vazia, o histórico do DJ entra
	engine.SkipCurrentTrack(context.Background(), roomID)

	newState := engine.GetState(roomID)
	if newState.CurrentTrack.YouTubeID != "dj_history_song" {
		t.Fatalf("com fila vazia, esperava que o histórico do DJ assumisse, obteve %s", newState.CurrentTrack.YouTubeID)
	}
}

func TestEngineBackendSovereignClockControlsTrackEnd(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	track1 := model.Track{
		YouTubeID:       "song_playing",
		Title:           "Song Playing",
		DurationSeconds: 1,
	}
	track2 := model.Track{
		YouTubeID:       "song_next_up",
		Title:           "Next Up",
		DurationSeconds: 150,
	}

	repo := &mockQueueRepo{
		currentTrack: &track1,
		fallback:     track2,
	}

	engine := radio.NewEngine(h, repo)
	roomID := "room-sovereign-clock-test"

	_ = engine.InitRoom(context.Background(), roomID)

	// Simula evento track_ended prematuro do player de um cliente
	engine.OnTrackEnded(context.Background(), roomID, "song_playing")

	// A faixa NÃO deve ser avançada por reporte do cliente
	stateBeforeEnd := engine.GetState(roomID)
	if stateBeforeEnd.CurrentTrack.YouTubeID != "song_playing" {
		t.Fatalf("esperava que a faixa não fosse pulada por reporte prematuro do cliente, obteve %s", stateBeforeEnd.CurrentTrack.YouTubeID)
	}

	// Aguarda o ticker soberano de 1s do backend avançar naturalmente a faixa
	time.Sleep(1200 * time.Millisecond)

	// Agora sim o backend soberano avançou naturalmente para a próxima faixa
	newState := engine.GetState(roomID)
	if newState.CurrentTrack.YouTubeID != "song_next_up" {
		t.Fatalf("esperava que o ticker soberano do backend avançasse para song_next_up, obteve %s", newState.CurrentTrack.YouTubeID)
	}
}






package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/database"
	"radio20/backend/internal/hub"
	"radio20/backend/internal/radio"

	"radio20/backend/internal/repository/blocked"
	chatRepoPkg "radio20/backend/internal/repository/chat"
	errorlogRepoPkg "radio20/backend/internal/repository/errorlog"
	favRepoPkg "radio20/backend/internal/repository/favorite"
	historyRepoPkg "radio20/backend/internal/repository/history"
	queueDJRepo "radio20/backend/internal/repository/queue/dj"
	queueItemRepo "radio20/backend/internal/repository/queue/item"
	queueTransitionRepo "radio20/backend/internal/repository/queue/transition"
	roomRepoPkg "radio20/backend/internal/repository/room"
	trackRepoPkg "radio20/backend/internal/repository/track"
	userRepoPkg "radio20/backend/internal/repository/user"
	youtubeClientPkg "radio20/backend/internal/youtube/client"

	authGoogleH "radio20/backend/internal/handler/auth/google"
	authGuestH "radio20/backend/internal/handler/auth/guest"
	errorlogH "radio20/backend/internal/handler/errorlog"
	favoriteH "radio20/backend/internal/handler/favorite"
	queueAddH "radio20/backend/internal/handler/queue/add"
	queueManageH "radio20/backend/internal/handler/queue/manage"
	queueQueryH "radio20/backend/internal/handler/queue/query"
	queueQuotaH "radio20/backend/internal/handler/queue/quota"
	radioHistoryH "radio20/backend/internal/handler/radio/history"
	radioRoomH "radio20/backend/internal/handler/radio/room"
	radioVoteH "radio20/backend/internal/handler/radio/vote"
	searchH "radio20/backend/internal/handler/search"
	wsH "radio20/backend/internal/handler/ws"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	log.Println("Iniciando Rádio 2.0 Backend...")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/radio20?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "radio20-super-secret-jwt-key-change-in-prod"
	}

	// 1. Conexão com o banco de dados PostgreSQL
	db, err := database.NewDatabase(dbURL)
	if err != nil {
		log.Fatalf("Falha crítica ao conectar no PostgreSQL: %v", err)
	}
	defer db.Close()
	log.Println("Conexão com PostgreSQL estabelecida com sucesso.")

	// 2. Serviços de Autenticação e Repositórios Modulares
	jwtService := auth.NewJWTService(jwtSecret, 4*time.Hour)
	userRepo := userRepoPkg.NewRepository(db.Pool)
	roomRepo := roomRepoPkg.NewRepository(db.Pool)
	trackRepo := trackRepoPkg.NewRepository(db.Pool)
	transitionRepo := queueTransitionRepo.NewRepository(db.Pool)
	chatRepo := chatRepoPkg.NewRepository(db.Pool)

	blockedRepo := blocked.NewRepository(db.Pool)
	itemRepo := queueItemRepo.NewRepository(db.Pool)
	djRepo := queueDJRepo.NewRepository(db.Pool)
	historyRepo := historyRepoPkg.NewRepository(db.Pool)
	errorlogRepo := errorlogRepoPkg.NewRepository(db.Pool)
	favRepo := favRepoPkg.NewRepository(db.Pool)

	if err := errorlogRepo.AutoMigrate(context.Background()); err != nil {
		log.Printf("[MIGRATION WARNING] Falha na auto-migração de app_error_logs: %v", err)
	}

	// 3. YouTube Service (Database-First com Fallback)
	youtubeService := youtubeClientPkg.NewService(trackRepo, nil)

	// 4. WebSocket Hub e Motor da Rádio
	wsHub := hub.NewHub()
	wsHub.OnChatMessage = func(roomID, userID string, payload interface{}) {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[RECOVER] chat save panic: %v", r)
				}
			}()
			m, ok := payload.(map[string]interface{})
			if !ok {
				return
			}
			nick, _ := m["userNickname"].(string)
			avatar, _ := m["userAvatar"].(string)
			text, _ := m["text"].(string)
			if nick == "" {
				nick = "Ouvinte"
			}
			if text == "" {
				return
			}
			var uid *string
			if userID != "" && userID != "anonymous" {
				uid = &userID
			}
			_, _ = chatRepo.SaveMessage(context.Background(), roomID, uid, nick, avatar, text)
		}()
	}
	go wsHub.Run()

	radioEngine := radio.NewEngine(wsHub, transitionRepo)

	// Callbacks em Tempo Real do WebSocket
	wsHub.OnTrackPlaybackError = func(roomID, youtubeID string, errorCode int) {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[RECOVER] track error recovery panic: %v", r)
				}
			}()
			// Auto-quarentena no banco para erros críticos do player (150, 101, 100, 2)
			if errorCode == 150 || errorCode == 101 || errorCode == 100 || errorCode == 2 {
				_ = blockedRepo.BlockTrack(context.Background(), youtubeID, "", "", errorCode, fmt.Sprintf("Erro crítico %d do YouTube Player", errorCode))
			}
			radioEngine.ReportTrackError(context.Background(), roomID, youtubeID, errorCode)
		}()
	}

	wsHub.OnTrackDurationSync = func(roomID, youtubeID string, durationSeconds int) {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[RECOVER] track duration sync panic: %v", r)
				}
			}()
			radioEngine.UpdateCurrentTrackDuration(roomID, youtubeID, durationSeconds)
			_ = trackRepo.UpdateTrackDuration(context.Background(), youtubeID, durationSeconds)
		}()
	}

	wsHub.OnTrackEnded = func(roomID, youtubeID string) {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[RECOVER] track ended panic: %v", r)
				}
			}()
			radioEngine.OnTrackEnded(context.Background(), roomID, youtubeID)
		}()
	}

	// Inicializa salas padrão
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	rooms, err := roomRepo.GetAllRooms(ctx)
	cancel()
	if err == nil {
		for _, room := range rooms {
			_ = radioEngine.InitRoom(context.Background(), room.ID)
			// Garante que o DJ adicione uma faixa na fila se estiver vazia
			_, _ = djRepo.EnsureDJTrackInQueue(context.Background(), room.ID)
			log.Printf("Sala de rádio inicializada: %s (%s)", room.Name, room.Slug)
		}
	}

	// Rotina em segundo plano para curar faixas com duração padrão (210s) no acervo
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[RECOVER] catalog duration updater panic: %v", r)
			}
		}()
		time.Sleep(3 * time.Second)
		defaultTrackIDs, err := trackRepo.GetTracksWithDefaultDuration(context.Background(), 200)
		if err != nil || len(defaultTrackIDs) == 0 {
			return
		}
		log.Printf("[CATALOG] Encontradas %d faixas com duração padrão para atualização...", len(defaultTrackIDs))
		durationsMap, err := youtubeService.FetchVideoDurations(context.Background(), defaultTrackIDs)
		if err != nil {
			log.Printf("[CATALOG] Falha ao consultar durações na API: %v", err)
			return
		}
		updatedCount := 0
		for ytID, realDur := range durationsMap {
			if realDur > 0 {
				if err := trackRepo.UpdateTrackDuration(context.Background(), ytID, realDur); err == nil {
					updatedCount++
				}
			}
		}
		log.Printf("[CATALOG] Catálogo curado: %d/%d faixas atualizadas com duração real!", updatedCount, len(defaultTrackIDs))
	}()

	// 5. Instanciação dos Handlers Modulares (Padrão 2 Arquivos)
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	guestHandler := authGuestH.NewHandler(wsHub.GetSessionManager(), jwtService)
	googleHandler := authGoogleH.NewHandler(userRepo, jwtService, googleClientID)
	searchHandler := searchH.NewHandler(youtubeService, blockedRepo)
	queueAddHandler := queueAddH.NewHandler(itemRepo, jwtService, wsHub, roomRepo)
	queueQueryHandler := queueQueryH.NewHandler(itemRepo, djRepo)
	queueManageHandler := queueManageH.NewHandler(itemRepo, jwtService, wsHub, roomRepo)
	queueQuotaHandler := queueQuotaH.NewHandler(itemRepo, radioEngine, jwtService)
	roomHandler := radioRoomH.NewHandler(roomRepo, radioEngine)
	voteHandler := radioVoteH.NewHandler(radioEngine, jwtService)
	historyHandler := radioHistoryH.NewHandler(historyRepo)
	favoriteHandler := favoriteH.NewHandler(favRepo, jwtService)
	errorlogHandler := errorlogH.NewHandler(errorlogRepo, jwtService)
	wsHandler := wsH.NewHandler(wsHub, roomRepo, jwtService)

	mux := http.NewServeMux()

	// Rota de Healthcheck
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","timestamp":` + time.Now().Format(time.RFC3339) + `}`))
	})

	// Rotas de Autenticação
	mux.HandleFunc("/api/auth/guest", guestHandler.HandleGuestLogin)
	mux.HandleFunc("/api/auth/check-nickname", guestHandler.HandleCheckNickname)
	mux.HandleFunc("/api/auth/google", googleHandler.HandleLogin)
	mux.HandleFunc("/api/auth/google/client-id", googleHandler.HandleConfig)
	mux.HandleFunc("/api/auth/google/config", googleHandler.HandleConfig)

	// Rotas do YouTube (com filtro de 600s e quarentena de vídeos com erro)
	mux.HandleFunc("/api/youtube/search", searchHandler.HandleSearch)

	// Rotas da Rádio
	mux.HandleFunc("/api/radio/rooms", roomHandler.HandleRooms)
	mux.HandleFunc("/api/radio/status", func(w http.ResponseWriter, r *http.Request) {
		roomSlug := r.URL.Query().Get("room")
		if roomSlug == "" {
			roomSlug = "radio-six-nine"
		}
		rm, err := roomRepo.GetRoomBySlug(r.Context(), roomSlug)
		if err != nil || rm == nil {
			http.Error(w, "sala não encontrada", http.StatusNotFound)
			return
		}
		st := radioEngine.GetState(rm.ID)
		if st == nil {
			_ = radioEngine.InitRoom(r.Context(), rm.ID)
			st = radioEngine.GetState(rm.ID)
		}
		listeners := wsHub.GetListenersCount(rm.ID)
		resp := map[string]interface{}{
			"room":       rm,
			"state":      st,
			"listeners":  listeners,
			"server_now": time.Now().UnixMilli(),
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})
	mux.HandleFunc("/api/radio/queue", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			queueAddHandler.HandleAdd(w, r)
		case http.MethodDelete:
			queueManageHandler.HandleRemove(w, r)
		case http.MethodPut:
			queueManageHandler.HandleSwap(w, r)
		default:
			queueQueryHandler.HandleGetQueue(w, r)
		}
	})
	mux.HandleFunc("/api/radio/queue/batch", queueAddHandler.HandleBatch)
	mux.HandleFunc("/api/radio/queue/remove", queueManageHandler.HandleRemove)
	mux.HandleFunc("/api/radio/queue/swap", queueManageHandler.HandleSwap)
	mux.HandleFunc("/api/radio/user-quota", queueQuotaHandler.HandleGetUserQuota)
	mux.HandleFunc("/api/radio/history", historyHandler.HandleHistory)
	mux.HandleFunc("/api/radio/user-favorites", favoriteHandler.HandleGetFavorites)
	mux.HandleFunc("/api/radio/favorites/toggle", favoriteHandler.HandleToggle)
	mux.HandleFunc("/api/radio/vote-skip", voteHandler.HandleVoteSkip)

	// Rotas de Auditoria e Logs de Erro (Telemetria Front & Back)
	mux.HandleFunc("/api/errors/log", errorlogHandler.HandleLogError)
	mux.HandleFunc("/api/errors/logs", errorlogHandler.HandleGetErrors)

	// Rota do WebSocket
	mux.HandleFunc("/ws", wsHandler.HandleWS)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      corsMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Inicia servidor em goroutine
	go func() {
		log.Printf("Servidor Rádio 2.0 ouvindo na porta :%s\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Erro no servidor HTTP: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Encerrando servidor Rádio 2.0 com segurança...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Falha no encerramento gracioso: %v", err)
	}

	log.Println("Servidor finalizado com sucesso.")
}

package errorlog

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type ErrorLogger interface {
	SaveError(ctx context.Context, entry model.ErrorLog) error
	GetRecentErrors(ctx context.Context, limit int, source string) ([]model.ErrorLog, error)
}

type Handler struct {
	repo       ErrorLogger
	jwtService *auth.JWTService
}

func NewHandler(repo ErrorLogger, jwtService *auth.JWTService) *Handler {
	return &Handler{
		repo:       repo,
		jwtService: jwtService,
	}
}

type ClientErrorRequest struct {
	ErrorType  string                 `json:"error_type"`
	Message    string                 `json:"message"`
	StackTrace string                 `json:"stack_trace"`
	RoomID     string                 `json:"room_id"`
	Endpoint   string                 `json:"endpoint"`
	Payload    map[string]interface{} `json:"payload"`
}

func (h *Handler) HandleLogError(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	var req ClientErrorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		http.Error(w, "mensagem de erro obrigatória", http.StatusBadRequest)
		return
	}

	var userID *string
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := h.jwtService.ValidateToken(tokenStr); err == nil && claims != nil {
			userID = &claims.UserID
		}
	}

	var roomID *string
	if req.RoomID != "" {
		roomID = &req.RoomID
	}

	entry := model.ErrorLog{
		Source:     "frontend",
		ErrorType:  req.ErrorType,
		Message:    req.Message,
		StackTrace: req.StackTrace,
		UserID:     userID,
		RoomID:     roomID,
		Endpoint:   req.Endpoint,
		Payload:    req.Payload,
		UserAgent:  r.UserAgent(),
		IPAddress:  r.RemoteAddr,
	}

	_ = h.repo.SaveError(r.Context(), entry)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "recorded"})
}

func (h *Handler) HandleGetErrors(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}
	source := r.URL.Query().Get("source")

	logs, err := h.repo.GetRecentErrors(r.Context(), limit, source)
	if err != nil {
		logs = []model.ErrorLog{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(logs)
}

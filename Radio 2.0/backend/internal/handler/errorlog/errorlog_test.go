package errorlog

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"radio20/backend/internal/auth"
	"radio20/backend/internal/model"
)

type mockErrorLogger struct {
	savedCount int
}

func (m *mockErrorLogger) SaveError(ctx context.Context, entry model.ErrorLog) error {
	m.savedCount++
	return nil
}

func (m *mockErrorLogger) GetRecentErrors(ctx context.Context, limit int, source string) ([]model.ErrorLog, error) {
	return []model.ErrorLog{}, nil
}

func TestErrorLogHandler(t *testing.T) {
	jwtSvc := auth.NewJWTService("secret-test-key-32-chars-length!!", time.Hour)
	mock := &mockErrorLogger{}
	h := NewHandler(mock, jwtSvc)

	// 1. Rejeita GET em log
	req := httptest.NewRequest(http.MethodGet, "/api/errors/log", nil)
	rr := httptest.NewRecorder()
	h.HandleLogError(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rr.Code)
	}

	// 2. Rejeita mensagem vazia
	req = httptest.NewRequest(http.MethodPost, "/api/errors/log", bytes.NewBufferString(`{"message":""}`))
	rr = httptest.NewRecorder()
	h.HandleLogError(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}

	// 3. Salva erro com sucesso 201
	req = httptest.NewRequest(http.MethodPost, "/api/errors/log", bytes.NewBufferString(`{"message":"Erro teste", "error_type":"TypeError"}`))
	rr = httptest.NewRecorder()
	h.HandleLogError(rr, req)
	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rr.Code)
	}
	if mock.savedCount != 1 {
		t.Errorf("expected 1 saved error, got %d", mock.savedCount)
	}
}

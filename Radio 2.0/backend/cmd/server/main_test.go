package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCorsMiddleware(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	wrapped := corsMiddleware(handler)

	// Test OPTIONS preflight
	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	rr := httptest.NewRecorder()
	wrapped.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("esperava 200 para OPTIONS preflight, obteve: %d", rr.Code)
	}

	if origin := rr.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
		t.Fatalf("esperava Access-Control-Allow-Origin '*', obteve: %s", origin)
	}
}

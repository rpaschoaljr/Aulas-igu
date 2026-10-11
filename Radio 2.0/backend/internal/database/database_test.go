package database

import (
	"testing"
)

func TestNewDatabase_InvalidConn(t *testing.T) {
	_, err := NewDatabase("postgres://user:wrongpassword@127.0.0.1:9999/nonexistent?sslmode=disable")
	if err == nil {
		t.Fatalf("esperava erro ao tentar conectar com credenciais/porta inválidas")
	}
}

func TestDatabase_CloseNil(t *testing.T) {
	db := &Database{Pool: nil}
	// Deve executar sem pânico
	db.Close()
}

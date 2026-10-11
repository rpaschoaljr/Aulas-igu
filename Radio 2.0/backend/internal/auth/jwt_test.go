package auth_test

import (
	"testing"
	"time"

	"radio20/backend/internal/auth"
)

func TestJWTTokenGenerationAndValidation(t *testing.T) {
	secret := "test-secret-key-1234567890123456"
	jwtService := auth.NewJWTService(secret, 4*time.Hour)

	userClaims := auth.UserClaims{
		UserID:    "user_123",
		Nickname:  "DJ Paschoal",
		IsGuest:   false,
		AvatarURL: "/assets/avatars/retro-1.png",
		Role:      "dj",
	}

	tokenStr, err := jwtService.GenerateToken(userClaims)
	if err != nil {
		t.Fatalf("expected nil error on token generation, got %v", err)
	}
	if tokenStr == "" {
		t.Fatalf("expected non-empty token string")
	}

	claims, err := jwtService.ValidateToken(tokenStr)
	if err != nil {
		t.Fatalf("expected valid token, got error: %v", err)
	}

	if claims.UserID != userClaims.UserID {
		t.Errorf("expected UserID %q, got %q", userClaims.UserID, claims.UserID)
	}
	if claims.Nickname != userClaims.Nickname {
		t.Errorf("expected Nickname %q, got %q", userClaims.Nickname, claims.Nickname)
	}
	if claims.Role != userClaims.Role {
		t.Errorf("expected Role %q, got %q", userClaims.Role, claims.Role)
	}
	if claims.IsGuest != false {
		t.Errorf("expected IsGuest false, got true")
	}
}

func TestJWTTokenInvalidSignature(t *testing.T) {
	jwtService1 := auth.NewJWTService("secret-1", time.Hour)
	jwtService2 := auth.NewJWTService("secret-2", time.Hour)

	tokenStr, _ := jwtService1.GenerateToken(auth.UserClaims{
		UserID:   "user_1",
		Nickname: "User",
	})

	_, err := jwtService2.ValidateToken(tokenStr)
	if err == nil {
		t.Fatalf("expected error validating token with wrong secret, got nil")
	}
}

func TestJWTTokenExpired(t *testing.T) {
	jwtService := auth.NewJWTService("secret", -time.Minute) // already expired
	tokenStr, err := jwtService.GenerateToken(auth.UserClaims{
		UserID:   "user_1",
		Nickname: "User",
	})
	if err != nil {
		t.Fatalf("unexpected error generating token: %v", err)
	}

	_, err = jwtService.ValidateToken(tokenStr)
	if err == nil {
		t.Fatalf("expected error validating expired token, got nil")
	}
}

package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("token inválido ou expirado")
	ErrTokenExpired = errors.New("token expirado")
)

type UserClaims struct {
	UserID    string `json:"user_id"`
	Nickname  string `json:"nickname"`
	IsGuest   bool   `json:"is_guest"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

type JWTService struct {
	secretKey     []byte
	tokenDuration time.Duration
}

func NewJWTService(secretKey string, tokenDuration time.Duration) *JWTService {
	return &JWTService{
		secretKey:     []byte(secretKey),
		tokenDuration: tokenDuration,
	}
}

// GenerateToken cria um novo JWT assinado com HMAC-SHA256
func (s *JWTService) GenerateToken(user UserClaims) (string, error) {
	now := time.Now()
	claims := UserClaims{
		UserID:    user.UserID,
		Nickname:  user.Nickname,
		IsGuest:   user.IsGuest,
		AvatarURL: user.AvatarURL,
		Role:      user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.UserID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.tokenDuration)),
			Issuer:    "radio20-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.secretKey)
	if err != nil {
		return "", fmt.Errorf("falha ao assinar token: %w", err)
	}

	return signedToken, nil
}

// ValidateToken valida o token e retorna os dados do usuário contidos nas claims
func (s *JWTService) ValidateToken(tokenString string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("algoritmo de assinatura inesperado: %v", token.Header["alg"])
		}
		return s.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

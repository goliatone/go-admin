package admin

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// PreviewToken carries metadata for content preview.
type PreviewToken struct {
	ContentID  string `json:"content_id"`
	EntityType string `json:"entity_type"`
	Expiry     int64  `json:"expiry"`
}

// PreviewService manages generation and validation of preview tokens.
type PreviewService struct {
	secret []byte
}

// NewPreviewService creates a new preview service.
func NewPreviewService(secret string) *PreviewService {
	return &PreviewService{
		secret: []byte(secret),
	}
}

// Generate creates a signed preview token for a record.
func (s *PreviewService) Generate(entityType, contentID string, duration time.Duration) (string, error) {
	token := PreviewToken{
		ContentID:  contentID,
		EntityType: entityType,
		Expiry:     time.Now().Add(duration).Unix(),
	}

	payload, err := json.Marshal(token)
	if err != nil {
		return "", err
	}

	payloadEncoded := base64.URLEncoding.EncodeToString(payload)
	signature := s.sign(payloadEncoded)

	return fmt.Sprintf("%s.%s", payloadEncoded, signature), nil
}

// GenerateJWT creates a JWT-formatted preview token.
func (s *PreviewService) GenerateJWT(entityType, contentID string, duration time.Duration) (string, error) {
	claims := map[string]any{
		"content_id":  contentID,
		"entity_type": entityType,
		"exp":         time.Now().Add(duration).Unix(),
	}
	header := map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	}

	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	headerEncoded := base64.RawURLEncoding.EncodeToString(headerBytes)
	payloadEncoded := base64.RawURLEncoding.EncodeToString(payloadBytes)
	unsigned := headerEncoded + "." + payloadEncoded
	signature := s.signJWT(unsigned)

	return unsigned + "." + signature, nil
}

// Validate parses and verifies a preview token.
func (s *PreviewService) Validate(tokenString string) (*PreviewToken, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) == 3 {
		return s.validateJWT(parts)
	}
	if len(parts) != 2 {
		return nil, errors.New("invalid token format")
	}

	payloadEncoded := parts[0]
	signature := parts[1]

	if s.sign(payloadEncoded) != signature {
		return nil, errors.New("invalid signature")
	}

	payload, err := base64.URLEncoding.DecodeString(payloadEncoded)
	if err != nil {
		return nil, err
	}

	var token PreviewToken
	if err := json.Unmarshal(payload, &token); err != nil {
		return nil, err
	}

	if time.Now().Unix() > token.Expiry {
		return nil, errors.New("token expired")
	}

	return &token, nil
}

func (s *PreviewService) validateJWT(parts []string) (*PreviewToken, error) {
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}
	unsigned := parts[0] + "." + parts[1]
	if s.signJWT(unsigned) != parts[2] {
		return nil, errors.New("invalid signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}

	var claims struct {
		ContentID  string `json:"content_id"`
		EntityType string `json:"entity_type"`
		Expiry     int64  `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, err
	}
	if time.Now().Unix() > claims.Expiry {
		return nil, errors.New("token expired")
	}
	return &PreviewToken{
		ContentID:  claims.ContentID,
		EntityType: claims.EntityType,
		Expiry:     claims.Expiry,
	}, nil
}

func (s *PreviewService) sign(payload string) string {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(payload))
	return base64.URLEncoding.EncodeToString(h.Sum(nil))
}

func (s *PreviewService) signJWT(payload string) string {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

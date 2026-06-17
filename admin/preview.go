package admin

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"slices"
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

// ContentPreviewPathOptions controls how preview URLs are inferred from content
// records when no explicit path or preview_url is present.
type ContentPreviewPathOptions struct {
	// AllowSlugFallback permits deriving a public preview path from record.slug.
	// Callers should only enable this for routed/deliverable content types.
	AllowSlugFallback bool
}

// ResolveContentPreviewPath resolves the public preview path for a content record.
// It only uses explicit path/preview_url values. Use
// ResolveContentPreviewPathWithOptions with AllowSlugFallback for routed content
// types that intentionally derive public paths from slug.
func ResolveContentPreviewPath(record map[string]any) string {
	return ResolveContentPreviewPathWithOptions(record, ContentPreviewPathOptions{})
}

// ResolveContentPreviewPathWithOptions resolves the public preview path for a
// content record with caller-controlled fallback behavior.
func ResolveContentPreviewPathWithOptions(record map[string]any, opts ContentPreviewPathOptions) string {
	if record == nil {
		return ""
	}
	for _, key := range []string{"path", "preview_url"} {
		if resolved := normalizePreviewPath(anyToString(record[key])); resolved != "" {
			return resolved
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		for _, key := range []string{"path", "preview_url"} {
			if resolved := normalizePreviewPath(anyToString(data[key])); resolved != "" {
				return resolved
			}
		}
	}
	if !opts.AllowSlugFallback {
		return ""
	}
	slug := strings.TrimSpace(anyToString(record["slug"]))
	if slug == "" {
		return ""
	}
	return normalizePreviewPath(slug)
}

func normalizePreviewPath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if isAbsoluteHTTPPreviewURL(trimmed) {
		return trimmed
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return trimmed
}

func isAbsoluteHTTPPreviewURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return parsed.Host != ""
	default:
		return false
	}
}

func normalizePreviewURLAllowedHosts(hosts []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(hosts))
	for _, host := range hosts {
		normalized := normalizePreviewURLAllowedHost(host)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	return out
}

func normalizePreviewURLAllowedHost(raw string) string {
	host := strings.TrimSpace(raw)
	if host == "" {
		return ""
	}
	if parsed, err := url.Parse(host); err == nil && parsed.Host != "" {
		host = parsed.Host
	}
	host = strings.TrimSpace(strings.TrimSuffix(host, "/"))
	if host == "" || strings.ContainsAny(host, "/?#") {
		return ""
	}
	return strings.ToLower(host)
}

func previewURLHostAllowed(host string, allowedHosts []string) bool {
	host = normalizePreviewURLAllowedHost(host)
	if host == "" {
		return false
	}
	return slices.Contains(normalizePreviewURLAllowedHosts(allowedHosts), host)
}

// BuildSitePreviewURL adds or replaces preview_token on a public preview path.
// Absolute HTTP(S) preview URLs require BuildSitePreviewURLWithAllowedHosts.
func BuildSitePreviewURL(targetPath, token string) string {
	return BuildSitePreviewURLWithAllowedHosts(targetPath, token, nil)
}

// BuildSitePreviewURLWithAllowedHosts adds or replaces preview_token on a
// preview path. Relative paths are always allowed; absolute HTTP(S) URLs are
// allowed only when their host is present in allowedHosts.
func BuildSitePreviewURLWithAllowedHosts(targetPath, token string, allowedHosts []string) string {
	path := strings.TrimSpace(targetPath)
	token = strings.TrimSpace(token)
	if path == "" || token == "" {
		return ""
	}
	parsed, err := url.Parse(path)
	if err != nil {
		return ""
	}
	if parsed.Scheme != "" || parsed.Host != "" {
		if parsed.Host == "" || !isAbsoluteHTTPPreviewURL(path) {
			return ""
		}
		if !previewURLHostAllowed(parsed.Host, allowedHosts) {
			return ""
		}
	}
	query := parsed.Query()
	query.Set("preview_token", token)
	parsed.RawQuery = query.Encode()
	return parsed.String()
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
		return nil, validationDomainError("invalid token format", map[string]any{"component": "preview_token"})
	}

	payloadEncoded := parts[0]
	signature := parts[1]

	if s.sign(payloadEncoded) != signature {
		return nil, validationDomainError("invalid signature", map[string]any{"component": "preview_token"})
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
		return nil, validationDomainError("token expired", map[string]any{"component": "preview_token"})
	}

	return &token, nil
}

func (s *PreviewService) validateJWT(parts []string) (*PreviewToken, error) {
	if len(parts) != 3 {
		return nil, validationDomainError("invalid token format", map[string]any{"component": "preview_token"})
	}
	unsigned := parts[0] + "." + parts[1]
	if s.signJWT(unsigned) != parts[2] {
		return nil, validationDomainError("invalid signature", map[string]any{"component": "preview_token"})
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
		return nil, validationDomainError("token expired", map[string]any{"component": "preview_token"})
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

package admin

import (
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"

	"github.com/goliatone/go-masker"
)

const (
	debugMaskTypeSecret = "filled32"
	debugMaskTypeToken  = "preserveEnds(4,4)"
	debugMaskTypeAny    = "filled"
)

var (
	debugMaskerOnce sync.Once
	debugMaskerRef  *masker.Masker
)

var debugMaskFields = map[string]string{
	"apikey":        "preserveEnds(2,2)",
	"bearer":        debugMaskTypeToken,
	"client_secret": debugMaskTypeSecret,
	"cookie":        debugMaskTypeSecret,
	"csrf":          debugMaskTypeToken,
	"jwt":           debugMaskTypeToken,
	"secret":        debugMaskTypeSecret,
	"session":       debugMaskTypeToken,
	"set-cookie":    debugMaskTypeSecret,
}

func debugMasker(cfg DebugConfig) *masker.Masker {
	debugMaskerOnce.Do(func() {
		debugMaskerRef = masker.Default
		registerDebugMaskFields(debugMaskerRef, debugMaskFields)
		registerDebugMaskConfig(debugMaskerRef, cfg)
	})
	return debugMaskerRef
}

func registerDebugMaskConfig(m *masker.Masker, cfg DebugConfig) {
	if m == nil || len(cfg.MaskFieldTypes) == 0 {
		return
	}
	fields := map[string]string{}
	for field, maskType := range cfg.MaskFieldTypes {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		maskType = strings.TrimSpace(maskType)
		if maskType == "" {
			maskType = debugMaskTypeAny
		}
		fields[field] = maskType
	}
	registerDebugMaskFields(m, fields)
}

func registerDebugMaskFields(m *masker.Masker, fields map[string]string) {
	if m == nil || len(fields) == 0 {
		return
	}
	for field, maskType := range fields {
		registerDebugMaskField(m, field, maskType)
	}
}

func registerDebugMaskField(m *masker.Masker, field, maskType string) {
	field = strings.TrimSpace(field)
	maskType = strings.TrimSpace(maskType)
	if field == "" || maskType == "" {
		return
	}
	m.RegisterMaskField(field, maskType)
	lower := strings.ToLower(field)
	if lower != field {
		m.RegisterMaskField(lower, maskType)
	}
	canonical := http.CanonicalHeaderKey(field)
	if canonical != field && canonical != lower {
		m.RegisterMaskField(canonical, maskType)
	}
}

func debugMaskValue(cfg DebugConfig, value any) any {
	if value == nil {
		return value
	}
	masked, err := debugMasker(cfg).Mask(value)
	if err != nil {
		return value
	}
	return masked
}

func debugMaskMap(cfg DebugConfig, data map[string]any) map[string]any {
	if len(data) == 0 {
		return map[string]any{}
	}
	masked := debugMaskValue(cfg, data)
	if typed, ok := masked.(map[string]any); ok {
		return typed
	}
	return data
}

func debugMaskStringMap(cfg DebugConfig, data map[string]string) map[string]string {
	if len(data) == 0 {
		return map[string]string{}
	}
	masked := debugMaskValue(cfg, data)
	if typed, ok := masked.(map[string]string); ok {
		return typed
	}
	return data
}

func debugMaskSlice(cfg DebugConfig, data []any) []any {
	if len(data) == 0 {
		return []any{}
	}
	masked := debugMaskValue(cfg, data)
	if typed, ok := masked.([]any); ok {
		return typed
	}
	return data
}

func debugMaskFieldValue(cfg DebugConfig, key string, value any) any {
	parts := splitKeyPath(key)
	if len(parts) == 0 {
		return debugMaskValue(cfg, value)
	}
	field := parts[len(parts)-1]
	value = debugMaskValue(cfg, value)
	masked, err := debugMasker(cfg).Mask(map[string]any{field: value})
	if err != nil {
		return value
	}
	if typed, ok := masked.(map[string]any); ok {
		if out, ok := typed[field]; ok {
			return out
		}
	}
	return value
}

func debugMaskBodyString(cfg DebugConfig, contentType string, body string) string {
	if strings.TrimSpace(body) == "" {
		return body
	}
	if !debugIsJSONContentType(contentType) {
		return body
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return body
	}
	masked := debugMaskMap(cfg, payload)
	out, err := json.Marshal(masked)
	if err != nil {
		return body
	}
	return string(out)
}

// debugMaskInlineString masks sensitive values embedded in freeform strings
// such as error messages, stack traces, and URLs. It applies two passes:
// 1. Mask URL query parameters whose names match known sensitive fields.
// 2. Mask inline Bearer/JWT tokens that appear in the text.
func debugMaskInlineString(cfg DebugConfig, s string) string {
	if strings.TrimSpace(s) == "" {
		return s
	}
	s = debugMaskQueryParams(cfg, s)
	s = debugMaskInlineTokens(cfg, s)
	return s
}

// debugInlineURLPattern matches http(s) URLs with query strings in freeform text.
var debugInlineURLPattern = regexp.MustCompile(`https?://[^\s"'<>]+\?[^\s"'<>]+`)

// debugMaskQueryParams finds inline URLs and masks query parameter values
// whose names match the known sensitive field set (debugMaskFields + cfg.MaskFieldTypes).
func debugMaskQueryParams(cfg DebugConfig, s string) string {
	return debugInlineURLPattern.ReplaceAllStringFunc(s, func(rawURL string) string {
		u, err := url.Parse(rawURL)
		if err != nil || u.RawQuery == "" {
			return rawURL
		}
		q := u.Query()
		changed := false
		for key, values := range q {
			maskType, ok := debugMaskTypeForField(cfg, key)
			if !ok {
				continue
			}
			maskedValues := make([]string, len(values))
			for i, value := range values {
				maskedValues[i] = debugMaskStringWithType(cfg, maskType, value)
			}
			q[key] = maskedValues
			changed = true
		}
		if !changed {
			return rawURL
		}
		u.RawQuery = q.Encode()
		return u.String()
	})
}

// debugInlineTokenPattern matches Bearer tokens and JWTs embedded in text.
var debugInlineTokenPattern = regexp.MustCompile(`(?i)\b(bearer\s+)([A-Za-z0-9\-._~+/]+=*\b)`)

// debugJWTPattern matches standalone JWT-like tokens (three dot-separated base64 segments).
var debugJWTPattern = regexp.MustCompile(`\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}[A-Za-z0-9_=-]*\b`)

func debugMaskInlineTokens(cfg DebugConfig, s string) string {
	s = debugInlineTokenPattern.ReplaceAllStringFunc(s, func(match string) string {
		idx := strings.IndexByte(match, ' ')
		if idx < 0 {
			return match
		}
		prefix := match[:idx+1]
		token := strings.TrimSpace(match[idx+1:])
		return prefix + debugMaskStringWithType(cfg, debugMaskTypeToken, token)
	})
	s = debugJWTPattern.ReplaceAllStringFunc(s, func(match string) string {
		return debugMaskStringWithType(cfg, debugMaskTypeToken, match)
	})
	return s
}

func debugMaskStringWithType(cfg DebugConfig, maskType, value string) string {
	maskType = strings.TrimSpace(maskType)
	if maskType == "" {
		maskType = debugMaskTypeAny
	}
	masked, err := debugMasker(cfg).String(maskType, value)
	if err != nil {
		return value
	}
	return masked
}

func debugIsSensitiveField(cfg DebugConfig, field string) bool {
	_, ok := debugMaskTypeForField(cfg, field)
	return ok
}

func debugMaskTypeForField(cfg DebugConfig, field string) (string, bool) {
	field = strings.TrimSpace(field)
	if field == "" {
		return "", false
	}
	lower := strings.ToLower(field)
	if maskType, ok := debugMaskFields[lower]; ok {
		return maskType, true
	}
	if maskType, ok := cfg.MaskFieldTypes[field]; ok {
		return normalizeMaskType(maskType), true
	}
	if maskType, ok := cfg.MaskFieldTypes[lower]; ok {
		return normalizeMaskType(maskType), true
	}
	canonical := http.CanonicalHeaderKey(field)
	if maskType, ok := cfg.MaskFieldTypes[canonical]; ok {
		return normalizeMaskType(maskType), true
	}
	if maskType, ok := cfg.MaskFieldTypes[strings.ToLower(canonical)]; ok {
		return normalizeMaskType(maskType), true
	}
	for key, maskType := range debugMaskFields {
		if strings.Contains(lower, key) {
			return maskType, true
		}
	}
	return "", false
}

func normalizeMaskType(maskType string) string {
	maskType = strings.TrimSpace(maskType)
	if maskType == "" {
		return debugMaskTypeAny
	}
	return maskType
}

func debugIsJSONContentType(contentType string) bool {
	contentType = debugNormalizeContentType(contentType)
	if contentType == "" {
		return false
	}
	if contentType == "application/json" || contentType == "text/json" {
		return true
	}
	return strings.HasSuffix(contentType, "+json")
}

func normalizeHeaderMap(headers map[string]string) map[string]string {
	if len(headers) == 0 {
		return nil
	}
	normalized := make(map[string]string, len(headers))
	for key, value := range headers {
		trimmed := strings.TrimSpace(key)
		if trimmed == "" {
			continue
		}
		normalized[http.CanonicalHeaderKey(trimmed)] = value
	}
	if len(normalized) == 0 {
		return nil
	}
	return normalized
}

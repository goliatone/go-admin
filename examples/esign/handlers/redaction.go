package handlers

import (
	"fmt"
	"strings"
	"sync"

	"github.com/goliatone/go-masker"
)

const redactionPlaceholder = "[redacted]"

const (
	redactionMaskTypeSecret = "filled32"
	redactionMaskTypeToken  = "preserveEnds(4,4)"
	redactionMaskTypeAny    = "filled"
)

var (
	sensitiveFieldMatchers = []string{
		"token",
		"upload_token",
		"authorization",
		"cookie",
		"email",
		"name",
		"signature",
		"object_key",
		"signed_url",
		"sha256",
		"digest",
		"payload",
		"ssn",
		"phone",
		"address",
	}
	redactionMaskFields = map[string]string{
		"token":         redactionMaskTypeToken,
		"upload_token":  redactionMaskTypeToken,
		"authorization": redactionMaskTypeToken,
		"cookie":        redactionMaskTypeSecret,
		"set-cookie":    redactionMaskTypeSecret,
		"email":         redactionMaskTypeToken,
		"name":          redactionMaskTypeToken,
		"signature":     redactionMaskTypeSecret,
		"object_key":    redactionMaskTypeSecret,
		"signed_url":    redactionMaskTypeSecret,
		"sha256":        redactionMaskTypeSecret,
		"digest":        redactionMaskTypeSecret,
		"payload":       redactionMaskTypeSecret,
		"ssn":           redactionMaskTypeSecret,
		"phone":         redactionMaskTypeToken,
		"address":       redactionMaskTypeSecret,
	}
	redactionMaskerOnce sync.Once
	redactionMaskerRef  *masker.Masker
)

func redactionMasker() *masker.Masker {
	redactionMaskerOnce.Do(func() {
		redactionMaskerRef = masker.Default
		for field, maskType := range redactionMaskFields {
			registerRedactionMaskField(redactionMaskerRef, field, maskType)
		}
	})
	return redactionMaskerRef
}

func registerRedactionMaskField(m *masker.Masker, field, maskType string) {
	if m == nil {
		return
	}
	field = strings.TrimSpace(field)
	maskType = strings.TrimSpace(maskType)
	if field == "" {
		return
	}
	if maskType == "" {
		maskType = redactionMaskTypeAny
	}
	m.RegisterMaskField(field, maskType)
	lower := strings.ToLower(field)
	if lower != field {
		m.RegisterMaskField(lower, maskType)
	}
}

// RedactSecurityFields redacts known sensitive values from structured log payloads.
func RedactSecurityFields(fields map[string]any) map[string]any {
	if len(fields) == 0 {
		return map[string]any{}
	}
	source := fields
	if masked, err := redactionMasker().Mask(fields); err == nil {
		if typed, ok := masked.(map[string]any); ok {
			source = typed
		}
	}
	out := make(map[string]any, len(source))
	for key, value := range source {
		out[key] = redactFieldValue(key, value)
	}
	return out
}

func redactFieldValue(field string, value any) any {
	normalized := strings.ToLower(strings.TrimSpace(field))
	if isSensitiveField(normalized) {
		return redactionPlaceholder
	}

	switch typed := value.(type) {
	case map[string]any:
		return RedactSecurityFields(typed)
	case map[string]string:
		mapped := make(map[string]any, len(typed))
		for key, val := range typed {
			mapped[key] = val
		}
		return RedactSecurityFields(mapped)
	case []any:
		result := make([]any, len(typed))
		for i, item := range typed {
			result[i] = redactFieldValue(field, item)
		}
		return result
	case []string:
		result := make([]any, len(typed))
		for i, item := range typed {
			result[i] = redactFieldValue(field, item)
		}
		return result
	case string:
		if looksSensitiveValue(normalized, typed) {
			return redactionPlaceholder
		}
		return typed
	default:
		if looksSensitiveValue(normalized, fmt.Sprintf("%v", typed)) {
			return redactionPlaceholder
		}
		return typed
	}
}

func isSensitiveField(field string) bool {
	if field == "" {
		return false
	}
	for _, candidate := range sensitiveFieldMatchers {
		if strings.Contains(field, candidate) {
			return true
		}
	}
	return false
}

func looksSensitiveValue(field, value string) bool {
	if isSensitiveField(field) {
		return true
	}
	lower := strings.ToLower(strings.TrimSpace(value))
	if strings.HasPrefix(lower, "bearer ") {
		return true
	}
	if strings.Count(value, ".") == 2 && len(value) > 24 {
		return true
	}
	return false
}

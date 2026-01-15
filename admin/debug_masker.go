package admin

import (
	"net/http"
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

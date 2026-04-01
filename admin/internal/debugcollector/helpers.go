package debugcollector

import (
	"maps"
	"strings"
)

func SetNestedValue(dest map[string]any, key string, value any) {
	parts := SplitKeyPath(key)
	if len(parts) == 0 {
		return
	}
	current := dest
	for i := 0; i < len(parts)-1; i++ {
		part := parts[i]
		next, ok := current[part]
		if !ok {
			child := map[string]any{}
			current[part] = child
			current = child
			continue
		}
		child, ok := next.(map[string]any)
		if !ok {
			child = map[string]any{}
			current[part] = child
		}
		current = child
	}
	current[parts[len(parts)-1]] = value
}

func GetNestedValue(src map[string]any, key string) (any, bool) {
	if len(src) == 0 {
		return nil, false
	}
	parts := SplitKeyPath(key)
	if len(parts) == 0 {
		return nil, false
	}
	current := src
	for i := 0; i < len(parts)-1; i++ {
		part := parts[i]
		next, ok := current[part]
		if !ok {
			return nil, false
		}
		child, ok := next.(map[string]any)
		if !ok {
			return nil, false
		}
		current = child
	}
	val, ok := current[parts[len(parts)-1]]
	return val, ok
}

func SplitKeyPath(key string) []string {
	raw := strings.FieldsFunc(key, func(r rune) bool {
		return r == '.' || r == '/' || r == ':'
	})
	parts := make([]string, 0, len(raw))
	for _, part := range raw {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	if len(parts) == 0 {
		return nil
	}
	return parts
}

func ClonePanelPayload(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			out[key] = ClonePanelPayload(item)
		}
		return out
	case map[string]string:
		out := make(map[string]string, len(typed))
		maps.Copy(out, typed)
		return out
	case []any:
		out := make([]any, len(typed))
		for i := range typed {
			out[i] = ClonePanelPayload(typed[i])
		}
		return out
	case []string:
		out := make([]string, len(typed))
		copy(out, typed)
		return out
	default:
		return value
	}
}

func FieldsToMap(fields []any, toString func(any) string) map[string]any {
	if len(fields) == 0 {
		return nil
	}
	out := map[string]any{}
	for i := 0; i < len(fields); i += 2 {
		key := toString(fields[i])
		if key == "" {
			continue
		}
		if i+1 < len(fields) {
			out[key] = fields[i+1]
		} else {
			out[key] = true
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func FilterBySession[T any](entries []T, sessionID string, sessionIDFor func(T) string) []T {
	if sessionID == "" || len(entries) == 0 || sessionIDFor == nil {
		return nil
	}
	out := make([]T, 0, len(entries))
	for _, entry := range entries {
		if sessionIDFor(entry) == sessionID {
			out = append(out, entry)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

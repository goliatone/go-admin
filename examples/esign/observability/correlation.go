package observability

import (
	"strings"

	"github.com/google/uuid"
)

// ResolveCorrelationID returns the first non-empty candidate or generates a new ID.
func ResolveCorrelationID(candidates ...string) string {
	for _, candidate := range candidates {
		if value := sanitizeCorrelationID(candidate); value != "" {
			return value
		}
	}
	return "corr_" + strings.ReplaceAll(uuid.NewString(), "-", "")
}

func sanitizeCorrelationID(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	builder := strings.Builder{}
	builder.Grow(len(value))
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			continue
		}
		switch r {
		case '-', '_', '.', ':':
			builder.WriteRune(r)
		}
	}
	return strings.TrimSpace(builder.String())
}

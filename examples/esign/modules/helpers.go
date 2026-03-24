package modules

import (
	"strings"

	"github.com/goliatone/go-admin/internal/pathutil"
)

func normalizeBasePath(value string) string {
	return pathutil.NormalizeBasePath(value)
}

func firstNonEmptyValue(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

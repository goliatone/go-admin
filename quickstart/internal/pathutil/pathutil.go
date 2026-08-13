package pathutil

import (
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
)

// NormalizeAbsolutePath trims the outer path boundary and ensures absolute
// form while preserving internal slashes, dot segments, and an explicit root.
func NormalizeAbsolutePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if value == "/" {
		return "/"
	}
	return routing.JoinAbsolutePath("", value)
}

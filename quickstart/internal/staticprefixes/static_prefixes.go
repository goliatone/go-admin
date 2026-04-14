package staticprefixes

import (
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	dashboardcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

// Input describes the mounted static prefixes that must stay aligned across
// host routing, ownership manifests, and public-site fallback reservations.
type Input struct {
	AssetsPrefix  string
	FormgenPrefix string
	RuntimePrefix string
	EChartsPrefix string
}

// DefaultInput derives the quickstart static mount prefixes from admin config.
func DefaultInput(cfg admin.Config) Input {
	return Input{
		AssetsPrefix:  path.Join(cfg.BasePath, "assets"),
		FormgenPrefix: path.Join(cfg.BasePath, "formgen"),
		RuntimePrefix: path.Join(cfg.BasePath, "runtime"),
		EChartsPrefix: strings.TrimSuffix(dashboardcmp.DefaultEChartsAssetsPath, "/"),
	}
}

// Resolve returns the concrete static mount prefixes in registration order.
func Resolve(input Input) []string {
	prefixes := []string{
		input.AssetsPrefix,
		input.RuntimePrefix,
		input.FormgenPrefix,
		input.EChartsPrefix,
	}
	if NeedsRuntimeRootAlias(input.RuntimePrefix) {
		prefixes = append(prefixes, "/runtime")
	}
	return uniquePrefixes(prefixes)
}

// NeedsRuntimeRootAlias reports whether go-formgen needs the legacy /runtime
// alias in addition to the configured admin-scoped runtime prefix.
func NeedsRuntimeRootAlias(prefix string) bool {
	trimmed := strings.TrimSpace(prefix)
	if trimmed == "" {
		return false
	}
	trimmed = strings.TrimSuffix(trimmed, "/")
	trimmed = strings.TrimPrefix(trimmed, "/")
	return trimmed != "runtime"
}

func uniquePrefixes(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := normalizePrefix(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizePrefix(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if trimmed == "/" {
		return "/"
	}
	cleaned := path.Clean("/" + strings.TrimPrefix(trimmed, "/"))
	if cleaned == "." {
		return ""
	}
	return cleaned
}

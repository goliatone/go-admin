package stores

import (
	"fmt"
	"strings"
)

func cloneRecord(record map[string]any) map[string]any {
	if record == nil {
		return map[string]any{}
	}
	out := make(map[string]any, len(record))
	for k, v := range record {
		out[k] = v
	}
	return out
}

func normalizeIDSet(ids []string) map[string]struct{} {
	if len(ids) == 0 {
		return nil
	}
	set := map[string]struct{}{}
	for _, id := range ids {
		if trimmed := stringID(id); trimmed != "" {
			set[trimmed] = struct{}{}
		}
	}
	return set
}

func idMatches(set map[string]struct{}, id string) bool {
	id = strings.TrimSpace(id)
	if id == "" {
		return false
	}
	if len(set) == 0 {
		return true
	}
	_, ok := set[id]
	return ok
}

func stringID(val any) string {
	return strings.TrimSpace(fmt.Sprint(val))
}

func cloneAnyMap(src map[string]any) map[string]any {
	if len(src) == 0 {
		return nil
	}
	dst := make(map[string]any, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

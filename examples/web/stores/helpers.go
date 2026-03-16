package stores

import (
	"fmt"
	"maps"
	"strings"
)

func cloneRecord(record map[string]any) map[string]any {
	if record == nil {
		return map[string]any{}
	}
	out := make(map[string]any, len(record))
	maps.Copy(out, record)
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

func isTranslationNotFoundErr(err error) bool {
	// return admin.IsTranslationMissing(err)
	return false
}

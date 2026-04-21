package quickstart

import "github.com/goliatone/go-admin/internal/primitives"

var (
	firstNonEmpty  = primitives.FirstNonEmpty
	cloneAnyMap    = primitives.CloneAnyMapNilOnEmpty
	cloneStringMap = primitives.CloneStringMapNilOnEmpty
	intPtr         = primitives.Int
)

func deepCloneAnyMap(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = deepCloneAnyValue(value)
	}
	return out
}

func deepCloneAnyValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return deepCloneAnyMap(typed)
	case []any:
		out := make([]any, len(typed))
		for i := range typed {
			out[i] = deepCloneAnyValue(typed[i])
		}
		return out
	default:
		return value
	}
}

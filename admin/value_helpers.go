package admin

import "github.com/goliatone/go-admin/internal/primitives"

var (
	cloneAnyMap    = primitives.CloneAnyMapNilOnEmpty
	cloneStringMap = primitives.CloneStringMapNilOnEmpty
)

func anyToString(value any) string {
	return toString(value)
}

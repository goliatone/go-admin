package admin

import "github.com/goliatone/go-admin/internal/primitives"

var (
	firstNonEmpty       = primitives.FirstNonEmpty
	firstNonEmptyString = primitives.FirstNonEmpty
	toString            = primitives.StringFromAny
	cloneAnyMap         = primitives.CloneAnyMapNilOnEmpty
	cloneStringMap      = primitives.CloneStringMapNilOnEmpty
)

func toStringSlice(value any) []string {
	return primitives.NormalizeUniqueStringSlice(primitives.StringSliceFromAny(value))
}

func anyToString(value any) string {
	return toString(value)
}

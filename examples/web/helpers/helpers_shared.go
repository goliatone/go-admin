package helpers

import "github.com/goliatone/go-admin/internal/primitives"

var (
	firstNonEmpty  = primitives.FirstNonEmpty
	cloneAnyMap    = primitives.CloneAnyMapNilOnEmpty
	cloneStringMap = primitives.CloneStringMapNilOnEmpty
)

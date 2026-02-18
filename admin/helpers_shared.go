package admin

import "github.com/goliatone/go-admin/internal/primitives"

var (
	firstNonEmpty  = primitives.FirstNonEmptyRaw
	cloneAnyMap    = primitives.CloneAnyMap
	cloneStringMap = primitives.CloneStringMapNilOnEmpty
	intPtr         = primitives.Int
)

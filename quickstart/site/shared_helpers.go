package site

import "github.com/goliatone/go-admin/internal/primitives"

var (
	firstNonEmpty           = primitives.FirstNonEmpty
	primitivesFirstNonEmpty = primitives.FirstNonEmpty
	cloneAnyMap             = primitives.CloneAnyMapEmptyOnEmpty
	cloneStringMap          = primitives.CloneStringMapNilOnEmpty
)

package main

import "github.com/goliatone/go-admin/internal/primitives"

var firstNonEmpty = primitives.FirstNonEmpty

func toString(value any) string {
	return primitives.StringFromAny(value)
}

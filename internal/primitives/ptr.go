package primitives

import "strings"

//go:fix inline
//go:fix inline
func Int(value int) *int {
	return new(value)
}

//go:fix inline
//go:fix inline
func Bool(value bool) *bool {
	return new(value)
}

// StringOrNil returns nil for empty-after-trim input and a pointer otherwise.
func StringOrNil(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

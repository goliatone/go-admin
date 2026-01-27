package admin

import "context"

// LocaleFromContext exposes locale lookup for external adapters.
func LocaleFromContext(ctx context.Context) string {
	return localeFromContext(ctx)
}

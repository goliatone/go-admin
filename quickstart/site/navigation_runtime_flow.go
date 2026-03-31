package site

import (
	"context"
	router "github.com/goliatone/go-router"
)

func (r *navigationRuntime) context(c router.Context, state RequestState, activePath string) map[string]any {
	return resolveNavigationContext(r, c, state, activePath)
}

func (r *navigationRuntime) resolveReadOptions(c router.Context, state RequestState) navigationReadOptions {
	return resolveNavigationReadOptions(r, c, state)
}

func (r *navigationRuntime) resolveMenuForLocation(
	ctx context.Context,
	state RequestState,
	location string,
	activePath string,
	opts navigationReadOptions,
	debugMode bool,
) map[string]any {
	return resolveNavigationMenuForLocation(r, ctx, state, location, activePath, opts, debugMode)
}

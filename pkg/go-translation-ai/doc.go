// Package translationai provides generic AI translation provider contracts,
// prompt construction, and OpenAI-compatible or Anthropic-compatible providers.
//
// The root package does not depend on go-admin. go-admin-specific translation
// suggestion wiring lives under adapters/goadmin so the provider core can move
// to a standalone repository without carrying go-admin internals.
package translationai

package site

import (
	"strings"

	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-search/adapters/media"
)

func requestSearchRoute(c router.Context, fallback string) string {
	if c == nil {
		return fallback
	}
	if path := strings.TrimSpace(c.Path()); path != "" {
		return path
	}
	return fallback
}

func topicLandingState(slug string) *searchLandingState {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil
	}
	preset, ok := media.TopicLandingPreset(slug)
	if !ok {
		return &searchLandingState{Slug: slug}
	}
	return &searchLandingState{
		Slug:       preset.Slug,
		Title:      preset.Title,
		Breadcrumb: preset.Breadcrumb,
	}
}

func landingMetadata(landing *searchLandingState) map[string]any {
	if landing == nil {
		return nil
	}
	return map[string]any{
		"slug":       strings.TrimSpace(landing.Slug),
		"title":      strings.TrimSpace(landing.Title),
		"breadcrumb": strings.TrimSpace(landing.Breadcrumb),
	}
}

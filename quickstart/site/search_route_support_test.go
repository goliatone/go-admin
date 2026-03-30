package site

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestRequestSearchRouteUsesContextPathBeforeFallback(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Path").Return("/search/topic/architecture")

	if got := requestSearchRoute(ctx, "/search"); got != "/search/topic/architecture" {
		t.Fatalf("expected request path to win, got %q", got)
	}
	if got := requestSearchRoute(nil, "/search"); got != "/search" {
		t.Fatalf("expected fallback for nil context, got %q", got)
	}
}

func TestTopicLandingStateUsesPresetWhenKnown(t *testing.T) {
	landing := topicLandingState("architecture")
	if landing == nil {
		t.Fatal("expected landing state")
	}
	if landing.Slug != "architecture" {
		t.Fatalf("expected preset slug, got %+v", landing)
	}
	if landing.Title == "" || landing.Breadcrumb == "" {
		t.Fatalf("expected preset metadata, got %+v", landing)
	}
}

func TestTopicLandingStateFallsBackToSlugOnlyWhenUnknown(t *testing.T) {
	landing := topicLandingState("custom-topic")
	if landing == nil {
		t.Fatal("expected landing state")
	}
	if landing.Slug != "custom-topic" || landing.Title != "" || landing.Breadcrumb != "" {
		t.Fatalf("expected slug-only fallback, got %+v", landing)
	}
	if topicLandingState("   ") != nil {
		t.Fatal("expected blank slug to return nil")
	}
}

func TestLandingMetadataProjectsTrimmedFields(t *testing.T) {
	meta := landingMetadata(&searchLandingState{
		Slug:       " architecture ",
		Title:      " Architecture ",
		Breadcrumb: " Archive ",
	})
	if anyString(meta["slug"]) != "architecture" || anyString(meta["title"]) != "Architecture" || anyString(meta["breadcrumb"]) != "Archive" {
		t.Fatalf("expected trimmed landing metadata, got %+v", meta)
	}
	if landingMetadata(nil) != nil {
		t.Fatal("expected nil landing metadata for nil landing")
	}
}

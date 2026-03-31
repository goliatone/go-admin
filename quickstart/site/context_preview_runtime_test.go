package site

import (
	"testing"
	"time"

	router "github.com/goliatone/go-router"
)

func TestResolveRequestPreviewHandlesDisabledMissingAndUnvalidatedTokens(t *testing.T) {
	if got := resolveRequestPreview(nil, nil, true); got != (previewResolution{}) {
		t.Fatalf("expected empty preview resolution for nil context, got %+v", got)
	}

	ctx := router.NewMockContext()
	if got := resolveRequestPreview(ctx, nil, false); got != (previewResolution{}) {
		t.Fatalf("expected empty preview resolution when preview disabled, got %+v", got)
	}

	got := resolveRequestPreview(ctx, nil, true)
	if got != (previewResolution{}) {
		t.Fatalf("expected empty preview resolution when token missing, got %+v", got)
	}

	ctx.QueriesM["preview_token"] = " preview-token "
	got = resolveRequestPreview(ctx, nil, true)
	if !got.Present || got.Valid || got.Token != "preview-token" {
		t.Fatalf("expected present unvalidated preview token passthrough, got %+v", got)
	}
}

func TestResolveRequestPreviewValidatesClaimsAndChannelExtraction(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	token, err := adm.Preview().Generate("pages@staging", "page-1", time.Minute)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["preview_token"] = token

	got := resolveRequestPreview(ctx, adm, true)
	if !got.Present || !got.Valid {
		t.Fatalf("expected valid preview token, got %+v", got)
	}
	if got.EntityType != "pages" {
		t.Fatalf("expected entity type pages, got %q", got.EntityType)
	}
	if got.ContentID != "page-1" {
		t.Fatalf("expected content id page-1, got %q", got.ContentID)
	}
	if got.Channel != "staging" {
		t.Fatalf("expected staging channel, got %q", got.Channel)
	}
}

func TestResolveRequestPreviewRejectsMalformedValidatedClaims(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	missingEntityToken, err := adm.Preview().Generate("", "page-1", time.Minute)
	if err != nil {
		t.Fatalf("generate missing entity token: %v", err)
	}
	missingContentIDToken, err := adm.Preview().Generate("pages", "", time.Minute)
	if err != nil {
		t.Fatalf("generate missing content_id token: %v", err)
	}

	for name, token := range map[string]string{
		"missing_entity":     missingEntityToken,
		"missing_content_id": missingContentIDToken,
	} {
		ctx := router.NewMockContext()
		ctx.QueriesM["preview_token"] = token

		got := resolveRequestPreview(ctx, adm, true)
		if got.Valid || got.EntityType != "" || got.ContentID != "" || got.Channel != "" {
			t.Fatalf("%s expected malformed validated token to stay invalid, got %+v", name, got)
		}
		if !got.Present {
			t.Fatalf("%s expected preview token to still be marked present, got %+v", name, got)
		}
	}
}

func TestSplitPreviewEntityTypeNormalizesChannelSuffixedValues(t *testing.T) {
	entityType, channel := splitPreviewEntityType("  Pages@Staging ")
	if entityType != "pages" || channel != "staging" {
		t.Fatalf("expected pages/staging, got %q/%q", entityType, channel)
	}

	entityType, channel = splitPreviewEntityType("documents")
	if entityType != "documents" || channel != "" {
		t.Fatalf("expected documents with empty channel, got %q/%q", entityType, channel)
	}

	entityType, channel = splitPreviewEntityType("")
	if entityType != "" || channel != "" {
		t.Fatalf("expected empty entity/channel, got %q/%q", entityType, channel)
	}
}

package admin

import (
	"reflect"
	"testing"

	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type testGoCMSTranslationLocale struct {
	Code string
}

type testGoCMSTranslationRecord struct {
	Locale         testGoCMSTranslationLocale
	FamilyID       *uuid.UUID
	Title          string
	Summary        *string
	Content        map[string]any
	ResolvedLocale string
}

type testGoCMSProjectionRecord struct {
	RequestedLocale        string
	ResolvedLocale         string
	MissingRequestedLocale bool
	AvailableLocales       []string
	Translations           []testGoCMSTranslationRecord
}

type testGoCMSProjectionRecordNoMissing struct {
	RequestedLocale  string
	ResolvedLocale   string
	AvailableLocales []string
	Translations     []testGoCMSTranslationRecord
}

func TestBuildGoCMSTranslationProjectionPrefersRequestedLocaleAndExtendsAvailableLocales(t *testing.T) {
	familyID := uuid.New()
	summary := "Bonjour summary"
	record := testGoCMSProjectionRecord{
		AvailableLocales: []string{"en"},
		Translations: []testGoCMSTranslationRecord{
			{
				Locale:  testGoCMSTranslationLocale{Code: "en"},
				Title:   "Hello",
				Content: map[string]any{"body": "hello"},
			},
			{
				Locale:         testGoCMSTranslationLocale{Code: "fr"},
				FamilyID:       &familyID,
				Title:          "Bonjour",
				Summary:        &summary,
				Content:        map[string]any{"body": "bonjour"},
				ResolvedLocale: "fr",
			},
		},
	}

	projection := buildGoCMSTranslationProjection(reflect.ValueOf(record), "fr")
	out := CMSContent{Data: map[string]any{}}
	applyGoCMSTranslationProjection(&out, projection)
	applyGoCMSTranslationLocaleState(&out, reflect.ValueOf(record), projection.chosen, "")

	if out.Locale != "fr" {
		t.Fatalf("expected locale fr, got %q", out.Locale)
	}
	if out.FamilyID != familyID.String() {
		t.Fatalf("expected family id %s, got %s", familyID.String(), out.FamilyID)
	}
	if out.Title != "Bonjour" {
		t.Fatalf("expected title Bonjour, got %q", out.Title)
	}
	if out.Data["body"] != "bonjour" {
		t.Fatalf("expected body bonjour, got %#v", out.Data["body"])
	}
	if out.Data["excerpt"] != summary {
		t.Fatalf("expected excerpt %q, got %#v", summary, out.Data["excerpt"])
	}
	if len(out.AvailableLocales) != 2 || out.AvailableLocales[0] != "en" || out.AvailableLocales[1] != "fr" {
		t.Fatalf("expected available locales [en fr], got %#v", out.AvailableLocales)
	}
	if out.ResolvedLocale != "fr" {
		t.Fatalf("expected resolved locale fr, got %q", out.ResolvedLocale)
	}
	if out.MissingRequestedLocale {
		t.Fatalf("expected requested locale to be satisfied")
	}
}

func TestApplyGoCMSTranslationProjectionLetsTranslationContentOverrideBaseData(t *testing.T) {
	record := testGoCMSProjectionRecord{
		AvailableLocales: []string{"en"},
		Translations: []testGoCMSTranslationRecord{
			{
				Locale: testGoCMSTranslationLocale{Code: "en"},
				Title:  "Teaching Topics Menu",
				Content: map[string]any{
					"columns": []any{
						map[string]any{"title": "Subjects", "entries": []any{map[string]any{"topic_id": "topic-refuge-id"}}},
					},
					"slug": "teaching-topics-menu",
				},
			},
		},
	}

	projection := buildGoCMSTranslationProjection(reflect.ValueOf(record), "en")
	out := CMSContent{Data: map[string]any{
		"columns":      []any{},
		"base_only":    "preserved",
		"slug":         "base-slug",
		"preview_path": "/preview/base",
	}}
	applyGoCMSTranslationProjection(&out, projection)

	columns, ok := out.Data["columns"].([]any)
	if !ok || len(columns) != 1 {
		t.Fatalf("expected translated columns to override empty base columns, got %#v", out.Data["columns"])
	}
	if out.Data["base_only"] != "preserved" {
		t.Fatalf("expected base-only data to remain available, got %#v", out.Data["base_only"])
	}
	if out.Data["slug"] != "teaching-topics-menu" {
		t.Fatalf("expected translated slug to override base slug, got %#v", out.Data["slug"])
	}
	if out.Data["preview_path"] != "/preview/base" {
		t.Fatalf("expected unrelated base fields to remain, got %#v", out.Data["preview_path"])
	}
}

func TestApplyGoCMSTranslationLocaleStateMarksMissingRequestedLocale(t *testing.T) {
	record := testGoCMSProjectionRecordNoMissing{
		RequestedLocale: "es",
		AvailableLocales: []string{
			"en",
		},
		Translations: []testGoCMSTranslationRecord{
			{
				Locale:         testGoCMSTranslationLocale{Code: "en"},
				Title:          "Hello",
				Content:        map[string]any{"body": "hello"},
				ResolvedLocale: "en",
			},
		},
	}

	projection := buildGoCMSTranslationProjection(reflect.ValueOf(record), "")
	out := CMSContent{Data: map[string]any{}}
	applyGoCMSTranslationProjection(&out, projection)
	applyGoCMSTranslationLocaleState(&out, reflect.ValueOf(record), projection.chosen, "")

	if out.RequestedLocale != "es" {
		t.Fatalf("expected requested locale es, got %q", out.RequestedLocale)
	}
	if out.ResolvedLocale != "en" {
		t.Fatalf("expected resolved locale en, got %q", out.ResolvedLocale)
	}
	if !out.MissingRequestedLocale {
		t.Fatalf("expected missing requested locale")
	}
}

func TestTranslationMetadataMapReturnsNilForZeroValue(t *testing.T) {
	if meta := translationMetadataMap(reflect.Value{}); meta != nil {
		t.Fatalf("expected nil metadata for zero value, got %#v", meta)
	}
}

func TestTranslationMetadataMapSupportsGoCMSTranslationMetadata(t *testing.T) {
	record := struct {
		Metadata cmscontent.TranslationMetadata
	}{
		Metadata: cmscontent.TranslationMetadata{
			"path":   "/fr/home",
			"custom": "keep",
		},
	}

	meta := translationMetadataMap(reflect.ValueOf(record))
	if meta["path"] != "/fr/home" {
		t.Fatalf("expected path metadata, got %#v", meta)
	}
	if meta["custom"] != "keep" {
		t.Fatalf("expected custom metadata, got %#v", meta)
	}

	record.Metadata["path"] = "/mutated"
	if meta["path"] != "/fr/home" {
		t.Fatalf("expected metadata clone, got %#v", meta)
	}
}

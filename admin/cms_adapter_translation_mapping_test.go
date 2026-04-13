package admin

import (
	"reflect"
	"testing"

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

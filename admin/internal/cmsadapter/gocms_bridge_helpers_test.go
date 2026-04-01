package cmsadapter

import (
	"reflect"
	"testing"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/google/uuid"
)

type gocmsBridgeHelperFixture struct {
	ID               uuid.UUID
	Name             *string
	Title            string
	RequestedLocale  *string
	MissingRequested *bool
	AvailableLocales []any
}

func TestBuildGoCMSContentTranslationsIncludesExcerptSummary(t *testing.T) {
	content := cmsboot.CMSContent{
		Locale: "en",
		Title:  "Hello",
		Data: map[string]any{
			"excerpt": "Short summary",
			"body":    "Hello world",
		},
	}

	got := BuildGoCMSContentTranslations(content)
	if len(got) != 1 {
		t.Fatalf("expected one translation payload, got %d", len(got))
	}
	if got[0].Summary == nil || *got[0].Summary != "Short summary" {
		t.Fatalf("expected excerpt summary to be promoted, got %+v", got[0].Summary)
	}
	if got[0].Content["body"] != "Hello world" {
		t.Fatalf("expected body to be preserved, got %+v", got[0].Content)
	}
}

func TestGoCMSBridgeHelperReflectionReaders(t *testing.T) {
	name := "Hero Banner"
	requested := "fr"
	missing := true
	id := uuid.New()
	fixture := gocmsBridgeHelperFixture{
		ID:               id,
		Name:             &name,
		Title:            "Bonjour",
		RequestedLocale:  &requested,
		MissingRequested: &missing,
		AvailableLocales: []any{"en", " fr ", 7, ""},
	}
	val := reflect.ValueOf(fixture)

	if got := UUIDStringField(val, "ID"); got != id.String() {
		t.Fatalf("expected uuid string %s, got %q", id, got)
	}
	if got := StringField(val, "Title"); got != "Bonjour" {
		t.Fatalf("expected title Bonjour, got %q", got)
	}
	if got := StringFieldAny(val, "RequestedLocale", "Title"); got != "fr" {
		t.Fatalf("expected requested locale fr, got %q", got)
	}
	if got, ok := BoolFieldAny(val, "MissingRequested", "Other"); !ok || !got {
		t.Fatalf("expected missing flag true, got %v ok=%v", got, ok)
	}
	if got := StringSliceFieldAny(val, "AvailableLocales"); !reflect.DeepEqual(got, []string{"en", "fr", "7"}) {
		t.Fatalf("unexpected available locales %+v", got)
	}
}

func TestUUIDFromStringAndAsString(t *testing.T) {
	id := uuid.New()
	if got := UUIDFromString(" " + id.String() + " "); got != id {
		t.Fatalf("expected parsed uuid %s, got %s", id, got)
	}
	if got := UUIDFromString("not-a-uuid"); got != uuid.Nil {
		t.Fatalf("expected nil uuid for invalid input, got %s", got)
	}
	if got := AsString(" value ", "fallback"); got != " value " {
		t.Fatalf("expected original nonblank string, got %q", got)
	}
	if got := AsString("   ", "fallback"); got != "fallback" {
		t.Fatalf("expected fallback for blank string, got %q", got)
	}
}

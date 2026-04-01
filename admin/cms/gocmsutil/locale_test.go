package gocmsutil

import (
	"context"
	"errors"
	"testing"

	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

type localeResolverStub struct {
	resolved map[string]cms.LocaleInfo
	lookups  map[string]int
	err      error
}

func (s *localeResolverStub) ResolveByCode(_ context.Context, code string) (cms.LocaleInfo, error) {
	if s.lookups == nil {
		s.lookups = map[string]int{}
	}
	s.lookups[code]++
	if s.err != nil {
		return cms.LocaleInfo{}, s.err
	}
	record, ok := s.resolved[code]
	if !ok {
		return cms.LocaleInfo{}, errors.New("missing locale")
	}
	return record, nil
}

type activeLocaleResolverStub struct {
	*localeResolverStub
	active []cms.LocaleInfo
	err    error
}

func (s *activeLocaleResolverStub) ActiveLocales(_ context.Context) ([]cms.LocaleInfo, error) {
	if s.err != nil {
		return nil, s.err
	}
	return append([]cms.LocaleInfo{}, s.active...), nil
}

func TestLocaleIDCacheResolveCachesNormalizedCodes(t *testing.T) {
	localeID := uuid.New()
	resolver := &localeResolverStub{
		resolved: map[string]cms.LocaleInfo{
			"en-us": {ID: localeID, Code: "en-US"},
		},
	}
	cache := NewLocaleIDCache(resolver)

	first, ok := cache.Resolve(context.Background(), " EN-us ")
	if !ok || first != localeID {
		t.Fatalf("expected cached locale id %s, got %s ok=%v", localeID, first, ok)
	}
	second, ok := cache.Resolve(context.Background(), "en-US")
	if !ok || second != localeID {
		t.Fatalf("expected repeated locale id %s, got %s ok=%v", localeID, second, ok)
	}
	if resolver.lookups["en-us"] != 1 {
		t.Fatalf("expected one normalized lookup, got %d", resolver.lookups["en-us"])
	}
}

func TestResolveActiveLocaleCodesNormalizesAndDeduplicates(t *testing.T) {
	resolver := &activeLocaleResolverStub{
		localeResolverStub: &localeResolverStub{},
		active: []cms.LocaleInfo{
			{Code: "EN_us"},
			{Code: "en-US"},
			{Code: "fr"},
			{Code: "  "},
		},
	}

	codes, err := ResolveActiveLocaleCodes(context.Background(), resolver)
	if err != nil {
		t.Fatalf("resolve active locales: %v", err)
	}
	if len(codes) != 2 || codes[0] != "en-US" || codes[1] != "fr" {
		t.Fatalf("expected normalized locales [en-US fr], got %#v", codes)
	}
}

func TestResolveActiveLocaleCodesIgnoresResolversWithoutActiveLocaleSupport(t *testing.T) {
	resolver := &localeResolverStub{}

	codes, err := ResolveActiveLocaleCodes(context.Background(), resolver)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if codes != nil {
		t.Fatalf("expected nil codes when active locale support is absent, got %#v", codes)
	}
}

func TestResolveLocaleIDHandlesNilContextAndCache(t *testing.T) {
	localeID := uuid.New()
	resolver := &localeResolverStub{
		resolved: map[string]cms.LocaleInfo{
			"fr": {ID: localeID, Code: "fr"},
		},
	}
	cache := NewLocaleIDCache(resolver)

	if got, ok := ResolveLocaleID(nil, cache, "fr"); !ok || got != localeID {
		t.Fatalf("expected helper to resolve locale id %s with nil context, got %s ok=%v", localeID, got, ok)
	}
	if got, ok := ResolveLocaleID(context.Background(), nil, "fr"); ok || got != uuid.Nil {
		t.Fatalf("expected nil cache to return nil uuid/false, got %s ok=%v", got, ok)
	}
}

package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type siteContentLoaderWithOptionsStub struct {
	admin.CMSContentService

	contentsLocale string
	contentsCalls  int
	contentsOut    []admin.CMSContent
	contentsErr    error

	withOptionsLocale string
	withOptionsCalls  int
	withOptionsArgs   []admin.CMSContentListOption
	withOptionsOut    []admin.CMSContent
	withOptionsErr    error
}

func (s *siteContentLoaderWithOptionsStub) Contents(_ context.Context, locale string) ([]admin.CMSContent, error) {
	s.contentsCalls++
	s.contentsLocale = locale
	return s.contentsOut, s.contentsErr
}

func (s *siteContentLoaderWithOptionsStub) ContentsWithOptions(_ context.Context, locale string, opts ...admin.CMSContentListOption) ([]admin.CMSContent, error) {
	s.withOptionsCalls++
	s.withOptionsLocale = locale
	s.withOptionsArgs = append([]admin.CMSContentListOption{}, opts...)
	return s.withOptionsOut, s.withOptionsErr
}

type siteContentLoaderLegacyStub struct {
	admin.CMSContentService

	contentsLocale string
	contentsCalls  int
	contentsOut    []admin.CMSContent
	contentsErr    error
}

func (s *siteContentLoaderLegacyStub) Contents(_ context.Context, locale string) ([]admin.CMSContent, error) {
	s.contentsCalls++
	s.contentsLocale = locale
	return s.contentsOut, s.contentsErr
}

func TestListSiteContentsPrefersOptionCapableRead(t *testing.T) {
	stub := &siteContentLoaderWithOptionsStub{
		contentsOut: []admin.CMSContent{
			{ID: "legacy"},
		},
		withOptionsOut: []admin.CMSContent{
			{ID: "with-options"},
		},
	}

	items, err := listSiteContents(context.Background(), stub, "en")
	if err != nil {
		t.Fatalf("list content: %v", err)
	}
	if len(items) != 1 || items[0].ID != "with-options" {
		t.Fatalf("expected option-capable payload, got %+v", items)
	}
	if stub.withOptionsCalls != 1 {
		t.Fatalf("expected exactly one option-capable call, got %d", stub.withOptionsCalls)
	}
	if stub.withOptionsLocale != "en" {
		t.Fatalf("expected locale en for option-capable call, got %q", stub.withOptionsLocale)
	}
	if len(stub.withOptionsArgs) != 2 || stub.withOptionsArgs[0] != admin.WithTranslations() || stub.withOptionsArgs[1] != admin.WithDerivedFields() {
		t.Fatalf("expected translations+derived options, got %+v", stub.withOptionsArgs)
	}
	if stub.contentsCalls != 0 {
		t.Fatalf("expected legacy contents path not called, got %d", stub.contentsCalls)
	}
}

func TestListSiteContentsFallsBackToLegacyReadWhenOptionsUnsupported(t *testing.T) {
	stub := &siteContentLoaderWithOptionsStub{
		withOptionsErr: admin.ErrNotFound,
		contentsOut: []admin.CMSContent{
			{ID: "legacy"},
		},
	}

	items, err := listSiteContents(context.Background(), stub, "fr")
	if err != nil {
		t.Fatalf("list content fallback: %v", err)
	}
	if len(items) != 1 || items[0].ID != "legacy" {
		t.Fatalf("expected legacy fallback payload, got %+v", items)
	}
	if stub.withOptionsCalls != 1 {
		t.Fatalf("expected option-capable call attempt, got %d", stub.withOptionsCalls)
	}
	if stub.contentsCalls != 1 {
		t.Fatalf("expected one legacy fallback call, got %d", stub.contentsCalls)
	}
	if stub.contentsLocale != "fr" {
		t.Fatalf("expected locale fr for legacy call, got %q", stub.contentsLocale)
	}
}

func TestListSiteContentsReturnsOptionReadErrors(t *testing.T) {
	expectedErr := errors.New("backend unavailable")
	stub := &siteContentLoaderWithOptionsStub{
		withOptionsErr: expectedErr,
		contentsOut: []admin.CMSContent{
			{ID: "legacy"},
		},
	}

	_, err := listSiteContents(context.Background(), stub, "en")
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected option read error %v, got %v", expectedErr, err)
	}
	if stub.contentsCalls != 0 {
		t.Fatalf("expected no legacy call when option read fails, got %d", stub.contentsCalls)
	}
}

func TestListSiteContentsUsesLegacyServiceWhenOptionsUnavailable(t *testing.T) {
	stub := &siteContentLoaderLegacyStub{
		contentsOut: []admin.CMSContent{
			{ID: "legacy-only"},
		},
	}

	items, err := listSiteContents(context.Background(), stub, "es")
	if err != nil {
		t.Fatalf("list content legacy: %v", err)
	}
	if len(items) != 1 || items[0].ID != "legacy-only" {
		t.Fatalf("expected legacy-only payload, got %+v", items)
	}
	if stub.contentsCalls != 1 {
		t.Fatalf("expected one legacy call, got %d", stub.contentsCalls)
	}
	if stub.contentsLocale != "es" {
		t.Fatalf("expected locale es for legacy call, got %q", stub.contentsLocale)
	}
}

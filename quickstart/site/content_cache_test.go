package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type siteContentCacheStub struct {
	admin.CMSContentService
	byLocale     map[string][]admin.CMSContent
	records      map[string]admin.CMSContent
	listErrs     map[string]error
	recordErrs   map[string]error
	listCalls    map[string]int
	contentCalls map[string]int
}

func (s *siteContentCacheStub) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	if s == nil {
		return nil, nil
	}
	if s.listCalls == nil {
		s.listCalls = map[string]int{}
	}
	s.listCalls[locale]++
	if err := s.listErrs[locale]; err != nil {
		return nil, err
	}
	if items, ok := s.byLocale[locale]; ok {
		return append([]admin.CMSContent{}, items...), nil
	}
	return nil, nil
}

func (s *siteContentCacheStub) ContentsWithOptions(ctx context.Context, locale string, _ ...admin.CMSContentListOption) ([]admin.CMSContent, error) {
	return s.Contents(ctx, locale)
}

func (s *siteContentCacheStub) Content(ctx context.Context, id, locale string) (*admin.CMSContent, error) {
	if s == nil {
		return nil, nil
	}
	if s.contentCalls == nil {
		s.contentCalls = map[string]int{}
	}
	key := siteContentRecordCacheKey(id, locale)
	s.contentCalls[key]++
	if err := s.recordErrs[key]; err != nil {
		return nil, err
	}
	record, ok := s.records[id]
	if !ok {
		return nil, admin.ErrNotFound
	}
	copy := record
	copy.RequestedLocale = locale
	return &copy, nil
}

func TestSiteContentCacheListCachesAndClonesResults(t *testing.T) {
	contentSvc := &siteContentCacheStub{
		byLocale: map[string][]admin.CMSContent{
			"es": {{
				ID:     "page-es",
				Locale: "es",
				Slug:   "hola",
			}},
		},
	}
	cache := newSiteContentCache()

	first, err := cache.List(context.Background(), contentSvc, " ES ")
	if err != nil {
		t.Fatalf("unexpected list error: %v", err)
	}
	if len(first) != 1 {
		t.Fatalf("expected one cached record, got %+v", first)
	}
	first[0].Slug = "mutated"

	second, err := cache.List(context.Background(), contentSvc, "es")
	if err != nil {
		t.Fatalf("unexpected second list error: %v", err)
	}
	if len(second) != 1 || second[0].Slug != "hola" {
		t.Fatalf("expected cloned cached result, got %+v", second)
	}
	if contentSvc.listCalls["es"] != 1 {
		t.Fatalf("expected one locale list call, got %+v", contentSvc.listCalls)
	}
}

func TestSiteContentCacheListCachesErrorsConsistently(t *testing.T) {
	expectedErr := errors.New("backend offline")
	contentSvc := &siteContentCacheStub{
		listErrs: map[string]error{
			"es": expectedErr,
		},
	}
	cache := newSiteContentCache()

	_, err := cache.List(context.Background(), contentSvc, "es")
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected first cached error %v, got %v", expectedErr, err)
	}
	_, err = cache.List(context.Background(), contentSvc, "es")
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected repeated cached error %v, got %v", expectedErr, err)
	}
	if contentSvc.listCalls["es"] != 1 {
		t.Fatalf("expected one locale list call after cached error, got %+v", contentSvc.listCalls)
	}
}

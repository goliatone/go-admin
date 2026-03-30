package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type siteContentListCacheEntry struct {
	loaded bool
	items  []admin.CMSContent
	err    error
}

type siteContentRecordCacheEntry struct {
	loaded bool
	record *admin.CMSContent
	err    error
}

type siteContentCache struct {
	lists   map[string]siteContentListCacheEntry
	records map[string]siteContentRecordCacheEntry
}

func newSiteContentCache() *siteContentCache {
	return &siteContentCache{
		lists:   map[string]siteContentListCacheEntry{},
		records: map[string]siteContentRecordCacheEntry{},
	}
}

func (c *siteContentCache) List(ctx context.Context, contentSvc admin.CMSContentService, locale string) ([]admin.CMSContent, error) {
	locale = normalizeSiteContentCacheLocale(locale)
	if c == nil {
		items, err := listSiteContents(ctx, contentSvc, locale)
		if err != nil {
			return nil, err
		}
		return cloneContentRecords(items), nil
	}
	if entry, ok := c.lists[locale]; ok && entry.loaded {
		if entry.err != nil {
			return nil, entry.err
		}
		return cloneContentRecords(entry.items), nil
	}

	items, err := listSiteContents(ctx, contentSvc, locale)
	entry := siteContentListCacheEntry{
		loaded: true,
		err:    err,
	}
	if err == nil {
		entry.items = cloneContentRecords(items)
	}
	c.lists[locale] = entry
	if err != nil {
		return nil, err
	}
	return cloneContentRecords(entry.items), nil
}

func (c *siteContentCache) Content(ctx context.Context, contentSvc admin.CMSContentService, id, locale string) (*admin.CMSContent, error) {
	id = strings.TrimSpace(id)
	locale = normalizeSiteContentCacheLocale(locale)
	if contentSvc == nil {
		return nil, admin.ErrNotFound
	}
	if c == nil {
		record, err := contentSvc.Content(ctx, id, locale)
		if err != nil || record == nil {
			return nil, err
		}
		return cloneContentRecord(record), nil
	}
	key := siteContentRecordCacheKey(id, locale)
	if entry, ok := c.records[key]; ok && entry.loaded {
		if entry.err != nil {
			return nil, entry.err
		}
		return cloneContentRecord(entry.record), nil
	}

	record, err := contentSvc.Content(ctx, id, locale)
	entry := siteContentRecordCacheEntry{
		loaded: true,
		err:    err,
	}
	if err == nil && record != nil {
		entry.record = cloneContentRecord(record)
	}
	c.records[key] = entry
	if err != nil || record == nil {
		return nil, err
	}
	return cloneContentRecord(entry.record), nil
}

func normalizeSiteContentCacheLocale(locale string) string {
	return strings.ToLower(strings.TrimSpace(locale))
}

func siteContentRecordCacheKey(id, locale string) string {
	return strings.ToLower(strings.TrimSpace(id)) + "|" + normalizeSiteContentCacheLocale(locale)
}

func cloneContentRecords(items []admin.CMSContent) []admin.CMSContent {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.CMSContent, len(items))
	copy(out, items)
	return out
}

func cloneContentRecord(record *admin.CMSContent) *admin.CMSContent {
	if record == nil {
		return nil
	}
	copy := *record
	return &copy
}

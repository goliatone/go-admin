package stores

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	repository "github.com/goliatone/go-repository-bun"
)

// AdminPageStoreAdapter exposes admin read/write services backed by the page repository/store.
type AdminPageStoreAdapter struct {
	repo          repository.Repository[*PageRecord]
	store         PageRepository
	adapter       *admin.BunRepositoryAdapter[*PageRecord]
	defaultLocale string
}

// NewAdminPageStoreAdapter wires repo/store-backed admin page services.
func NewAdminPageStoreAdapter(repo repository.Repository[*PageRecord], store PageRepository, defaultLocale string) *AdminPageStoreAdapter {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	adapter := admin.NewBunRepositoryAdapter[*PageRecord](repo,
		admin.WithBunSearchColumns[*PageRecord]("title", "slug"),
	)
	return &AdminPageStoreAdapter{
		repo:          repo,
		store:         store,
		adapter:       adapter,
		defaultLocale: defaultLocale,
	}
}

// List returns admin page records using the view-backed repository when available.
func (s *AdminPageStoreAdapter) List(ctx context.Context, opts admin.AdminPageListOptions) ([]admin.AdminPageRecord, int, error) {
	include := pageIncludeFlags{includeContent: opts.IncludeContent, includeBlocks: opts.IncludeBlocks, includeData: opts.IncludeData}
	if s == nil {
		return nil, 0, admin.ErrNotFound
	}

	listOpts := buildAdminListOptions(opts)
	if s.adapter == nil {
		return s.listFromStore(ctx, listOpts, include, opts.Locale, opts.FallbackLocale)
	}

	records, total, err := s.adapter.List(ctx, listOpts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]admin.AdminPageRecord, 0, len(records))
	for _, record := range records {
		out = append(out, s.toAdminPageRecord(record, include, opts.Locale, opts.FallbackLocale))
	}
	return out, total, nil
}

// Get returns a single admin page record, optionally hydrating content/blocks from the store.
func (s *AdminPageStoreAdapter) Get(ctx context.Context, id string, opts admin.AdminPageGetOptions) (*admin.AdminPageRecord, error) {
	include := pageIncludeFlags{includeContent: opts.IncludeContent, includeBlocks: opts.IncludeBlocks, includeData: opts.IncludeData}
	if s == nil {
		return nil, admin.ErrNotFound
	}

	var record map[string]any
	if s.adapter != nil {
		if rec, err := s.adapter.Get(ctx, id); err == nil {
			record = rec
		} else if s.store == nil {
			return nil, err
		}
	}

	var fallback map[string]any
	if s.store != nil && (record == nil || needsPageFallback(record, include)) {
		if rec, err := s.store.Get(ctx, id); err == nil {
			fallback = rec
		} else if record == nil {
			return nil, err
		}
	}

	merged := mergePageRecordMaps(record, fallback)
	if merged == nil {
		return nil, admin.ErrNotFound
	}
	out := s.toAdminPageRecord(merged, include, opts.Locale, opts.FallbackLocale)
	return &out, nil
}

// Create inserts a page record via the store.
func (s *AdminPageStoreAdapter) Create(ctx context.Context, payload map[string]any) (*admin.AdminPageRecord, error) {
	if s == nil || s.store == nil {
		return nil, admin.ErrNotFound
	}
	created, err := s.store.Create(ctx, payload)
	if err != nil {
		return nil, err
	}
	include := pageIncludeFlags{includeContent: true, includeBlocks: true, includeData: true}
	out := s.toAdminPageRecord(created, include, asString(payload["locale"], ""), "")
	return &out, nil
}

// Update modifies a page record via the store.
func (s *AdminPageStoreAdapter) Update(ctx context.Context, id string, payload map[string]any) (*admin.AdminPageRecord, error) {
	if s == nil || s.store == nil {
		return nil, admin.ErrNotFound
	}
	updated, err := s.store.Update(ctx, id, payload)
	if err != nil {
		return nil, err
	}
	include := pageIncludeFlags{includeContent: true, includeBlocks: true, includeData: true}
	out := s.toAdminPageRecord(updated, include, asString(payload["locale"], ""), "")
	return &out, nil
}

// Delete removes a page record via the store.
func (s *AdminPageStoreAdapter) Delete(ctx context.Context, id string) error {
	if s == nil || s.store == nil {
		return admin.ErrNotFound
	}
	return s.store.Delete(ctx, id)
}

// Publish applies publish updates via the store.
func (s *AdminPageStoreAdapter) Publish(ctx context.Context, id string, payload map[string]any) (*admin.AdminPageRecord, error) {
	if s == nil || s.store == nil {
		return nil, admin.ErrNotFound
	}
	update := cloneAnyMap(payload)
	if update == nil {
		update = map[string]any{}
	}
	if _, ok := update["status"]; !ok {
		update["status"] = "published"
	}
	updated, err := s.store.Update(ctx, id, update)
	if err != nil {
		return nil, err
	}
	include := pageIncludeFlags{includeContent: true, includeBlocks: true, includeData: true}
	out := s.toAdminPageRecord(updated, include, asString(update["locale"], ""), "")
	return &out, nil
}

// Unpublish applies draft updates via the store.
func (s *AdminPageStoreAdapter) Unpublish(ctx context.Context, id string, payload map[string]any) (*admin.AdminPageRecord, error) {
	if s == nil || s.store == nil {
		return nil, admin.ErrNotFound
	}
	update := cloneAnyMap(payload)
	if update == nil {
		update = map[string]any{}
	}
	if _, ok := update["status"]; !ok {
		update["status"] = "draft"
	}
	updated, err := s.store.Update(ctx, id, update)
	if err != nil {
		return nil, err
	}
	include := pageIncludeFlags{includeContent: true, includeBlocks: true, includeData: true}
	out := s.toAdminPageRecord(updated, include, asString(update["locale"], ""), "")
	return &out, nil
}

type pageIncludeFlags struct {
	includeContent bool
	includeBlocks  bool
	includeData    bool
}

func buildAdminListOptions(opts admin.AdminPageListOptions) admin.ListOptions {
	list := admin.ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Search:   opts.Search,
		Filters:  cloneAnyMap(opts.Filters),
	}
	if list.Filters == nil {
		list.Filters = map[string]any{}
	}
	if loc := strings.TrimSpace(opts.Locale); loc != "" {
		if _, ok := list.Filters["locale"]; !ok {
			list.Filters["locale"] = loc
		}
	}
	return list
}

func (s *AdminPageStoreAdapter) listFromStore(ctx context.Context, opts admin.ListOptions, include pageIncludeFlags, locale, fallbackLocale string) ([]admin.AdminPageRecord, int, error) {
	if s == nil || s.store == nil {
		return nil, 0, admin.ErrNotFound
	}
	records, total, err := s.store.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]admin.AdminPageRecord, 0, len(records))
	for _, record := range records {
		out = append(out, s.toAdminPageRecord(record, include, locale, fallbackLocale))
	}
	return out, total, nil
}

func needsPageFallback(record map[string]any, include pageIncludeFlags) bool {
	if record == nil {
		return true
	}
	if include.includeBlocks && record["blocks"] == nil {
		return true
	}
	if include.includeContent && strings.TrimSpace(asString(record["content"], "")) == "" {
		return true
	}
	return false
}

func mergePageRecordMaps(base, fallback map[string]any) map[string]any {
	if len(base) == 0 && len(fallback) == 0 {
		return nil
	}
	merged := cloneRecord(base)
	if len(merged) == 0 {
		return cloneRecord(fallback)
	}
	if len(fallback) == 0 {
		return merged
	}
	for _, key := range []string{"content", "blocks", "meta_title", "meta_description", "path", "preview_url", "summary", "tags", "locale", "status"} {
		if isEmptyValue(merged[key]) && !isEmptyValue(fallback[key]) {
			merged[key] = fallback[key]
		}
	}
	return merged
}

func isEmptyValue(val any) bool {
	switch v := val.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(v) == ""
	case []string:
		return len(v) == 0
	case []any:
		return len(v) == 0
	case map[string]any:
		return len(v) == 0
	default:
		return false
	}
}

func (s *AdminPageStoreAdapter) toAdminPageRecord(record map[string]any, include pageIncludeFlags, requestedLocale, fallbackLocale string) admin.AdminPageRecord {
	if record == nil {
		return admin.AdminPageRecord{}
	}
	fallbackLocale = strings.TrimSpace(fallbackLocale)
	if fallbackLocale == "" && s != nil {
		fallbackLocale = strings.TrimSpace(s.defaultLocale)
	}
	locale := strings.TrimSpace(asString(record["locale"], ""))
	requested, resolved := resolveLocalePair(requestedLocale, locale, fallbackLocale)

	title := strings.TrimSpace(asString(record["title"], ""))
	slug := strings.TrimSpace(asString(record["slug"], ""))
	path := strings.TrimSpace(asString(record["path"], ""))
	status := strings.TrimSpace(asString(record["status"], ""))
	metaTitle := strings.TrimSpace(asString(record["meta_title"], ""))
	metaDescription := strings.TrimSpace(asString(record["meta_description"], ""))
	previewURL := strings.TrimSpace(asString(record["preview_url"], ""))
	if previewURL == "" {
		previewURL = path
	}

	tags := parseTags(record["tags"])
	summaryText := strings.TrimSpace(asString(record["summary"], ""))
	var summary *string
	if summaryText != "" {
		summary = &summaryText
	}

	schema := strings.TrimSpace(asString(record["schema"], asString(record["_schema"], "")))

	var data map[string]any
	if include.includeData {
		data = map[string]any{}
		if path != "" {
			data["path"] = path
		}
		if metaTitle != "" {
			data["meta_title"] = metaTitle
		}
		if metaDescription != "" {
			data["meta_description"] = metaDescription
		}
		if len(tags) > 0 {
			data["tags"] = append([]string{}, tags...)
		}
		if summaryText != "" {
			data["summary"] = summaryText
		}
		if schema != "" {
			data["schema"] = schema
			data["_schema"] = schema
		}
	}

	var content any
	if include.includeContent {
		if contentText := strings.TrimSpace(asString(record["content"], "")); contentText != "" {
			content = contentText
			if data != nil {
				data["content"] = contentText
			}
		}
	}

	var blocks any
	if include.includeBlocks {
		if record["blocks"] != nil {
			blocks = record["blocks"]
			if data != nil {
				data["blocks"] = blocks
			}
		}
	}

	out := admin.AdminPageRecord{
		ID:                 strings.TrimSpace(stringID(record["id"])),
		ContentID:          strings.TrimSpace(stringID(record["content_id"])),
		TranslationGroupID: strings.TrimSpace(stringID(record["translation_group_id"])),
		TemplateID:         strings.TrimSpace(stringID(record["template_id"])),
		Title:              title,
		Slug:               slug,
		Path:               path,
		RequestedLocale:    requested,
		ResolvedLocale:     resolved,
		Status:             status,
		ParentID:           strings.TrimSpace(stringID(record["parent_id"])),
		MetaTitle:          metaTitle,
		MetaDescription:    metaDescription,
		Summary:            summary,
		Tags:               append([]string{}, tags...),
		SchemaVersion:      schema,
		Data:               data,
		Content:            content,
		Blocks:             blocks,
		PreviewURL:         previewURL,
	}

	if ts := parseTimeValue(record["published_at"]); !ts.IsZero() {
		out.PublishedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["created_at"]); !ts.IsZero() {
		out.CreatedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["updated_at"]); !ts.IsZero() {
		out.UpdatedAt = ptrTime(ts)
	}

	return out
}

func resolveLocalePair(requested, resolved, fallback string) (string, string) {
	req := strings.TrimSpace(requested)
	res := strings.TrimSpace(resolved)
	fallback = strings.TrimSpace(fallback)
	if req == "" {
		if res != "" {
			req = res
		} else if fallback != "" {
			req = fallback
		}
	}
	if res == "" {
		if fallback != "" {
			res = fallback
		} else {
			res = req
		}
	}
	return req, res
}

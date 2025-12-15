package stores

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
)

// CMSPageStore adapts a CMSContentService-backed page repository to the panel/store contract.
type CMSPageStore struct {
	repo          *admin.CMSPageRepository
	content       admin.CMSContentService
	activity      admin.ActivitySink
	defaultLocale string
}

// NewCMSPageStore builds a go-cms-backed page store. Returns nil when no content service is provided.
func NewCMSPageStore(content admin.CMSContentService, defaultLocale string) *CMSPageStore {
	if content == nil {
		return nil
	}
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	return &CMSPageStore{
		repo:          admin.NewCMSPageRepository(content),
		content:       content,
		defaultLocale: defaultLocale,
	}
}

// WithActivitySink wires an activity sink for CRUD events.
func (s *CMSPageStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Seed inserts sample pages when the CMS backend is empty.
func (s *CMSPageStore) Seed() {
	if s == nil || s.repo == nil {
		return
	}
	ctx := context.Background()
	if existing, _, err := s.List(ctx, admin.ListOptions{PerPage: 1}); err == nil && len(existing) > 0 {
		return
	}

	now := time.Now()
	seeds := []map[string]any{
		{"title": "Home", "slug": "home", "content": "Welcome to our website", "status": "published", "meta_title": "Home - Enterprise Admin", "meta_description": "Welcome to Enterprise Admin", "created_at": now.Add(-100 * 24 * time.Hour), "updated_at": now.Add(-10 * 24 * time.Hour)},
		{"title": "About Us", "slug": "about", "content": "Learn more about our company", "status": "published", "meta_title": "About Us", "meta_description": "Learn more about our company", "created_at": now.Add(-90 * 24 * time.Hour), "updated_at": now.Add(-5 * 24 * time.Hour)},
		{"title": "Our Team", "slug": "team", "content": "Meet our team members", "status": "published", "parent_id": "", "meta_title": "Our Team", "meta_description": "Meet our team", "created_at": now.Add(-80 * 24 * time.Hour), "updated_at": now.Add(-3 * 24 * time.Hour)},
		{"title": "Contact", "slug": "contact", "content": "Get in touch with us", "status": "published", "meta_title": "Contact Us", "meta_description": "Get in touch", "created_at": now.Add(-70 * 24 * time.Hour), "updated_at": now.Add(-1 * 24 * time.Hour)},
		{"title": "Privacy Policy", "slug": "privacy", "content": "Our privacy policy", "status": "draft", "meta_title": "Privacy Policy", "meta_description": "Our privacy policy", "created_at": now.Add(-20 * 24 * time.Hour), "updated_at": now.Add(-20 * 24 * time.Hour)},
	}

	for _, rec := range seeds {
		rec["locale"] = s.defaultLocale
		if _, err := s.Create(ctx, rec); err != nil {
			continue
		}
	}
}

// List returns CMS pages filtered by locale/search.
func (s *CMSPageStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, admin.ErrNotFound
	}
	locale := s.resolveLocale(opts)
	pages, err := s.content.Pages(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearchFromOptions(opts))
	statusFilter := strings.ToLower(asString(opts.Filters["status"], asString(opts.Filters["Status"], "")))
	slugFilter := strings.ToLower(asString(opts.Filters["slug"], asString(opts.Filters["Slug"], "")))
	pathFilter := strings.ToLower(asString(opts.Filters["path"], asString(opts.Filters["Path"], "")))
	records := []map[string]any{}
	for _, page := range pages {
		record := s.pageToRecord(page)
		if search != "" && !strings.Contains(strings.ToLower(page.Title), search) && !strings.Contains(strings.ToLower(page.Slug), search) && !strings.Contains(strings.ToLower(asString(record["path"], "")), search) {
			continue
		}
		if statusFilter != "" && !strings.EqualFold(asString(record["status"], ""), statusFilter) {
			continue
		}
		if slugFilter != "" && !strings.EqualFold(asString(record["slug"], ""), slugFilter) {
			continue
		}
		if pathFilter != "" && !strings.EqualFold(strings.ToLower(asString(record["path"], "")), pathFilter) {
			continue
		}
		records = append(records, record)
	}
	return records, len(records), nil
}

// Get returns a single page.
func (s *CMSPageStore) Get(ctx context.Context, id string) (map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}
	locale := strings.TrimSpace(s.defaultLocale)
	if locale == "" {
		locale = "en"
	}
	page, err := s.content.Page(ctx, id, locale)
	if err != nil {
		// Some CMS backends allow empty-locale lookups; keep as a best-effort fallback.
		page, err = s.content.Page(ctx, id, "")
	}
	if err != nil {
		// When the ID is valid but the locale differs (or the backend requires locale),
		// locate the record via a global listing and retry with the discovered locale.
		if pages, listErr := s.content.Pages(ctx, ""); listErr == nil {
			for _, p := range pages {
				if p.ID != id {
					continue
				}
				if loc := strings.TrimSpace(p.Locale); loc != "" && !strings.EqualFold(loc, locale) {
					page, err = s.content.Page(ctx, id, loc)
				} else {
					page, err = s.content.Page(ctx, id, "")
				}
				break
			}
		}
	}
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, admin.ErrNotFound
	}
	return s.pageToRecord(*page), nil
}

// Create inserts a page into the CMS backend.
func (s *CMSPageStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}
	payload := s.pagePayload(record, nil)
	created, err := s.repo.Create(ctx, payload)
	if err != nil {
		return nil, err
	}
	out := s.pageToRecord(cmsPageFromMap(created))
	s.emitActivity(ctx, "created", out)
	return out, nil
}

// Update modifies an existing page.
func (s *CMSPageStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}
	existing, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	record["id"] = id
	payload := s.pagePayload(record, existing)
	updated, err := s.repo.Update(ctx, id, payload)
	if err != nil {
		return nil, err
	}
	out := s.pageToRecord(cmsPageFromMap(updated))
	s.emitActivity(ctx, "updated", out)
	return out, nil
}

// Delete removes a page.
func (s *CMSPageStore) Delete(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return admin.ErrNotFound
	}
	existing, _ := s.Get(ctx, id)
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.emitActivity(ctx, "deleted", existing)
	return nil
}

// Publish marks matching pages as published.
func (s *CMSPageStore) Publish(ctx context.Context, ids []string) ([]map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}

	targets := normalizeIDSet(ids)
	records, _, err := s.List(ctx, admin.ListOptions{})
	if err != nil {
		return nil, err
	}
	now := time.Now()
	updated := []map[string]any{}
	for _, rec := range records {
		id := stringID(rec["id"])
		if !idMatches(targets, id) {
			continue
		}
		if strings.EqualFold(asString(rec["status"], ""), "published") {
			continue
		}
		rec["status"] = "published"
		rec["updated_at"] = now
		updatedRec, err := s.Update(ctx, id, rec)
		if err != nil {
			return nil, err
		}
		updated = append(updated, cloneRecord(updatedRec))
	}
	if len(updated) == 0 && len(targets) > 0 {
		return nil, admin.ErrNotFound
	}
	return updated, nil
}

// Unpublish marks matching pages as drafts.
func (s *CMSPageStore) Unpublish(ctx context.Context, ids []string) ([]map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}

	targets := normalizeIDSet(ids)
	records, _, err := s.List(ctx, admin.ListOptions{})
	if err != nil {
		return nil, err
	}
	now := time.Now()
	updated := []map[string]any{}
	for _, rec := range records {
		id := stringID(rec["id"])
		if !idMatches(targets, id) {
			continue
		}
		if strings.EqualFold(asString(rec["status"], ""), "draft") {
			continue
		}
		rec["status"] = "draft"
		rec["updated_at"] = now
		updatedRec, err := s.Update(ctx, id, rec)
		if err != nil {
			return nil, err
		}
		updated = append(updated, cloneRecord(updatedRec))
	}
	if len(updated) == 0 && len(targets) > 0 {
		return nil, admin.ErrNotFound
	}
	return updated, nil
}

func (s *CMSPageStore) pagePayload(record map[string]any, existing map[string]any) map[string]any {
	if record == nil {
		record = map[string]any{}
	}
	now := time.Now()
	locale := asString(record["locale"], asString(existing["locale"], s.defaultLocale))
	metaTitle := asString(record["meta_title"], asString(existing["meta_title"], ""))
	metaDescription := asString(record["meta_description"], asString(existing["meta_description"], ""))
	content := asString(record["content"], asString(existing["content"], ""))
	status := asString(record["status"], asString(existing["status"], "draft"))
	templateID := asString(record["template_id"], asString(existing["template_id"], ""))
	if templateID == "" {
		templateID = asString(record["template"], asString(existing["template"], ""))
	}
	createdAt := parseTimeValue(record["created_at"])
	if createdAt.IsZero() {
		createdAt = parseTimeValue(existing["created_at"])
	}
	if createdAt.IsZero() {
		createdAt = now
	}
	updatedAt := parseTimeValue(record["updated_at"])
	if updatedAt.IsZero() {
		updatedAt = now
	}

	payload := map[string]any{
		"title":     asString(record["title"], asString(existing["title"], "")),
		"slug":      asString(record["slug"], asString(existing["slug"], "")),
		"status":    status,
		"locale":    locale,
		"parent_id": asString(record["parent_id"], asString(existing["parent_id"], "")),
		"seo": map[string]any{
			"title":       metaTitle,
			"description": metaDescription,
		},
		"data": map[string]any{
			"content":          content,
			"meta_title":       metaTitle,
			"meta_description": metaDescription,
			"created_at":       createdAt,
			"updated_at":       updatedAt,
		},
	}
	if path := asString(record["path"], asString(existing["path"], "")); path != "" {
		payloadData := payload["data"].(map[string]any)
		payloadData["path"] = path
	}
	if payloadData := payload["data"].(map[string]any); payloadData["path"] == nil || payloadData["path"] == "" {
		if slug := asString(payload["slug"], ""); slug != "" {
			payloadData["path"] = "/" + strings.TrimPrefix(slug, "/")
		}
	}
	if templateID != "" {
		payload["template_id"] = templateID
	}
	if blocks, ok := record["blocks"].([]string); ok && len(blocks) > 0 {
		payload["blocks"] = append([]string{}, blocks...)
	} else if blocksAny, ok := record["blocks"].([]any); ok && len(blocksAny) > 0 {
		extracted := []string{}
		for _, b := range blocksAny {
			if str := strings.TrimSpace(fmt.Sprint(b)); str != "" {
				extracted = append(extracted, str)
			}
		}
		if len(extracted) > 0 {
			payload["blocks"] = extracted
		}
	} else if existingBlocks, ok := existing["blocks"].([]string); ok && len(existingBlocks) > 0 {
		payload["blocks"] = append([]string{}, existingBlocks...)
	}

	if id := asString(record["id"], asString(existing["id"], "")); id != "" {
		payload["id"] = id
	}
	return payload
}

func (s *CMSPageStore) pageToRecord(page admin.CMSPage) map[string]any {
	record := map[string]any{
		"id":          page.ID,
		"title":       page.Title,
		"slug":        page.Slug,
		"status":      page.Status,
		"template_id": page.TemplateID,
		"parent_id":   page.ParentID,
		"locale":      page.Locale,
		"preview_url": page.PreviewURL,
	}
	if len(page.Blocks) > 0 {
		record["blocks"] = append([]string{}, page.Blocks...)
	}

	data := cloneRecord(page.Data)
	seo := cloneRecord(page.SEO)

	record["content"] = asString(data["content"], "")
	record["meta_title"] = asString(seo["title"], asString(data["meta_title"], ""))
	record["meta_description"] = asString(seo["description"], asString(data["meta_description"], ""))
	if tpl := asString(data["template_id"], asString(data["template"], "")); tpl != "" && asString(record["template_id"], "") == "" {
		record["template_id"] = tpl
	}
	if path := asString(data["path"], ""); path != "" {
		record["path"] = path
	} else if path := asString(seo["path"], ""); path != "" {
		record["path"] = path
	} else if page.PreviewURL != "" {
		record["path"] = page.PreviewURL
	} else if page.Slug != "" {
		record["path"] = "/" + strings.TrimPrefix(page.Slug, "/")
	}
	if record["preview_url"] == "" && record["path"] != nil {
		record["preview_url"] = record["path"]
	}

	if created := parseTimeValue(data["created_at"]); !created.IsZero() {
		record["created_at"] = created
	}
	if updated := parseTimeValue(data["updated_at"]); !updated.IsZero() {
		record["updated_at"] = updated
	}

	return record
}

func (s *CMSPageStore) resolveLocale(opts admin.ListOptions) string {
	if opts.Filters != nil {
		if loc, ok := opts.Filters["locale"].(string); ok && strings.TrimSpace(loc) != "" {
			return loc
		}
		if loc, ok := opts.Filters["Locale"].(string); ok && strings.TrimSpace(loc) != "" {
			return loc
		}
	}
	return s.defaultLocale
}

func (s *CMSPageStore) emitActivity(ctx context.Context, verb string, page map[string]any) {
	if s.activity == nil || page == nil {
		return
	}
	status := asString(page["status"], "")
	entry := admin.ActivityEntry{
		Actor:  resolveActivityActor(ctx),
		Action: verb,
		Object: "page:" + stringID(page["id"]),
		Metadata: map[string]any{
			"title":  page["title"],
			"slug":   page["slug"],
			"status": status,
		},
	}
	_ = s.activity.Record(ctx, entry)
}

func cmsPageFromMap(record map[string]any) admin.CMSPage {
	if record == nil {
		return admin.CMSPage{}
	}
	page := admin.CMSPage{
		Data: cloneRecord(nil),
		SEO:  cloneRecord(nil),
	}
	if id, ok := record["id"].(string); ok {
		page.ID = id
	}
	if title, ok := record["title"].(string); ok {
		page.Title = title
	}
	if slug, ok := record["slug"].(string); ok {
		page.Slug = slug
	}
	if locale, ok := record["locale"].(string); ok {
		page.Locale = locale
	}
	if parent, ok := record["parent_id"].(string); ok {
		page.ParentID = parent
	}
	if status, ok := record["status"].(string); ok {
		page.Status = status
	}
	if preview, ok := record["preview_url"].(string); ok {
		page.PreviewURL = preview
	}
	if tpl, ok := record["template_id"].(string); ok {
		page.TemplateID = tpl
	}
	if blocks, ok := record["blocks"].([]string); ok {
		page.Blocks = append([]string{}, blocks...)
	} else if blocksAny, ok := record["blocks"].([]any); ok {
		for _, blk := range blocksAny {
			if b, ok := blk.(string); ok && strings.TrimSpace(b) != "" {
				page.Blocks = append(page.Blocks, b)
			}
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		page.Data = cloneRecord(data)
	}
	if seo, ok := record["seo"].(map[string]any); ok {
		page.SEO = cloneRecord(seo)
	}
	return page
}

func extractSearchFromOptions(opts admin.ListOptions) string {
	if opts.Search != "" {
		return opts.Search
	}
	if opts.Filters != nil {
		if search, ok := opts.Filters["_search"].(string); ok && strings.TrimSpace(search) != "" {
			return search
		}
	}
	return ""
}

package stores

import (
	"context"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
)

// CMSPostStore adapts go-cms content to the post store contract.
type CMSPostStore struct {
	repo          *admin.CMSContentRepository
	content       admin.CMSContentService
	activity      admin.ActivitySink
	defaultLocale string
}

// NewCMSPostStore builds a content-backed post store. Returns nil when no content service is provided.
func NewCMSPostStore(content admin.CMSContentService, defaultLocale string) *CMSPostStore {
	if content == nil {
		return nil
	}
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	return &CMSPostStore{
		repo:          NewFilteredContentRepository(content, "post"),
		content:       content,
		defaultLocale: defaultLocale,
	}
}

// WithActivitySink wires an activity sink for CRUD events.
func (s *CMSPostStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Seed inserts sample posts when the CMS backend is empty.
func (s *CMSPostStore) Seed() {
	if s == nil || s.repo == nil {
		return
	}
	ctx := context.Background()
	if existing, _, err := s.List(ctx, admin.ListOptions{PerPage: 1}); err == nil && len(existing) > 0 {
		return
	}

	now := time.Now()
	seeds := []map[string]any{
		{
			"title":          "Getting Started with Go",
			"slug":           "getting-started-go",
			"content":        "Learn the basics of Go programming...",
			"excerpt":        "A beginner's guide to Go",
			"author":         "jane.smith",
			"category":       "tutorial",
			"status":         "published",
			"published_at":   now.Add(-30 * 24 * time.Hour),
			"featured_image": "/media/go-tutorial.jpg",
			"tags":           "go,programming,tutorial",
			"created_at":     now.Add(-31 * 24 * time.Hour),
			"updated_at":     now.Add(-30 * 24 * time.Hour),
		},
		{
			"title":          "Building REST APIs",
			"slug":           "building-rest-apis",
			"content":        "How to build RESTful APIs in Go...",
			"excerpt":        "REST API development guide",
			"author":         "jane.smith",
			"category":       "tutorial",
			"status":         "published",
			"published_at":   now.Add(-20 * 24 * time.Hour),
			"featured_image": "/media/rest-api.jpg",
			"tags":           "go,api,rest",
			"created_at":     now.Add(-21 * 24 * time.Hour),
			"updated_at":     now.Add(-20 * 24 * time.Hour),
		},
		{
			"title":          "Company News: Q4 2024",
			"slug":           "company-news-q4-2024",
			"content":        "Exciting updates from Q4...",
			"excerpt":        "Our Q4 achievements",
			"author":         "john.doe",
			"category":       "news",
			"status":         "published",
			"published_at":   now.Add(-10 * 24 * time.Hour),
			"featured_image": "/media/news.jpg",
			"tags":           "news,company",
			"created_at":     now.Add(-11 * 24 * time.Hour),
			"updated_at":     now.Add(-10 * 24 * time.Hour),
		},
		{
			"title":        "Database Optimization Tips",
			"slug":         "database-optimization",
			"content":      "Tips for optimizing database queries...",
			"excerpt":      "Improve your database performance",
			"author":       "jane.smith",
			"category":     "blog",
			"status":       "draft",
			"published_at": nil,
			"tags":         "database,optimization",
			"created_at":   now.Add(-5 * 24 * time.Hour),
			"updated_at":   now.Add(-1 * 24 * time.Hour),
		},
		{
			"title":          "Upcoming Features in 2025",
			"slug":           "upcoming-features-2025",
			"content":        "What's coming in 2025...",
			"excerpt":        "Preview of 2025 features",
			"author":         "admin",
			"category":       "news",
			"status":         "scheduled",
			"published_at":   now.Add(7 * 24 * time.Hour),
			"featured_image": "/media/2025.jpg",
			"tags":           "news,roadmap",
			"created_at":     now.Add(-2 * 24 * time.Hour),
			"updated_at":     now.Add(-2 * 24 * time.Hour),
		},
	}

	for _, rec := range seeds {
		rec["locale"] = s.defaultLocale
		if _, err := s.Create(ctx, rec); err != nil {
			continue
		}
	}
}

// List returns CMS posts filtered by content_type, locale, and search.
func (s *CMSPostStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, admin.ErrNotFound
	}
	locale := s.resolveLocale(opts)
	contents, err := s.content.Contents(ctx, locale)
	if err != nil {
		return nil, 0, err
	}

	search := strings.ToLower(extractSearchFromOptions(opts))
	statusFilter := strings.ToLower(asString(opts.Filters["status"], asString(opts.Filters["Status"], "")))
	categoryFilter := strings.ToLower(asString(opts.Filters["category"], asString(opts.Filters["Category"], "")))
	tagFilter := strings.ToLower(asString(opts.Filters["tag"], asString(opts.Filters["Tag"], "")))
	slugFilter := strings.ToLower(asString(opts.Filters["slug"], asString(opts.Filters["Slug"], "")))
	records := []map[string]any{}
	for _, item := range contents {
		if !strings.EqualFold(item.ContentType, "post") {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(item.Title), search) && !strings.Contains(strings.ToLower(item.Slug), search) && !strings.Contains(strings.ToLower(asString(item.Data["content"], "")), search) {
			continue
		}
		rec := s.postToRecord(item)
		if statusFilter != "" && !strings.EqualFold(asString(rec["status"], ""), statusFilter) {
			continue
		}
		if slugFilter != "" && !strings.EqualFold(asString(rec["slug"], ""), slugFilter) {
			continue
		}
		if categoryFilter != "" && !strings.EqualFold(asString(rec["category"], ""), categoryFilter) {
			continue
		}
		if tagFilter != "" && !strings.Contains(strings.ToLower(asString(rec["tags"], "")), tagFilter) {
			continue
		}
		records = append(records, rec)
	}
	return records, len(records), nil
}

// Get returns a post by id.
func (s *CMSPostStore) Get(ctx context.Context, id string) (map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}
	locale := strings.TrimSpace(s.defaultLocale)
	if locale == "" {
		locale = "en"
	}
	content, err := s.content.Content(ctx, id, locale)
	if err != nil {
		// Some CMS backends allow empty-locale lookups; keep as a best-effort fallback.
		content, err = s.content.Content(ctx, id, "")
	}
	if err != nil {
		// When the ID is valid but the locale differs (or the backend requires locale),
		// locate the record via a global listing and retry with the discovered locale.
		if items, listErr := s.content.Contents(ctx, ""); listErr == nil {
			for _, item := range items {
				if item.ID != id {
					continue
				}
				if loc := strings.TrimSpace(item.Locale); loc != "" && !strings.EqualFold(loc, locale) {
					content, err = s.content.Content(ctx, id, loc)
				} else {
					content, err = s.content.Content(ctx, id, "")
				}
				break
			}
		}
	}
	if err != nil {
		return nil, err
	}
	if content == nil || !strings.EqualFold(content.ContentType, "post") {
		return nil, admin.ErrNotFound
	}
	return s.postToRecord(*content), nil
}

// Create inserts a post into the CMS backend.
func (s *CMSPostStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}
	payload := s.postPayload(record, nil)
	created, err := s.repo.Create(ctx, payload)
	if err != nil {
		return nil, err
	}
	out := s.postToRecord(cmsContentFromMap(created))
	s.emitActivity(ctx, "created", out)
	return out, nil
}

// Update modifies an existing post.
func (s *CMSPostStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s == nil || s.repo == nil {
		return nil, admin.ErrNotFound
	}
	existing, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	record["id"] = id
	payload := s.postPayload(record, existing)
	updated, err := s.repo.Update(ctx, id, payload)
	if err != nil {
		return nil, err
	}
	out := s.postToRecord(cmsContentFromMap(updated))
	s.emitActivity(ctx, "updated", out)
	return out, nil
}

// Delete removes a post.
func (s *CMSPostStore) Delete(ctx context.Context, id string) error {
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

// Publish marks matching posts as published and stamps published_at.
func (s *CMSPostStore) Publish(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "published", nil)
}

// Unpublish marks matching posts as drafts and clears publish time.
func (s *CMSPostStore) Unpublish(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "draft", nil)
}

// Schedule marks matching posts as scheduled with a publish time (defaults to now when missing).
func (s *CMSPostStore) Schedule(ctx context.Context, ids []string, publishAt time.Time) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "scheduled", &publishAt)
}

// Archive marks matching posts as archived.
func (s *CMSPostStore) Archive(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "archived", nil)
}

func (s *CMSPostStore) updateStatus(ctx context.Context, ids []string, status string, publishAt *time.Time) ([]map[string]any, error) {
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
		currentStatus := strings.ToLower(asString(rec["status"], ""))
		if currentStatus == strings.ToLower(status) {
			if publishAt == nil {
				continue
			}
			if ts := parseTimeValue(rec["published_at"]); !ts.IsZero() && publishAt.UTC().Equal(ts.UTC()) {
				continue
			}
		}
		rec["status"] = status
		rec["updated_at"] = now
		switch strings.ToLower(status) {
		case "published":
			if publishAt != nil && !publishAt.IsZero() {
				rec["published_at"] = publishAt.UTC()
			} else if ts := parseTimeValue(rec["published_at"]); ts.IsZero() {
				rec["published_at"] = now
			}
		case "scheduled":
			when := now
			if publishAt != nil && !publishAt.IsZero() {
				when = publishAt.UTC()
			}
			rec["published_at"] = when
		case "draft":
			rec["published_at"] = nil
		}
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

func (s *CMSPostStore) postPayload(record map[string]any, existing map[string]any) map[string]any {
	if record == nil {
		record = map[string]any{}
	}
	now := time.Now()
	locale := asString(record["locale"], asString(existing["locale"], s.defaultLocale))
	content := asString(record["content"], asString(existing["content"], ""))
	status := asString(record["status"], asString(existing["status"], "draft"))
	metaTitle := asString(record["meta_title"], asString(existing["meta_title"], ""))
	metaDescription := asString(record["meta_description"], asString(existing["meta_description"], ""))
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

	var publishedAt any
	if ts := parseTimeValue(record["published_at"]); !ts.IsZero() {
		publishedAt = ts
	} else if ts := parseTimeValue(existing["published_at"]); !ts.IsZero() {
		publishedAt = ts
	}

	tags := parseTags(record["tags"])
	if len(tags) == 0 {
		tags = parseTags(existing["tags"])
	}
	if tags == nil {
		tags = []string{}
	}
	category := asString(record["category"], asString(existing["category"], ""))
	featuredImage := asString(record["featured_image"], asString(existing["featured_image"], ""))
	if metaTitle != "" {
		tags = append(tags, metaTitle)
	}

	payload := map[string]any{
		"id":           asString(record["id"], asString(existing["id"], "")),
		"title":        asString(record["title"], asString(existing["title"], "")),
		"slug":         asString(record["slug"], asString(existing["slug"], "")),
		"status":       status,
		"locale":       locale,
		"content_type": "post",
	}
	payloadData := map[string]any{
		"content":        content,
		"excerpt":        asString(record["excerpt"], asString(existing["excerpt"], "")),
		"category":       category,
		"featured_image": featuredImage,
		"tags":           tags,
		"author":         asString(record["author"], asString(existing["author"], resolveActivityActor(nil))),
		"created_at":     createdAt,
		"updated_at":     updatedAt,
	}
	payload["data"] = payloadData
	seo := map[string]any{}
	if metaTitle != "" {
		payloadData["meta_title"] = metaTitle
		seo["title"] = metaTitle
	}
	if metaDescription != "" {
		payloadData["meta_description"] = metaDescription
		seo["description"] = metaDescription
	}
	markdown := map[string]any{
		"frontmatter": map[string]any{
			"seo":              cloneAnyMap(seo),
			"tags":             tags,
			"category":         category,
			"featured_image":   featuredImage,
			"meta_title":       metaTitle,
			"meta_description": metaDescription,
		},
		"body": content,
	}
	payloadData["markdown"] = markdown

	if len(seo) > 0 {
		payloadData["seo"] = seo
	}
	if path := asString(record["path"], asString(existing["path"], "")); path != "" {
		payloadData["path"] = path
	} else if slug := asString(payload["slug"], ""); slug != "" {
		payloadData["path"] = "/posts/" + strings.TrimPrefix(slug, "/")
	}
	if publishedAt != nil {
		payloadData["published_at"] = publishedAt
	}

	if legacy, embedded, embeddedPresent := parseBlocksPayload(record["blocks"]); embeddedPresent {
		payloadData["blocks"] = embedded
	} else if len(legacy) > 0 {
		payload["blocks"] = legacy
	} else if embedded, ok := extractEmbeddedBlocks(existing["blocks"]); ok {
		payloadData["blocks"] = embedded
	} else if existingBlocks, ok := existing["blocks"].([]string); ok && len(existingBlocks) > 0 {
		payload["blocks"] = append([]string{}, existingBlocks...)
	}
	return payload
}

func (s *CMSPostStore) postToRecord(content admin.CMSContent) map[string]any {
	record := map[string]any{
		"id":             content.ID,
		"title":          content.Title,
		"slug":           content.Slug,
		"status":         content.Status,
		"path":           "",
		"locale":         content.Locale,
		"content_type":   content.ContentType,
		"content":        "",
		"excerpt":        "",
		"category":       "",
		"featured_image": "",
		"tags":           "",
		"author":         "",
	}

	data := cloneRecord(content.Data)
	record["content"] = asString(data["content"], "")
	record["excerpt"] = asString(data["excerpt"], "")
	record["category"] = asString(data["category"], "")
	record["featured_image"] = asString(data["featured_image"], "")
	record["tags"] = parseTags(data["tags"])
	record["author"] = asString(data["author"], "")
	if seo, ok := data["seo"].(map[string]any); ok {
		record["meta_title"] = asString(seo["title"], "")
		record["meta_description"] = asString(seo["description"], "")
	}
	if metaTitle := asString(data["meta_title"], ""); metaTitle != "" && record["meta_title"] == "" {
		record["meta_title"] = metaTitle
	}
	if metaDesc := asString(data["meta_description"], ""); metaDesc != "" && record["meta_description"] == nil {
		record["meta_description"] = metaDesc
	}
	if path := asString(data["path"], ""); path != "" {
		record["path"] = path
	} else if slug := strings.TrimPrefix(content.Slug, "/"); slug != "" {
		record["path"] = "/posts/" + slug
	}

	if embedded, ok := extractEmbeddedBlocks(data["blocks"]); ok {
		record["blocks"] = embedded
	} else if len(content.EmbeddedBlocks) > 0 {
		record["blocks"] = cloneEmbeddedBlocks(content.EmbeddedBlocks)
	} else if len(content.Blocks) > 0 {
		record["blocks"] = append([]string{}, content.Blocks...)
	}

	if created := parseTimeValue(data["created_at"]); !created.IsZero() {
		record["created_at"] = created
	}
	if updated := parseTimeValue(data["updated_at"]); !updated.IsZero() {
		record["updated_at"] = updated
	}
	if published := parseTimeValue(data["published_at"]); !published.IsZero() {
		record["published_at"] = published
	}

	return record
}

func (s *CMSPostStore) resolveLocale(opts admin.ListOptions) string {
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

func (s *CMSPostStore) emitActivity(ctx context.Context, verb string, post map[string]any) {
	if s.activity == nil || post == nil {
		return
	}
	entry := admin.ActivityEntry{
		Actor:  resolveActivityActor(ctx),
		Action: verb,
		Object: "post:" + stringID(post["id"]),
		Metadata: map[string]any{
			"title":    post["title"],
			"slug":     post["slug"],
			"status":   post["status"],
			"category": post["category"],
		},
	}
	_ = s.activity.Record(ctx, entry)
}

// NewFilteredContentRepository wraps CMSContentService to enforce a fixed content_type.
func NewFilteredContentRepository(content admin.CMSContentService, contentType string) *admin.CMSContentRepository {
	return admin.NewCMSContentRepository(&filteredContentService{inner: content, contentType: contentType})
}

type filteredContentService struct {
	inner       admin.CMSContentService
	contentType string
}

func (f *filteredContentService) Pages(ctx context.Context, locale string) ([]admin.CMSPage, error) {
	return nil, admin.ErrNotFound
}

func (f *filteredContentService) Page(ctx context.Context, id, locale string) (*admin.CMSPage, error) {
	return nil, admin.ErrNotFound
}

func (f *filteredContentService) CreatePage(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	return nil, admin.ErrNotFound
}

func (f *filteredContentService) UpdatePage(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	return nil, admin.ErrNotFound
}

func (f *filteredContentService) DeletePage(ctx context.Context, id string) error {
	return admin.ErrNotFound
}

func (f *filteredContentService) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	items, err := f.inner.Contents(ctx, locale)
	if err != nil {
		return nil, err
	}
	filtered := []admin.CMSContent{}
	for _, item := range items {
		if !strings.EqualFold(item.ContentType, f.contentType) {
			continue
		}
		filtered = append(filtered, item)
	}
	return filtered, nil
}

func (f *filteredContentService) Content(ctx context.Context, id, locale string) (*admin.CMSContent, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	content, err := f.inner.Content(ctx, id, locale)
	if err != nil {
		return nil, err
	}
	if !strings.EqualFold(content.ContentType, f.contentType) {
		return nil, admin.ErrNotFound
	}
	return content, nil
}

func (f *filteredContentService) CreateContent(ctx context.Context, content admin.CMSContent) (*admin.CMSContent, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	content.ContentType = f.contentType
	return f.inner.CreateContent(ctx, content)
}

func (f *filteredContentService) UpdateContent(ctx context.Context, content admin.CMSContent) (*admin.CMSContent, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	content.ContentType = f.contentType
	return f.inner.UpdateContent(ctx, content)
}

func (f *filteredContentService) DeleteContent(ctx context.Context, id string) error {
	if f.inner == nil {
		return admin.ErrNotFound
	}
	return f.inner.DeleteContent(ctx, id)
}

func (f *filteredContentService) BlockDefinitions(ctx context.Context) ([]admin.CMSBlockDefinition, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	return f.inner.BlockDefinitions(ctx)
}

func (f *filteredContentService) CreateBlockDefinition(ctx context.Context, def admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	return f.inner.CreateBlockDefinition(ctx, def)
}

func (f *filteredContentService) UpdateBlockDefinition(ctx context.Context, def admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	return f.inner.UpdateBlockDefinition(ctx, def)
}

func (f *filteredContentService) DeleteBlockDefinition(ctx context.Context, id string) error {
	if f.inner == nil {
		return admin.ErrNotFound
	}
	return f.inner.DeleteBlockDefinition(ctx, id)
}

func (f *filteredContentService) BlockDefinitionVersions(ctx context.Context, id string) ([]admin.CMSBlockDefinitionVersion, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	return f.inner.BlockDefinitionVersions(ctx, id)
}

func (f *filteredContentService) BlocksForContent(ctx context.Context, contentID, locale string) ([]admin.CMSBlock, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	return f.inner.BlocksForContent(ctx, contentID, locale)
}

func (f *filteredContentService) SaveBlock(ctx context.Context, block admin.CMSBlock) (*admin.CMSBlock, error) {
	if f.inner == nil {
		return nil, admin.ErrNotFound
	}
	return f.inner.SaveBlock(ctx, block)
}

func (f *filteredContentService) DeleteBlock(ctx context.Context, id string) error {
	if f.inner == nil {
		return admin.ErrNotFound
	}
	return f.inner.DeleteBlock(ctx, id)
}

func cmsContentFromMap(record map[string]any) admin.CMSContent {
	if record == nil {
		return admin.CMSContent{Data: map[string]any{}}
	}
	content := admin.CMSContent{
		Data: map[string]any{},
	}
	if id, ok := record["id"].(string); ok {
		content.ID = id
	}
	if title, ok := record["title"].(string); ok {
		content.Title = title
	}
	if slug, ok := record["slug"].(string); ok {
		content.Slug = slug
	}
	if locale, ok := record["locale"].(string); ok {
		content.Locale = locale
	}
	if status, ok := record["status"].(string); ok {
		content.Status = status
	}
	if ctype, ok := record["content_type"].(string); ok {
		content.ContentType = ctype
	}
	if data, ok := record["data"].(map[string]any); ok {
		content.Data = cloneRecord(data)
	}
	return content
}

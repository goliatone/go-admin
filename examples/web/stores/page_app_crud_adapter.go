package stores

import (
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-crud"
	repository "github.com/goliatone/go-repository-bun"
)

// PageAppCRUDAdapter adapts the PageApplicationService to go-crud read/write service interfaces.
type PageAppCRUDAdapter struct {
	app           admin.PageApplicationService
	defaultLocale string
}

// NewPageAppCRUDAdapter wires a PageApplicationService-backed adapter for CRUD controllers.
func NewPageAppCRUDAdapter(app admin.PageApplicationService, defaultLocale string) *PageAppCRUDAdapter {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	return &PageAppCRUDAdapter{app: app, defaultLocale: defaultLocale}
}

// Index returns page records using the application service read path.
func (a *PageAppCRUDAdapter) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]*PageRecord, int, error) {
	if a == nil {
		return nil, 0, admin.ErrNotFound
	}
	opts := pageListOptionsFromContext(ctx, a.defaultLocale)
	records, total, err := a.app.List(ctx.UserContext(), opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]*PageRecord, 0, len(records))
	for _, record := range records {
		out = append(out, pageRecordFromMap(adminPageRecordToMap(record, a.defaultLocale)))
	}
	return out, total, nil
}

// Show returns a single page record using the application service read path.
func (a *PageAppCRUDAdapter) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (*PageRecord, error) {
	if a == nil {
		return nil, admin.ErrNotFound
	}
	opts := pageGetOptionsFromContext(ctx, a.defaultLocale)
	record, err := a.app.Get(ctx.UserContext(), strings.TrimSpace(id), opts)
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, admin.ErrNotFound
	}
	return pageRecordFromMap(adminPageRecordToMap(*record, a.defaultLocale)), nil
}

// Create inserts a page record through the application service write path.
func (a *PageAppCRUDAdapter) Create(ctx crud.Context, record *PageRecord) (*PageRecord, error) {
	if a == nil {
		return nil, admin.ErrNotFound
	}
	payload := pageRecordToMap(record)
	ensureLocaleInPayload(payload, record, ctx, a.defaultLocale)
	created, err := a.app.Create(ctx.UserContext(), payload)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, admin.ErrNotFound
	}
	return pageRecordFromMap(adminPageRecordToMap(*created, a.defaultLocale)), nil
}

// CreateBatch inserts multiple page records through the application service write path.
func (a *PageAppCRUDAdapter) CreateBatch(ctx crud.Context, records []*PageRecord) ([]*PageRecord, error) {
	if a == nil {
		return nil, admin.ErrNotFound
	}
	out := make([]*PageRecord, 0, len(records))
	for _, record := range records {
		created, err := a.Create(ctx, record)
		if err != nil {
			return nil, err
		}
		out = append(out, created)
	}
	return out, nil
}

// Update modifies a page record through the application service write path.
func (a *PageAppCRUDAdapter) Update(ctx crud.Context, record *PageRecord) (*PageRecord, error) {
	if a == nil {
		return nil, admin.ErrNotFound
	}
	payload := pageRecordToMap(record)
	ensureLocaleInPayload(payload, record, ctx, a.defaultLocale)
	id := strings.TrimSpace(stringID(record.ID))
	if id == "" {
		id = strings.TrimSpace(record.Slug)
	}
	updated, err := a.app.Update(ctx.UserContext(), id, payload)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, admin.ErrNotFound
	}
	return pageRecordFromMap(adminPageRecordToMap(*updated, a.defaultLocale)), nil
}

// UpdateBatch updates multiple page records through the application service write path.
func (a *PageAppCRUDAdapter) UpdateBatch(ctx crud.Context, records []*PageRecord) ([]*PageRecord, error) {
	if a == nil {
		return nil, admin.ErrNotFound
	}
	out := make([]*PageRecord, 0, len(records))
	for _, record := range records {
		updated, err := a.Update(ctx, record)
		if err != nil {
			return nil, err
		}
		out = append(out, updated)
	}
	return out, nil
}

// Delete removes a page record through the application service write path.
func (a *PageAppCRUDAdapter) Delete(ctx crud.Context, record *PageRecord) error {
	if a == nil {
		return admin.ErrNotFound
	}
	id := strings.TrimSpace(stringID(record.ID))
	if id == "" {
		id = strings.TrimSpace(record.Slug)
	}
	return a.app.Delete(ctx.UserContext(), id)
}

// DeleteBatch removes multiple page records through the application service write path.
func (a *PageAppCRUDAdapter) DeleteBatch(ctx crud.Context, records []*PageRecord) error {
	if a == nil {
		return admin.ErrNotFound
	}
	for _, record := range records {
		if err := a.Delete(ctx, record); err != nil {
			return err
		}
	}
	return nil
}

func ensureLocaleInPayload(payload map[string]any, record *PageRecord, ctx crud.Context, fallback string) {
	if payload == nil {
		return
	}
	if locale, ok := payload["locale"]; ok && strings.TrimSpace(stringID(locale)) != "" {
		return
	}
	if record != nil && strings.TrimSpace(record.Locale) != "" {
		payload["locale"] = record.Locale
		return
	}
	if ctx != nil {
		if loc := strings.TrimSpace(ctx.Query("locale")); loc != "" {
			payload["locale"] = loc
			return
		}
		if loc := strings.TrimSpace(admin.LocaleFromContext(ctx.UserContext())); loc != "" {
			payload["locale"] = loc
			return
		}
	}
	if strings.TrimSpace(fallback) != "" {
		payload["locale"] = fallback
	}
}

func pageListOptionsFromContext(ctx crud.Context, defaultLocale string) admin.PageListOptions {
	readOpts := pageReadOptionsFromContext(ctx, defaultLocale)
	opts := admin.PageListOptions{PageReadOptions: readOpts}

	limit := ctx.QueryInt("limit", 0)
	perPage := ctx.QueryInt("per_page", 0)
	if perPage <= 0 {
		perPage = ctx.QueryInt("perPage", 0)
	}
	if limit <= 0 && perPage > 0 {
		limit = perPage
	}
	if limit <= 0 {
		limit = crud.DefaultLimit
	}
	page := ctx.QueryInt("page", 0)
	offset := ctx.QueryInt("offset", 0)
	if page <= 0 && limit > 0 && offset >= 0 {
		page = (offset / limit) + 1
	}
	opts.Page = page
	opts.PerPage = limit

	order := strings.TrimSpace(ctx.Query("order"))
	if order == "" {
		order = strings.TrimSpace(ctx.Query("sort"))
	}
	if order != "" {
		parts := strings.Split(order, ",")
		first := strings.Fields(strings.TrimSpace(parts[0]))
		if len(first) > 0 {
			opts.SortBy = strings.TrimSpace(first[0])
		}
		if len(first) > 1 && strings.EqualFold(first[1], "desc") {
			opts.SortDesc = true
		}
	}

	search := strings.TrimSpace(ctx.Query("search"))
	if search == "" {
		search = strings.TrimSpace(ctx.Query("_search"))
	}
	if search == "" {
		search = strings.TrimSpace(ctx.Query("q"))
	}
	if search == "" {
		search = strings.TrimSpace(ctx.Query("query"))
	}
	opts.Search = search

	filters := pageFiltersFromContext(ctx)
	if opts.Search != "" {
		filters["_search"] = opts.Search
	}
	if len(filters) > 0 {
		opts.Filters = filters
	}

	return opts
}

func pageGetOptionsFromContext(ctx crud.Context, defaultLocale string) admin.PageGetOptions {
	readOpts := pageReadOptionsFromContext(ctx, defaultLocale)
	return admin.PageGetOptions{PageReadOptions: readOpts}
}

func pageReadOptionsFromContext(ctx crud.Context, defaultLocale string) admin.PageReadOptions {
	opts := admin.PageReadOptions{}
	if ctx == nil {
		return opts
	}
	opts.Locale = strings.TrimSpace(ctx.Query("locale"))
	if opts.Locale == "" {
		opts.Locale = strings.TrimSpace(ctx.Query("requested_locale"))
	}
	if opts.Locale == "" {
		opts.Locale = strings.TrimSpace(ctx.Query("lang"))
	}
	if opts.Locale == "" {
		opts.Locale = strings.TrimSpace(admin.LocaleFromContext(ctx.UserContext()))
	}
	if opts.Locale == "" {
		opts.Locale = strings.TrimSpace(defaultLocale)
	}

	opts.FallbackLocale = strings.TrimSpace(ctx.Query("fallback_locale"))
	if opts.FallbackLocale == "" {
		opts.FallbackLocale = strings.TrimSpace(ctx.Query("fallback"))
	}

	opts.EnvironmentKey = strings.TrimSpace(ctx.Query("environment"))
	if opts.EnvironmentKey == "" {
		opts.EnvironmentKey = strings.TrimSpace(ctx.Query("env"))
	}
	if opts.EnvironmentKey == "" {
		opts.EnvironmentKey = strings.TrimSpace(admin.EnvironmentFromContext(ctx.UserContext()))
	}

	if val := strings.TrimSpace(ctx.Query("allow_missing_translations")); val != "" {
		opts.AllowMissingTranslations = parseBoolValueFromString(val)
	} else if val := strings.TrimSpace(ctx.Query("allow_missing")); val != "" {
		opts.AllowMissingTranslations = parseBoolValueFromString(val)
	}

	includes := strings.TrimSpace(ctx.Query("include"))
	if includes != "" {
		parts := strings.Split(includes, ",")
		for _, part := range parts {
			switch strings.ToLower(strings.TrimSpace(part)) {
			case "content":
				opts.IncludeContent = admin.BoolPtr(true)
			case "blocks":
				opts.IncludeBlocks = admin.BoolPtr(true)
			case "data":
				opts.IncludeData = admin.BoolPtr(true)
			}
		}
	}

	if ptr := parseBoolPtrFromQuery(ctx, "include_content"); ptr != nil {
		opts.IncludeContent = ptr
	}
	if ptr := parseBoolPtrFromQuery(ctx, "include_blocks"); ptr != nil {
		opts.IncludeBlocks = ptr
	}
	if ptr := parseBoolPtrFromQuery(ctx, "include_data"); ptr != nil {
		opts.IncludeData = ptr
	}

	return opts
}

func parseBoolPtrFromQuery(ctx crud.Context, key string) *bool {
	val := strings.TrimSpace(ctx.Query(key))
	if val == "" {
		return nil
	}
	parsed := parseBoolValueFromString(val)
	return admin.BoolPtr(parsed)
}

func parseBoolValueFromString(val string) bool {
	switch strings.ToLower(strings.TrimSpace(val)) {
	case "1", "t", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func pageFiltersFromContext(ctx crud.Context) map[string]any {
	filters := map[string]any{}
	if ctx == nil {
		return filters
	}
	reserved := map[string]struct{}{
		"limit":                      {},
		"offset":                     {},
		"page":                       {},
		"per_page":                   {},
		"perPage":                    {},
		"order":                      {},
		"sort":                       {},
		"search":                     {},
		"_search":                    {},
		"q":                          {},
		"query":                      {},
		"include":                    {},
		"include_content":            {},
		"include_blocks":             {},
		"include_data":               {},
		"fallback_locale":            {},
		"fallback":                   {},
		"environment":                {},
		"env":                        {},
		"locale":                     {},
		"requested_locale":           {},
		"resolved_locale":            {},
		"lang":                       {},
		"allow_missing":              {},
		"allow_missing_translations": {},
	}

	for key, val := range ctx.Queries() {
		if key == "" || val == "" {
			continue
		}
		if _, ok := reserved[key]; ok {
			continue
		}
		if strings.HasPrefix(key, "filter_") {
			trimmed := strings.TrimPrefix(key, "filter_")
			if trimmed != "" {
				filters[trimmed] = val
			}
			continue
		}
		filters[key] = val
	}

	scope := crud.ScopeFromContext(ctx.UserContext())
	if scope.Bypass {
		return filters
	}
	for _, filter := range scope.ColumnFilters {
		column := strings.TrimSpace(filter.Column)
		if column == "" {
			continue
		}
		operator := strings.ToLower(strings.TrimSpace(filter.Operator))
		switch operator {
		case "in":
			if len(filter.Values) > 0 {
				filters[column] = append([]string{}, filter.Values...)
			}
		case "=", "eq", "":
			if len(filter.Values) == 1 {
				filters[column] = filter.Values[0]
			} else if len(filter.Values) > 1 {
				filters[column] = append([]string{}, filter.Values...)
			}
		default:
			if len(filter.Values) > 0 {
				filters[column] = append([]string{}, filter.Values...)
			}
		}
	}

	return filters
}

func adminPageRecordToMap(record admin.AdminPageRecord, defaultLocale string) map[string]any {
	out := map[string]any{}
	data := cloneAnyMap(record.Data)

	requested := strings.TrimSpace(record.RequestedLocale)
	resolved := strings.TrimSpace(record.ResolvedLocale)
	locale := resolved
	if locale == "" {
		locale = requested
	}
	if locale == "" {
		locale = strings.TrimSpace(defaultLocale)
	}

	title := strings.TrimSpace(record.Title)
	if title == "" {
		title = strings.TrimSpace(asString(data["title"], ""))
	}
	slug := strings.TrimSpace(record.Slug)
	if slug == "" {
		slug = strings.TrimSpace(asString(data["slug"], ""))
	}
	path := strings.TrimSpace(record.Path)
	if path == "" {
		path = strings.TrimSpace(asString(data["path"], ""))
	}
	if path == "" {
		path = strings.TrimSpace(record.PreviewURL)
	}
	status := strings.TrimSpace(record.Status)

	metaTitle := strings.TrimSpace(record.MetaTitle)
	if metaTitle == "" {
		metaTitle = strings.TrimSpace(asString(data["meta_title"], ""))
	}
	metaDescription := strings.TrimSpace(record.MetaDescription)
	if metaDescription == "" {
		metaDescription = strings.TrimSpace(asString(data["meta_description"], ""))
	}

	previewURL := strings.TrimSpace(record.PreviewURL)
	if previewURL == "" {
		previewURL = path
	}

	summary := ""
	if record.Summary != nil {
		summary = strings.TrimSpace(*record.Summary)
	}
	if summary == "" {
		summary = strings.TrimSpace(asString(data["summary"], ""))
	}

	tags := record.Tags
	if len(tags) == 0 {
		tags = parseTags(data["tags"])
	}

	schema := strings.TrimSpace(record.SchemaVersion)
	if schema == "" {
		schema = strings.TrimSpace(asString(data["_schema"], asString(data["schema"], "")))
	}

	out["id"] = strings.TrimSpace(record.ID)
	out["content_id"] = strings.TrimSpace(record.ContentID)
	out["translation_group_id"] = strings.TrimSpace(record.TranslationGroupID)
	out["template_id"] = strings.TrimSpace(record.TemplateID)
	out["title"] = title
	out["slug"] = slug
	out["path"] = path
	out["locale"] = locale
	out["status"] = status
	out["parent_id"] = strings.TrimSpace(record.ParentID)
	out["meta_title"] = metaTitle
	out["meta_description"] = metaDescription
	out["preview_url"] = previewURL

	if summary != "" {
		out["summary"] = summary
	}
	if len(tags) > 0 {
		out["tags"] = append([]string{}, tags...)
	}
	if schema != "" {
		out["schema"] = schema
		out["_schema"] = schema
	}

	if record.Content != nil {
		out["content"] = record.Content
	} else if data["content"] != nil {
		out["content"] = data["content"]
	}

	if record.Blocks != nil {
		out["blocks"] = record.Blocks
	} else if data["blocks"] != nil {
		out["blocks"] = data["blocks"]
	}

	if record.PublishedAt != nil {
		out["published_at"] = record.PublishedAt
	}
	if record.CreatedAt != nil {
		out["created_at"] = record.CreatedAt
	}
	if record.UpdatedAt != nil {
		out["updated_at"] = record.UpdatedAt
	}

	return out
}

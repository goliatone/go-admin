package setup

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var (
	cmsSeedNamespace      = uuid.MustParse("4e7b7b9f-24c0-4d6a-9e2f-6e5a0cc3d7b7")
	seedAuthorID          = uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	pageContentTypeID     = uuid.MustParse("00000000-0000-0000-0000-000000000210")
	postContentTypeID     = uuid.MustParse("00000000-0000-0000-0000-000000000211")
	seedThemeID           = uuid.MustParse("00000000-0000-0000-0000-000000000310")
	seedTemplateID        = uuid.MustParse("00000000-0000-0000-0000-000000000311")
	siteMenuLocaleDefault = ""
)

type cmsSeedRefs struct {
	PageContentTypeID uuid.UUID
	PostContentTypeID uuid.UUID
	TemplateID        uuid.UUID
}

type localeRow struct {
	bun.BaseModel `bun:"table:locales,alias:l"`

	ID         uuid.UUID      `bun:",pk,type:uuid"`
	Code       string         `bun:"code,notnull"`
	Display    string         `bun:"display_name,notnull"`
	NativeName *string        `bun:"native_name"`
	IsActive   bool           `bun:"is_active,notnull,default:true"`
	IsDefault  bool           `bun:"is_default,notnull,default:false"`
	Metadata   map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt  time.Time      `bun:"created_at"`
}

type themeRow struct {
	bun.BaseModel `bun:"table:themes,alias:th"`

	ID          uuid.UUID      `bun:",pk,type:uuid"`
	Name        string         `bun:"name,notnull"`
	Description *string        `bun:"description"`
	Version     string         `bun:"version,notnull"`
	Author      *string        `bun:"author"`
	IsActive    bool           `bun:"is_active,notnull,default:false"`
	ThemePath   string         `bun:"theme_path,notnull"`
	Config      map[string]any `bun:"config,type:jsonb"`
	CreatedAt   time.Time      `bun:"created_at"`
	UpdatedAt   time.Time      `bun:"updated_at"`
}

type templateRow struct {
	bun.BaseModel `bun:"table:templates,alias:tpl"`

	ID           uuid.UUID      `bun:",pk,type:uuid"`
	ThemeID      uuid.UUID      `bun:"theme_id,notnull,type:uuid"`
	Name         string         `bun:"name,notnull"`
	Slug         string         `bun:"slug,notnull"`
	Description  *string        `bun:"description"`
	TemplatePath string         `bun:"template_path,notnull"`
	Regions      map[string]any `bun:"regions,type:jsonb"`
	Metadata     map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt    time.Time      `bun:"created_at"`
	UpdatedAt    time.Time      `bun:"updated_at"`
}

type contentTypeRow struct {
	bun.BaseModel `bun:"table:content_types,alias:ct"`

	ID           uuid.UUID      `bun:",pk,type:uuid"`
	Name         string         `bun:"name,notnull"`
	Slug         string         `bun:"slug"`
	Description  *string        `bun:"description"`
	Schema       map[string]any `bun:"schema,type:jsonb,notnull"`
	Capabilities map[string]any `bun:"capabilities,type:jsonb"`
	Icon         *string        `bun:"icon"`
	CreatedAt    time.Time      `bun:"created_at"`
	UpdatedAt    time.Time      `bun:"updated_at"`
}

type pageRow struct {
	bun.BaseModel `bun:"table:pages,alias:p"`

	ID       uuid.UUID  `bun:",pk,type:uuid"`
	Slug     string     `bun:"slug"`
	ParentID *uuid.UUID `bun:"parent_id"`
}

type contentTranslationRow struct {
	bun.BaseModel `bun:"table:content_translations,alias:ct"`

	ID                 uuid.UUID      `bun:",pk,type:uuid"`
	ContentID          uuid.UUID      `bun:"content_id,notnull,type:uuid"`
	LocaleID           uuid.UUID      `bun:"locale_id,notnull,type:uuid"`
	TranslationGroupID *uuid.UUID     `bun:"translation_group_id,type:uuid"`
	Title              string         `bun:"title,notnull"`
	Summary            *string        `bun:"summary"`
	Content            map[string]any `bun:"content,type:jsonb,notnull"`
	CreatedAt          time.Time      `bun:"created_at"`
	UpdatedAt          time.Time      `bun:"updated_at"`
}

type pageTranslationRow struct {
	bun.BaseModel `bun:"table:page_translations,alias:pt"`

	ID                 uuid.UUID      `bun:",pk,type:uuid"`
	PageID             uuid.UUID      `bun:"page_id,notnull,type:uuid"`
	LocaleID           uuid.UUID      `bun:"locale_id,notnull,type:uuid"`
	TranslationGroupID *uuid.UUID     `bun:"translation_group_id,type:uuid"`
	Title              string         `bun:"title,notnull"`
	Path               string         `bun:"path,notnull"`
	SEOTitle           *string        `bun:"seo_title"`
	SEODescription     *string        `bun:"seo_description"`
	Summary            *string        `bun:"summary"`
	MediaBindings      map[string]any `bun:"media_bindings,type:jsonb"`
	CreatedAt          time.Time      `bun:"created_at"`
	UpdatedAt          time.Time      `bun:"updated_at"`
}

type contentSeed struct {
	Slug    string
	Title   string
	Summary string
	Body    string
	Status  string
	Path    string
	Tags    []string
	Custom  map[string]any
}

func seedCMSPrereqs(ctx context.Context, db *bun.DB, defaultLocale string) (cmsSeedRefs, error) {
	if db == nil {
		return cmsSeedRefs{}, fmt.Errorf("db is nil")
	}

	if err := ensureLocale(ctx, db, defaultLocale); err != nil {
		return cmsSeedRefs{}, err
	}
	if err := ensureTheme(ctx, db); err != nil {
		return cmsSeedRefs{}, err
	}
	if err := ensureTemplate(ctx, db); err != nil {
		return cmsSeedRefs{}, err
	}
	if err := ensureContentTypes(ctx, db); err != nil {
		return cmsSeedRefs{}, err
	}

	return cmsSeedRefs{
		PageContentTypeID: pageContentTypeID,
		PostContentTypeID: postContentTypeID,
		TemplateID:        seedTemplateID,
	}, nil
}

func ensureLocale(ctx context.Context, db *bun.DB, code string) error {
	if strings.TrimSpace(code) == "" {
		return fmt.Errorf("locale code is required")
	}
	var existing localeRow
	err := db.NewSelect().
		Model(&existing).
		Where("code = ?", strings.ToLower(code)).
		Scan(ctx)
	switch {
	case err == nil:
		return nil
	case errors.Is(err, sql.ErrNoRows):
		now := time.Now().UTC()
		_, execErr := db.NewInsert().
			Model(&localeRow{
				ID:        uuid.NewSHA1(cmsSeedNamespace, []byte(code)),
				Code:      strings.ToLower(code),
				Display:   strings.ToUpper(code),
				IsActive:  true,
				IsDefault: true,
				Metadata:  map[string]any{},
				CreatedAt: now,
			}).
			On("CONFLICT (code) DO NOTHING").
			Exec(ctx)
		return execErr
	default:
		return err
	}
}

func ensureTheme(ctx context.Context, db *bun.DB) error {
	var existing themeRow
	err := db.NewSelect().
		Model(&existing).
		Where("name = ?", "admin-demo").
		Scan(ctx)
	if err == nil {
		if existing.ID != seedThemeID {
			return fmt.Errorf("theme admin-demo already exists with id %s (expected %s)", existing.ID, seedThemeID)
		}
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	now := time.Now().UTC()
	_, execErr := db.NewInsert().
		Model(&themeRow{
			ID:        seedThemeID,
			Name:      "admin-demo",
			Version:   "1.0.0",
			IsActive:  true,
			ThemePath: "themes/admin-demo",
			Config:    map[string]any{},
			CreatedAt: now,
			UpdatedAt: now,
		}).
		On("CONFLICT (id) DO NOTHING").
		Exec(ctx)
	return execErr
}

func ensureTemplate(ctx context.Context, db *bun.DB) error {
	var existing templateRow
	err := db.NewSelect().
		Model(&existing).
		Where("slug = ? AND theme_id = ?", "page-default", seedThemeID).
		Scan(ctx)
	if err == nil {
		if existing.ID != seedTemplateID {
			return fmt.Errorf("template page-default already exists with id %s (expected %s)", existing.ID, seedTemplateID)
		}
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	now := time.Now().UTC()
	regions := map[string]any{
		"main": map[string]any{
			"name":            "Main",
			"accepts_blocks":  true,
			"accepts_widgets": true,
		},
	}
	_, execErr := db.NewInsert().
		Model(&templateRow{
			ID:           seedTemplateID,
			ThemeID:      seedThemeID,
			Name:         "Default Page",
			Slug:         "page-default",
			TemplatePath: "templates/page.html",
			Regions:      regions,
			Metadata:     map[string]any{},
			CreatedAt:    now,
			UpdatedAt:    now,
		}).
		On("CONFLICT (id) DO NOTHING").
		Exec(ctx)
	return execErr
}

func ensureContentTypes(ctx context.Context, db *bun.DB) error {
	blockDefs := map[string]any{
		"hero": map[string]any{
			"type":     "object",
			"required": []string{"_type", "headline"},
			"x-formgen": map[string]any{
				"label":     "Hero",
				"icon":      "star",
				"collapsed": true,
			},
			"properties": map[string]any{
				"_type": map[string]any{
					"const": "hero",
					"x-formgen": map[string]any{
						"readonly": true,
					},
				},
				"headline":    map[string]any{"type": "string"},
				"subheadline": map[string]any{"type": "string"},
				"cta_label":   map[string]any{"type": "string"},
				"cta_url":     map[string]any{"type": "string"},
			},
		},
		"rich_text": map[string]any{
			"type":     "object",
			"required": []string{"_type", "body"},
			"x-formgen": map[string]any{
				"label": "Rich Text",
				"icon":  "text",
			},
			"properties": map[string]any{
				"_type": map[string]any{
					"const": "rich_text",
					"x-formgen": map[string]any{
						"readonly": true,
					},
				},
				"body": map[string]any{
					"type": "string",
					"x-formgen": map[string]any{
						"widget": "wysiwyg",
					},
				},
			},
		},
	}
	pageSchema := map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type":    "object",
		"$defs":   blockDefs,
		"properties": map[string]any{
			"title":          map[string]any{"type": "string"},
			"summary":        map[string]any{"type": "string"},
			"body":           map[string]any{"type": "string"},
			"featured_image": map[string]any{"type": "string"},
			"seo":            map[string]any{"type": "object"},
			"meta":           map[string]any{"type": "object"},
			"markdown":       map[string]any{"type": "object"},
			"locale":         map[string]any{"type": "string"},
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget":   "block",
					"label":    "Page Sections",
					"sortable": true,
				},
				"items": map[string]any{
					"oneOf": []any{
						map[string]any{"$ref": "#/$defs/hero"},
						map[string]any{"$ref": "#/$defs/rich_text"},
					},
				},
			},
		},
	}
	postSchema := map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type":    "object",
		"$defs":   blockDefs,
		"properties": map[string]any{
			"title":          map[string]any{"type": "string"},
			"summary":        map[string]any{"type": "string"},
			"body":           map[string]any{"type": "string"},
			"featured_image": map[string]any{"type": "string"},
			"tags":           map[string]any{"type": "array"},
			"meta":           map[string]any{"type": "object"},
			"seo":            map[string]any{"type": "object"},
			"markdown":       map[string]any{"type": "object"},
			"locale":         map[string]any{"type": "string"},
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget":   "block",
					"label":    "Post Blocks",
					"sortable": true,
				},
				"items": map[string]any{
					"oneOf": []any{
						map[string]any{"$ref": "#/$defs/hero"},
						map[string]any{"$ref": "#/$defs/rich_text"},
					},
				},
			},
		},
	}

	if err := ensureContentType(ctx, db, pageContentTypeID, "page", "Pages managed through go-cms", pageSchema); err != nil {
		return err
	}
	return ensureContentType(ctx, db, postContentTypeID, "post", "Posts managed through go-cms", postSchema)
}

func ensureContentType(ctx context.Context, db *bun.DB, id uuid.UUID, name, description string, schema map[string]any) error {
	var existing contentTypeRow
	err := db.NewSelect().
		Model(&existing).
		Where("name = ?", name).
		Scan(ctx)
	if err == nil {
		if existing.ID != id {
			return fmt.Errorf("content type %s already exists with id %s (expected %s)", name, existing.ID, id)
		}
		if strings.TrimSpace(existing.Slug) == "" {
			slug := contentTypeSlug(name)
			if slug != "" {
				if _, updateErr := db.NewUpdate().
					Model(&contentTypeRow{Slug: slug, UpdatedAt: time.Now().UTC()}).
					Column("slug", "updated_at").
					Where("id = ?", existing.ID).
					Exec(ctx); updateErr != nil {
					return updateErr
				}
			}
		}
		if !reflect.DeepEqual(existing.Schema, schema) {
			if _, updateErr := db.NewUpdate().
				Model(&contentTypeRow{Schema: schema, UpdatedAt: time.Now().UTC()}).
				Column("schema", "updated_at").
				Where("id = ?", existing.ID).
				Exec(ctx); updateErr != nil {
				return updateErr
			}
		}
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	now := time.Now().UTC()
	desc := strings.TrimSpace(description)
	var descPtr *string
	if desc != "" {
		descPtr = &desc
	}
	slug := contentTypeSlug(name)
	_, execErr := db.NewInsert().
		Model(&contentTypeRow{
			ID:           id,
			Name:         name,
			Slug:         slug,
			Description:  descPtr,
			Schema:       schema,
			Capabilities: map[string]any{"translations": true},
			CreatedAt:    now,
			UpdatedAt:    now,
		}).
		On("CONFLICT (id) DO NOTHING").
		Exec(ctx)
	return execErr
}

func contentTypeSlug(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	if slug == "" {
		return ""
	}
	return strings.ReplaceAll(slug, " ", "-")
}

func seedCMSDemoContent(ctx context.Context, db *bun.DB, md interfaces.MarkdownService, contentSvc admin.CMSContentService, menuSvc admin.CMSMenuService, refs cmsSeedRefs, defaultLocale string) error {
	if md == nil && contentSvc == nil {
		return fmt.Errorf("markdown service unavailable")
	}
	if menuSvc == nil {
		return fmt.Errorf("menu service unavailable")
	}
	useContentFallback := contentSvc != nil
	if _, ok := contentSvc.(*admin.InMemoryContentService); ok {
		useContentFallback = false
	}

	heroBlock := func(headline, subheadline, ctaLabel, ctaURL string) map[string]any {
		block := map[string]any{
			"_type":    "hero",
			"headline": headline,
		}
		if subheadline != "" {
			block["subheadline"] = subheadline
		}
		if ctaLabel != "" {
			block["cta_label"] = ctaLabel
		}
		if ctaURL != "" {
			block["cta_url"] = ctaURL
		}
		return block
	}
	richTextBlock := func(body string) map[string]any {
		return map[string]any{
			"_type": "rich_text",
			"body":  body,
		}
	}

	pageSeeds := []contentSeed{
		{
			Slug:    "home",
			Title:   "Home",
			Summary: "Welcome to our website",
			Body:    "Welcome to our website. Explore our content and dashboards.",
			Status:  "published",
			Path:    "/",
			Custom: map[string]any{
				"seo": map[string]any{"title": "Home - Enterprise Admin", "description": "Welcome to Enterprise Admin"},
				"blocks": []map[string]any{
					heroBlock("Enterprise Admin", "Build modular admin experiences with go-cms.", "Explore", "/admin"),
					richTextBlock("The CMS panel now supports schema-driven blocks for pages and posts."),
				},
			},
		},
		{
			Slug:    "about",
			Title:   "About Us",
			Summary: "Learn more about our company",
			Body:    "We build modular admin experiences on top of go-cms.",
			Status:  "published",
			Path:    "/about",
			Custom: map[string]any{
				"seo": map[string]any{"title": "About Us", "description": "Learn more about our company"},
				"blocks": []map[string]any{
					richTextBlock("We build modular admin experiences on top of go-cms and go-formgen."),
				},
			},
		},
		{
			Slug:    "team",
			Title:   "Our Team",
			Summary: "Meet our team members",
			Body:    "A distributed team shipping Go-first admin tooling.",
			Status:  "published",
			Path:    "/about/team",
			Custom: map[string]any{
				"seo": map[string]any{"title": "Our Team", "description": "Meet the team behind Enterprise Admin"},
			},
		},
		{
			Slug:    "contact",
			Title:   "Contact",
			Summary: "Get in touch with us",
			Body:    "Reach us for support, demos, or questions.",
			Status:  "published",
			Path:    "/contact",
			Custom: map[string]any{
				"seo": map[string]any{"title": "Contact", "description": "Get in touch"},
			},
		},
		{
			Slug:    "privacy",
			Title:   "Privacy Policy",
			Summary: "Our privacy policy",
			Body:    "We respect your privacy and protect your data.",
			Status:  "draft",
			Path:    "/privacy",
			Custom: map[string]any{
				"seo": map[string]any{"title": "Privacy Policy", "description": "Our privacy policy"},
			},
		},
	}

	postSeeds := []contentSeed{
		{
			Slug:    "getting-started-go",
			Title:   "Getting Started with Go",
			Summary: "A beginner's guide to Go",
			Body:    "Learn the basics of Go programming and build fast services.",
			Status:  "published",
			Path:    "/posts/getting-started-go",
			Tags:    []string{"go", "programming", "tutorial"},
			Custom: map[string]any{
				"seo": map[string]any{"title": "Getting Started with Go", "description": "A beginner's guide to Go"},
				"blocks": []map[string]any{
					richTextBlock("Start with packages, modules, and fast feedback loops."),
				},
			},
		},
		{
			Slug:    "building-rest-apis",
			Title:   "Building REST APIs",
			Summary: "REST API development guide",
			Body:    "How to build RESTful APIs in Go.",
			Status:  "published",
			Path:    "/posts/building-rest-apis",
			Tags:    []string{"go", "api", "rest"},
			Custom: map[string]any{
				"seo": map[string]any{"title": "Building REST APIs", "description": "REST API development guide"},
				"blocks": []map[string]any{
					richTextBlock("Plan your handlers, use middleware, and add structured logs."),
				},
			},
		},
		{
			Slug:    "company-news-q4-2024",
			Title:   "Company News: Q4 2024",
			Summary: "Our Q4 achievements",
			Body:    "Exciting updates from Q4, including product launches.",
			Status:  "published",
			Path:    "/posts/company-news-q4-2024",
			Tags:    []string{"news", "company"},
			Custom: map[string]any{
				"seo": map[string]any{"title": "Company News Q4 2024", "description": "Our Q4 achievements"},
			},
		},
		{
			Slug:    "database-optimization",
			Title:   "Database Optimization Tips",
			Summary: "Improve your database performance",
			Body:    "Tips for optimizing database queries.",
			Status:  "draft",
			Path:    "/posts/database-optimization",
			Tags:    []string{"database", "optimization"},
			Custom: map[string]any{
				"seo": map[string]any{"title": "Database Optimization", "description": "Improve your database performance"},
			},
		},
		{
			Slug:    "upcoming-features-2025",
			Title:   "Upcoming Features in 2025",
			Summary: "Preview of 2025 features",
			Body:    "What's coming in 2025 for go-admin and go-cms.",
			Status:  "scheduled",
			Path:    "/posts/upcoming-features-2025",
			Tags:    []string{"news", "roadmap"},
			Custom: map[string]any{
				"seo": map[string]any{"title": "Upcoming Features", "description": "Preview of 2025 features"},
			},
		},
	}

	pageOpts := interfaces.ImportOptions{
		ContentTypeID:                   refs.PageContentTypeID,
		AuthorID:                        seedAuthorID,
		CreatePages:                     true,
		TemplateID:                      &refs.TemplateID,
		ContentAllowMissingTranslations: true,
		PageAllowMissingTranslations:    true,
	}
	if md != nil {
		for _, seed := range pageSeeds {
			if err := importSeed(ctx, md, seed, pageOpts, defaultLocale); err != nil && !useContentFallback {
				return err
			}
		}
	}

	postOpts := interfaces.ImportOptions{
		ContentTypeID:                   refs.PostContentTypeID,
		AuthorID:                        seedAuthorID,
		CreatePages:                     true,
		TemplateID:                      &refs.TemplateID,
		ContentAllowMissingTranslations: true,
		PageAllowMissingTranslations:    true,
	}
	if md != nil {
		for _, seed := range postSeeds {
			if err := importSeed(ctx, md, seed, postOpts, defaultLocale); err != nil && !useContentFallback {
				return err
			}
		}
	}

	if useContentFallback {
		if err := ensureSeedContent(ctx, contentSvc, refs, defaultLocale, pageSeeds, postSeeds); err != nil {
			return err
		}
	}

	if err := updatePageParents(ctx, db, map[string]string{"team": "about"}); err != nil {
		return err
	}

	if err := backfillTranslations(ctx, db, defaultLocale, pageSeeds, postSeeds); err != nil {
		return err
	}

	return seedSiteMenu(ctx, menuSvc, defaultLocale)
}

func ensureSeedContent(ctx context.Context, contentSvc admin.CMSContentService, refs cmsSeedRefs, defaultLocale string, pageSeeds, postSeeds []contentSeed) error {
	if contentSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	locale := strings.TrimSpace(defaultLocale)
	if locale == "" {
		locale = "en"
	}

	pageStore := stores.NewCMSPageStore(contentSvc, locale)
	postStore := stores.NewCMSPostStore(contentSvc, locale)
	if pageStore == nil || postStore == nil {
		return fmt.Errorf("content service unavailable")
	}

	pageRows, _, err := pageStore.List(ctx, admin.ListOptions{Filters: map[string]any{"locale": locale}})
	if err != nil {
		return err
	}
	pageSlugs := map[string]struct{}{}
	for _, row := range pageRows {
		slug := strings.TrimSpace(fmt.Sprint(row["slug"]))
		if slug == "" || slug == "<nil>" {
			continue
		}
		pageSlugs[strings.ToLower(slug)] = struct{}{}
	}

	postRows, _, err := postStore.List(ctx, admin.ListOptions{Filters: map[string]any{"locale": locale}})
	if err != nil {
		return err
	}
	postSlugs := map[string]struct{}{}
	for _, row := range postRows {
		slug := strings.TrimSpace(fmt.Sprint(row["slug"]))
		if slug == "" || slug == "<nil>" {
			continue
		}
		postSlugs[strings.ToLower(slug)] = struct{}{}
	}

	for _, seed := range pageSeeds {
		slug := strings.ToLower(strings.TrimSpace(seed.Slug))
		if slug == "" {
			continue
		}
		if _, exists := pageSlugs[slug]; exists {
			continue
		}
		seoTitle, seoDescription := seedSEO(seed)
		record := map[string]any{
			"title":            seed.Title,
			"slug":             seed.Slug,
			"content":          seed.Body,
			"status":           seed.Status,
			"locale":           locale,
			"path":             normalizePath(seed.Path, seed.Slug),
			"meta_title":       seoTitle,
			"meta_description": seoDescription,
			"template_id":      refs.TemplateID.String(),
		}
		if seed.Custom != nil {
			if blocks, ok := seed.Custom["blocks"]; ok {
				record["blocks"] = blocks
			}
		}
		if _, err := pageStore.Create(ctx, record); err != nil {
			return fmt.Errorf("seed page %s: %w", seed.Slug, err)
		}
	}

	for _, seed := range postSeeds {
		slug := strings.ToLower(strings.TrimSpace(seed.Slug))
		if slug == "" {
			continue
		}
		if _, exists := postSlugs[slug]; exists {
			continue
		}
		seoTitle, seoDescription := seedSEO(seed)
		record := map[string]any{
			"title":            seed.Title,
			"slug":             seed.Slug,
			"content":          seed.Body,
			"excerpt":          seed.Summary,
			"status":           seed.Status,
			"locale":           locale,
			"path":             normalizePath(seed.Path, seed.Slug),
			"meta_title":       seoTitle,
			"meta_description": seoDescription,
			"tags":             append([]string{}, seed.Tags...),
		}
		if seed.Custom != nil {
			if blocks, ok := seed.Custom["blocks"]; ok {
				record["blocks"] = blocks
			}
		}
		if _, err := postStore.Create(ctx, record); err != nil {
			return fmt.Errorf("seed post %s: %w", seed.Slug, err)
		}
	}

	return nil
}

func importSeed(ctx context.Context, md interfaces.MarkdownService, seed contentSeed, opts interfaces.ImportOptions, locale string) error {
	custom := cloneAnyMap(seed.Custom)
	if custom == nil {
		custom = map[string]any{}
	}
	if seed.Tags != nil {
		custom["tags"] = append([]string(nil), seed.Tags...)
	}
	if seed.Path != "" {
		if custom["path"] == nil {
			custom["path"] = seed.Path
		}
	}

	bodyBytes := []byte(strings.TrimSpace(seed.Body))
	checksum := sha256.Sum256(bodyBytes)
	doc := &interfaces.Document{
		FilePath: seed.Slug + ".md",
		Locale:   locale,
		FrontMatter: interfaces.FrontMatter{
			Title:   seed.Title,
			Slug:    seed.Slug,
			Summary: seed.Summary,
			Status:  seed.Status,
			Tags:    append([]string(nil), seed.Tags...),
			Custom:  cloneAnyMap(custom),
			Raw:     cloneAnyMap(custom),
		},
		Body:         bodyBytes,
		Checksum:     checksum[:],
		LastModified: time.Now().UTC(),
	}
	if _, err := md.Import(ctx, doc, opts); err != nil {
		return fmt.Errorf("import %s: %w", seed.Slug, err)
	}
	return nil
}

func updatePageParents(ctx context.Context, db *bun.DB, parents map[string]string) error {
	if len(parents) == 0 {
		return nil
	}
	slugSet := map[string]struct{}{}
	for child, parent := range parents {
		if child != "" {
			slugSet[child] = struct{}{}
		}
		if parent != "" {
			slugSet[parent] = struct{}{}
		}
	}
	slugs := make([]string, 0, len(slugSet))
	for slug := range slugSet {
		slugs = append(slugs, slug)
	}

	var rows []pageRow
	if err := db.NewSelect().Model(&rows).Where("slug IN (?)", bun.In(slugs)).Scan(ctx); err != nil {
		return err
	}
	lookup := map[string]pageRow{}
	for _, row := range rows {
		lookup[strings.ToLower(row.Slug)] = row
	}

	for childSlug, parentSlug := range parents {
		child, ok := lookup[strings.ToLower(childSlug)]
		if !ok || child.ID == uuid.Nil {
			continue
		}
		parent, ok := lookup[strings.ToLower(parentSlug)]
		if !ok || parent.ID == uuid.Nil {
			continue
		}
		if child.ParentID != nil && *child.ParentID == parent.ID {
			continue
		}
		_, err := db.NewUpdate().
			Model(&pageRow{ParentID: &parent.ID}).
			Column("parent_id").
			Where("id = ?", child.ID).
			Exec(ctx)
		if err != nil {
			return fmt.Errorf("set parent for %s: %w", childSlug, err)
		}
	}
	return nil
}

func prtInt(v int) *int {
	o := v
	return &o
}

func seedSiteMenu(ctx context.Context, menuSvc admin.CMSMenuService, defaultLocale string) error {
	locale := strings.TrimSpace(defaultLocale)
	if locale == "" {
		locale = siteMenuLocaleDefault
	}
	items := []admin.MenuItem{
		{
			ID:       "home",
			Label:    "Home",
			Target:   map[string]any{"type": "url", "path": "/"},
			Position: prtInt(1),
			Menu:     SiteNavigationMenuCode,
			Locale:   locale,
		},
		{
			ID:       "about",
			Label:    "About Us",
			Target:   map[string]any{"type": "url", "path": "/about"},
			Position: prtInt(2),
			Menu:     SiteNavigationMenuCode,
			Locale:   locale,
		},
		{
			ID:       "team",
			Label:    "Our Team",
			Target:   map[string]any{"type": "url", "path": "/about/team"},
			Position: prtInt(3),
			Menu:     SiteNavigationMenuCode,
			Locale:   locale,
		},
		{
			ID:       "contact",
			Label:    "Contact",
			Target:   map[string]any{"type": "url", "path": "/contact"},
			Position: prtInt(4),
			Menu:     SiteNavigationMenuCode,
			Locale:   locale,
		},
		{
			ID:       "posts",
			Label:    "Posts",
			Target:   map[string]any{"type": "url", "path": "/posts"},
			Position: prtInt(5),
			Menu:     SiteNavigationMenuCode,
			Locale:   locale,
		},
		{
			ID:       "posts.getting-started-go",
			Label:    "Getting Started with Go",
			Target:   map[string]any{"type": "url", "path": "/posts/getting-started-go"},
			ParentID: "posts",
			Position: prtInt(6),
			Menu:     SiteNavigationMenuCode,
			Locale:   locale,
		},
	}

	return quickstart.SeedNavigation(ctx, quickstart.SeedNavigationOptions{
		MenuSvc:           menuSvc,
		MenuCode:          SiteNavigationMenuCode,
		Items:             items,
		Locale:            locale,
		SkipLogger:        true,
		AutoCreateParents: true,
	})
}

func backfillTranslations(ctx context.Context, db *bun.DB, locale string, pageSeeds, postSeeds []contentSeed) error {
	if db == nil {
		return fmt.Errorf("db is nil")
	}
	code := strings.TrimSpace(locale)
	if code == "" {
		code = siteMenuLocaleDefault
	}

	var loc localeRow
	if err := db.NewSelect().
		Model(&loc).
		Where("LOWER(code) = LOWER(?)", code).
		Scan(ctx); err != nil {
		return fmt.Errorf("lookup locale %s: %w", code, err)
	}

	seeds := append([]contentSeed{}, pageSeeds...)
	seeds = append(seeds, postSeeds...)
	now := time.Now().UTC()

	for _, seed := range seeds {
		var contentID uuid.UUID
		if err := db.NewSelect().
			Table("contents").
			Column("id").
			Where("slug = ?", seed.Slug).
			Scan(ctx, &contentID); err != nil || contentID == uuid.Nil {
			continue
		}

		payload := buildSeedContentPayload(seed)
		summary := strings.TrimSpace(seed.Summary)
		contentTranslation := &contentTranslationRow{
			ID:                 uuid.NewSHA1(cmsSeedNamespace, []byte(seed.Slug+":"+code)),
			ContentID:          contentID,
			LocaleID:           loc.ID,
			TranslationGroupID: &contentID,
			Title:              seed.Title,
			Content:            payload,
			CreatedAt:          now,
			UpdatedAt:          now,
		}
		if summary != "" {
			contentTranslation.Summary = &summary
		}

		if _, err := db.NewInsert().
			Model(contentTranslation).
			On("CONFLICT (content_id, locale_id) DO UPDATE").
			Set("title = EXCLUDED.title").
			Set("summary = EXCLUDED.summary").
			Set("content = EXCLUDED.content").
			Set("translation_group_id = EXCLUDED.translation_group_id").
			Set("updated_at = EXCLUDED.updated_at").
			Exec(ctx); err != nil {
			return fmt.Errorf("seed content translation %s: %w", seed.Slug, err)
		}

		if strings.EqualFold(seed.Status, "published") {
			_, _ = db.NewUpdate().
				TableExpr("contents").
				Set("published_at = COALESCE(published_at, ?)", now).
				Where("id = ?", contentID).
				Exec(ctx)
		}

		var pageID uuid.UUID
		if err := db.NewSelect().
			Table("pages").
			Column("id").
			Where("content_id = ?", contentID).
			Scan(ctx, &pageID); err != nil || pageID == uuid.Nil {
			continue
		}

		seoTitle, seoDescription := seedSEO(seed)
		path := normalizePath(seed.Path, seed.Slug)
		pageTranslation := &pageTranslationRow{
			ID:                 uuid.NewSHA1(cmsSeedNamespace, []byte(seed.Slug+":page:"+code)),
			PageID:             pageID,
			LocaleID:           loc.ID,
			TranslationGroupID: &pageID,
			Title:              seed.Title,
			Path:               path,
			MediaBindings:      map[string]any{},
			CreatedAt:          now,
			UpdatedAt:          now,
		}
		if summary != "" {
			pageTranslation.Summary = &summary
		}
		if seoTitle != "" {
			pageTranslation.SEOTitle = &seoTitle
		}
		if seoDescription != "" {
			pageTranslation.SEODescription = &seoDescription
		}

		if _, err := db.NewInsert().
			Model(pageTranslation).
			On("CONFLICT (page_id, locale_id) DO UPDATE").
			Set("title = EXCLUDED.title").
			Set("path = EXCLUDED.path").
			Set("summary = EXCLUDED.summary").
			Set("seo_title = EXCLUDED.seo_title").
			Set("seo_description = EXCLUDED.seo_description").
			Set("media_bindings = EXCLUDED.media_bindings").
			Set("translation_group_id = EXCLUDED.translation_group_id").
			Set("updated_at = EXCLUDED.updated_at").
			Exec(ctx); err != nil {
			return fmt.Errorf("seed page translation %s: %w", seed.Slug, err)
		}

		if strings.EqualFold(seed.Status, "published") {
			_, _ = db.NewUpdate().
				TableExpr("pages").
				Set("published_at = COALESCE(published_at, ?)", now).
				Where("id = ?", pageID).
				Exec(ctx)
		}
	}

	return nil
}

func buildSeedContentPayload(seed contentSeed) map[string]any {
	seoTitle, seoDescription := seedSEO(seed)
	frontmatter := map[string]any{
		"title":   seed.Title,
		"summary": seed.Summary,
		"status":  seed.Status,
	}
	if len(seed.Tags) > 0 {
		frontmatter["tags"] = append([]string{}, seed.Tags...)
	}
	if seoTitle != "" || seoDescription != "" {
		frontmatter["seo"] = map[string]any{
			"title":       seoTitle,
			"description": seoDescription,
		}
	}

	payload := map[string]any{
		"markdown": map[string]any{
			"frontmatter": frontmatter,
			"body":        seed.Body,
		},
	}

	if len(seed.Custom) > 0 {
		payload["markdown"].(map[string]any)["custom"] = cloneAnyMap(seed.Custom)
	}

	return payload
}

func seedSEO(seed contentSeed) (string, string) {
	meta := cloneAnyMap(seed.Custom)
	seoRaw, ok := meta["seo"].(map[string]any)
	if !ok || len(seoRaw) == 0 {
		return "", ""
	}
	title := strings.TrimSpace(fmt.Sprint(seoRaw["title"]))
	description := strings.TrimSpace(fmt.Sprint(seoRaw["description"]))
	return title, description
}

func normalizePath(path string, slug string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		path = "/" + strings.TrimPrefix(strings.TrimSpace(slug), "/")
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return path
}

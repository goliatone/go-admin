package setup

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"reflect"
	"strings"
	"text/template"
	"time"

	"github.com/goliatone/go-admin/examples/web/data"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"gopkg.in/yaml.v3"
)

var (
	cmsSeedNamespace                     = uuid.MustParse("4e7b7b9f-24c0-4d6a-9e2f-6e5a0cc3d7b7")
	seedAuthorID                         = uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	pageContentTypeID                    = uuid.NewSHA1(cmsSeedNamespace, []byte("content_type:page"))
	postContentTypeID                    = uuid.NewSHA1(cmsSeedNamespace, []byte("content_type:post"))
	newsContentTypeID                    = uuid.NewSHA1(cmsSeedNamespace, []byte("content_type:news"))
	seedThemeID                          = uuid.NewSHA1(cmsSeedNamespace, []byte("theme:admin-demo"))
	seedTemplateID                       = uuid.NewSHA1(cmsSeedNamespace, []byte("template:page-default"))
	siteMenuLocaleDefault                = ""
	translationScenarioMultilingualSlugs = map[string]struct{}{
		"home":                          {},
		"getting-started-go":            {},
		"translation-demo-exchange":     {},
		"translation-demo-queue-active": {},
	}
	// translationScenarioMissingLocale slugs get en/es but NOT fr (for readiness testing)
	translationScenarioMissingLocale = map[string]struct{}{
		"translation-demo-missing-locale": {},
	}
	// translationScenarioReviewPending slugs have es in review state (for publish readiness testing)
	translationScenarioReviewPending = map[string]struct{}{
		"translation-demo-review-pending": {},
	}
)

const cmsContentSeedsFilePath = "content/content.yml"

func translationSeedLocales(defaultLocale string) []string {
	primary := strings.ToLower(strings.TrimSpace(defaultLocale))
	if primary == "" {
		primary = "en"
	}
	seen := map[string]struct{}{}
	add := func(out []string, locale string) []string {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			return out
		}
		if _, ok := seen[normalized]; ok {
			return out
		}
		seen[normalized] = struct{}{}
		return append(out, normalized)
	}

	locales := []string{}
	locales = add(locales, primary)
	for _, locale := range []string{"en", "es", "fr"} {
		locales = add(locales, locale)
	}
	return locales
}

func translationSeedLocalesForSlug(defaultLocale, slug string) []string {
	primary := strings.ToLower(strings.TrimSpace(defaultLocale))
	if primary == "" {
		primary = "en"
	}
	slug = strings.ToLower(strings.TrimSpace(slug))

	// Missing locale scenario: seed en/es but NOT fr (for readiness testing)
	if _, ok := translationScenarioMissingLocale[slug]; ok {
		return []string{primary, "es"}
	}

	// Review pending scenario: seed en/es only (es will be in review state)
	if _, ok := translationScenarioReviewPending[slug]; ok {
		return []string{primary, "es"}
	}

	if _, ok := translationScenarioMultilingualSlugs[slug]; !ok {
		return []string{primary}
	}
	return translationSeedLocales(primary)
}

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
	Status       string         `bun:"status"`
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
	Slug    string         `yaml:"slug"`
	Title   string         `yaml:"title"`
	Summary string         `yaml:"summary"`
	Body    string         `yaml:"body"`
	Status  string         `yaml:"status"`
	Path    string         `yaml:"path"`
	Tags    []string       `yaml:"tags"`
	Custom  map[string]any `yaml:"custom"`
}

type cmsContentSeedsFile struct {
	Pages []contentSeed `yaml:"pages"`
	Posts []contentSeed `yaml:"posts"`
}

func loadCMSContentSeeds() ([]contentSeed, []contentSeed, error) {
	fsys := data.SeedsFS()
	raw, err := fs.ReadFile(fsys, cmsContentSeedsFilePath)
	if err != nil {
		return nil, nil, fmt.Errorf("read cms content seeds %s: %w", cmsContentSeedsFilePath, err)
	}

	tmpl, err := template.New("cms-content-seeds").
		Funcs(seedTemplateFuncs()).
		Option("missingkey=zero").
		Parse(string(raw))
	if err != nil {
		return nil, nil, fmt.Errorf("parse cms content seed template: %w", err)
	}

	var rendered bytes.Buffer
	if err := tmpl.Execute(&rendered, nil); err != nil {
		return nil, nil, fmt.Errorf("render cms content seed template: %w", err)
	}

	var payload cmsContentSeedsFile
	if err := yaml.Unmarshal(rendered.Bytes(), &payload); err != nil {
		return nil, nil, fmt.Errorf("decode cms content seeds yaml: %w", err)
	}

	for idx := range payload.Pages {
		seed := &payload.Pages[idx]
		if seed.Custom == nil {
			seed.Custom = map[string]any{}
		}
	}
	for idx := range payload.Posts {
		seed := &payload.Posts[idx]
		if seed.Custom == nil {
			seed.Custom = map[string]any{}
		}
	}

	return payload.Pages, payload.Posts, nil
}

func seedCMSPrereqs(ctx context.Context, db *bun.DB, defaultLocale string) (cmsSeedRefs, error) {
	if db == nil {
		return cmsSeedRefs{}, fmt.Errorf("db is nil")
	}

	defaultLocale = strings.ToLower(strings.TrimSpace(defaultLocale))
	if defaultLocale == "" {
		defaultLocale = "en"
	}
	for _, locale := range translationSeedLocales(defaultLocale) {
		if err := ensureLocale(ctx, db, locale, strings.EqualFold(locale, defaultLocale)); err != nil {
			return cmsSeedRefs{}, err
		}
	}
	themeID, err := ensureTheme(ctx, db)
	if err != nil {
		return cmsSeedRefs{}, err
	}
	templateID, err := ensureTemplate(ctx, db, themeID)
	if err != nil {
		return cmsSeedRefs{}, err
	}
	pageID, postID, err := ensureContentTypes(ctx, db)
	if err != nil {
		return cmsSeedRefs{}, err
	}

	return cmsSeedRefs{
		PageContentTypeID: pageID,
		PostContentTypeID: postID,
		TemplateID:        templateID,
	}, nil
}

func ensureLocale(ctx context.Context, db *bun.DB, code string, isDefault bool) error {
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
				IsDefault: isDefault,
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

func ensureTheme(ctx context.Context, db *bun.DB) (uuid.UUID, error) {
	var existing themeRow
	err := db.NewSelect().
		Model(&existing).
		Where("name = ?", "admin-demo").
		Scan(ctx)
	if err == nil {
		return existing.ID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return uuid.Nil, err
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
	if execErr != nil {
		return uuid.Nil, execErr
	}
	return seedThemeID, nil
}

func ensureTemplate(ctx context.Context, db *bun.DB, themeID uuid.UUID) (uuid.UUID, error) {
	var existing templateRow
	err := db.NewSelect().
		Model(&existing).
		Where("slug = ? AND theme_id = ?", "page-default", themeID).
		Scan(ctx)
	if err == nil {
		return existing.ID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return uuid.Nil, err
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
			ThemeID:      themeID,
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
	if execErr != nil {
		return uuid.Nil, execErr
	}
	return seedTemplateID, nil
}

func ensureContentTypes(ctx context.Context, db *bun.DB) (uuid.UUID, uuid.UUID, error) {
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
			"title": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"slug": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"status": map[string]any{
				"type": "string",
				"enum": []string{
					"draft",
					"published",
					"archived",
				},
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"path":        map[string]any{"type": "string"},
			"template_id": map[string]any{"type": "string"},
			"parent_id":   map[string]any{"type": "string"},
			"published_at": map[string]any{
				"type":   "string",
				"format": "date-time",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"summary":        map[string]any{"type": "string"},
			"content":        map[string]any{"type": "string"},
			"featured_image": map[string]any{"type": "string"},
			"tags": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"meta_title":       map[string]any{"type": "string"},
			"meta_description": map[string]any{"type": "string"},
			"seo":              map[string]any{"type": "object"},
			"meta":             map[string]any{"type": "object"},
			"markdown":         map[string]any{"type": "object"},
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget":   "block-library-picker",
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
			"title": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"slug": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"status": map[string]any{
				"type": "string",
				"enum": []string{
					"draft",
					"published",
					"archived",
				},
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"path": map[string]any{"type": "string"},
			"published_at": map[string]any{
				"type":   "string",
				"format": "date-time",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"category": map[string]any{
				"type": "string",
				"enum": []string{
					"news",
					"updates",
					"guides",
				},
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"author": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"filterable": true,
				},
			},
			"excerpt":        map[string]any{"type": "string"},
			"content":        map[string]any{"type": "string"},
			"featured_image": map[string]any{"type": "string"},
			"tags": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"meta_title":       map[string]any{"type": "string"},
			"meta_description": map[string]any{"type": "string"},
			"meta":             map[string]any{"type": "object"},
			"seo":              map[string]any{"type": "object"},
			"markdown":         map[string]any{"type": "object"},
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget":   "block-library-picker",
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

	pageCapabilities := map[string]any{
		"translations":      true,
		"seo":               true,
		"blocks":            true,
		"tree":              true,
		"structural_fields": true,
		"workflow":          "pages",
		"permissions":       "admin.pages",
		"panel_slug":        "pages",
		"panel_preset":      "editorial",
		"panel_traits":      []string{"editorial"},
		"policy_entity":     "pages",
	}
	postCapabilities := map[string]any{
		"translations":  true,
		"seo":           true,
		"blocks":        true,
		"workflow":      "posts",
		"permissions":   "admin.posts",
		"panel_slug":    "posts",
		"panel_preset":  "editorial",
		"panel_traits":  []string{"editorial"},
		"policy_entity": "posts",
	}
	newsCapabilities := map[string]any{
		"translations":  true,
		"seo":           true,
		"blocks":        true,
		"workflow_id":   "editorial.news",
		"permissions":   "admin.posts",
		"panel_slug":    "news",
		"panel_preset":  "editorial",
		"panel_traits":  []string{"editorial"},
		"policy_entity": "posts",
	}

	if err := validateSeedContentTypeCapabilities([]seedContentTypeSpec{
		{
			Name:         "page",
			Capabilities: pageCapabilities,
			RequiredStrings: map[string]string{
				"workflow":      "pages",
				"permissions":   "admin.pages",
				"panel_slug":    "pages",
				"panel_preset":  "editorial",
				"policy_entity": "pages",
			},
			RequiredBools: map[string]bool{
				"translations":      true,
				"seo":               true,
				"blocks":            true,
				"tree":              true,
				"structural_fields": true,
			},
			RequiredTraits: []string{"editorial"},
		},
		{
			Name:         "post",
			Capabilities: postCapabilities,
			RequiredStrings: map[string]string{
				"workflow":      "posts",
				"permissions":   "admin.posts",
				"panel_slug":    "posts",
				"panel_preset":  "editorial",
				"policy_entity": "posts",
			},
			RequiredBools: map[string]bool{
				"translations": true,
				"seo":          true,
				"blocks":       true,
			},
			RequiredTraits: []string{"editorial"},
		},
		{
			Name:         "news",
			Capabilities: newsCapabilities,
			RequiredStrings: map[string]string{
				"workflow_id":   "editorial.news",
				"permissions":   "admin.posts",
				"panel_slug":    "news",
				"panel_preset":  "editorial",
				"policy_entity": "posts",
			},
			RequiredBools: map[string]bool{
				"translations": true,
				"seo":          true,
				"blocks":       true,
			},
			RequiredTraits: []string{"editorial"},
		},
	}); err != nil {
		return uuid.Nil, uuid.Nil, err
	}

	pageID, err := ensureContentType(ctx, db, pageContentTypeID, "page", "Pages managed through go-cms", "file-text", pageSchema, pageCapabilities, "active")
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	postID, err := ensureContentType(ctx, db, postContentTypeID, "post", "Posts managed through go-cms", "newspaper", postSchema, postCapabilities, "active")
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	if _, err := ensureContentType(ctx, db, newsContentTypeID, "news", "News managed through go-cms", "newspaper", postSchema, newsCapabilities, "active"); err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	return pageID, postID, nil
}

type seedContentTypeSpec struct {
	Name            string
	Capabilities    map[string]any
	RequiredStrings map[string]string
	RequiredBools   map[string]bool
	RequiredTraits  []string
}

func validateSeedContentTypeCapabilities(seeds []seedContentTypeSpec) error {
	if len(seeds) == 0 {
		return nil
	}
	panelSlugs := map[string]string{}
	for _, seed := range seeds {
		if seed.Name == "" {
			return fmt.Errorf("seed content type name required")
		}
		if seed.Capabilities == nil {
			return fmt.Errorf("seed content type %s missing capabilities", seed.Name)
		}
		for key, expected := range seed.RequiredStrings {
			value := capabilityString(seed.Capabilities, key)
			if value == "" {
				return fmt.Errorf("seed content type %s missing capability %s", seed.Name, key)
			}
			if !strings.EqualFold(value, expected) {
				return fmt.Errorf("seed content type %s capability %s must be %q", seed.Name, key, expected)
			}
		}
		for key, expected := range seed.RequiredBools {
			value, ok := capabilityBool(seed.Capabilities, key)
			if !ok {
				return fmt.Errorf("seed content type %s missing capability %s", seed.Name, key)
			}
			if value != expected {
				return fmt.Errorf("seed content type %s capability %s must be %t", seed.Name, key, expected)
			}
		}
		for _, required := range seed.RequiredTraits {
			if !capabilityStringSliceContains(seed.Capabilities, required, "panel_traits", "panelTraits", "panel-traits") {
				return fmt.Errorf("seed content type %s missing panel trait %s", seed.Name, required)
			}
		}
		panelSlug := capabilityString(seed.Capabilities, "panel_slug", "panelSlug", "panel-slug")
		if panelSlug == "" {
			return fmt.Errorf("seed content type %s missing capability panel_slug", seed.Name)
		}
		normalized := strings.ToLower(panelSlug)
		if existing, ok := panelSlugs[normalized]; ok {
			return fmt.Errorf("panel_slug %s is duplicated by %s and %s", panelSlug, existing, seed.Name)
		}
		panelSlugs[normalized] = seed.Name
	}
	return nil
}

func capabilityStringSliceContains(capabilities map[string]any, target string, keys ...string) bool {
	target = strings.ToLower(strings.TrimSpace(target))
	if target == "" {
		return false
	}
	values := capabilityStringSlice(capabilities, keys...)
	for _, value := range values {
		if strings.ToLower(strings.TrimSpace(value)) == target {
			return true
		}
	}
	return false
}

func capabilityStringSlice(capabilities map[string]any, keys ...string) []string {
	if capabilities == nil || len(keys) == 0 {
		return nil
	}
	out := []string{}
	seen := map[string]struct{}{}
	add := func(raw string) {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return
		}
		normalized := strings.ToLower(trimmed)
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		out = append(out, trimmed)
	}
	for _, key := range keys {
		value, ok := capabilities[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			for _, segment := range strings.Split(typed, ",") {
				add(segment)
			}
		case []string:
			for _, segment := range typed {
				add(segment)
			}
		case []any:
			for _, segment := range typed {
				add(fmt.Sprint(segment))
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func capabilityString(capabilities map[string]any, keys ...string) string {
	if capabilities == nil {
		return ""
	}
	if len(keys) == 0 {
		return ""
	}
	for _, key := range keys {
		if value, ok := capabilities[key]; ok {
			trimmed := strings.TrimSpace(fmt.Sprint(value))
			if trimmed != "" {
				return trimmed
			}
		}
	}
	return ""
}

func capabilityBool(capabilities map[string]any, key string) (bool, bool) {
	if capabilities == nil {
		return false, false
	}
	value, ok := capabilities[key]
	if !ok {
		return false, false
	}
	switch typed := value.(type) {
	case bool:
		return typed, true
	case string:
		trimmed := strings.TrimSpace(typed)
		if strings.EqualFold(trimmed, "true") {
			return true, true
		}
		if strings.EqualFold(trimmed, "false") {
			return false, true
		}
	case int:
		return typed != 0, true
	case int64:
		return typed != 0, true
	case float64:
		return typed != 0, true
	}
	return false, false
}

func ensureContentType(ctx context.Context, db *bun.DB, id uuid.UUID, name, description, icon string, schema map[string]any, capabilities map[string]any, status string) (uuid.UUID, error) {
	desiredStatus := strings.TrimSpace(status)
	if desiredStatus == "" {
		desiredStatus = "active"
	}
	if capabilities == nil {
		capabilities = map[string]any{"translations": true}
	}
	desiredIcon := strings.TrimSpace(icon)
	var desiredIconPtr *string
	if desiredIcon != "" {
		desiredIconPtr = &desiredIcon
	}

	var existing contentTypeRow
	err := db.NewSelect().
		Model(&existing).
		Where("name = ?", name).
		Scan(ctx)
	if err == nil {
		actualID := existing.ID
		updates := contentTypeRow{UpdatedAt: time.Now().UTC()}
		columns := []string{"updated_at"}
		if strings.TrimSpace(existing.Slug) == "" {
			if slug := contentTypeSlug(name); slug != "" {
				updates.Slug = slug
				columns = append(columns, "slug")
			}
		}
		if !reflect.DeepEqual(existing.Schema, schema) {
			updates.Schema = schema
			columns = append(columns, "schema")
		}
		if !reflect.DeepEqual(existing.Capabilities, capabilities) {
			updates.Capabilities = capabilities
			columns = append(columns, "capabilities")
		}
		existingIcon := strings.TrimSpace(derefString(existing.Icon))
		if existingIcon != desiredIcon || (existing.Icon == nil && desiredIconPtr != nil) || (existing.Icon != nil && desiredIconPtr == nil) {
			updates.Icon = desiredIconPtr
			columns = append(columns, "icon")
		}
		if !strings.EqualFold(strings.TrimSpace(existing.Status), desiredStatus) {
			updates.Status = desiredStatus
			columns = append(columns, "status")
		}
		if len(columns) > 1 {
			if _, updateErr := db.NewUpdate().
				Model(&updates).
				Column(columns...).
				Where("id = ?", existing.ID).
				Exec(ctx); updateErr != nil {
				return uuid.Nil, updateErr
			}
		}
		return actualID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return uuid.Nil, err
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
			Capabilities: capabilities,
			Icon:         desiredIconPtr,
			Status:       desiredStatus,
			CreatedAt:    now,
			UpdatedAt:    now,
		}).
		On("CONFLICT (id) DO NOTHING").
		Exec(ctx)
	if execErr != nil {
		return uuid.Nil, execErr
	}
	return id, nil
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
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

	pageSeeds, postSeeds, err := loadCMSContentSeeds()
	if err != nil {
		return err
	}

	pageOpts := interfaces.ImportOptions{
		ContentTypeID:                   refs.PageContentTypeID,
		AuthorID:                        seedAuthorID,
		ContentAllowMissingTranslations: true,
	}
	if md != nil {
		for _, seed := range pageSeeds {
			if err := importSeed(ctx, md, seed, pageOpts, seedLocale(seed, defaultLocale)); err != nil && !useContentFallback {
				return err
			}
		}
	}

	postOpts := interfaces.ImportOptions{
		ContentTypeID:                   refs.PostContentTypeID,
		AuthorID:                        seedAuthorID,
		ContentAllowMissingTranslations: true,
	}
	if md != nil {
		for _, seed := range postSeeds {
			if err := importSeed(ctx, md, seed, postOpts, seedLocale(seed, defaultLocale)); err != nil && !useContentFallback {
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
			"summary":          seed.Summary,
			"status":           seed.Status,
			"locale":           locale,
			"path":             normalizePath(seed.Path, seed.Slug),
			"meta_title":       seoTitle,
			"meta_description": seoDescription,
			"template_id":      refs.TemplateID.String(),
			"tags":             append([]string{}, seed.Tags...),
		}
		mergeSeedCustomFields(record, seed.Custom, "blocks")
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
			"summary":          seed.Summary,
			"status":           seed.Status,
			"locale":           locale,
			"path":             normalizePath(seed.Path, seed.Slug),
			"meta_title":       seoTitle,
			"meta_description": seoDescription,
			"tags":             append([]string{}, seed.Tags...),
		}
		mergeSeedCustomFields(record, seed.Custom, "blocks")
		if seed.Custom != nil {
			if category := strings.TrimSpace(fmt.Sprint(seed.Custom["category"])); category != "" && category != "<nil>" {
				record["category"] = category
			}
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

func mergeSeedCustomFields(record map[string]any, custom map[string]any, excluded ...string) {
	if record == nil || len(custom) == 0 {
		return
	}
	exclude := map[string]struct{}{}
	for _, key := range excluded {
		normalized := strings.ToLower(strings.TrimSpace(key))
		if normalized == "" {
			continue
		}
		exclude[normalized] = struct{}{}
	}
	for key, value := range custom {
		normalized := strings.ToLower(strings.TrimSpace(key))
		if normalized == "" {
			continue
		}
		if _, blocked := exclude[normalized]; blocked {
			continue
		}
		record[key] = value
	}
}

func importSeed(ctx context.Context, md interfaces.MarkdownService, seed contentSeed, opts interfaces.ImportOptions, locale string) error {
	custom := cloneAnyMap(seed.Custom)
	if custom == nil {
		custom = map[string]any{}
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

func seedLocale(seed contentSeed, fallback string) string {
	locale := strings.ToLower(strings.TrimSpace(fallback))
	if locale == "" {
		locale = "en"
	}
	if seed.Custom == nil {
		return locale
	}
	customLocale := strings.ToLower(strings.TrimSpace(fmt.Sprint(seed.Custom["locale"])))
	if customLocale == "" || customLocale == "<nil>" {
		return locale
	}
	return customLocale
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
	defaultCode := strings.ToLower(strings.TrimSpace(locale))
	if defaultCode == "" {
		defaultCode = "en"
	}

	localeLookup := map[string]localeRow{}
	for _, code := range translationSeedLocales(defaultCode) {
		var loc localeRow
		if err := db.NewSelect().
			Model(&loc).
			Where("LOWER(code) = LOWER(?)", code).
			Scan(ctx); err != nil {
			return fmt.Errorf("lookup locale %s: %w", code, err)
		}
		localeLookup[strings.ToLower(code)] = loc
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

		targetLocales := translationSeedLocalesForSlug(defaultCode, seed.Slug)
		for _, targetLocale := range targetLocales {
			loc, ok := localeLookup[strings.ToLower(targetLocale)]
			if !ok {
				return fmt.Errorf("seed locale unavailable for %s", targetLocale)
			}

			payload := buildSeedContentPayload(seed)
			summary := strings.TrimSpace(seed.Summary)
			contentTranslation := &contentTranslationRow{
				ID:                 uuid.NewSHA1(cmsSeedNamespace, []byte(seed.Slug+":"+targetLocale)),
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
				return fmt.Errorf("seed content translation %s (%s): %w", seed.Slug, targetLocale, err)
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
				ID:                 uuid.NewSHA1(cmsSeedNamespace, []byte(seed.Slug+":page:"+targetLocale)),
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
				return fmt.Errorf("seed page translation %s (%s): %w", seed.Slug, targetLocale, err)
			}

			if strings.EqualFold(seed.Status, "published") {
				_, _ = db.NewUpdate().
					TableExpr("pages").
					Set("published_at = COALESCE(published_at, ?)", now).
					Where("id = ?", pageID).
					Exec(ctx)
			}
		}
	}

	return nil
}

func buildSeedContentPayload(seed contentSeed) map[string]any {
	seoTitle, seoDescription := seedSEO(seed)
	path := normalizePath(seed.Path, seed.Slug)
	frontmatter := map[string]any{
		"title":   seed.Title,
		"summary": seed.Summary,
		"status":  seed.Status,
	}
	if path != "" {
		frontmatter["path"] = path
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

	custom := cloneAnyMap(seed.Custom)
	if custom == nil {
		custom = map[string]any{}
	}
	if len(custom) > 0 {
		payload["markdown"].(map[string]any)["custom"] = custom
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

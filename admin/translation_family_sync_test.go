package admin

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"sort"
	"testing"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestTranslationFamilySyncKeepsLocaleVariantsForSharedPageRecordID(t *testing.T) {
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"bo": {{
				ID:               "page-privacy",
				FamilyID:         "family-privacy",
				Locale:           "bo",
				Title:            "Privacy BO",
				Slug:             "privacy",
				Status:           "published",
				AvailableLocales: []string{"bo", "en", "zh"},
			}},
			"en": {{
				ID:               "page-privacy",
				FamilyID:         "family-privacy",
				Locale:           "en",
				Title:            "Privacy",
				Slug:             "privacy",
				Status:           "published",
				AvailableLocales: []string{"bo", "en", "zh"},
			}},
			"zh": {{
				ID:               "page-privacy",
				FamilyID:         "family-privacy",
				Locale:           "zh",
				Title:            "Privacy ZH",
				Slug:             "privacy",
				Status:           "published",
				AvailableLocales: []string{"bo", "en", "zh"},
			}},
		},
	}
	adm := &Admin{contentSvc: content, config: Config{DefaultLocale: "en"}}

	families, err := translationFamilySyncFamilies(context.Background(), adm, []string{"bo", "en", "zh"}, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}
	family := families["family-privacy"]
	if family.SourceVariantID != "page-privacy::en" {
		t.Fatalf("source variant id = %q, want localized en variant", family.SourceVariantID)
	}
	if got := sortedFamilyVariantIDs(family); !equalStrings(got, []string{"page-privacy::bo", "page-privacy::en", "page-privacy::zh"}) {
		t.Fatalf("variant ids = %#v", got)
	}
	for _, variant := range family.Variants {
		if variant.SourceRecordID != "page-privacy" {
			t.Fatalf("variant %s source record id = %q", variant.ID, variant.SourceRecordID)
		}
	}
}

func TestTranslationFamilySyncAppliesSingleTenantDefaultScope(t *testing.T) {
	const (
		defaultTenant = "tenant-default"
		defaultOrg    = "org-default"
	)
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"en": {{
				ID:               "page-global",
				FamilyID:         "family-global",
				Locale:           "en",
				Title:            "Global Page",
				Slug:             "global-page",
				Status:           "published",
				AvailableLocales: []string{"en"},
			}},
		},
		contentsByLocale: map[string][]CMSContent{
			"en": {{
				ID:               "post-explicit",
				FamilyID:         "family-explicit",
				Locale:           "en",
				ContentType:      "posts",
				ContentTypeSlug:  "posts",
				Title:            "Explicit Post",
				Slug:             "explicit-post",
				Status:           "published",
				AvailableLocales: []string{"en"},
				Metadata:         map[string]any{"tenant_id": "tenant-explicit", "org_id": "org-explicit"},
			}},
		},
	}
	adm := &Admin{
		contentSvc: content,
		config: Config{
			DefaultLocale:   "en",
			ScopeMode:       "single",
			DefaultTenantID: defaultTenant,
			DefaultOrgID:    defaultOrg,
		},
	}

	families, err := translationFamilySyncFamilies(context.Background(), adm, []string{"en"}, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}

	defaulted := families["family-global"]
	if defaulted.TenantID != defaultTenant || defaulted.OrgID != defaultOrg {
		t.Fatalf("defaulted family scope = (%q, %q), want (%q, %q)", defaulted.TenantID, defaulted.OrgID, defaultTenant, defaultOrg)
	}
	if len(defaulted.Variants) != 1 {
		t.Fatalf("defaulted variants = %d, want 1", len(defaulted.Variants))
	}
	if defaulted.Variants[0].TenantID != defaultTenant || defaulted.Variants[0].OrgID != defaultOrg {
		t.Fatalf("defaulted variant scope = (%q, %q), want (%q, %q)", defaulted.Variants[0].TenantID, defaulted.Variants[0].OrgID, defaultTenant, defaultOrg)
	}

	explicit := families["family-explicit"]
	if explicit.TenantID != "tenant-explicit" || explicit.OrgID != "org-explicit" {
		t.Fatalf("explicit family scope = (%q, %q), want explicit scope", explicit.TenantID, explicit.OrgID)
	}
	if len(explicit.Variants) != 1 {
		t.Fatalf("explicit variants = %d, want 1", len(explicit.Variants))
	}
	if explicit.Variants[0].TenantID != "tenant-explicit" || explicit.Variants[0].OrgID != "org-explicit" {
		t.Fatalf("explicit variant scope = (%q, %q), want explicit scope", explicit.Variants[0].TenantID, explicit.Variants[0].OrgID)
	}
}

func TestTranslationFamilySyncDoesNotDefaultScopeInMultiTenantMode(t *testing.T) {
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"en": {{
				ID:               "page-unscoped",
				FamilyID:         "family-unscoped",
				Locale:           "en",
				Title:            "Unscoped Page",
				Slug:             "unscoped-page",
				Status:           "published",
				AvailableLocales: []string{"en"},
			}},
		},
	}
	adm := &Admin{
		contentSvc: content,
		config: Config{
			DefaultLocale:   "en",
			ScopeMode:       "multi",
			DefaultTenantID: "tenant-default",
			DefaultOrgID:    "org-default",
		},
	}

	families, err := translationFamilySyncFamilies(context.Background(), adm, []string{"en"}, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}

	family := families["family-unscoped"]
	if family.TenantID != "" || family.OrgID != "" {
		t.Fatalf("multi-tenant family scope = (%q, %q), want blank", family.TenantID, family.OrgID)
	}
	if len(family.Variants) != 1 {
		t.Fatalf("variants = %d, want 1", len(family.Variants))
	}
	if family.Variants[0].TenantID != "" || family.Variants[0].OrgID != "" {
		t.Fatalf("multi-tenant variant scope = (%q, %q), want blank", family.Variants[0].TenantID, family.Variants[0].OrgID)
	}
}

func TestTranslationFamilySyncSingleTenantBunDetailIntegration(t *testing.T) {
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(newTranslationFamilyStoreSQLiteDB(t))
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"en": {{
				ID:               "page-single-scope",
				FamilyID:         "family-single-scope",
				Locale:           "en",
				Title:            "Single Scope",
				Slug:             "single-scope",
				Status:           "published",
				AvailableLocales: []string{"en"},
				Data:             map[string]any{"body": "Hello scoped world"},
			}},
		},
	}
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	adm.contentSvc = content
	adm.WithTranslationFamilyStore(store)
	adm.WithTranslationPolicy(readinessPolicyByEntityStub{
		requirements: map[string]TranslationRequirements{
			"pages": {
				Locales:        []string{"fr"},
				RequiredFields: map[string][]string{"fr": {"title"}},
			},
		},
	})

	if err := SyncTranslationFamilyStore(ctx, adm, "production"); err != nil {
		t.Fatalf("sync translation family store: %v", err)
	}

	family, ok, err := store.FamilyQuery(ctx, translationservices.GetFamilyInput{
		FamilyID: "family-single-scope",
		Scope:    translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
	})
	if err != nil {
		t.Fatalf("family query: %v", err)
	}
	if !ok {
		t.Fatalf("expected synced single-tenant family")
	}
	if family.TenantID != "tenant-1" || family.OrgID != "org-1" {
		t.Fatalf("family scope = (%q, %q), want tenant-1/org-1", family.TenantID, family.OrgID)
	}
	if len(family.Variants) != 1 || family.Variants[0].TenantID != "tenant-1" || family.Variants[0].OrgID != "org-1" {
		t.Fatalf("variant scope not defaulted: %+v", family.Variants)
	}
	if len(family.Blockers) != 1 || family.Blockers[0].TenantID != "tenant-1" || family.Blockers[0].OrgID != "org-1" {
		t.Fatalf("blocker scope not defaulted: %+v", family.Blockers)
	}

	app := newTranslationFamilyTestApp(t, newTranslationFamilyBinding(adm))
	status, payload := doTranslationFamilyJSONRequest(t, app, http.MethodGet, "/admin/api/translations/families/family-single-scope?channel=production&tenant_id=tenant-evil&org_id=org-evil", nil, nil)
	if status != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if got := toString(data["family_id"]); got != "family-single-scope" {
		t.Fatalf("detail family_id = %q, want family-single-scope", got)
	}
	blockers := testAnySlice(t, data["blockers"], "data.blockers")
	if len(blockers) != 1 {
		t.Fatalf("expected scoped blocker in detail, got %+v", blockers)
	}
}

func TestTranslationFamilySyncPreservesEditorRowVersion(t *testing.T) {
	ctx := context.Background()
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"en": {{
				ID:               "page-versioned",
				FamilyID:         "family-versioned",
				Locale:           "en",
				Title:            "Versioned",
				Slug:             "versioned",
				Status:           "published",
				AvailableLocales: []string{"en", "fr"},
			}},
			"fr": {{
				ID:               "page-versioned",
				FamilyID:         "family-versioned",
				Locale:           "fr",
				Title:            "Versioned FR",
				Slug:             "versioned-fr",
				Status:           "draft",
				AvailableLocales: []string{"en", "fr"},
				Metadata: map[string]any{
					translationEditorMetadataKey: map[string]any{
						translationEditorRowVersionKey: int64(2),
					},
				},
			}},
		},
	}
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.contentSvc = content
	adm.WithTranslationFamilyStore(store)

	if err := SyncTranslationFamilyStore(ctx, adm, "production"); err != nil {
		t.Fatalf("sync translation family store: %v", err)
	}

	family, ok, err := store.FamilyQuery(ctx, translationservices.GetFamilyInput{
		FamilyID: "family-versioned",
		Scope:    translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
	})
	if err != nil {
		t.Fatalf("family query: %v", err)
	}
	if !ok {
		t.Fatalf("expected synced versioned family")
	}
	variant, ok := translationFamilyVariantByLocale(family, "fr")
	if !ok {
		t.Fatalf("expected fr variant in family: %+v", family.Variants)
	}
	if variant.RowVersion != 2 {
		t.Fatalf("hydrated row_version = %d, want 2", variant.RowVersion)
	}

	var storedVersion int64
	if scanErr := db.QueryRowContext(ctx, `SELECT row_version FROM locale_variants WHERE family_id = ? AND locale = ?`, "family-versioned", "fr").Scan(&storedVersion); scanErr != nil {
		t.Fatalf("select stored row_version: %v", scanErr)
	}
	if storedVersion != 2 {
		t.Fatalf("stored row_version = %d, want 2", storedVersion)
	}

	result, err := store.ListFamiliesQuery(ctx, translationservices.ListFamiliesInput{
		Scope: translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		Page:  1,
	})
	if err != nil {
		t.Fatalf("list families query: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected one listed family, got %d", len(result.Items))
	}
	listedVariant, ok := translationFamilyVariantByLocale(result.Items[0], "fr")
	if !ok {
		t.Fatalf("expected listed fr variant: %+v", result.Items[0].Variants)
	}
	if listedVariant.RowVersion != 2 {
		t.Fatalf("listed row_version = %d, want 2", listedVariant.RowVersion)
	}
}

func TestTranslationFamilySyncPreservesEditorRowVersionForContent(t *testing.T) {
	ctx := context.Background()
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		contentsByLocale: map[string][]CMSContent{
			"en": {{
				ID:               "article-versioned",
				FamilyID:         "family-article-versioned",
				Locale:           "en",
				ContentType:      "article",
				ContentTypeSlug:  "article",
				Title:            "Versioned Article",
				Slug:             "versioned-article",
				Status:           "published",
				AvailableLocales: []string{"en", "fr"},
			}},
			"fr": {{
				ID:               "article-versioned",
				FamilyID:         "family-article-versioned",
				Locale:           "fr",
				ContentType:      "article",
				ContentTypeSlug:  "article",
				Title:            "Versioned Article FR",
				Slug:             "versioned-article-fr",
				Status:           "draft",
				AvailableLocales: []string{"en", "fr"},
				Metadata: map[string]any{
					translationEditorMetadataKey: map[string]any{
						translationEditorRowVersionKey: "4",
					},
				},
			}},
		},
	}
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.contentSvc = content
	adm.WithTranslationFamilyStore(store)

	if err := SyncTranslationFamilyStore(ctx, adm, "production"); err != nil {
		t.Fatalf("sync translation family store: %v", err)
	}

	family, ok, err := store.FamilyQuery(ctx, translationservices.GetFamilyInput{
		FamilyID: "family-article-versioned",
		Scope:    translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
	})
	if err != nil {
		t.Fatalf("family query: %v", err)
	}
	if !ok {
		t.Fatalf("expected synced content family")
	}
	variant, ok := translationFamilyVariantByLocale(family, "fr")
	if !ok {
		t.Fatalf("expected fr variant in content family: %+v", family.Variants)
	}
	if variant.RowVersion != 4 {
		t.Fatalf("content row_version = %d, want 4", variant.RowVersion)
	}
}

func TestTranslationFamilySyncMultiTenantBunLeavesMissingScopeBlank(t *testing.T) {
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(newTranslationFamilyStoreSQLiteDB(t))
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"en": {{
				ID:               "page-multi-scope",
				FamilyID:         "family-multi-scope",
				Locale:           "en",
				Title:            "Multi Scope",
				Slug:             "multi-scope",
				Status:           "published",
				AvailableLocales: []string{"en"},
			}},
		},
	}
	adm := mustNewAdmin(t, Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		ScopeMode:       "multi",
		DefaultTenantID: "tenant-1",
		DefaultOrgID:    "org-1",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.contentSvc = content
	adm.WithTranslationFamilyStore(store)

	if err := SyncTranslationFamilyStore(ctx, adm, "production"); err != nil {
		t.Fatalf("sync translation family store: %v", err)
	}
	family, ok, err := store.Family(ctx, "family-multi-scope")
	if err != nil {
		t.Fatalf("family: %v", err)
	}
	if !ok {
		t.Fatalf("expected synced multi-tenant family")
	}
	if family.TenantID != "" || family.OrgID != "" {
		t.Fatalf("multi-tenant family scope = (%q, %q), want blank", family.TenantID, family.OrgID)
	}
	if len(family.Variants) != 1 || family.Variants[0].TenantID != "" || family.Variants[0].OrgID != "" {
		t.Fatalf("multi-tenant variant scope not blank: %+v", family.Variants)
	}
}

func TestTranslationFamilySyncLocalesIncludeActiveLocaleCatalog(t *testing.T) {
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"bo": {{
				ID:               "page-home",
				FamilyID:         "family-home",
				Locale:           "bo",
				Title:            "Home BO",
				Slug:             "home",
				Status:           "published",
				AvailableLocales: []string{"bo"},
			}},
			"en": {{
				ID:               "page-home",
				FamilyID:         "family-home",
				Locale:           "en",
				Title:            "Home",
				Slug:             "home",
				Status:           "published",
				AvailableLocales: []string{"en"},
			}},
		},
	}
	adm := &Admin{
		contentSvc: content,
		cms: activeLocalesContentContainerStub{
			NoopCMSContainer: NewNoopCMSContainer(),
			locales:          []string{"en", "bo"},
		},
		config: Config{DefaultLocale: "en"},
	}
	binding := &translationFamilyBinding{admin: adm}

	locales, err := translationFamilySyncLocales(context.Background(), adm, binding, "en", "default")
	if err != nil {
		t.Fatalf("translationFamilySyncLocales: %v", err)
	}
	if !equalStrings(locales, []string{"bo", "en"}) {
		t.Fatalf("locales = %#v, want active catalog locales bo/en", locales)
	}
	families, err := translationFamilySyncFamilies(context.Background(), adm, locales, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}
	if got := sortedFamilyVariantIDs(families["family-home"]); !equalStrings(got, []string{"page-home::bo", "page-home::en"}) {
		t.Fatalf("variant ids = %#v, want bo/en variants from active catalog", got)
	}
}

func TestSyncTranslationFamilyStoreForFamilySavesOnlyRequestedFamily(t *testing.T) {
	ctx := context.Background()
	store := translationservices.NewInMemoryFamilyStore()
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"en": {
				{
					ID:               "page-a",
					FamilyID:         "family-a",
					Locale:           "en",
					Title:            "A",
					Slug:             "a",
					Status:           "published",
					AvailableLocales: []string{"en"},
				},
				{
					ID:               "page-b",
					FamilyID:         "family-b",
					Locale:           "en",
					Title:            "B",
					Slug:             "b",
					Status:           "published",
					AvailableLocales: []string{"en"},
				},
			},
		},
	}
	adm := &Admin{
		contentSvc:             content,
		translationFamilyStore: store,
		config:                 Config{DefaultLocale: "en"},
		translationPolicy:      TranslationPolicyFunc(func(context.Context, TranslationPolicyInput) error { return nil }),
	}

	if err := SyncTranslationFamilyStoreForFamily(ctx, adm, "default", "family-a"); err != nil {
		t.Fatalf("SyncTranslationFamilyStoreForFamily: %v", err)
	}
	if _, ok, err := store.Family(ctx, "family-a"); err != nil || !ok {
		t.Fatalf("expected family-a saved, ok=%v err=%v", ok, err)
	}
	if _, ok, err := store.Family(ctx, "family-b"); err != nil || ok {
		t.Fatalf("expected family-b not saved by scoped sync, ok=%v err=%v", ok, err)
	}
}

func TestTranslationFamilyPolicyResolverUsesRequirementsSourceLocaleAndPolicyBlockers(t *testing.T) {
	ctx := context.Background()
	policy := &translationFamilyBlockingPolicy{
		req: TranslationRequirements{
			Locales:      []string{"en", "bo"},
			SourceLocale: "bo",
		},
		err: errors.New("route conflict"),
	}
	adm := &Admin{
		config:            Config{DefaultLocale: "zh"},
		translationPolicy: policy,
	}
	resolver := translationFamilyPolicyResolver{admin: adm}

	familyPolicy, ok, err := resolver.ResolvePolicy(ctx, "archive_event", "default")
	if err != nil || !ok {
		t.Fatalf("ResolvePolicy ok=%v err=%v", ok, err)
	}
	if familyPolicy.SourceLocale != "bo" {
		t.Fatalf("source locale = %q, want requirements source locale bo", familyPolicy.SourceLocale)
	}
	blockers, err := resolver.ResolvePolicyBlockers(ctx, translationservices.FamilyRecord{
		ID:              "family-archive",
		ContentType:     "archive_event",
		SourceLocale:    "bo",
		SourceVariantID: "variant-bo",
		Variants: []translationservices.FamilyVariant{{
			ID:             "variant-bo",
			FamilyID:       "family-archive",
			Locale:         "bo",
			IsSource:       true,
			SourceRecordID: "record-bo",
		}},
	}, familyPolicy, "default")
	if err != nil {
		t.Fatalf("ResolvePolicyBlockers: %v", err)
	}
	if len(blockers) != 1 || blockers[0].BlockerCode != string(translationcore.FamilyBlockerPolicyDenied) || blockers[0].Locale != "bo" {
		t.Fatalf("unexpected blockers: %+v", blockers)
	}
	if blockers[0].Details[translationcore.FamilyBlockerDetailReason] != string(translationcore.FamilyBlockerReasonHostPolicy) {
		t.Fatalf("expected host policy reason, got %+v", blockers[0].Details)
	}
	if blockers[0].Details[translationcore.FamilyBlockerDetailMessage] != "route conflict" {
		t.Fatalf("expected host policy message, got %+v", blockers[0].Details)
	}
	if policy.input.RequestedLocale != "bo" || policy.input.EntityID != "record-bo" {
		t.Fatalf("unexpected validation input: %+v", policy.input)
	}
}

func TestTranslationFamilyPolicyResolverSourceLocaleFallsBackToRequiredEnglishBeforeDefaultLocale(t *testing.T) {
	ctx := context.Background()
	policy := &translationFamilyBlockingPolicy{
		req: TranslationRequirements{
			Locales: []string{"en", "bo", "zh"},
		},
	}
	adm := &Admin{
		config:            Config{DefaultLocale: "bo"},
		translationPolicy: policy,
	}
	resolver := translationFamilyPolicyResolver{admin: adm}

	familyPolicy, ok, err := resolver.ResolvePolicy(ctx, "archive_event", "default")
	if err != nil || !ok {
		t.Fatalf("ResolvePolicy ok=%v err=%v", ok, err)
	}
	if familyPolicy.SourceLocale != "en" {
		t.Fatalf("source locale = %q, want required English before default locale", familyPolicy.SourceLocale)
	}
}

func TestTranslationFamilySyncKeepsRecordIDsWhenLocaleRecordsAreDistinct(t *testing.T) {
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		contentsByLocale: map[string][]CMSContent{
			"bo": {{
				ID:              "archive-bo",
				FamilyID:        "archive-family",
				Locale:          "bo",
				Title:           "Archive BO",
				ContentType:     "archive_event",
				ContentTypeSlug: "archive_event",
				Status:          "published",
			}},
			"en": {{
				ID:              "archive-en",
				FamilyID:        "archive-family",
				Locale:          "en",
				Title:           "Archive",
				ContentType:     "archive_event",
				ContentTypeSlug: "archive_event",
				Status:          "published",
			}},
		},
	}
	adm := &Admin{contentSvc: content, config: Config{DefaultLocale: "en"}}

	families, err := translationFamilySyncFamilies(context.Background(), adm, []string{"bo", "en"}, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}
	family := families["archive-family"]
	if family.SourceVariantID != "archive-en" {
		t.Fatalf("source variant id = %q, want raw en record id", family.SourceVariantID)
	}
	if got := sortedFamilyVariantIDs(family); !equalStrings(got, []string{"archive-bo", "archive-en"}) {
		t.Fatalf("variant ids = %#v", got)
	}
}

func TestBunTranslationFamilyStoreReplacesStaleLocaleVariantIDs(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "bo",
		SourceVariantID: "page-privacy",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-privacy",
			FamilyID:       "family-privacy",
			Locale:         "bo",
			Status:         "published",
			IsSource:       true,
			SourceRecordID: "page-privacy",
		}},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-privacy::bo",
				FamilyID:       "family-privacy",
				Locale:         "bo",
				Status:         "published",
				SourceRecordID: "page-privacy",
			},
			{
				ID:             "page-privacy::en",
				FamilyID:       "family-privacy",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-privacy",
			},
		},
	}); err != nil {
		t.Fatalf("replace stale variants: %v", err)
	}

	family, ok, err := store.Family(ctx, "family-privacy")
	if err != nil {
		t.Fatalf("load family: %v", err)
	}
	if !ok {
		t.Fatal("expected saved family")
	}
	if family.SourceVariantID != "page-privacy::en" {
		t.Fatalf("source variant id = %q", family.SourceVariantID)
	}
	if got := sortedFamilyVariantIDs(family); !equalStrings(got, []string{"page-privacy::bo", "page-privacy::en"}) {
		t.Fatalf("variant ids = %#v", got)
	}
}

func TestBunTranslationFamilyStoreRenamesStaleVariantIDsWithoutDeletingAssignments(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "bo",
		SourceVariantID: "page-privacy",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-privacy",
			FamilyID:       "family-privacy",
			Locale:         "bo",
			Status:         "published",
			IsSource:       true,
			SourceRecordID: "page-privacy",
		}},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	_, err := db.ExecContext(ctx, `INSERT INTO translation_assignments (
		assignment_id, family_id, variant_id, entity_type, source_record_id, source_locale,
		target_locale, work_scope, assignment_type, status, priority, row_version, created_at, updated_at
	) VALUES (
		'assignment-bo', 'family-privacy', 'page-privacy', 'pages', 'page-privacy', 'en',
		'bo', '__all__', 'open_pool', 'open', 'normal', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
	)`)
	if err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-privacy::bo",
				FamilyID:       "family-privacy",
				Locale:         "bo",
				Status:         "published",
				SourceRecordID: "page-privacy",
			},
			{
				ID:             "page-privacy::en",
				FamilyID:       "family-privacy",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-privacy",
			},
		},
	}); err != nil {
		t.Fatalf("rename variants: %v", err)
	}

	var variantID string
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = 'assignment-bo'`).Scan(&variantID); err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	if variantID != "page-privacy::bo" {
		t.Fatalf("assignment variant_id = %q, want page-privacy::bo", variantID)
	}
}

func TestBunTranslationAssignmentRepositoryResolvesLocaleVariantID(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-privacy::bo",
				FamilyID:       "family-privacy",
				Locale:         "bo",
				Status:         "draft",
				SourceRecordID: "page-privacy",
			},
			{
				ID:             "page-privacy::en",
				FamilyID:       "family-privacy",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-privacy",
			},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "family-privacy",
		EntityType:     "pages",
		SourceRecordID: "page-privacy",
		SourceLocale:   "en",
		TargetLocale:   "bo",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if created.VariantID != "page-privacy::bo" {
		t.Fatalf("created variant_id = %q, want page-privacy::bo", created.VariantID)
	}
	var storedVariantID string
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = ?`, created.ID).Scan(&storedVariantID); err != nil {
		t.Fatalf("load stored assignment: %v", err)
	}
	if storedVariantID != "page-privacy::bo" {
		t.Fatalf("stored variant_id = %q, want page-privacy::bo", storedVariantID)
	}
}

func TestBunTranslationAssignmentRepositoryAllowsMissingLocaleAssignment(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "blocked",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-privacy::en",
			FamilyID:       "family-privacy",
			Locale:         "en",
			Status:         "published",
			IsSource:       true,
			SourceRecordID: "page-privacy",
		}},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "family-privacy",
		EntityType:     "pages",
		SourceRecordID: "page-privacy",
		SourceLocale:   "en",
		TargetLocale:   "bo",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create missing-locale assignment: %v", err)
	}
	if created.VariantID != "" {
		t.Fatalf("created variant_id = %q, want empty missing-locale variant", created.VariantID)
	}
	var storedVariantID sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = ?`, created.ID).Scan(&storedVariantID); err != nil {
		t.Fatalf("load stored assignment: %v", err)
	}
	if storedVariantID.Valid {
		t.Fatalf("stored variant_id valid = true, value %q; want SQL NULL", storedVariantID.String)
	}
}

type translationFamilySyncContentStub struct {
	*InMemoryContentService
	pagesByLocale    map[string][]CMSPage
	contentsByLocale map[string][]CMSContent
}

type translationFamilyBlockingPolicy struct {
	req   TranslationRequirements
	err   error
	input TranslationPolicyInput
}

func (p *translationFamilyBlockingPolicy) Requirements(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
	return p.req, true, nil
}

func (p *translationFamilyBlockingPolicy) Validate(_ context.Context, input TranslationPolicyInput) error {
	p.input = input
	return p.err
}

func (s *translationFamilySyncContentStub) Pages(_ context.Context, locale string) ([]CMSPage, error) {
	return append([]CMSPage(nil), s.pagesByLocale[locale]...), nil
}

func (s *translationFamilySyncContentStub) Contents(_ context.Context, locale string) ([]CMSContent, error) {
	return append([]CMSContent(nil), s.contentsByLocale[locale]...), nil
}

func sortedFamilyVariantIDs(family translationservices.FamilyRecord) []string {
	out := make([]string, 0, len(family.Variants))
	for _, variant := range family.Variants {
		out = append(out, variant.ID)
	}
	sort.Strings(out)
	return out
}

func equalStrings(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return false
		}
	}
	return true
}

func newTranslationFamilyStoreSQLiteDB(t *testing.T) *bun.DB {
	t.Helper()
	sqlDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			t.Errorf("close sqlite handle: %v", closeErr)
		}
	})
	db := bun.NewDB(sqlDB, sqlitedialect.New())
	t.Cleanup(func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Errorf("close bun db: %v", closeErr)
		}
	})
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}
	statements := []string{
		`CREATE TABLE content_families (
			family_id TEXT PRIMARY KEY,
			tenant_id TEXT,
			org_id TEXT,
			content_type TEXT NOT NULL,
			source_locale TEXT NOT NULL,
			source_variant_id TEXT,
			readiness_state TEXT NOT NULL,
			blocker_codes_json TEXT NOT NULL DEFAULT '[]',
			missing_required_locale_count INTEGER NOT NULL DEFAULT 0,
			pending_review_count INTEGER NOT NULL DEFAULT 0,
			outdated_locale_count INTEGER NOT NULL DEFAULT 0,
			created_at TEXT,
			updated_at TEXT,
			FOREIGN KEY (source_variant_id, family_id, source_locale)
				REFERENCES locale_variants(variant_id, family_id, locale)
				ON UPDATE CASCADE
				DEFERRABLE INITIALLY DEFERRED
		)`,
		`CREATE TABLE locale_variants (
			variant_id TEXT PRIMARY KEY,
			tenant_id TEXT,
			org_id TEXT,
			family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
			locale TEXT NOT NULL,
			status TEXT NOT NULL,
			is_source BOOLEAN NOT NULL DEFAULT FALSE,
			source_hash_at_last_sync TEXT,
			fields_json TEXT NOT NULL DEFAULT '{}',
			row_version BIGINT NOT NULL DEFAULT 1,
			source_record_id TEXT,
			created_at TEXT,
			updated_at TEXT,
			published_at TEXT,
			UNIQUE (variant_id, family_id, locale),
			UNIQUE (family_id, locale)
			)`,
		`CREATE UNIQUE INDEX ux_locale_variants_one_source_per_family
			ON locale_variants(family_id)
			WHERE is_source`,
		`CREATE TABLE family_blockers (
			family_id TEXT,
			tenant_id TEXT,
			org_id TEXT,
			blocker_code TEXT,
			locale TEXT,
			field_path TEXT,
			details_json TEXT,
			created_at TEXT,
			updated_at TEXT
		)`,
		`CREATE UNIQUE INDEX ux_family_blockers_identity
			ON family_blockers(COALESCE(tenant_id, ''), COALESCE(org_id, ''), family_id, blocker_code, COALESCE(locale, ''), COALESCE(field_path, ''))`,
		`CREATE TABLE translation_assignments (
			assignment_id TEXT PRIMARY KEY,
			tenant_id TEXT,
			org_id TEXT,
			family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
			variant_id TEXT,
			entity_type TEXT,
			source_record_id TEXT,
			source_locale TEXT,
			target_locale TEXT NOT NULL,
			target_record_id TEXT,
			source_title TEXT,
			source_path TEXT,
			work_scope TEXT,
			assignment_type TEXT,
			status TEXT,
			assignee_id TEXT,
			reviewer_id TEXT,
			assigner_id TEXT,
			last_reviewer_id TEXT,
			last_rejection_reason TEXT,
			assigned_at TEXT,
			priority TEXT,
			due_date TEXT,
			row_version BIGINT,
			claimed_at TEXT,
			submitted_at TEXT,
			approved_at TEXT,
			published_at TEXT,
			archived_at TEXT,
			created_at TEXT,
			updated_at TEXT,
			FOREIGN KEY (variant_id, family_id, target_locale)
				REFERENCES locale_variants(variant_id, family_id, locale)
				ON UPDATE CASCADE
				ON DELETE CASCADE
		)`,
	}
	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			t.Fatalf("create schema: %v", err)
		}
	}
	return db
}

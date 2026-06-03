package main

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/quickstart"
	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	cms "github.com/goliatone/go-cms"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

func TestSeedExampleTranslationQueueFixtureCreatesInProgressAssignment(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(ctx, repo, cmsOpts.Container.ContentService(), "", "")
	require.NoError(t, err)

	source, err := findPageBySlug(ctx, cmsOpts.Container.ContentService(), exampleTranslationQueueSourceSlug)
	require.NoError(t, err)
	require.NotNil(t, source)
	expectedGroupID := normalizeFamilyID(source.FamilyID, source.ID)
	require.NotEmpty(t, strings.TrimSpace(expectedGroupID))

	assignments, total, err := repo.List(ctx, coreadmin.ListOptions{Filters: map[string]any{
		"family_id":     expectedGroupID,
		"target_locale": "fr",
	}})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, assignments, 1)

	fixture := assignments[0]
	require.Equal(t, coreadmin.AssignmentStatusInProgress, fixture.Status)
	require.Equal(t, coreadmin.AssignmentTypeDirect, fixture.AssignmentType)
	require.Equal(t, exampleTranslationQueueFallbackUser, fixture.AssigneeID)
	require.Equal(t, exampleTranslationQueueTargetLocale, strings.ToLower(fixture.TargetLocale))
	require.Equal(t, strings.ToLower(strings.TrimSpace(expectedGroupID)), strings.ToLower(fixture.FamilyID))
}

func TestSeedExampleTranslationQueueFixtureSeedsMyWorkAndQueueCoverageForProvidedAssignees(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(
		ctx,
		repo,
		cmsOpts.Container.ContentService(),
		"",
		"",
		"translator-1",
		"translator-2",
	)
	require.NoError(t, err)

	myWorkItems, myWorkTotal, err := repo.List(ctx, coreadmin.ListOptions{
		Filters: map[string]any{"assignee_id": "translator-1"},
	})
	require.NoError(t, err)
	require.GreaterOrEqual(t, myWorkTotal, 1)
	require.NotEmpty(t, myWorkItems)

	queueItems, queueTotal, err := repo.List(ctx, coreadmin.ListOptions{})
	require.NoError(t, err)
	require.GreaterOrEqual(t, queueTotal, 3)
	require.NotEmpty(t, queueItems)

	hasOpenPool := false
	hasAssigned := false
	hasOverdue := false
	for _, item := range queueItems {
		if item.AssignmentType == coreadmin.AssignmentTypeOpenPool &&
			item.Status == coreadmin.AssignmentStatusPending &&
			strings.TrimSpace(item.AssigneeID) == "" {
			hasOpenPool = true
		}
		if item.Status == coreadmin.AssignmentStatusAssigned && strings.TrimSpace(item.AssigneeID) != "" {
			hasAssigned = true
		}
		if item.Status == coreadmin.AssignmentStatusInProgress && item.DueDate != nil && item.DueDate.Before(time.Now().UTC()) {
			hasOverdue = true
		}
	}
	require.True(t, hasOpenPool, "expected seeded open-pool queue fixture assignment")
	require.True(t, hasAssigned, "expected seeded assigned queue fixture assignment")
	require.True(t, hasOverdue, "expected seeded overdue queue fixture assignment")
}

func TestSeedExampleTranslationQueueFixtureRequiresDependencies(t *testing.T) {
	ctx := context.Background()
	err := seedExampleTranslationQueueFixture(ctx, nil, nil, "", "")
	require.Error(t, err)
	require.Contains(t, strings.ToLower(err.Error()), "repository is required")

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(ctx, repo, nil, "", "")
	require.Error(t, err)
	require.Contains(t, strings.ToLower(err.Error()), "content service is required")
}

func TestSeedExampleTranslationQueueFixtureFailsWhenRequiredSourceFixtureMissing(t *testing.T) {
	ctx := context.Background()
	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	contentSvc := coreadmin.NewInMemoryContentService()

	err := seedExampleTranslationQueueFixture(ctx, repo, contentSvc, "", "")
	require.Error(t, err)
	require.Contains(t, strings.ToLower(err.Error()), "source page")
	require.Contains(t, strings.ToLower(err.Error()), "not found")
}

func TestSeedExampleTranslationQueueFixtureAppliesRequestedScope(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	const tenantID = "tenant-demo"
	const orgID = "org-demo"

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(ctx, repo, cmsOpts.Container.ContentService(), tenantID, orgID, "translator-1")
	require.NoError(t, err)

	source, err := findPageBySlug(ctx, cmsOpts.Container.ContentService(), exampleTranslationQueueSourceSlug)
	require.NoError(t, err)
	require.NotNil(t, source)
	actualTenantID := strings.TrimSpace(fmt.Sprint(source.Metadata["tenant_id"]))
	if actualTenantID == "" || actualTenantID == "<nil>" {
		actualTenantID = strings.TrimSpace(fmt.Sprint(source.Data["tenant_id"]))
	}
	actualOrgID := strings.TrimSpace(fmt.Sprint(source.Metadata["org_id"]))
	if actualOrgID == "" || actualOrgID == "<nil>" {
		actualOrgID = strings.TrimSpace(fmt.Sprint(source.Data["org_id"]))
	}
	require.Equal(t, tenantID, actualTenantID)
	require.Equal(t, orgID, actualOrgID)

	assignments, total, err := repo.List(ctx, coreadmin.ListOptions{Filters: map[string]any{
		"assignee_id": "translator-1",
	}})
	require.NoError(t, err)
	require.GreaterOrEqual(t, total, 1)
	require.NotEmpty(t, assignments)
	for _, assignment := range assignments {
		require.Equal(t, tenantID, strings.TrimSpace(assignment.TenantID))
		require.Equal(t, orgID, strings.TrimSpace(assignment.OrgID))
	}
}

func TestSeedExampleTranslationQueueFixtureRepairsLegacyQATargetFamily(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	contentSvc := cmsOpts.Container.ContentService()
	require.NotNil(t, contentSvc)

	source, err := findPageBySlug(ctx, contentSvc, "home")
	require.NoError(t, err)
	require.NotNil(t, source)
	sourceGroupID := normalizeFamilyID(source.FamilyID, source.ID)
	require.NotEmpty(t, strings.TrimSpace(sourceGroupID))

	_, err = contentSvc.CreatePage(ctx, coreadmin.CMSPage{
		Title:    "Guide d'accueil",
		Slug:     "home-fr",
		Locale:   "fr",
		FamilyID: "legacy-home-fr",
		Status:   "draft",
		Data: map[string]any{
			"path": "/home-fr",
			"body": "Legacy orphan target page.",
		},
	})
	require.NoError(t, err)

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(ctx, repo, contentSvc, "", "")
	require.NoError(t, err)

	repairedTarget, err := findPageLocaleVariantForSource(ctx, contentSvc, source, sourceGroupID, "fr")
	require.NoError(t, err)
	require.NotNil(t, repairedTarget)
	require.Equal(t, strings.ToLower(sourceGroupID), strings.ToLower(strings.TrimSpace(repairedTarget.FamilyID)))

	assignment, err := repo.Get(ctx, exampleTranslationQAAssignmentID)
	require.NoError(t, err)
	require.Equal(t, strings.TrimSpace(repairedTarget.ID), strings.TrimSpace(assignment.TargetRecordID))
	require.Equal(t, strings.ToLower(sourceGroupID), strings.ToLower(strings.TrimSpace(assignment.FamilyID)))
	require.Equal(t, coreadmin.AssignmentStatusReview, assignment.Status)
	require.Equal(t, exampleTranslationQueueFallbackUser, strings.TrimSpace(assignment.ReviewerID))
	require.NotNil(t, assignment.SubmittedAt)
}

func TestSeedExampleTranslationQueueFixtureSeedsPersistentBunEditorAssignmentAndScopedFamily(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	db, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	require.NotNil(t, db)

	repo := coreadmin.NewBunTranslationAssignmentRepository(db)
	require.NotNil(t, repo)

	const tenantID = "tenant-demo"
	const orgID = "org-demo"
	familyStore := coreadmin.NewBunTranslationFamilyStore(db)
	require.NotNil(t, familyStore)

	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	cfg.ScopeMode = string(quickstart.ScopeModeMulti)
	cfg.AuthConfig = &coreadmin.AuthConfig{AllowUnauthenticatedRoutes: true}
	cfg.CMS = cmsOpts
	queueEnabled := true
	translationCfg := appcfg.TranslationConfig{
		Profile: "full",
		Queue:   &queueEnabled,
	}
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminDependencies(coreadmin.Dependencies{
			TranslationFamilyStore: familyStore,
		}),
		quickstart.WithFeatureDefaults(map[string]bool{
			string(coreadmin.FeatureCMS): true,
		}),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationPolicyServices(exampleContentBackedPagePolicyServices(t, cmsOpts)),
		quickstart.WithTranslationProductConfig(buildTranslationProductConfig(
			resolveTranslationProfile("full"),
			noopExchangeStore{},
			repo,
			translationCfg,
		)),
	)
	require.NoError(t, err)

	err = seedExampleTranslationQueueFixtureWithFamilySync(
		ctx,
		repo,
		cmsOpts.Container.ContentService(),
		tenantID,
		orgID,
		func(ctx context.Context) error {
			return coreadmin.SyncTranslationFamilyStore(ctx, adm, "default")
		},
		"reviewer-qa",
		"translator-qa",
	)
	require.NoError(t, err)

	assignment, err := repo.Get(ctx, exampleTranslationQAAssignmentID)
	require.NoError(t, err)
	require.Equal(t, tenantID, strings.TrimSpace(assignment.TenantID))
	require.Equal(t, orgID, strings.TrimSpace(assignment.OrgID))
	require.Equal(t, coreadmin.AssignmentStatusInReview, assignment.Status)
	require.NotEmpty(t, strings.TrimSpace(assignment.TargetRecordID))

	require.NoError(t, coreadmin.SyncTranslationFamilyStore(ctx, adm, "default"))

	service := translationservices.FamilyService{Store: familyStore}
	family, ok, err := service.Detail(ctx, translationservices.GetFamilyInput{
		Scope: translationservices.Scope{
			TenantID: tenantID,
			OrgID:    orgID,
		},
		Environment: "default",
		FamilyID:    assignment.FamilyID,
	})
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, tenantID, strings.TrimSpace(family.TenantID))
	require.Equal(t, orgID, strings.TrimSpace(family.OrgID))
}

func TestPersistentExampleFamilySyncProducesMeaningfulReadiness(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	db, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	require.NotNil(t, db)

	familyStore := coreadmin.NewBunTranslationFamilyStore(db)
	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	cfg.ScopeMode = string(quickstart.ScopeModeMulti)
	cfg.AuthConfig = &coreadmin.AuthConfig{AllowUnauthenticatedRoutes: true}
	cfg.CMS = cmsOpts
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminDependencies(coreadmin.Dependencies{
			TranslationFamilyStore: familyStore,
		}),
		quickstart.WithFeatureDefaults(map[string]bool{
			string(coreadmin.FeatureCMS): true,
		}),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationPolicyServices(exampleContentBackedPagePolicyServices(t, cmsOpts)),
	)
	require.NoError(t, err)
	require.NoError(t, coreadmin.SyncTranslationFamilyStore(ctx, adm, "default"))

	missingFR := requireSyncedFamily(t, ctx, familyStore, "11111111-1111-1111-1111-111111111201")
	require.Equal(t, "pages", strings.TrimSpace(missingFR.ContentType))
	requireFamilyBlocker(t, missingFR, string(translationcore.FamilyBlockerMissingLocale), "fr")
	requireNoPolicyUnavailableOnly(t, missingFR)

	reviewPost := requireSyncedFamily(t, ctx, familyStore, "11111111-1111-1111-1111-111111111203")
	require.Equal(t, "posts", strings.TrimSpace(reviewPost.ContentType))
	requireFamilyBlocker(t, reviewPost, string(translationcore.FamilyBlockerPendingReview), "es")
	requireFamilyBlocker(t, reviewPost, string(translationcore.FamilyBlockerMissingField), "es")
	requireNoPolicyUnavailableOnly(t, reviewPost)

	exchangeReady := requireSyncedFamilyWithVariantPath(t, ctx, familyStore, "/translation-demo-exchange")
	require.Equal(t, "pages", strings.TrimSpace(exchangeReady.ContentType))
	require.Equal(t, string(translationcore.FamilyReadinessReady), strings.TrimSpace(exchangeReady.ReadinessState), "family=%s blockers=%+v variants=%+v", exchangeReady.ID, exchangeReady.Blockers, exchangeReady.Variants)
	require.Empty(t, exchangeReady.Blockers)

	for _, tc := range []struct {
		name     string
		familyID string
	}{
		{name: "site-runtime-rollout", familyID: "11111111-1111-1111-1111-111111111206"},
		{name: "menu-projection-preview", familyID: "11111111-1111-1111-1111-111111111207"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			newsFamily := requireSyncedFamily(t, ctx, familyStore, tc.familyID)
			require.Equal(t, "news", strings.TrimSpace(newsFamily.ContentType))
			requireFamilyBlocker(t, newsFamily, string(translationcore.FamilyBlockerMissingField), "es")
			requireFamilyBlocker(t, newsFamily, string(translationcore.FamilyBlockerMissingField), "fr")
			requireNoPolicyUnavailableOnly(t, newsFamily)
		})
	}

	families, err := familyStore.Families(ctx)
	require.NoError(t, err)
	blocked := 0
	barePolicyUnavailable := 0
	for _, family := range families {
		if strings.TrimSpace(family.ReadinessState) != string(translationcore.FamilyReadinessBlocked) {
			continue
		}
		blocked++
		if familyHasOnlyPolicyUnavailableBlockers(family) {
			barePolicyUnavailable++
		}
	}
	require.Positive(t, blocked, "expected seeded dataset to include blocked readiness examples")
	require.NotEqual(t, blocked, barePolicyUnavailable, "blocked seeded families must not all be bare policy-unavailable blockers")
}

func exampleContentBackedPagePolicyServices(t *testing.T, cmsOpts coreadmin.CMSOptions) quickstart.TranslationPolicyServices {
	t.Helper()
	provider, ok := cmsOpts.GoCMSConfig.(interface{ Content() cms.ContentService })
	require.True(t, ok, "expected persistent CMS config to expose a go-cms content checker")
	content := provider.Content()
	require.NotNil(t, content)
	return quickstart.TranslationPolicyServices{
		Pages:   content,
		Content: content,
	}
}

func requireSyncedFamily(t *testing.T, ctx context.Context, store *coreadmin.BunTranslationFamilyStore, familyID string) translationservices.FamilyRecord {
	t.Helper()
	family, ok, err := store.Family(ctx, familyID)
	require.NoError(t, err)
	require.True(t, ok, "expected synced family %s", familyID)
	return family
}

func requireSyncedFamilyWithVariantPath(t *testing.T, ctx context.Context, store *coreadmin.BunTranslationFamilyStore, path string) translationservices.FamilyRecord {
	t.Helper()
	path = strings.TrimSpace(path)
	families, err := store.Families(ctx)
	require.NoError(t, err)
	for _, family := range families {
		for _, variant := range family.Variants {
			if strings.TrimSpace(variant.Fields["path"]) == path {
				return family
			}
		}
	}
	t.Fatalf("expected synced family with variant path %q", path)
	return translationservices.FamilyRecord{}
}

func requireFamilyBlocker(t *testing.T, family translationservices.FamilyRecord, code string, locale string) {
	t.Helper()
	code = strings.TrimSpace(strings.ToLower(code))
	locale = strings.TrimSpace(strings.ToLower(locale))
	for _, blocker := range family.Blockers {
		if strings.TrimSpace(strings.ToLower(blocker.BlockerCode)) != code {
			continue
		}
		if locale == "" || strings.TrimSpace(strings.ToLower(blocker.Locale)) == locale {
			return
		}
	}
	t.Fatalf("expected family %s to include blocker code=%s locale=%s, got %+v", family.ID, code, locale, family.Blockers)
}

func requireNoPolicyUnavailableOnly(t *testing.T, family translationservices.FamilyRecord) {
	t.Helper()
	if familyHasOnlyPolicyUnavailableBlockers(family) {
		t.Fatalf("family %s should not be blocked only by policy-unavailable diagnostics: %+v", family.ID, family.Blockers)
	}
}

func familyHasOnlyPolicyUnavailableBlockers(family translationservices.FamilyRecord) bool {
	if len(family.Blockers) == 0 {
		return false
	}
	for _, blocker := range family.Blockers {
		if strings.TrimSpace(strings.ToLower(blocker.BlockerCode)) != string(translationcore.FamilyBlockerPolicyDenied) {
			return false
		}
		if strings.TrimSpace(fmt.Sprint(blocker.Details[translationcore.FamilyBlockerDetailReason])) != string(translationcore.FamilyBlockerReasonPolicyUnavailable) {
			return false
		}
		if family.MissingRequiredLocaleCount != 0 || family.PendingReviewCount != 0 || family.OutdatedLocaleCount != 0 {
			return false
		}
	}
	return true
}

func TestPersistentAssignmentEditorSaveUsesCMSLifecycleStatus(t *testing.T) {
	_ = commandregistry.Stop(context.Background())
	t.Cleanup(func() {
		_ = commandregistry.Stop(context.Background())
	})

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	db, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	require.NotNil(t, db)

	repo := coreadmin.NewBunTranslationAssignmentRepository(db)
	familyStore := coreadmin.NewBunTranslationFamilyStore(db)

	const tenantID = "tenant-demo"
	const orgID = "org-demo"

	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	cfg.ScopeMode = string(quickstart.ScopeModeMulti)
	cfg.AuthConfig = &coreadmin.AuthConfig{AllowUnauthenticatedRoutes: true}
	cfg.CMS = cmsOpts
	queueEnabled := true
	translationCfg := appcfg.TranslationConfig{
		Profile: "full",
		Queue:   &queueEnabled,
	}
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminDependencies(coreadmin.Dependencies{
			TranslationFamilyStore: familyStore,
		}),
		quickstart.WithFeatureDefaults(map[string]bool{
			string(coreadmin.FeatureCMS): true,
		}),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationPolicyServices(exampleContentBackedPagePolicyServices(t, cmsOpts)),
		quickstart.WithTranslationProductConfig(buildTranslationProductConfig(
			resolveTranslationProfile("full"),
			noopExchangeStore{},
			repo,
			translationCfg,
		)),
	)
	require.NoError(t, err)
	adm.WithAuth(translationRuntimeHarnessPassthroughAuthenticator{}, nil)
	adm.WithAuthorizer(translationRuntimeHarnessAllowAllAuthorizer{})

	err = seedExampleTranslationQueueFixtureWithFamilySync(
		ctx,
		repo,
		cmsOpts.Container.ContentService(),
		tenantID,
		orgID,
		func(ctx context.Context) error {
			return coreadmin.SyncTranslationFamilyStore(ctx, adm, "default")
		},
		"reviewer-qa",
		"translator-qa",
	)
	require.NoError(t, err)

	assignment, err := repo.Get(ctx, exampleTranslationQAAssignmentID)
	require.NoError(t, err)
	require.NotEmpty(t, strings.TrimSpace(assignment.TargetRecordID))

	service := translationservices.FamilyService{Store: familyStore}
	family, ok, err := service.Detail(ctx, translationservices.GetFamilyInput{
		Scope: translationservices.Scope{
			TenantID: tenantID,
			OrgID:    orgID,
		},
		Environment: "default",
		FamilyID:    assignment.FamilyID,
	})
	require.NoError(t, err)
	require.True(t, ok)

	var targetVariant translationservices.FamilyVariant
	for _, variant := range family.Variants {
		if strings.EqualFold(strings.TrimSpace(variant.Locale), strings.TrimSpace(assignment.TargetLocale)) {
			targetVariant = variant
			break
		}
	}
	require.NotEmpty(t, strings.TrimSpace(targetVariant.ID))

	server := router.NewHTTPServer()
	require.NoError(t, adm.Initialize(server.Router()))

	for _, currentStatus := range []string{"draft", "published", "scheduled"} {
		t.Run(currentStatus, func(t *testing.T) {
			setPersistentPageStatus(t, ctx, cmsOpts.Container.ContentService(), assignment.TargetRecordID, currentStatus)

			detailStatus, detailPayload := doAdminJSONRequest(t, server.WrappedRouter(), http.MethodGet, "/admin/api/translations/assignments/"+assignment.ID+"?channel=default&tenant_id="+tenantID+"&org_id="+orgID, nil)
			require.Equal(t, http.StatusOK, detailStatus, "payload=%+v", detailPayload)
			expectedVersion := toInt(extractMap(detailPayload["data"])["row_version"])
			require.Positive(t, expectedVersion)

			status, payload := doAdminJSONRequest(t, server.WrappedRouter(), http.MethodPatch, "/admin/api/translations/sync/resources/translation_variant_draft/"+targetVariant.ID+"?channel=default&tenant_id="+tenantID+"&org_id="+orgID, map[string]any{
				"operation":         "autosave",
				"expected_revision": expectedVersion,
				"payload": map[string]any{
					"fields": map[string]any{
						"title": "Guide persistant mis a jour " + currentStatus,
					},
					"metadata": map[string]any{
						"autosave": false,
					},
					"autosave": false,
				},
			})
			require.Equal(t, http.StatusOK, status, "payload=%+v", payload)

			target, err := cmsOpts.Container.ContentService().Page(ctx, assignment.TargetRecordID, "")
			require.NoError(t, err)
			require.NotNil(t, target)
			require.Equal(t, "draft", strings.ToLower(strings.TrimSpace(target.Status)))
			editorMeta, _ := target.Metadata["translation_editor"].(map[string]any)
			require.Equal(t, "in_progress", strings.TrimSpace(fmt.Sprint(editorMeta["variant_status"])))
			require.Equal(t, "in_progress", strings.TrimSpace(fmt.Sprint(target.Metadata["translation_variant_status"])))
		})
	}
}

func setPersistentPageStatus(t *testing.T, ctx context.Context, service coreadmin.CMSContentService, pageID, status string) {
	t.Helper()

	target, err := service.Page(ctx, pageID, "")
	require.NoError(t, err)
	require.NotNil(t, target)

	current := strings.TrimSpace(target.Status)
	next := strings.TrimSpace(status)
	if current == next {
		return
	}

	if current == "published" && next == "scheduled" {
		draftTarget := *target
		draftTarget.Status = "draft"
		target, err = service.UpdatePage(ctx, draftTarget)
		require.NoError(t, err)
		require.NotNil(t, target)
	}

	updatedTarget := *target
	updatedTarget.Status = next
	_, err = service.UpdatePage(ctx, updatedTarget)
	require.NoError(t, err)
}

func TestSeedExampleTranslationQueueFixtureSeedsReviewerOwnedReviewAssignments(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(ctx, repo, cmsOpts.Container.ContentService(), "", "", "reviewer-qa", "translator-qa")
	require.NoError(t, err)

	assignments, total, err := repo.List(ctx, coreadmin.ListOptions{
		Filters: map[string]any{
			"status":      string(coreadmin.AssignmentStatusReview),
			"reviewer_id": "reviewer-qa",
		},
	})
	require.NoError(t, err)
	require.GreaterOrEqual(t, total, 2)
	require.NotEmpty(t, assignments)

	hasEditorQA := false
	hasPostReview := false
	for _, assignment := range assignments {
		require.Equal(t, coreadmin.AssignmentStatusReview, assignment.Status)
		require.Equal(t, "reviewer-qa", strings.TrimSpace(assignment.ReviewerID))
		switch strings.TrimSpace(assignment.ID) {
		case exampleTranslationQAAssignmentID:
			hasEditorQA = true
		default:
			if strings.EqualFold(strings.TrimSpace(assignment.EntityType), "posts") {
				hasPostReview = true
			}
		}
	}
	require.True(t, hasEditorQA, "expected seeded QA editor assignment in reviewer inbox")
	require.True(t, hasPostReview, "expected seeded review post assignment in reviewer inbox")
}

func TestExampleTranslationExchangeStoreResolvesAndAppliesDeterministicLinkage(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	contentSvc := cmsOpts.Container.ContentService()
	require.NotNil(t, contentSvc)

	var source coreadmin.CMSPage
	pages, err := contentSvc.Pages(ctx, "en")
	require.NoError(t, err)
	for _, page := range pages {
		if strings.EqualFold(strings.TrimSpace(page.Slug), "translation-exchange-ready") {
			source = page
			break
		}
	}
	require.NotEmpty(t, source.ID, "expected seeded translation-exchange-ready page")

	store := newExampleTranslationExchangeStore(func() coreadmin.CMSContentService {
		return contentSvc
	})

	rows, err := store.ExportRows(ctx, coreadmin.TranslationExportFilter{
		Resources:         []string{"pages"},
		EntityIDs:         []string{source.ID},
		TargetLocales:     []string{"fr"},
		FieldPaths:        []string{"title"},
		SourceLocale:      "en",
		IncludeSourceHash: true,
	})
	require.NoError(t, err)
	require.NotEmpty(t, rows)

	row := rows[0]
	require.Equal(t, "pages", strings.ToLower(row.Resource))
	require.Equal(t, strings.TrimSpace(source.ID), strings.TrimSpace(row.EntityID))
	require.Equal(
		t,
		strings.ToLower(strings.TrimSpace(normalizeFamilyID(source.FamilyID, source.ID))),
		strings.ToLower(strings.TrimSpace(row.FamilyID)),
	)
	require.Equal(t, "fr", strings.ToLower(strings.TrimSpace(row.TargetLocale)))

	linkage, err := store.ResolveLinkage(ctx, coreadmin.TranslationExchangeLinkageKey{
		Resource:     row.Resource,
		EntityID:     row.EntityID,
		FamilyID:     row.FamilyID,
		TargetLocale: row.TargetLocale,
		FieldPath:    row.FieldPath,
	})
	require.NoError(t, err)
	require.False(t, linkage.TargetExists)
	require.NotEmpty(t, strings.TrimSpace(linkage.SourceHash))

	err = store.ApplyTranslation(ctx, coreadmin.TranslationExchangeApplyRequest{
		Key:               linkage.Key,
		TranslatedText:    "Fixture Translation FR",
		CreateTranslation: true,
		WorkflowStatus:    "draft",
	})
	require.NoError(t, err)

	linkageAfter, err := store.ResolveLinkage(ctx, linkage.Key)
	require.NoError(t, err)
	require.True(t, linkageAfter.TargetExists)
}

func TestExampleTranslationExchangeStoreAppliesTranslatedLocalizedPagePath(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)

	contentSvc := cmsOpts.Container.ContentService()
	source, err := contentSvc.CreatePage(ctx, coreadmin.CMSPage{
		Title:    "About Locale Paths",
		Slug:     "about-locale-paths",
		Locale:   "en",
		Status:   "draft",
		RouteKey: "pages/about-locale-paths",
		Data:     map[string]any{"path": "/about-locale-paths"},
	})
	require.NoError(t, err)

	store := newExampleTranslationExchangeStore(func() coreadmin.CMSContentService { return contentSvc })
	groupID := normalizeFamilyID(source.FamilyID, source.ID)
	linkage, err := store.ResolveLinkage(ctx, coreadmin.TranslationExchangeLinkageKey{
		Resource:     "pages",
		EntityID:     source.ID,
		FamilyID:     groupID,
		TargetLocale: "es",
		FieldPath:    "title",
	})
	require.NoError(t, err)
	require.False(t, linkage.TargetExists)

	err = store.ApplyTranslation(ctx, coreadmin.TranslationExchangeApplyRequest{
		Key:               linkage.Key,
		TranslatedText:    "Sobre nosotros",
		CreateTranslation: true,
		WorkflowStatus:    "draft",
		Path:              "/sobre-nosotros",
		RouteKey:          "pages/about-locale-paths",
	})
	require.NoError(t, err)

	target, err := findPageLocaleVariantForSource(ctx, contentSvc, source, groupID, "es")
	require.NoError(t, err)
	require.NotNil(t, target)
	require.Equal(t, "pages/about-locale-paths", strings.TrimSpace(target.RouteKey))
	require.Equal(t, "/sobre-nosotros", strings.TrimSpace(target.Data["path"].(string)))
	require.Equal(t, "about-locale-paths-es", strings.TrimSpace(target.Slug))
}

func TestExampleTranslationExchangeStorePreservesCanonicalHomepagePathForNonDefaultLocale(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)

	contentSvc := cmsOpts.Container.ContentService()
	source, err := contentSvc.CreatePage(ctx, coreadmin.CMSPage{
		Title:    "Home Locale Paths",
		Slug:     "home-locale-paths",
		Locale:   "en",
		Status:   "draft",
		RouteKey: "pages/home-locale-paths",
		Data:     map[string]any{"path": "/"},
	})
	require.NoError(t, err)

	store := newExampleTranslationExchangeStore(func() coreadmin.CMSContentService { return contentSvc })
	groupID := normalizeFamilyID(source.FamilyID, source.ID)
	linkage, err := store.ResolveLinkage(ctx, coreadmin.TranslationExchangeLinkageKey{
		Resource:     "pages",
		EntityID:     source.ID,
		FamilyID:     groupID,
		TargetLocale: "fr",
		FieldPath:    "title",
	})
	require.NoError(t, err)

	err = store.ApplyTranslation(ctx, coreadmin.TranslationExchangeApplyRequest{
		Key:               linkage.Key,
		TranslatedText:    "Accueil",
		CreateTranslation: true,
		WorkflowStatus:    "draft",
		Path:              "/",
		RouteKey:          "pages/home-locale-paths",
	})
	require.NoError(t, err)

	target, err := findPageLocaleVariantForSource(ctx, contentSvc, source, groupID, "fr")
	require.NoError(t, err)
	require.NotNil(t, target)
	require.Equal(t, "/", strings.TrimSpace(target.Data["path"].(string)))
	require.Equal(t, "home-locale-paths-fr", strings.TrimSpace(target.Slug))
}

func TestExampleLocalePathMigrationAuditFlagsLegacyPrefixedFixture(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)

	contentSvc := cmsOpts.Container.ContentService()
	source, err := contentSvc.CreatePage(ctx, coreadmin.CMSPage{
		Title:    "About Legacy Prefix",
		Slug:     "about-legacy-prefix",
		Locale:   "en",
		Status:   "draft",
		RouteKey: "pages/about-legacy-prefix",
		Data:     map[string]any{"path": "/about-legacy-prefix"},
	})
	require.NoError(t, err)
	_, err = contentSvc.CreatePage(ctx, coreadmin.CMSPage{
		Title:    "About FR Legacy",
		Slug:     "about-bo",
		Locale:   "fr",
		Status:   "draft",
		FamilyID: normalizeFamilyID(source.FamilyID, source.ID),
		Data:     map[string]any{"path": "/fr/about-legacy-prefix"},
	})
	require.NoError(t, err)

	report, err := coreadmin.AuditLocalePathMigration(ctx, contentSvc, coreadmin.LocalePathMigrationOptions{
		SupportedLocales: []string{"en", "fr"},
		DefaultLocale:    "en",
		IncludePages:     true,
	})
	require.NoError(t, err)
	require.Equal(t, 1, report.Summary.LegacyPrefixedRecords)
	var family *coreadmin.LocalePathMigrationFamilyPlan
	targetFamilyID := normalizeFamilyID(source.FamilyID, source.ID)
	for i := range report.Families {
		if strings.EqualFold(strings.TrimSpace(report.Families[i].FamilyID), strings.TrimSpace(targetFamilyID)) {
			family = &report.Families[i]
			break
		}
	}
	require.NotNil(t, family, "expected audit family for %s in %+v", targetFamilyID, report.Families)
	require.NotEmpty(t, family.Rewrites)
	require.Equal(t, "/about-legacy-prefix", family.Rewrites[0].PathTo)
}

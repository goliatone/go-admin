package main

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/quickstart"
	translationservices "github.com/goliatone/go-admin/translations/services"
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

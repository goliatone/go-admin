package main

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/stretchr/testify/require"
)

func TestSeedExampleTranslationQueueFixtureCreatesInProgressAssignment(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	repo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	err = seedExampleTranslationQueueFixture(ctx, repo, cmsOpts.Container.ContentService())
	require.NoError(t, err)

	source, err := findPageBySlug(ctx, cmsOpts.Container.ContentService(), exampleTranslationQueueSourceSlug)
	require.NoError(t, err)
	require.NotNil(t, source)
	expectedGroupID := normalizeTranslationGroupID(source.TranslationGroupID, source.ID)
	require.NotEmpty(t, strings.TrimSpace(expectedGroupID))

	assignments, total, err := repo.List(ctx, coreadmin.ListOptions{Filters: map[string]any{
		"translation_group_id": expectedGroupID,
		"target_locale":        "fr",
	}})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, assignments, 1)

	fixture := assignments[0]
	require.Equal(t, coreadmin.AssignmentStatusInProgress, fixture.Status)
	require.Equal(t, coreadmin.AssignmentTypeDirect, fixture.AssignmentType)
	require.Equal(t, "translator.demo", fixture.AssigneeID)
	require.Equal(t, exampleTranslationQueueTargetLocale, strings.ToLower(fixture.TargetLocale))
	require.Equal(t, strings.ToLower(strings.TrimSpace(expectedGroupID)), strings.ToLower(fixture.TranslationGroupID))
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
		strings.ToLower(strings.TrimSpace(normalizeTranslationGroupID(source.TranslationGroupID, source.ID))),
		strings.ToLower(strings.TrimSpace(row.TranslationGroupID)),
	)
	require.Equal(t, "fr", strings.ToLower(strings.TrimSpace(row.TargetLocale)))

	linkage, err := store.ResolveLinkage(ctx, coreadmin.TranslationExchangeLinkageKey{
		Resource:           row.Resource,
		EntityID:           row.EntityID,
		TranslationGroupID: row.TranslationGroupID,
		TargetLocale:       row.TargetLocale,
		FieldPath:          row.FieldPath,
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

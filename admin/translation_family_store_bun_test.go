package admin

import (
	"context"
	"testing"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

func TestBunTranslationFamilyStoreTranslationEditorMemorySuggestions(t *testing.T) {
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(newTranslationFamilyStoreSQLiteDB(t))
	now := time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC)
	sourceFields := map[string]string{
		"title": "Prior publish guide",
		"path":  "/prior",
		"body":  "Translation guide for publish workflows from the home page.",
	}
	sourceHash := translationEditorHashFields(sourceFields)
	seedMemoryFamily := func(familyID, tenantID, orgID, targetLocale, targetStatus, targetBody, syncHash string, updatedAt time.Time) {
		t.Helper()
		err := store.SaveFamily(ctx, translationservices.FamilyRecord{
			ID:              familyID,
			TenantID:        tenantID,
			OrgID:           orgID,
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: familyID + "::en",
			ReadinessState:  "ready",
			Variants: []translationservices.FamilyVariant{
				{
					ID:             familyID + "::en",
					FamilyID:       familyID,
					TenantID:       tenantID,
					OrgID:          orgID,
					Locale:         "en",
					Status:         string(translationcore.VariantStatusPublished),
					IsSource:       true,
					SourceRecordID: familyID + "-source",
					Fields:         sourceFields,
					UpdatedAt:      updatedAt.Add(-time.Hour),
					CreatedAt:      updatedAt.Add(-2 * time.Hour),
				},
				{
					ID:                   familyID + "::" + targetLocale,
					FamilyID:             familyID,
					TenantID:             tenantID,
					OrgID:                orgID,
					Locale:               targetLocale,
					Status:               targetStatus,
					SourceHashAtLastSync: syncHash,
					SourceRecordID:       familyID + "-" + targetLocale,
					Fields: map[string]string{
						"title": "Titre",
						"path":  "/" + targetLocale + "/prior",
						"body":  targetBody,
					},
					UpdatedAt: updatedAt,
					CreatedAt: updatedAt.Add(-2 * time.Hour),
				},
			},
		})
		if err != nil {
			t.Fatalf("seed memory family %q: %v", familyID, err)
		}
	}
	seedMemoryFamily("tm-current", "tenant-1", "org-1", "fr", string(translationcore.VariantStatusApproved), "Guide precedent pour les workflows de publication.", sourceHash, now)
	seedMemoryFamily("tm-stale", "tenant-1", "org-1", "fr", string(translationcore.VariantStatusPublished), "Ancienne suggestion approuvee.", "stale-source-hash", now.Add(-time.Hour))
	seedMemoryFamily("tm-other-tenant", "tenant-2", "org-9", "fr", string(translationcore.VariantStatusApproved), "Leaked tenant suggestion", sourceHash, now.Add(time.Hour))
	seedMemoryFamily("tm-other-locale", "tenant-1", "org-1", "es", string(translationcore.VariantStatusApproved), "Sugerencia en espanol", sourceHash, now.Add(time.Hour))
	seedMemoryFamily("tm-draft", "tenant-1", "org-1", "fr", string(translationcore.VariantStatusDraft), "Draft suggestion", sourceHash, now.Add(time.Hour))

	suggestions, err := store.TranslationEditorMemorySuggestions(ctx, TranslationEditorMemorySuggestionInput{
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		TargetLocale:    "fr",
		ExcludeFamilyID: "current-family",
		FieldSources: map[string]string{
			"body": "Translation guide for publish workflows from the home page.",
		},
		Limit: 12,
	})
	if err != nil {
		t.Fatalf("translation memory suggestions: %v", err)
	}
	if len(suggestions) != 2 {
		t.Fatalf("expected two scoped suggestions, got %+v", suggestions)
	}
	if got := suggestions[0].SuggestedText; got != "Guide precedent pour les workflows de publication." {
		t.Fatalf("expected current suggestion first, got %+v", suggestions[0])
	}
	if got := suggestions[1].SuggestedText; got != "Ancienne suggestion approuvee." {
		t.Fatalf("expected stale suggestion second, got %+v", suggestions[1])
	}
	for _, suggestion := range suggestions {
		switch suggestion.SuggestedText {
		case "Leaked tenant suggestion", "Sugerencia en espanol", "Draft suggestion":
			t.Fatalf("unexpected unscoped, wrong-locale, or draft suggestion: %+v", suggestion)
		}
	}

	empty, err := store.TranslationEditorMemorySuggestions(ctx, TranslationEditorMemorySuggestionInput{
		TenantID:     "tenant-1",
		OrgID:        "org-1",
		ContentType:  "pages",
		SourceLocale: "en",
		TargetLocale: "fr",
		FieldSources: map[string]string{"body": "No exact source match"},
		Limit:        12,
	})
	if err != nil {
		t.Fatalf("no-match translation memory suggestions: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("expected no exact-match suggestions, got %+v", empty)
	}
}

func TestBunTranslationFamilyStoreTranslationEditorMemorySuggestionsScopesJoinedVariants(t *testing.T) {
	ctx := context.Background()
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	now := time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC)
	sourceFieldsJSON := `{"body":"Scoped source copy"}`
	targetFieldsJSON := `{"body":"Leaked target copy"}`

	for _, family := range []bunTranslationFamilyRecord{
		{
			FamilyID:       "tm-wrong-source",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			ContentType:    "pages",
			SourceLocale:   "en",
			ReadinessState: "ready",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			FamilyID:       "tm-wrong-target",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			ContentType:    "pages",
			SourceLocale:   "en",
			ReadinessState: "ready",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
	} {
		if _, err := db.NewInsert().Model(&family).Exec(ctx); err != nil {
			t.Fatalf("seed family %s: %v", family.FamilyID, err)
		}
	}
	for _, variant := range []bunTranslationLocaleVariantRecord{
		{
			VariantID:      "tm-wrong-source::en",
			FamilyID:       "tm-wrong-source",
			TenantID:       "tenant-2",
			OrgID:          "org-9",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       true,
			SourceRecordID: "wrong-source",
			FieldsJSON:     sourceFieldsJSON,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			VariantID:      "tm-wrong-source::fr",
			FamilyID:       "tm-wrong-source",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "fr",
			Status:         string(translationcore.VariantStatusApproved),
			IsSource:       false,
			SourceRecordID: "wrong-source-fr",
			FieldsJSON:     targetFieldsJSON,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			VariantID:      "tm-wrong-target::en",
			FamilyID:       "tm-wrong-target",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       true,
			SourceRecordID: "scoped-source",
			FieldsJSON:     sourceFieldsJSON,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			VariantID:      "tm-wrong-target::fr",
			FamilyID:       "tm-wrong-target",
			TenantID:       "tenant-2",
			OrgID:          "org-9",
			Locale:         "fr",
			Status:         string(translationcore.VariantStatusApproved),
			IsSource:       false,
			SourceRecordID: "wrong-target-fr",
			FieldsJSON:     targetFieldsJSON,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
	} {
		if _, err := db.NewInsert().Model(&variant).Exec(ctx); err != nil {
			t.Fatalf("seed variant %s: %v", variant.VariantID, err)
		}
	}

	suggestions, err := store.TranslationEditorMemorySuggestions(ctx, TranslationEditorMemorySuggestionInput{
		TenantID:     "tenant-1",
		OrgID:        "org-1",
		ContentType:  "pages",
		SourceLocale: "en",
		TargetLocale: "fr",
		FieldSources: map[string]string{"body": "Scoped source copy"},
		Limit:        12,
	})
	if err != nil {
		t.Fatalf("translation memory suggestions: %v", err)
	}
	if len(suggestions) != 0 {
		t.Fatalf("expected wrong-scope joined variants to be excluded, got %+v", suggestions)
	}
}

func TestBunTranslationFamilyStoreFamilyQueryScopesChildRows(t *testing.T) {
	ctx := context.Background()
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	now := time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-scoped-detail",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-scoped-detail::en",
		ReadinessState:  "blocked",
		Variants: []translationservices.FamilyVariant{{
			ID:             "family-scoped-detail::en",
			FamilyID:       "family-scoped-detail",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       true,
			SourceRecordID: "page-1",
			Fields:         map[string]string{"title": "Scoped"},
			CreatedAt:      now,
			UpdatedAt:      now,
		}},
		Blockers: []translationservices.FamilyBlocker{{
			FamilyID:    "family-scoped-detail",
			TenantID:    "tenant-1",
			OrgID:       "org-1",
			BlockerCode: "missing_locale",
			Locale:      "fr",
		}},
	}); err != nil {
		t.Fatalf("seed scoped family: %v", err)
	}
	if _, err := db.NewInsert().Model(&bunTranslationLocaleVariantRecord{
		VariantID:      "family-scoped-detail::es-other",
		FamilyID:       "family-scoped-detail",
		TenantID:       "tenant-2",
		OrgID:          "org-9",
		Locale:         "es",
		Status:         string(translationcore.VariantStatusDraft),
		SourceRecordID: "page-other",
		FieldsJSON:     `{"title":"Wrong scope"}`,
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Exec(ctx); err != nil {
		t.Fatalf("seed wrong-scope variant: %v", err)
	}
	if _, err := db.NewInsert().Model(&bunTranslationFamilyBlockerRecord{
		FamilyID:    "family-scoped-detail",
		TenantID:    "tenant-2",
		OrgID:       "org-9",
		BlockerCode: "wrong_scope",
		Locale:      "es",
		CreatedAt:   now,
		UpdatedAt:   now,
	}).Exec(ctx); err != nil {
		t.Fatalf("seed wrong-scope blocker: %v", err)
	}

	family, ok, err := store.FamilyQuery(ctx, translationservices.GetFamilyInput{
		FamilyID: "family-scoped-detail",
		Scope:    translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
	})
	if err != nil {
		t.Fatalf("family query: %v", err)
	}
	if !ok {
		t.Fatalf("expected scoped family")
	}
	if len(family.Variants) != 1 || family.Variants[0].TenantID != "tenant-1" || family.Variants[0].Locale != "en" {
		t.Fatalf("unexpected scoped variants: %+v", family.Variants)
	}
	if len(family.Blockers) != 1 || family.Blockers[0].TenantID != "tenant-1" || family.Blockers[0].BlockerCode != "missing_locale" {
		t.Fatalf("unexpected scoped blockers: %+v", family.Blockers)
	}
}

func TestBunTranslationFamilyStoreSaveFamilyReconcilesUnscopedLocaleVariantDrift(t *testing.T) {
	ctx := context.Background()
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-dev-restart",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-dev-restart",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-dev-restart",
			FamilyID:       "family-dev-restart",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       true,
			SourceRecordID: "page-dev-restart",
		}},
	}); err != nil {
		t.Fatalf("seed unscoped family: %v", err)
	}

	if _, err := db.ExecContext(ctx, `INSERT INTO translation_assignments (
		assignment_id, family_id, variant_id, entity_type, source_record_id, source_locale,
		target_locale, work_scope, assignment_type, status, priority, row_version, created_at, updated_at
	) VALUES (
		'assignment-dev-restart', 'family-dev-restart', 'page-dev-restart', 'pages', 'page-dev-restart', 'en',
		'en', '__all__', 'open_pool', 'open', 'normal', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
	)`); err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-dev-restart",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-dev-restart::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-dev-restart::en",
			FamilyID:       "family-dev-restart",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       true,
			SourceRecordID: "page-dev-restart",
		}},
	}); err != nil {
		t.Fatalf("save scoped family over unscoped drift: %v", err)
	}

	var variantID, tenantID, orgID string
	if err := db.QueryRowContext(ctx, `SELECT variant_id, tenant_id, org_id FROM locale_variants WHERE family_id = ? AND locale = ?`, "family-dev-restart", "en").Scan(&variantID, &tenantID, &orgID); err != nil {
		t.Fatalf("load repaired variant: %v", err)
	}
	if variantID != "page-dev-restart::en" || tenantID != "tenant-1" || orgID != "org-1" {
		t.Fatalf("variant not repaired, got id=%q tenant=%q org=%q", variantID, tenantID, orgID)
	}

	var assignmentVariantID string
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = ?`, "assignment-dev-restart").Scan(&assignmentVariantID); err != nil {
		t.Fatalf("load assignment variant: %v", err)
	}
	if assignmentVariantID != "page-dev-restart::en" {
		t.Fatalf("assignment variant_id = %q, want page-dev-restart::en", assignmentVariantID)
	}
}

func TestBunTranslationFamilyStoreSaveFamilyReplacesStaleBlockerIdentities(t *testing.T) {
	ctx := context.Background()
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	now := time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC)
	base := translationservices.FamilyRecord{
		ID:              "family-scoped-blockers",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-scoped-blockers::en",
		ReadinessState:  "blocked",
		Variants: []translationservices.FamilyVariant{{
			ID:             "family-scoped-blockers::en",
			FamilyID:       "family-scoped-blockers",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       true,
			SourceRecordID: "page-scoped-blockers",
			Fields:         map[string]string{"title": "Scoped"},
			CreatedAt:      now,
			UpdatedAt:      now,
		}},
		Blockers: []translationservices.FamilyBlocker{{
			FamilyID:    "family-scoped-blockers",
			TenantID:    "tenant-1",
			OrgID:       "org-1",
			BlockerCode: "missing_locale",
			Locale:      "fr",
		}},
	}
	if err := store.SaveFamily(ctx, base); err != nil {
		t.Fatalf("seed scoped family: %v", err)
	}
	if _, err := db.NewUpdate().
		Model((*bunTranslationFamilyBlockerRecord)(nil)).
		Set("tenant_id = ?", "tenant-2").
		Set("org_id = ?", "org-9").
		Where("family_id = ?", "family-scoped-blockers").
		Where("blocker_code = ?", "missing_locale").
		Where("locale = ?", "fr").
		Exec(ctx); err != nil {
		t.Fatalf("simulate stale wrong-scope blocker: %v", err)
	}

	base.Blockers = []translationservices.FamilyBlocker{{
		FamilyID:    "family-scoped-blockers",
		TenantID:    "tenant-1",
		OrgID:       "org-1",
		BlockerCode: "missing_locale",
		Locale:      "es",
	}}
	if err := store.SaveFamily(ctx, base); err != nil {
		t.Fatalf("save family with scoped blocker replacement: %v", err)
	}

	var total int
	if err := db.NewSelect().
		Model((*bunTranslationFamilyBlockerRecord)(nil)).
		ColumnExpr("COUNT(*)").
		Where("family_id = ?", "family-scoped-blockers").
		Scan(ctx, &total); err != nil {
		t.Fatalf("count blockers: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected scoped replacement to remove stale same-identity blocker, got %d rows", total)
	}
	family, ok, err := store.FamilyQuery(ctx, translationservices.GetFamilyInput{
		FamilyID: "family-scoped-blockers",
		Scope:    translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
	})
	if err != nil {
		t.Fatalf("family query: %v", err)
	}
	if !ok || len(family.Blockers) != 1 || family.Blockers[0].Locale != "es" || family.Blockers[0].TenantID != "tenant-1" {
		t.Fatalf("expected only replacement blocker in scoped query, got ok=%v family=%+v", ok, family)
	}
}

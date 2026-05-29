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

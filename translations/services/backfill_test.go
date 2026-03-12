package services

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDeterministicFamilyIDIncludesScopeKeys(t *testing.T) {
	global := DeterministicFamilyID(Scope{}, "pages", "home")
	tenant := DeterministicFamilyID(Scope{TenantID: "tenant-a", OrgID: "org-a"}, "pages", "home")
	if global == tenant {
		t.Fatalf("expected scope-aware deterministic ids to differ")
	}
}

func TestBackfillRunnerBuildPlanIsReplaySafe(t *testing.T) {
	fixture := mustLoadBackfillSeedFixture(t)
	runner := NewBackfillRunner()

	first, err := runner.BuildPlan(context.Background(), fixture)
	if err != nil {
		t.Fatalf("first build plan: %v", err)
	}
	second, err := runner.BuildPlan(context.Background(), fixture)
	if err != nil {
		t.Fatalf("second build plan: %v", err)
	}

	if first.Checksum != second.Checksum {
		t.Fatalf("expected deterministic checksum, got first=%s second=%s", first.Checksum, second.Checksum)
	}
	if len(first.Families) == 0 {
		t.Fatalf("expected families in backfill plan")
	}
}

func TestBackfillSeedFixtureCoversTenantAndNonTenantPagesPostsNews(t *testing.T) {
	fixture := mustLoadBackfillSeedFixture(t)
	hasGlobalPages := false
	hasTenantPosts := false
	hasTenantNews := false
	for _, variant := range fixture.Variants {
		switch {
		case variant.Scope.TenantID == "" && variant.ContentType == "pages":
			hasGlobalPages = true
		case variant.Scope.TenantID != "" && variant.ContentType == "posts":
			hasTenantPosts = true
		case variant.Scope.TenantID != "" && variant.ContentType == "news":
			hasTenantNews = true
		}
	}
	if !hasGlobalPages || !hasTenantPosts || !hasTenantNews {
		t.Fatalf("expected fixture coverage for global pages plus tenant-scoped posts and news")
	}
}

func TestBackfillRunnerCreatesMissingLocaleAssignmentsAndBlockers(t *testing.T) {
	runner := NewBackfillRunner()
	plan, err := runner.BuildPlan(context.Background(), BackfillInput{
		Variants: []BackfillSourceVariant{
			{
				Scope:          Scope{},
				ContentType:    "pages",
				SourceRecordID: "page-1",
				Locale:         "en",
				Fields: map[string]string{
					"title": "Home",
					"path":  "/home",
				},
				CreatedAt: time.Date(2026, time.January, 1, 10, 0, 0, 0, time.UTC),
				UpdatedAt: time.Date(2026, time.January, 1, 10, 0, 0, 0, time.UTC),
			},
		},
		Policies: map[string]BackfillPolicy{
			"pages": {
				SourceLocale:    "en",
				RequiredLocales: []string{"en", "es", "fr"},
				RequiredFields: map[string][]string{
					"en": {"title", "path"},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("build plan: %v", err)
	}
	if len(plan.Families) != 1 {
		t.Fatalf("expected one family, got %d", len(plan.Families))
	}
	family := plan.Families[0]
	if family.ReadinessState != "blocked" {
		t.Fatalf("expected blocked readiness, got %s", family.ReadinessState)
	}
	if len(family.Assignments) != 2 {
		t.Fatalf("expected assignments for missing locales, got %d", len(family.Assignments))
	}
	if family.MissingRequiredLocaleCount != 2 {
		t.Fatalf("expected missing locale count=2, got %d", family.MissingRequiredLocaleCount)
	}
}

func TestEvaluateBackfillQualityGatesFailsOnAmbiguousWarningRate(t *testing.T) {
	rolledBack := false
	_, err := EvaluateBackfillQualityGates(context.Background(), BackfillPlan{
		Families: []BackfillFamily{{ID: "family-1"}},
		Warnings: []BackfillWarning{{
			Code:    "ambiguous_source_locale",
			Message: "policy source locale missing",
		}},
	}, QualityGateOptions{
		MaxAmbiguousSourceWarningRate: 0.1,
		OnRollback: func(context.Context, error) error {
			rolledBack = true
			return nil
		},
	})
	if err == nil {
		t.Fatalf("expected ambiguous warning gate to fail")
	}
	if !rolledBack {
		t.Fatalf("expected rollback hook to run")
	}
}

func mustLoadBackfillSeedFixture(t *testing.T) BackfillInput {
	t.Helper()
	path := filepath.Join("testdata", "translation_backfill_seed_fixture.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", path, err)
	}
	var fixture BackfillInput
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatalf("unmarshal fixture %s: %v", path, err)
	}
	return fixture
}

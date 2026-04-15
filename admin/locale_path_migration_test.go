package admin

import (
	"context"
	"testing"
)

func TestAuditLocalePathMigrationClassifiesLegacyPrefixedAndBackfillsRouteKey(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryContentService()
	en, err := svc.CreateContent(ctx, CMSContent{
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        "tg_posts_about",
		Data:            map[string]any{"path": "/about"},
	})
	if err != nil {
		t.Fatalf("seed english content: %v", err)
	}
	if _, createErr := svc.CreateContent(ctx, CMSContent{
		Title:           "A propos",
		Slug:            "about",
		Locale:          "fr",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        en.FamilyID,
		Data:            map[string]any{"path": "/fr/about"},
	}); createErr != nil {
		t.Fatalf("seed french content: %v", createErr)
	}

	report, err := AuditLocalePathMigration(ctx, svc, LocalePathMigrationOptions{
		SupportedLocales: []string{"EN", "FR"},
		DefaultLocale:    "en",
		IncludeContents:  true,
	})
	if err != nil {
		t.Fatalf("audit migration: %v", err)
	}
	if report.Summary.TotalFamilies != 1 {
		t.Fatalf("expected one family, got %+v", report.Summary)
	}
	family := report.Families[0]
	if family.RouteKeyReadiness != LocalePathRouteKeyMissingDerivable {
		t.Fatalf("expected missing-derivable route_key, got %q", family.RouteKeyReadiness)
	}
	if family.ProposedRouteKey != "posts/about" {
		t.Fatalf("expected posts/about route_key, got %q", family.ProposedRouteKey)
	}
	if len(family.Rewrites) != 2 {
		t.Fatalf("expected path rewrite plus route_key backfill rewrites, got %+v", family.Rewrites)
	}
	foundLegacy := false
	for _, record := range family.Records {
		if record.Locale == "fr" {
			foundLegacy = true
			if record.Classification != LocalePathRecordLegacyPrefixed {
				t.Fatalf("expected fr record to be legacy prefixed, got %+v", record)
			}
			if record.ProposedPath != "/about" {
				t.Fatalf("expected fr proposed path /about, got %+v", record)
			}
		}
	}
	if !foundLegacy {
		t.Fatalf("expected french record in report, got %+v", family.Records)
	}
}

func TestAuditLocalePathMigrationReportsAmbiguousLocaleLikeSlug(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryContentService()
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "Bo",
		Slug:            "bo",
		Locale:          "bo",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        "tg_posts_bo",
		Data:            map[string]any{"path": "/bo"},
	}); err != nil {
		t.Fatalf("seed bo content: %v", err)
	}

	report, err := AuditLocalePathMigration(ctx, svc, LocalePathMigrationOptions{
		SupportedLocales: []string{"en", "bo", "zh"},
		DefaultLocale:    "en",
		IncludeContents:  true,
	})
	if err != nil {
		t.Fatalf("audit migration: %v", err)
	}
	family := report.Families[0]
	if family.Records[0].Classification != LocalePathRecordAmbiguousLocaleLike {
		t.Fatalf("expected ambiguous locale-like slug, got %+v", family.Records[0])
	}
	if len(family.Rewrites) != 1 {
		t.Fatalf("expected route_key-only backfill rewrite, got %+v", family.Rewrites)
	}
	if family.Rewrites[0].PathTo != "" {
		t.Fatalf("expected no path rewrite for ambiguous locale-like slug, got %+v", family.Rewrites[0])
	}
}

func TestAuditLocalePathMigrationReportsAmbiguousRouteKeyConflicts(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryContentService()
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        "tg_posts_route_conflict",
		RouteKey:        "posts/about",
		Data:            map[string]any{"path": "/about"},
	}); err != nil {
		t.Fatalf("seed english content: %v", err)
	}
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "A propos",
		Slug:            "a-propos",
		Locale:          "fr",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        "tg_posts_route_conflict",
		RouteKey:        "posts/a-propos",
		Data:            map[string]any{"path": "/a-propos"},
	}); err != nil {
		t.Fatalf("seed french content: %v", err)
	}

	report, err := AuditLocalePathMigration(ctx, svc, LocalePathMigrationOptions{
		SupportedLocales: []string{"en", "fr"},
		DefaultLocale:    "en",
		IncludeContents:  true,
	})
	if err != nil {
		t.Fatalf("audit migration: %v", err)
	}
	family := report.Families[0]
	if family.RouteKeyReadiness != LocalePathRouteKeyAmbiguous {
		t.Fatalf("expected ambiguous route_key readiness, got %+v", family)
	}
	if len(family.Rewrites) != 0 {
		t.Fatalf("expected no rewrites for conflicting route keys, got %+v", family.Rewrites)
	}
}

func TestAuditLocalePathMigrationDoesNotBackfillUnanchoredLocalizedFamilies(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryContentService()
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		ContentType:     "pages",
		ContentTypeSlug: "pages",
		Data:            map[string]any{"path": "/about"},
	}); err != nil {
		t.Fatalf("seed english content: %v", err)
	}
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "Sobre Nosotros",
		Slug:            "sobre-nosotros",
		Locale:          "es",
		ContentType:     "pages",
		ContentTypeSlug: "pages",
		Data:            map[string]any{"path": "/sobre-nosotros"},
	}); err != nil {
		t.Fatalf("seed spanish content: %v", err)
	}

	report, err := AuditLocalePathMigration(ctx, svc, LocalePathMigrationOptions{
		SupportedLocales: []string{"en", "es"},
		DefaultLocale:    "en",
		IncludeContents:  true,
	})
	if err != nil {
		t.Fatalf("audit migration: %v", err)
	}
	if report.Summary.AmbiguousRouteKeyFamilies != 2 {
		t.Fatalf("expected both orphan records to require manual route_key review, got %+v", report.Summary)
	}
	for _, family := range report.Families {
		if family.RouteKeyReadiness != LocalePathRouteKeyAmbiguous {
			t.Fatalf("expected orphan family to be ambiguous, got %+v", family)
		}
		if family.ProposedRouteKey != "" {
			t.Fatalf("expected no route_key proposal for orphan family, got %+v", family)
		}
		if len(family.Rewrites) != 0 {
			t.Fatalf("expected no automatic rewrites for orphan family, got %+v", family)
		}
		if len(family.Warnings) == 0 {
			t.Fatalf("expected orphan family warning, got %+v", family)
		}
	}
}

func TestApplyLocalePathMigrationRewritesStoredPathAndRouteKey(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryContentService()
	source, err := svc.CreatePage(ctx, CMSPage{
		Title:    "Home",
		Slug:     "home",
		Locale:   "en",
		FamilyID: "tg_pages_home",
		Data:     map[string]any{"path": "/"},
	})
	if err != nil {
		t.Fatalf("seed english page: %v", err)
	}
	target, err := svc.CreatePage(ctx, CMSPage{
		Title:    "Accueil",
		Slug:     "home",
		Locale:   "fr",
		FamilyID: source.FamilyID,
		Data:     map[string]any{"path": "/fr"},
	})
	if err != nil {
		t.Fatalf("seed french page: %v", err)
	}

	report, err := AuditLocalePathMigration(ctx, svc, LocalePathMigrationOptions{
		SupportedLocales: []string{"en", "fr"},
		DefaultLocale:    "en",
		IncludePages:     true,
	})
	if err != nil {
		t.Fatalf("audit migration: %v", err)
	}
	result, err := ApplyLocalePathMigration(ctx, svc, report)
	if err != nil {
		t.Fatalf("apply migration: %v", err)
	}
	if len(result.Updated) != 2 {
		t.Fatalf("expected path rewrite plus route_key backfill, got %+v", result)
	}
	updated, err := svc.Page(ctx, target.ID, "")
	if err != nil {
		t.Fatalf("load updated page: %v", err)
	}
	if got := ExtractContentPath(updated.Data, updated.Metadata, ""); got != "/" {
		t.Fatalf("expected rewritten path /, got %q", got)
	}
	if got := updated.RouteKey; got != "page/home" {
		t.Fatalf("expected derived route_key page/home, got %q", got)
	}
	if got := toString(updated.Metadata["route_key"]); got != "page/home" {
		t.Fatalf("expected metadata route_key page/home, got %q", got)
	}
}

func TestAuditLocalePathMigrationNoFamilyLeftBehindBackfillOrWarning(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryContentService()
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        "tg_posts_complete",
		Data:            map[string]any{"path": "/about"},
	}); err != nil {
		t.Fatalf("seed derivable family: %v", err)
	}
	if _, err := svc.CreateContent(ctx, CMSContent{
		Title:           "Bo",
		Slug:            "",
		Locale:          "bo",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		FamilyID:        "tg_posts_ambiguous",
		Data:            map[string]any{"path": "/bo"},
	}); err != nil {
		t.Fatalf("seed ambiguous family: %v", err)
	}

	report, err := AuditLocalePathMigration(ctx, svc, LocalePathMigrationOptions{
		SupportedLocales: []string{"en", "bo"},
		DefaultLocale:    "en",
		IncludeContents:  true,
	})
	if err != nil {
		t.Fatalf("audit migration: %v", err)
	}
	if report.Summary.MissingRouteKeyFamilies != 2 {
		t.Fatalf("expected both families to need route_key attention, got %+v", report.Summary)
	}
	derivable := 0
	ambiguous := 0
	for _, family := range report.Families {
		switch family.RouteKeyReadiness {
		case LocalePathRouteKeyMissingDerivable:
			derivable++
		case LocalePathRouteKeyAmbiguous:
			ambiguous++
		}
	}
	if derivable != 2 || ambiguous != 0 {
		t.Fatalf("expected both families derivable, got derivable=%d ambiguous=%d report=%+v", derivable, ambiguous, report.Families)
	}
}

package admin

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

func TestStructuralPartialsUseDefaultsWithoutLookup(t *testing.T) {
	adm := &Admin{defaultTheme: &ThemeSelection{Partials: map[string]string{
		AdminPartialPageBreadcrumbs: "host/unsafe.html",
	}}}
	got := adm.StructuralPartials(context.Background())
	want := DefaultAdminStructuralPartials()
	if got.Sidebar != want.Sidebar || got.Breadcrumbs != want.Breadcrumbs || got.Footer != want.Footer {
		t.Fatalf("StructuralPartials() = %+v, want defaults %+v", got, want)
	}
	if len(got.Diagnostics) != 0 {
		t.Fatalf("no-lookup fallback must not interpret manifest metadata: %+v", got.Diagnostics)
	}
}

func TestStructuralPartialsResolveOnlyRegisteredSafeIdentifiers(t *testing.T) {
	available := map[string]bool{"host/breadcrumbs.html": true}
	adm := &Admin{defaultTheme: &ThemeSelection{Partials: map[string]string{
		AdminPartialPageBreadcrumbs: "host/breadcrumbs.html",
		AdminPartialShellSidebar:    "../private.html",
		AdminPartialShellFooter:     "host/missing.html",
		"admin.page.actions":        "host/actions.html",
		"forms.input":               "renderer-owned.html",
	}}}
	adm.WithAdminTemplateLookup(AdminTemplateLookupFunc(func(identifier string) bool { return available[identifier] }))

	got := adm.StructuralPartials(context.Background())
	if got.Breadcrumbs != "host/breadcrumbs.html" {
		t.Fatalf("breadcrumbs = %q", got.Breadcrumbs)
	}
	if got.Sidebar != defaultAdminSidebarPartial || got.Footer != defaultAdminFooterPartial {
		t.Fatalf("unsafe or missing candidates did not fall back: %+v", got)
	}
	if len(got.Diagnostics) != 3 {
		t.Fatalf("diagnostics = %+v, want invalid/unavailable/unsupported", got.Diagnostics)
	}
	reasons := map[string]bool{}
	for _, diagnostic := range got.Diagnostics {
		reasons[diagnostic.ReasonCode] = true
		if strings.Contains(diagnostic.CandidateBasename, "\n") || len(diagnostic.CandidateFingerprint) != 16 {
			t.Fatalf("unsafe diagnostic projection: %+v", diagnostic)
		}
	}
	for _, reason := range []string{AdminPartialInvalidIdentifier, AdminPartialUnavailable, AdminPartialUnsupportedKey} {
		if !reasons[reason] {
			t.Fatalf("missing reason %q in %+v", reason, got.Diagnostics)
		}
	}
}

func TestStructuralPartialDiagnosticsAreSortedDeduplicatedAndBounded(t *testing.T) {
	partials := map[string]string{}
	for index := range 20 {
		partials[fmt.Sprintf("admin.shell.unknown-%02d", index)] = fmt.Sprintf("host/%02d.html", index)
	}
	adm := (&Admin{defaultTheme: &ThemeSelection{Partials: partials}}).
		WithAdminTemplateLookup(AdminTemplateLookupFunc(func(string) bool { return false }))

	first := adm.StructuralPartials(context.Background())
	second := adm.StructuralPartials(context.Background())
	if len(first.Diagnostics) != maxAdminStructuralDiagnostics {
		t.Fatalf("diagnostic count = %d, want %d", len(first.Diagnostics), maxAdminStructuralDiagnostics)
	}
	if fmt.Sprint(first.Diagnostics) != fmt.Sprint(second.Diagnostics) {
		t.Fatalf("diagnostics are not deterministic:\n%+v\n%+v", first.Diagnostics, second.Diagnostics)
	}
	for index := 1; index < len(first.Diagnostics); index++ {
		if first.Diagnostics[index-1].Key >= first.Diagnostics[index].Key {
			t.Fatalf("diagnostics are not ordered: %+v", first.Diagnostics)
		}
	}
}

func TestStructuralPartialDiagnosticKeysAreBoundedAndLogSafe(t *testing.T) {
	hostileKey := "admin.shell." + strings.Repeat("very-long-", 40) + "\nforged-entry"
	diagnostic := newAdminStructuralDiagnostic(hostileKey, AdminPartialUnsupportedKey, "host/footer.html")

	if strings.ContainsAny(diagnostic.Key, "\r\n\t") {
		t.Fatalf("diagnostic key contains control characters: %q", diagnostic.Key)
	}
	if len([]rune(diagnostic.Key)) > maxAdminStructuralDiagnosticKeyRunes {
		t.Fatalf("diagnostic key is not bounded: %d runes", len([]rune(diagnostic.Key)))
	}
	if !strings.HasPrefix(diagnostic.Key, "unsafe-admin-key-") {
		t.Fatalf("hostile diagnostic key was not fingerprinted: %q", diagnostic.Key)
	}
	if got := safeAdminStructuralDiagnosticKey(AdminPartialShellFooter); got != AdminPartialShellFooter {
		t.Fatalf("supported key changed from %q to %q", AdminPartialShellFooter, got)
	}
}

func TestStructuralPartialsReturnAndSinkClones(t *testing.T) {
	var captured []AdminStructuralPartialDiagnostic
	adm := (&Admin{defaultTheme: &ThemeSelection{Partials: map[string]string{
		AdminPartialShellFooter: "missing/footer.html",
	}}}).WithAdminTemplateLookup(AdminTemplateLookupFunc(func(string) bool { return false })).
		WithAdminStructuralDiagnosticSink(AdminStructuralDiagnosticSinkFunc(func(_ context.Context, diagnostics []AdminStructuralPartialDiagnostic) {
			captured = diagnostics
		}))

	first := adm.StructuralPartials(context.Background())
	first.Diagnostics[0].ReasonCode = "mutated"
	second := adm.StructuralPartials(context.Background())
	if second.Diagnostics[0].ReasonCode != AdminPartialUnavailable || captured[0].ReasonCode != AdminPartialUnavailable {
		t.Fatalf("selection or sink aliases mutable diagnostics: second=%+v captured=%+v", second.Diagnostics, captured)
	}
}

func TestStructuralPartialsFollowRequestThemeVariant(t *testing.T) {
	adm := (&Admin{}).WithThemeProvider(func(_ context.Context, selector ThemeSelector) (*ThemeSelection, error) {
		candidate := "themes/acme/light-breadcrumbs.html"
		if selector.Variant == "dark" {
			candidate = "themes/acme/dark-breadcrumbs.html"
		}
		return &ThemeSelection{Partials: map[string]string{
			AdminPartialPageBreadcrumbs: candidate,
		}}, nil
	}).WithAdminTemplateLookup(AdminTemplateLookupFunc(func(identifier string) bool {
		return strings.HasPrefix(identifier, "themes/acme/")
	}))

	light := adm.StructuralPartials(WithThemeSelection(context.Background(), ThemeSelector{Variant: "light"}))
	dark := adm.StructuralPartials(WithThemeSelection(context.Background(), ThemeSelector{Variant: "dark"}))
	if light.Breadcrumbs != "themes/acme/light-breadcrumbs.html" || dark.Breadcrumbs != "themes/acme/dark-breadcrumbs.html" {
		t.Fatalf("variant selection mismatch: light=%+v dark=%+v", light, dark)
	}
}

func TestNormalizeAdminTemplateIdentifierRejectsUnsafeCandidates(t *testing.T) {
	unsafe := []string{"", " /absolute.html", "/absolute.html", "../escape.html", "a/../b.html", `a\\b.html`, "a.html?x=1", "a.html#x", "a.txt", ".hidden.html", "a/\n.html", "https:theme.html", "theme/<unsafe>.html", "theme/has space.html"}
	for _, candidate := range unsafe {
		if normalized, ok := normalizeAdminTemplateIdentifier(candidate); ok {
			t.Fatalf("normalizeAdminTemplateIdentifier(%q) = %q, true", candidate, normalized)
		}
	}
	for _, candidate := range []string{"partials/breadcrumbs.html", "themes/acme/footer.html"} {
		if normalized, ok := normalizeAdminTemplateIdentifier(candidate); !ok || normalized != candidate {
			t.Fatalf("normalizeAdminTemplateIdentifier(%q) = %q, %v", candidate, normalized, ok)
		}
	}
}

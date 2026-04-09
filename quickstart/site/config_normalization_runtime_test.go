package site

import (
	"io/fs"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/admin"
)

func TestConfigNormalizationUniqueLocalesPreserveOrderNormalizesAndDeduplicates(t *testing.T) {
	got := uniqueLocalesPreserveOrder([]string{" ES ", "en", "es", "", "fr"}, " EN ")
	want := []string{"en", "es", "fr"}
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}

	if got := uniqueLocalesPreserveOrder(nil, " "); got != nil {
		t.Fatalf("expected nil when no locales remain, got %v", got)
	}
}

func TestConfigNormalizationNormalizeEnvironmentAndContentChannelCanonicalizeAliases(t *testing.T) {
	if got := normalizeRuntimeEnvironment("development"); got != "dev" {
		t.Fatalf("expected development -> dev, got %q", got)
	}
	if got := normalizeRuntimeEnvironment(" default "); got != "" {
		t.Fatalf("expected default -> empty, got %q", got)
	}
	if got := normalizeRuntimeEnvironment("Custom"); got != "custom" {
		t.Fatalf("expected custom passthrough lowercased, got %q", got)
	}

	if got := normalizeContentChannel(" stage "); got != "staging" {
		t.Fatalf("expected stage -> staging, got %q", got)
	}
	if got := normalizeContentChannel(" "); got != "default" {
		t.Fatalf("expected empty channel -> default, got %q", got)
	}
	if got := normalizeContentChannel("Canary"); got != "canary" {
		t.Fatalf("expected custom channel lowercased, got %q", got)
	}
}

func TestConfigNormalizationNormalizePathAndAssetPathPreserveExpectedContracts(t *testing.T) {
	if got := normalizePath(" site "); got != "/site" {
		t.Fatalf("expected normalized path /site, got %q", got)
	}
	if got := normalizePathOrDefault("", "/fallback/"); got != "/fallback" {
		t.Fatalf("expected fallback path /fallback, got %q", got)
	}
	if got := normalizeAssetPath("https://cdn.example.com/assets/"); got != "https://cdn.example.com/assets" {
		t.Fatalf("expected absolute asset URL without trailing slash, got %q", got)
	}
	if got := normalizeAssetPath(" assets "); got != "/assets" {
		t.Fatalf("expected local asset path normalization, got %q", got)
	}
}

func TestConfigNormalizationCloneAndMergeTemplateMapsTrimInvalidEntries(t *testing.T) {
	clonedStatus := cloneStatusTemplateMap(map[int]string{
		404: " site/error/404 ",
		500: "   ",
	})
	if len(clonedStatus) != 1 || clonedStatus[404] != "site/error/404" {
		t.Fatalf("expected trimmed status template clone, got %#v", clonedStatus)
	}

	clonedCode := cloneCodeTemplateMap(map[string]string{
		" translation_missing ": " site/error/missing ",
		"":                      "site/error/empty",
	})
	if len(clonedCode) != 1 || clonedCode["translation_missing"] != "site/error/missing" {
		t.Fatalf("expected trimmed code template clone, got %#v", clonedCode)
	}

	mergedStatus := mergeStatusTemplateMaps(
		map[int]string{404: "site/error/default"},
		map[int]string{404: " site/error/custom ", 500: " "},
	)
	if len(mergedStatus) != 1 || mergedStatus[404] != "site/error/custom" {
		t.Fatalf("expected merged status templates with last-write-wins, got %#v", mergedStatus)
	}

	mergedCode := mergeCodeTemplateMaps(
		map[string]string{"translation_missing": "site/error/default"},
		map[string]string{" translation_missing ": " site/error/custom ", " ": "ignored"},
	)
	if len(mergedCode) != 1 || mergedCode["translation_missing"] != "site/error/custom" {
		t.Fatalf("expected merged code templates with trimmed key/value, got %#v", mergedCode)
	}
}

func TestConfigNormalizationCompactHelpersDropNilAndCloneStringsTrimValues(t *testing.T) {
	fsA := fstest.MapFS{"a.txt": {Data: []byte("a")}}
	fsB := fstest.MapFS{"b.txt": {Data: []byte("b")}}
	compactedFS := compactFS([]fs.FS{fsA, nil, fsB})
	if len(compactedFS) != 2 {
		t.Fatalf("expected two fs entries after compaction, got %d", len(compactedFS))
	}

	modules := compactModules([]SiteModule{
		moduleStub{id: "first"},
		nil,
		moduleStub{id: "second"},
	})
	if len(modules) != 2 {
		t.Fatalf("expected two modules after compaction, got %d", len(modules))
	}

	cloned := cloneStrings([]string{" one ", "", "two"})
	if len(cloned) != 2 || cloned[0] != "one" || cloned[1] != "two" {
		t.Fatalf("expected trimmed cloned strings, got %v", cloned)
	}
}

func TestResolveSiteConfigUsesExtractedNormalizationHelpers(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", Debug: admin.DebugConfig{Enabled: true}}
	resolved := ResolveSiteConfig(cfg, SiteConfig{
		BasePath:         " site ",
		DefaultLocale:    " ES ",
		SupportedLocales: []string{"fr", "es", "FR"},
		LocalePrefixMode: LocalePrefixAlways,
		Environment:      "production",
		ContentChannel:   "stage",
		Navigation: SiteNavigationConfig{
			ContributionLocalePolicy: "strict",
		},
		Views: SiteViewConfig{
			AssetBasePath: "assets",
			ErrorTemplatesByStatus: map[int]string{
				418: " site/error/teapot ",
			},
			ErrorTemplatesByCode: map[string]string{
				"translation_missing": " site/error/custom_missing ",
			},
		},
		Search: SiteSearchConfig{
			Collections: []string{"pages", "posts"},
		},
	})

	if resolved.BasePath != "/site" {
		t.Fatalf("expected normalized base path /site, got %q", resolved.BasePath)
	}
	if resolved.DefaultLocale != "ES" {
		t.Fatalf("expected explicit default locale trimming to be preserved by entrypoint, got %q", resolved.DefaultLocale)
	}
	if got, want := resolved.SupportedLocales, []string{"es", "fr"}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("expected normalized supported locales %v, got %v", want, got)
	}
	if resolved.LocalePrefixMode != LocalePrefixAlways {
		t.Fatalf("expected locale prefix always, got %q", resolved.LocalePrefixMode)
	}
	if resolved.Environment != "prod" {
		t.Fatalf("expected normalized environment prod, got %q", resolved.Environment)
	}
	if resolved.ContentChannel != "staging" {
		t.Fatalf("expected normalized content channel staging, got %q", resolved.ContentChannel)
	}
	if resolved.Navigation.ContributionLocalePolicy != ContributionLocalePolicyStrict {
		t.Fatalf("expected strict contribution locale policy, got %q", resolved.Navigation.ContributionLocalePolicy)
	}
	if resolved.Views.AssetBasePath != "/assets" {
		t.Fatalf("expected normalized asset base path /assets, got %q", resolved.Views.AssetBasePath)
	}
	if resolved.Views.ErrorTemplatesByStatus[418] != "site/error/teapot" {
		t.Fatalf("expected trimmed error status template, got %#v", resolved.Views.ErrorTemplatesByStatus)
	}
	if resolved.Views.ErrorTemplatesByCode[siteErrorCodeTranslationMissing] != "site/error/custom_missing" {
		t.Fatalf("expected trimmed error code template override, got %#v", resolved.Views.ErrorTemplatesByCode)
	}
	if got, want := resolved.Search.Indexes, []string{"pages", "posts"}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("expected collection fallback indexes %v, got %v", want, got)
	}
	if resolved.Fallback.Mode != SiteFallbackModePublicContentOnly || !resolved.Fallback.AllowRoot {
		t.Fatalf("expected default fallback policy to be resolved, got %+v", resolved.Fallback)
	}
}

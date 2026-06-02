package quickstart

import (
	"context"
	"slices"
	"testing"

	"github.com/goliatone/go-admin/admin"
	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

type stubTranslationChecker struct{}

func (stubTranslationChecker) CheckTranslations(context.Context, uuid.UUID, []string, cmsinterfaces.TranslationCheckOptions) ([]string, error) {
	return nil, nil
}

type anyTranslationServicesProvider struct {
	pages   TranslationChecker
	content TranslationChecker
}

func (p anyTranslationServicesProvider) PageService() any { return p.pages }
func (p anyTranslationServicesProvider) ContentService() any {
	return p.content
}

type nestedTranslationContainer struct {
	inner any
}

func (c nestedTranslationContainer) Container() any { return c.inner }

func TestResolveTranslationPolicyServicesFromAnyGoCMSProvider(t *testing.T) {
	pages := stubTranslationChecker{}
	content := stubTranslationChecker{}
	cfg := admin.Config{
		CMS: admin.CMSOptions{
			GoCMSConfig: anyTranslationServicesProvider{pages: pages, content: content},
		},
	}

	services := resolveTranslationPolicyServices(cfg, TranslationPolicyServices{})
	if services.Pages == nil {
		t.Fatalf("expected pages checker to resolve")
	}
	if services.Content == nil {
		t.Fatalf("expected content checker to resolve")
	}
}

func TestResolveTranslationPolicyServicesFromNestedContainer(t *testing.T) {
	pages := stubTranslationChecker{}
	content := stubTranslationChecker{}
	cfg := admin.Config{
		CMS: admin.CMSOptions{
			GoCMSConfig: nestedTranslationContainer{inner: anyTranslationServicesProvider{pages: pages, content: content}},
		},
	}

	services := resolveTranslationPolicyServices(cfg, TranslationPolicyServices{})
	if services.Pages == nil || services.Content == nil {
		t.Fatalf("expected nested provider checkers, got %+v", services)
	}
}

func TestResolveTranslationPolicyServicesPrefersOverrides(t *testing.T) {
	pages := stubTranslationChecker{}
	content := stubTranslationChecker{}
	overrides := TranslationPolicyServices{Pages: pages, Content: content}
	cfg := admin.Config{CMS: admin.CMSOptions{}}

	services := resolveTranslationPolicyServices(cfg, overrides)
	if services.Pages == nil || services.Content == nil {
		t.Fatalf("expected override services to be used")
	}
}

func TestDiagnoseTranslationPolicyServicesReportsExplicitRequirementsWithoutCheckers(t *testing.T) {
	cfg := TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {Locales: []string{"en", "es"}},
			},
		},
	}
	diagnostics := DiagnoseTranslationPolicyServices(cfg, TranslationPolicyServices{})
	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %+v", diagnostics)
	}
	if diagnostics[0].Code != TranslationPolicyServicesMissingCode {
		t.Fatalf("unexpected diagnostic code: %+v", diagnostics[0])
	}
	if len(diagnostics[0].MissingServices) != 1 || diagnostics[0].MissingServices[0] != translationPolicyPagesServiceName {
		t.Fatalf("expected page service missing, got %+v", diagnostics[0].MissingServices)
	}
}

func TestDiagnoseTranslationPolicyServicesReportsEntitySpecificMissingServices(t *testing.T) {
	cfg := TranslationPolicyConfig{
		PageEntities: []string{"landing_pages"},
		Required: map[string]TranslationPolicyEntityConfig{
			"landing_pages": {
				"publish": {Locales: []string{"en", "es"}},
			},
			"news": {
				"publish": {Locales: []string{"en", "fr"}},
			},
		},
	}
	diagnostics := DiagnoseTranslationPolicyServices(cfg, TranslationPolicyServices{})
	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %+v", diagnostics)
	}
	missing := diagnostics[0].MissingServices
	if !slices.Equal(missing, []string{translationPolicyContentServiceName, translationPolicyPagesServiceName}) {
		t.Fatalf("expected page and content services missing, got %+v", missing)
	}
}

func TestDiagnoseTranslationPolicyServicesReportsPartialCheckerMismatch(t *testing.T) {
	cfg := TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"news": {
				"publish": {Locales: []string{"en", "fr"}},
			},
		},
	}
	diagnostics := DiagnoseTranslationPolicyServices(
		cfg,
		TranslationPolicyServices{Pages: stubTranslationChecker{}},
	)
	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic for missing content checker, got %+v", diagnostics)
	}
	if !slices.Equal(diagnostics[0].MissingServices, []string{translationPolicyContentServiceName}) {
		t.Fatalf("expected content service missing, got %+v", diagnostics[0].MissingServices)
	}
}

func TestDiagnoseTranslationPolicyServicesReportsDenyByDefaultWithoutCheckers(t *testing.T) {
	diagnostics := DiagnoseTranslationPolicyServices(
		TranslationPolicyConfig{DenyByDefault: true},
		TranslationPolicyServices{},
	)
	if len(diagnostics) != 1 || diagnostics[0].Code != TranslationPolicyServicesMissingCode {
		t.Fatalf("expected services-missing diagnostic, got %+v", diagnostics)
	}
}

func TestDiagnoseTranslationPolicyServicesAllowsPermissiveEmptyPolicyWithoutCheckers(t *testing.T) {
	diagnostics := DiagnoseTranslationPolicyServices(TranslationPolicyConfig{}, TranslationPolicyServices{})
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for empty permissive policy, got %+v", diagnostics)
	}
}

func TestDiagnoseTranslationPolicyServicesAllowsExplicitOverrides(t *testing.T) {
	diagnostics := DiagnoseTranslationPolicyServices(
		TranslationPolicyConfig{
			Required: map[string]TranslationPolicyEntityConfig{
				"pages": {
					"publish": {Locales: []string{"en", "es"}},
				},
			},
		},
		TranslationPolicyServices{Pages: stubTranslationChecker{}, Content: stubTranslationChecker{}},
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics with explicit checker overrides, got %+v", diagnostics)
	}
}

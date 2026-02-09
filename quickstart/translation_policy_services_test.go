package quickstart

import (
	"context"
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

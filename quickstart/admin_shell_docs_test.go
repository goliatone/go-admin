package quickstart

import (
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestAdminShellCustomizationDocsMatchRuntimeContract(t *testing.T) {
	documents := map[string][]string{
		"README.md": {
			"WithViewAdmin(adm *admin.Admin)",
			"admin.EnrichLayoutViewContextWithChrome",
			"`DashboardTemplatesFS()` is the canonical client template set",
		},
	}

	for path, fragments := range documents {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		for _, fragment := range fragments {
			if !strings.Contains(string(content), fragment) {
				t.Errorf("%s is missing runtime contract fragment %q", path, fragment)
			}
		}
	}
}

func TestQuickstartContextProviderUsesTypedPageChromeProjection(t *testing.T) {
	source, err := os.ReadFile("ui_routes.go")
	if err != nil {
		t.Fatalf("read quickstart UI provider: %v", err)
	}
	if !strings.Contains(string(source), "admin.EnrichLayoutViewContextWithChrome(") {
		t.Fatal("central quickstart UI provider must project route presentation through typed page chrome")
	}
}

func TestDashboardRendererUsesTypedRuntimeContract(t *testing.T) {
	renderer := reflect.TypeFor[admin.DashboardRenderer]()
	method, ok := renderer.MethodByName("RenderPage")
	if !ok || method.Type.NumIn() < 2 {
		t.Fatal("admin.DashboardRenderer.RenderPage contract is unavailable")
	}
	pageType := method.Type.In(1)
	if pageType.PkgPath() != "github.com/goliatone/go-admin/admin" || pageType.Name() != "AdminDashboardPage" {
		t.Fatalf("unexpected dashboard renderer page contract %s.%s", pageType.PkgPath(), pageType.Name())
	}

}

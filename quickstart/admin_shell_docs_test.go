package quickstart

import (
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

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

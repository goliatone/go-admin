package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	cmswidgets "github.com/goliatone/go-cms/widgets"
	"github.com/google/uuid"
)

func TestLocalizationRegressionSnapshot(t *testing.T) {
	ctx := context.Background()

	widgetSvc := newStubGoCMSWidgetService()
	defID := uuid.MustParse("00000000-0000-0000-0000-00000000a101")
	widgetSvc.defs["admin.widget.localized"] = &cmswidgets.Definition{
		ID:     defID,
		Name:   "admin.widget.localized",
		Schema: map[string]any{"fields": []any{}},
	}
	area := "admin.dashboard.main"
	instID := uuid.MustParse("00000000-0000-0000-0000-00000000b101")
	widgetSvc.instances[instID] = &cmswidgets.Instance{
		ID:            instID,
		DefinitionID:  defID,
		AreaCode:      &area,
		Configuration: map[string]any{"headline": "Base"},
	}
	widgetSvc.resolvedConfigs[instID] = map[string]any{"headline": "Localized"}
	widgetSvc.placementsByArea[area] = map[uuid.UUID]*cmswidgets.AreaPlacement{
		instID: {
			ID:         uuid.MustParse("00000000-0000-0000-0000-00000000c101"),
			AreaCode:   area,
			InstanceID: instID,
			Position:   1,
		},
	}

	adapter := NewGoCMSWidgetAdapter(widgetSvc)
	instances, err := adapter.ListInstances(ctx, WidgetInstanceFilter{Area: area})
	if err != nil {
		t.Fatalf("list instances: %v", err)
	}
	if len(instances) != 1 {
		t.Fatalf("expected one widget instance, got %d", len(instances))
	}

	menuSvc := &siteAPIMenuServiceStub{
		byLocation: map[string]*Menu{
			"site.main": {
				Code:     "site_primary",
				Location: "site.main",
				Items: []MenuItem{
					{ID: "home", LabelKey: "menu.home", Target: map[string]any{"url": "/"}},
				},
			},
		},
	}
	adm, server := newSiteTestServerWithoutAuthorizer(t, allowPublicSiteReads(Config{BasePath: "/admin", DefaultLocale: "en"}), Dependencies{}, nil, menuSvc)
	adm.WithTranslator(siteAPITranslatorStub{
		values: map[string]string{
			"es:menu.home": "Inicio",
		},
	})
	path := mustResolveURL(t, adm.URLs(), publicAPIGroupName(adm.config), SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale": "es",
	})
	req := httptest.NewRequest(http.MethodGet, path, nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("site menu status=%d body=%s", res.Code, res.Body.String())
	}
	menuPayload := decodeJSONMap(t, res)
	menuData := extractMap(menuPayload["data"])
	menuItems := extractListMaps(menuData["items"])
	if len(menuItems) != 1 {
		t.Fatalf("expected one menu item, got %+v", menuData)
	}

	snapshot := map[string]any{
		"localized_widget_instance": map[string]any{
			"definition": instances[0].DefinitionCode,
			"config":     instances[0].Config,
		},
		"site_menu_item": map[string]any{
			"code":      menuData["code"],
			"location":  menuData["location"],
			"id":        menuItems[0]["id"],
			"label":     menuItems[0]["label"],
			"label_key": menuItems[0]["label_key"],
			"href":      menuItems[0]["target"].(map[string]any)["url"],
		},
	}

	assertLocalizationSnapshot(t, snapshot, filepath.Join("testdata", "localization_regression_snapshot.json"))
}

func assertLocalizationSnapshot(t *testing.T, payload map[string]any, snapshotPath string) {
	t.Helper()
	got, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal localization snapshot: %v", err)
	}
	want, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot %q: %v", snapshotPath, err)
	}
	if !bytes.Equal(bytes.TrimSpace(got), bytes.TrimSpace(want)) {
		t.Fatalf("localization snapshot mismatch\nexpected:\n%s\n\ngot:\n%s", string(want), string(got))
	}
}

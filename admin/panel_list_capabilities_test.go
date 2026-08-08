package admin

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

type panelCapabilityExportRegistry struct {
	definition ExportDefinition
	err        error
}

func (r panelCapabilityExportRegistry) ListDefinitions(context.Context) ([]ExportDefinition, error) {
	if r.err != nil {
		return nil, r.err
	}
	return []ExportDefinition{r.definition}, nil
}

func (r panelCapabilityExportRegistry) GetDefinition(context.Context, string) (ExportDefinition, error) {
	if r.err != nil {
		return ExportDefinition{}, r.err
	}
	return r.definition, nil
}

type panelCapabilityExportRegistrar struct {
	err  error
	path string
}

func (r panelCapabilityExportRegistrar) RegisterExportRoutes(routeRouter AdminRouter, opts ExportRouteOptions) error {
	if r.err != nil {
		return r.err
	}
	path := r.path
	if path == "" {
		path = strings.TrimRight(opts.BasePath, "/") + "/exports"
	}
	routeRouter.Post(path, func(router.Context) error { return nil })
	return nil
}

type panelCapabilityNoopExportRegistrar struct{}

func (panelCapabilityNoopExportRegistrar) RegisterExportRoutes(AdminRouter, ExportRouteOptions) error {
	return nil
}

type panelCapabilityAuthorizer map[string]bool

func (a panelCapabilityAuthorizer) Can(_ context.Context, action, _ string) bool {
	return a[action]
}

func TestResolvePanelListCapabilitiesEnforcesSelectionInvariant(t *testing.T) {
	tests := []struct {
		bulk, export bool
		want         PanelListCapabilities
	}{
		{want: PanelListCapabilities{}},
		{bulk: true, want: PanelListCapabilities{Selection: true, Bulk: true}},
		{export: true, want: PanelListCapabilities{Selection: true, Export: true}},
		{bulk: true, export: true, want: PanelListCapabilities{Selection: true, Bulk: true, Export: true}},
	}
	for _, tc := range tests {
		if got := ResolvePanelListCapabilities(tc.bulk, tc.export); got != tc.want {
			t.Fatalf("ResolvePanelListCapabilities(%t, %t) = %+v, want %+v", tc.bulk, tc.export, got, tc.want)
		}
	}
}

func TestResolvePanelExportConfigRequiresSuccessfulRouteRegistrationAndValidDefinition(t *testing.T) {
	registry := panelCapabilityExportRegistry{definition: ExportDefinition{
		Name: "items", Variants: []string{"published"},
	}}
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate:     featureGateFromKeys(FeatureExport, FeatureCMS),
		ExportRegistry:  registry,
		ExportRegistrar: panelCapabilityExportRegistrar{},
	})

	if got := adm.ResolvePanelExportConfig(context.Background(), "items", "published"); got != nil {
		t.Fatalf("expected export to fail closed before route registration, got %+v", got)
	}

	server := router.NewHTTPServer()
	if err := adm.ExportRegistrar().Register(server.Router(), boot.ExportRouteOptions{BasePath: "/admin"}); err != nil {
		t.Fatalf("register export routes: %v", err)
	}
	if !adm.ExportAPIAvailable() {
		t.Fatal("expected export API to become available after successful registration")
	}

	config := adm.ResolvePanelExportConfig(context.Background(), "items", "published")
	if config == nil || config.Definition != "items" || config.Endpoint != "/admin/exports" || config.Variant != "published" {
		t.Fatalf("unexpected registered export config: %+v", config)
	}
	config = adm.ResolvePanelExportConfig(context.Background(), "items", "unsupported")
	if config == nil || config.Variant != "" {
		t.Fatalf("expected unsupported variant to fall back to the base definition, got %+v", config)
	}
}

func TestResolvePanelExportConfigUsesActuallyRegisteredEndpoint(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate:     featureGateFromKeys(FeatureExport, FeatureCMS),
		ExportRegistry:  panelCapabilityExportRegistry{definition: ExportDefinition{Name: "items"}},
		ExportRegistrar: panelCapabilityExportRegistrar{path: "/operations/downloads"},
	})
	server := router.NewHTTPServer()
	if err := adm.ExportRegistrar().Register(server.Router(), boot.ExportRouteOptions{BasePath: "/admin"}); err != nil {
		t.Fatalf("register export routes: %v", err)
	}

	config := adm.ResolvePanelExportConfig(context.Background(), "items", "")
	if config == nil || config.Endpoint != "/operations/downloads" {
		t.Fatalf("expected registered custom endpoint, got %+v", config)
	}
}

func TestExportAPIAvailabilityRequiresMountedPostEndpoint(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate:     featureGateFromKeys(FeatureExport, FeatureCMS),
		ExportRegistry:  panelCapabilityExportRegistry{definition: ExportDefinition{Name: "items"}},
		ExportRegistrar: panelCapabilityNoopExportRegistrar{},
	})
	server := router.NewHTTPServer()
	if err := adm.ExportRegistrar().Register(server.Router(), boot.ExportRouteOptions{BasePath: "/admin"}); err != nil {
		t.Fatalf("register export routes: %v", err)
	}
	if adm.ExportAPIAvailable() {
		t.Fatal("a successful registrar call without a mounted POST endpoint must fail closed")
	}
}

func TestResolvePanelExportConfigFailsClosedOnRegistrationOrRegistryErrors(t *testing.T) {
	registrationErr := errors.New("route registration failed")
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate:     featureGateFromKeys(FeatureExport, FeatureCMS),
		ExportRegistry:  panelCapabilityExportRegistry{definition: ExportDefinition{Name: "items"}},
		ExportRegistrar: panelCapabilityExportRegistrar{err: registrationErr},
	})
	server := router.NewHTTPServer()
	if err := adm.ExportRegistrar().Register(server.Router(), boot.ExportRouteOptions{}); !errors.Is(err, registrationErr) {
		t.Fatalf("expected registration error, got %v", err)
	}
	if adm.ExportAPIAvailable() {
		t.Fatal("failed route registration must not enable export")
	}

	adm = mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate:     featureGateFromKeys(FeatureExport, FeatureCMS),
		ExportRegistry:  panelCapabilityExportRegistry{err: errors.New("registry unavailable")},
		ExportRegistrar: panelCapabilityExportRegistrar{},
	})
	adm.recordExportRoutesAvailable("/admin/exports")
	if got := adm.ResolvePanelExportConfig(context.Background(), "items", ""); got != nil {
		t.Fatalf("registry errors must fail closed, got %+v", got)
	}
}

func TestAuthorizedPanelBulkActionsRequiresPermissionAndPermissionsAll(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		Authorizer: panelCapabilityAuthorizer{
			"items.bulk": true,
			"items.edit": true,
		},
	})
	actions := []Action{
		{Name: "legacy", Permission: "items.bulk"},
		{Name: "allowed", PermissionsAll: []string{"items.bulk", "items.edit"}},
		{Name: "denied", PermissionsAll: []string{"items.bulk", "items.publish"}},
	}

	got := adm.AuthorizedPanelBulkActions(context.Background(), "items", actions)
	if len(got) != 2 || got[0].Name != "legacy" || got[1].Name != "allowed" {
		t.Fatalf("unexpected authorized actions: %+v", got)
	}
}

func TestPanelListSchemaOmitsBulkActionsMissingAnyRequiredPermission(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		Authorizer: panelCapabilityAuthorizer{"items.bulk": true},
	})
	panel, err := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		BulkActions(Action{
			Name:           "publish",
			Permission:     "items.bulk",
			PermissionsAll: []string{"items.bulk", "items.publish"},
			Scope:          ActionScopeBulk,
		}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	schema, err := (&panelBinding{admin: adm, name: "items", panel: panel}).listSchema(
		AdminContext{Context: context.Background()},
		false,
	)
	if err != nil {
		t.Fatalf("resolve list schema: %v", err)
	}
	if len(schema.BulkActions) != 0 {
		t.Fatalf("expected denied bulk action to be absent from API schema, got %+v", schema.BulkActions)
	}
	if schema.BulkActionStateConfig != nil {
		t.Fatalf("expected denied bulk state metadata to be absent, got %+v", schema.BulkActionStateConfig)
	}
}

package admin

import (
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
)

func TestBuiltInModuleContractsDeclareCanonicalHTTPMethods(t *testing.T) {
	providers := []RouteContractProvider{
		&ActivityModule{},
		&ContentTypeBuilderModule{},
		&DebugModule{},
		&FeatureFlagsModule{},
		&MediaModule{},
		&OrganizationsModule{},
		&PreferencesModule{},
		&ProfileModule{},
		&TenantsModule{},
		&UserManagementModule{},
	}

	for _, provider := range providers {
		contract := routing.NormalizeModuleContract(provider.RouteContract())
		assertTypedRouteTable(t, contract.Slug, "ui", contract.UIRoutes, contract.UIRouteDeclarations)
		assertTypedRouteTable(t, contract.Slug, "api", contract.APIRoutes, contract.APIRouteDeclarations)
		assertTypedRouteTable(t, contract.Slug, "public_api", contract.PublicAPIRoutes, contract.PublicAPIRouteDeclarations)
	}
}

func assertTypedRouteTable(t *testing.T, slug, surface string, routes map[string]string, declarations map[string]routing.RouteDeclaration) {
	t.Helper()
	for key := range routes {
		declaration, ok := declarations[key]
		if !ok || declaration.Method == "" {
			t.Errorf("module %q %s route %q has no typed HTTP method", slug, surface, key)
		}
	}
}

package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	router "github.com/goliatone/go-router"
)

func TestTenantAndOrganizationModulesRegister(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureTenants, FeatureOrganizations, FeatureSearch)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if _, ok := adm.registry.Panel(tenantsModuleID); !ok {
		t.Fatalf("expected tenants panel to be registered")
	}
	if _, ok := adm.registry.Panel(organizationsModuleID); !ok {
		t.Fatalf("expected organizations panel to be registered")
	}

	items := adm.Navigation().Resolve(context.Background(), cfg.DefaultLocale)
	if !navinternal.NavigationHasTarget(items, tenantsModuleID, joinBasePath(cfg.BasePath, tenantsModuleID)) {
		t.Fatalf("expected tenants navigation entry, got %+v", items)
	}
	if !navinternal.NavigationHasTarget(items, organizationsModuleID, joinBasePath(cfg.BasePath, organizationsModuleID)) {
		t.Fatalf("expected organizations navigation entry, got %+v", items)
	}
}

func TestTenantModuleEnforcesPermissions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureTenants)})
	adm.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", adminPanelAPIPath(adm, cfg, tenantsModuleID), nil)
	req.Header.Set("X-User-ID", "actor-tenant")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for forbidden list, got %d", rr.Code)
	}
}

func TestTenantAndOrganizationCRUDSearchAndActivity(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureTenants, FeatureOrganizations, FeatureSearch)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	tenantPayload := map[string]any{
		"name":   "Acme Corp",
		"slug":   "acme",
		"status": "active",
		"domain": "acme.test",
		"members": []map[string]any{
			{"user_id": "user-tenant-1", "roles": []string{"owner"}, "permissions": []string{"admin.tenants.manage"}},
		},
	}
	tenantBody, _ := json.Marshal(tenantPayload)
	tenantReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, tenantsModuleID), bytes.NewReader(tenantBody))
	tenantReq.Header.Set("Content-Type", "application/json")
	tenantReq.Header.Set("X-User-ID", "actor-tenant")
	tenantRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(tenantRes, tenantReq)
	if tenantRes.Code != 200 {
		t.Fatalf("expected tenant create 200, got %d body=%s", tenantRes.Code, tenantRes.Body.String())
	}
	var tenantResp map[string]any
	_ = json.Unmarshal(tenantRes.Body.Bytes(), &tenantResp)
	tenantID := toString(tenantResp["id"])
	if tenantID == "" || toString(tenantResp["name"]) != "Acme Corp" {
		t.Fatalf("unexpected tenant response %+v", tenantResp)
	}

	orgPayload := map[string]any{
		"name":      "Acme Org",
		"slug":      "acme-org",
		"status":    "active",
		"tenant_id": tenantID,
		"members": []map[string]any{
			{"user_id": "user-org-1", "roles": []string{"manager"}},
		},
	}
	orgBody, _ := json.Marshal(orgPayload)
	orgReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, organizationsModuleID), bytes.NewReader(orgBody))
	orgReq.Header.Set("Content-Type", "application/json")
	orgReq.Header.Set("X-User-ID", "actor-org")
	orgRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(orgRes, orgReq)
	if orgRes.Code != 200 {
		t.Fatalf("expected organization create 200, got %d body=%s", orgRes.Code, orgRes.Body.String())
	}
	var orgResp map[string]any
	_ = json.Unmarshal(orgRes.Body.Bytes(), &orgResp)
	orgID := toString(orgResp["id"])
	if orgID == "" || toString(orgResp["tenant_id"]) != tenantID {
		t.Fatalf("unexpected organization response %+v", orgResp)
	}

	searchReq := httptest.NewRequest("GET", "/admin/api/search?query=acme", nil)
	searchReq.Header.Set("X-User-ID", "actor-search")
	searchRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(searchRes, searchReq)
	if searchRes.Code != 200 {
		t.Fatalf("expected search 200, got %d body=%s", searchRes.Code, searchRes.Body.String())
	}
	var searchPayload map[string]any
	_ = json.Unmarshal(searchRes.Body.Bytes(), &searchPayload)
	results, _ := searchPayload["results"].([]any)
	if len(results) == 0 {
		t.Fatalf("expected search results, got %+v", searchPayload["results"])
	}

	tenantDetailReq := httptest.NewRequest("GET", adminAPIPath(adm, cfg, "panel.id", map[string]string{"panel": tenantsModuleID, "id": tenantID}, nil), nil)
	tenantDetailReq.Header.Set("X-User-ID", "actor-tenant")
	tenantDetailRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(tenantDetailRes, tenantDetailReq)
	if tenantDetailRes.Code != 200 {
		t.Fatalf("expected tenant detail 200, got %d body=%s", tenantDetailRes.Code, tenantDetailRes.Body.String())
	}
	var tenantDetail map[string]any
	_ = json.Unmarshal(tenantDetailRes.Body.Bytes(), &tenantDetail)
	record, _ := tenantDetail["data"].(map[string]any)
	if members, ok := record["members"].([]any); !ok || len(members) != 1 {
		t.Fatalf("expected tenant members to persist, got %+v", record["members"])
	}

	entries, _ := adm.ActivityFeed().List(context.Background(), 10)
	foundTenant := false
	foundOrg := false
	for _, entry := range entries {
		if entry.Action == "tenant.create" && entry.Object == "tenant:"+tenantID {
			foundTenant = true
		}
		if entry.Action == "organization.create" && entry.Object == "organization:"+orgID {
			foundOrg = true
		}
	}
	if !foundTenant {
		t.Fatalf("expected tenant.create activity entry, got %+v", entries)
	}
	if !foundOrg {
		t.Fatalf("expected organization.create activity entry, got %+v", entries)
	}
}

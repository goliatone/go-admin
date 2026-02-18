package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"path"
	"strings"
	"time"

	urlkit "github.com/goliatone/go-urlkit"
)

const (
	tenantsModuleID       = "tenants"
	organizationsModuleID = "organizations"
)

// TenantsModule registers the tenants panel and navigation.
type TenantsModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	viewPerm      string
	createPerm    string
	updatePerm    string
	deletePerm    string
	menuParent    string
	urls          urlkit.Resolver
}

// NewTenantsModule constructs the default tenants module.
func NewTenantsModule() *TenantsModule {
	return (&TenantsModule{}).WithMenuParent("nav-group-main")
}

// Manifest describes the module metadata.
func (m *TenantsModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             tenantsModuleID,
		NameKey:        "modules.tenants.name",
		DescriptionKey: "modules.tenants.description",
		FeatureFlags:   []string{string(FeatureTenants)},
	}
}

// Register wires the tenants panel and search adapter.
func (m *TenantsModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "tenants_module"})
	}
	if ctx.Admin.tenants == nil {
		return FeatureDisabledError{Feature: string(FeatureTenants)}
	}
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.viewPerm == "" {
		m.viewPerm = ctx.Admin.config.TenantsPermission
	}
	if m.createPerm == "" {
		m.createPerm = ctx.Admin.config.TenantsCreatePermission
	}
	if m.updatePerm == "" {
		m.updatePerm = ctx.Admin.config.TenantsUpdatePermission
	}
	if m.deletePerm == "" {
		m.deletePerm = ctx.Admin.config.TenantsDeletePermission
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}

	repo := NewTenantPanelRepository(ctx.Admin.tenants)
	builder := ctx.Admin.Panel(tenantsModuleID).
		WithRepository(repo).
		ListFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "domain", Label: "Domain", Type: "text"},
			Field{Name: "member_count", Label: "Members", Type: "number"},
		).
		Filters(
			Filter{Name: "status", Type: "select"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			Field{Name: "status", Label: "Status", Type: "select", Options: statusOptions()},
			Field{Name: "domain", Label: "Domain", Type: "text"},
			Field{Name: "members", Label: "Members", Type: "table"},
		).
		DetailFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "domain", Label: "Domain", Type: "text"},
			Field{Name: "members", Label: "Members", Type: "table"},
		).
		Permissions(PanelPermissions{
			View:   m.viewPerm,
			Create: m.createPerm,
			Edit:   m.updatePerm,
			Delete: m.deletePerm,
		})

	if _, err := ctx.Admin.RegisterPanel(tenantsModuleID, builder); err != nil {
		return err
	}
	if ctx.Admin.SearchService() != nil && featureEnabled(ctx.Admin.featureGate, FeatureSearch) {
		ctx.Admin.SearchService().Register(tenantsModuleID, &tenantSearchAdapter{
			service:    ctx.Admin.tenants,
			permission: m.viewPerm,
			basePath:   m.basePath,
			urls:       m.urls,
		})
	}
	return nil
}

// MenuItems contributes navigation for tenants.
func (m *TenantsModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	path := resolveURLWith(m.urls, "admin", tenantsModuleID, nil, nil)
	return []MenuItem{
		{
			Label:       "Tenants",
			LabelKey:    "menu.tenants",
			Icon:        "building",
			Target:      map[string]any{"type": "url", "path": path, "key": tenantsModuleID},
			Permissions: []string{m.viewPerm},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    primitives.Int(32),
			ParentID:    m.menuParent,
		},
	}
}

// OrganizationsModule registers the organizations panel and navigation.
type OrganizationsModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	viewPerm      string
	createPerm    string
	updatePerm    string
	deletePerm    string
	menuParent    string
	urls          urlkit.Resolver
}

// NewOrganizationsModule constructs the default organizations module.
func NewOrganizationsModule() *OrganizationsModule {
	return (&OrganizationsModule{}).WithMenuParent("nav-group-main")
}

// Manifest describes the module metadata.
func (m *OrganizationsModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             organizationsModuleID,
		NameKey:        "modules.organizations.name",
		DescriptionKey: "modules.organizations.description",
		FeatureFlags:   []string{string(FeatureOrganizations)},
	}
}

// Register wires the organizations panel and search adapter.
func (m *OrganizationsModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "tenants_module"})
	}
	if ctx.Admin.organizations == nil {
		return FeatureDisabledError{Feature: string(FeatureOrganizations)}
	}
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.viewPerm == "" {
		m.viewPerm = ctx.Admin.config.OrganizationsPermission
	}
	if m.createPerm == "" {
		m.createPerm = ctx.Admin.config.OrganizationsCreatePermission
	}
	if m.updatePerm == "" {
		m.updatePerm = ctx.Admin.config.OrganizationsUpdatePermission
	}
	if m.deletePerm == "" {
		m.deletePerm = ctx.Admin.config.OrganizationsDeletePermission
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}

	repo := NewOrganizationPanelRepository(ctx.Admin.organizations)
	builder := ctx.Admin.Panel(organizationsModuleID).
		WithRepository(repo).
		ListFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "tenant_id", Label: "Tenant", Type: "text"},
			Field{Name: "member_count", Label: "Members", Type: "number"},
		).
		Filters(
			Filter{Name: "status", Type: "select"},
			Filter{Name: "tenant_id", Type: "text"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			Field{Name: "status", Label: "Status", Type: "select", Options: statusOptions()},
			Field{Name: "tenant_id", Label: "Tenant ID", Type: "text"},
			Field{Name: "members", Label: "Members", Type: "table"},
		).
		DetailFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "tenant_id", Label: "Tenant", Type: "text"},
			Field{Name: "members", Label: "Members", Type: "table"},
		).
		Permissions(PanelPermissions{
			View:   m.viewPerm,
			Create: m.createPerm,
			Edit:   m.updatePerm,
			Delete: m.deletePerm,
		})

	if _, err := ctx.Admin.RegisterPanel(organizationsModuleID, builder); err != nil {
		return err
	}
	if ctx.Admin.SearchService() != nil && featureEnabled(ctx.Admin.featureGate, FeatureSearch) {
		ctx.Admin.SearchService().Register(organizationsModuleID, &organizationSearchAdapter{
			service:    ctx.Admin.organizations,
			permission: m.viewPerm,
			basePath:   m.basePath,
			urls:       m.urls,
		})
	}
	return nil
}

// MenuItems contributes navigation for organizations.
func (m *OrganizationsModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	path := resolveURLWith(m.urls, "admin", organizationsModuleID, nil, nil)
	return []MenuItem{
		{
			Label:       "Organizations",
			LabelKey:    "menu.organizations",
			Icon:        "community",
			Target:      map[string]any{"type": "url", "path": path, "key": organizationsModuleID},
			Permissions: []string{m.viewPerm},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    primitives.Int(33),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests tenant navigation under a parent menu item ID.
func (m *TenantsModule) WithMenuParent(parent string) *TenantsModule {
	m.menuParent = parent
	return m
}

// WithMenuParent nests organization navigation under a parent menu item ID.
func (m *OrganizationsModule) WithMenuParent(parent string) *OrganizationsModule {
	m.menuParent = parent
	return m
}

// TenantPanelRepository adapts TenantService to the panel Repository contract.
type TenantPanelRepository struct {
	service *TenantService
}

// NewTenantPanelRepository constructs a repository backed by TenantService.
func NewTenantPanelRepository(service *TenantService) *TenantPanelRepository {
	return &TenantPanelRepository{service: service}
}

func (r *TenantPanelRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeatureTenants)}
	}
	tenants, total, err := r.service.ListTenants(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]map[string]any, 0, len(tenants))
	for _, tenant := range tenants {
		rec := tenantToRecord(tenant)
		rec["member_count"] = len(tenant.Members)
		out = append(out, rec)
	}
	return out, total, nil
}

func (r *TenantPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureTenants)}
	}
	tenant, err := r.service.GetTenant(ctx, id)
	if err != nil {
		return nil, err
	}
	return tenantToRecord(tenant), nil
}

func (r *TenantPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, "", record)
}

func (r *TenantPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureTenants)}
	}
	tenant := tenantFromRecord(record, id)
	saved, err := r.service.SaveTenant(ctx, tenant)
	if err != nil {
		return nil, err
	}
	return tenantToRecord(saved), nil
}

func (r *TenantPanelRepository) Delete(ctx context.Context, id string) error {
	if r.service == nil {
		return FeatureDisabledError{Feature: string(FeatureTenants)}
	}
	return r.service.DeleteTenant(ctx, id)
}

// OrganizationPanelRepository adapts OrganizationService to the panel Repository contract.
type OrganizationPanelRepository struct {
	service *OrganizationService
}

// NewOrganizationPanelRepository constructs a repository backed by OrganizationService.
func NewOrganizationPanelRepository(service *OrganizationService) *OrganizationPanelRepository {
	return &OrganizationPanelRepository{service: service}
}

func (r *OrganizationPanelRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeatureOrganizations)}
	}
	orgs, total, err := r.service.ListOrganizations(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]map[string]any, 0, len(orgs))
	for _, org := range orgs {
		rec := organizationToRecord(org)
		rec["member_count"] = len(org.Members)
		out = append(out, rec)
	}
	return out, total, nil
}

func (r *OrganizationPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureOrganizations)}
	}
	org, err := r.service.GetOrganization(ctx, id)
	if err != nil {
		return nil, err
	}
	return organizationToRecord(org), nil
}

func (r *OrganizationPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, "", record)
}

func (r *OrganizationPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureOrganizations)}
	}
	org := organizationFromRecord(record, id)
	saved, err := r.service.SaveOrganization(ctx, org)
	if err != nil {
		return nil, err
	}
	return organizationToRecord(saved), nil
}

func (r *OrganizationPanelRepository) Delete(ctx context.Context, id string) error {
	if r.service == nil {
		return FeatureDisabledError{Feature: string(FeatureOrganizations)}
	}
	return r.service.DeleteOrganization(ctx, id)
}

// tenantToRecord converts a tenant into a panel record.
func tenantToRecord(tenant TenantRecord) map[string]any {
	record := map[string]any{
		"id":      tenant.ID,
		"name":    tenant.Name,
		"slug":    tenant.Slug,
		"status":  tenant.Status,
		"domain":  tenant.Domain,
		"members": tenantMembersToAny(tenant.Members),
	}
	if tenant.Metadata != nil {
		record["metadata"] = primitives.CloneAnyMap(tenant.Metadata)
	}
	if !tenant.CreatedAt.IsZero() {
		record["created_at"] = tenant.CreatedAt.Format(time.RFC3339)
	}
	if !tenant.UpdatedAt.IsZero() {
		record["updated_at"] = tenant.UpdatedAt.Format(time.RFC3339)
	}
	return record
}

// organizationToRecord converts an organization into a panel record.
func organizationToRecord(org OrganizationRecord) map[string]any {
	record := map[string]any{
		"id":        org.ID,
		"name":      org.Name,
		"slug":      org.Slug,
		"status":    org.Status,
		"tenant_id": org.TenantID,
		"members":   organizationMembersToAny(org.Members),
	}
	if org.Metadata != nil {
		record["metadata"] = primitives.CloneAnyMap(org.Metadata)
	}
	if !org.CreatedAt.IsZero() {
		record["created_at"] = org.CreatedAt.Format(time.RFC3339)
	}
	if !org.UpdatedAt.IsZero() {
		record["updated_at"] = org.UpdatedAt.Format(time.RFC3339)
	}
	return record
}

// tenantFromRecord builds a tenant from a panel record map.
func tenantFromRecord(record map[string]any, id string) TenantRecord {
	tenant := TenantRecord{
		ID:       id,
		Name:     toString(record["name"]),
		Slug:     toString(record["slug"]),
		Status:   strings.ToLower(toString(record["status"])),
		Domain:   toString(record["domain"]),
		Metadata: extractMap(record["metadata"]),
		Members:  tenantMembersFromAny(record["members"]),
	}
	if tenant.ID == "" {
		tenant.ID = toString(record["id"])
	}
	return tenant
}

// organizationFromRecord builds an organization from a panel record map.
func organizationFromRecord(record map[string]any, id string) OrganizationRecord {
	org := OrganizationRecord{
		ID:       id,
		Name:     toString(record["name"]),
		Slug:     toString(record["slug"]),
		Status:   strings.ToLower(toString(record["status"])),
		TenantID: toString(record["tenant_id"]),
		Metadata: extractMap(record["metadata"]),
		Members:  organizationMembersFromAny(record["members"]),
	}
	if org.ID == "" {
		org.ID = toString(record["id"])
	}
	return org
}

func tenantMembersToAny(members []TenantMember) []map[string]any {
	out := []map[string]any{}
	for _, m := range members {
		out = append(out, map[string]any{
			"user_id":     m.UserID,
			"roles":       append([]string{}, m.Roles...),
			"permissions": append([]string{}, m.Permissions...),
		})
	}
	return out
}

func organizationMembersToAny(members []OrganizationMember) []map[string]any {
	out := []map[string]any{}
	for _, m := range members {
		out = append(out, map[string]any{
			"user_id":     m.UserID,
			"roles":       append([]string{}, m.Roles...),
			"permissions": append([]string{}, m.Permissions...),
		})
	}
	return out
}

func tenantMembersFromAny(val any) []TenantMember {
	switch v := val.(type) {
	case []TenantMember:
		return cloneTenantMembers(v)
	case []map[string]any:
		return parseTenantMembers(v)
	case []any:
		out := []map[string]any{}
		for _, item := range v {
			if m, ok := item.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return parseTenantMembers(out)
	}
	return nil
}

func organizationMembersFromAny(val any) []OrganizationMember {
	switch v := val.(type) {
	case []OrganizationMember:
		return cloneOrganizationMembers(v)
	case []map[string]any:
		return parseOrganizationMembers(v)
	case []any:
		out := []map[string]any{}
		for _, item := range v {
			if m, ok := item.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return parseOrganizationMembers(out)
	}
	return nil
}

func parseTenantMembers(items []map[string]any) []TenantMember {
	out := []TenantMember{}
	for _, item := range items {
		member := TenantMember{
			UserID:      toString(item["user_id"]),
			Roles:       toStringSlice(item["roles"]),
			Permissions: toStringSlice(item["permissions"]),
		}
		if member.UserID == "" {
			continue
		}
		out = append(out, normalizeTenantMember(member))
	}
	return out
}

func parseOrganizationMembers(items []map[string]any) []OrganizationMember {
	out := []OrganizationMember{}
	for _, item := range items {
		member := OrganizationMember{
			UserID:      toString(item["user_id"]),
			Roles:       toStringSlice(item["roles"]),
			Permissions: toStringSlice(item["permissions"]),
		}
		if member.UserID == "" {
			continue
		}
		out = append(out, normalizeOrganizationMember(member))
	}
	return out
}

type tenantSearchAdapter struct {
	service    *TenantService
	permission string
	basePath   string
	urls       urlkit.Resolver
}

func (a *tenantSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if a == nil || a.service == nil {
		return nil, nil
	}
	results := []SearchResult{}
	tenants, err := a.service.SearchTenants(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	for _, tenant := range tenants {
		descParts := []string{titleCase(primitives.FirstNonEmptyRaw(tenant.Status, "active"))}
		if tenant.Domain != "" {
			descParts = append(descParts, tenant.Domain)
		}
		results = append(results, SearchResult{
			Type:        tenantsModuleID,
			ID:          tenant.ID,
			Title:       tenant.Name,
			Description: strings.Join(descParts, " "),
			URL:         primitives.FirstNonEmptyRaw(resolveURLWith(a.urls, "admin", "tenants.id", map[string]string{"id": tenant.ID}, nil), path.Join("/", a.basePath, tenantsModuleID, tenant.ID)),
			Icon:        "building",
		})
	}
	return results, nil
}

func (a *tenantSearchAdapter) Permission() string {
	if a == nil {
		return ""
	}
	return a.permission
}

type organizationSearchAdapter struct {
	service    *OrganizationService
	permission string
	basePath   string
	urls       urlkit.Resolver
}

func (a *organizationSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if a == nil || a.service == nil {
		return nil, nil
	}
	results := []SearchResult{}
	orgs, err := a.service.SearchOrganizations(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	for _, org := range orgs {
		descParts := []string{titleCase(primitives.FirstNonEmptyRaw(org.Status, "active"))}
		if org.TenantID != "" {
			descParts = append(descParts, "Tenant:"+org.TenantID)
		}
		results = append(results, SearchResult{
			Type:        organizationsModuleID,
			ID:          org.ID,
			Title:       org.Name,
			Description: strings.Join(descParts, " "),
			URL:         primitives.FirstNonEmptyRaw(resolveURLWith(a.urls, "admin", "organizations.id", map[string]string{"id": org.ID}, nil), path.Join("/", a.basePath, organizationsModuleID, org.ID)),
			Icon:        "briefcase",
		})
	}
	return results, nil
}

func (a *organizationSearchAdapter) Permission() string {
	if a == nil {
		return ""
	}
	return a.permission
}

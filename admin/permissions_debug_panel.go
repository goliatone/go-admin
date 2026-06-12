package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"

	auth "github.com/goliatone/go-auth"
)

const (
	DebugPanelPermissions = "permissions"
)

// PermissionEntry represents a single permission with its diagnostic status.
type PermissionEntry struct {
	Permission     string `json:"permission"`
	Required       bool   `json:"required"`
	InClaims       bool   `json:"in_claims"`
	CoveredByGrant bool   `json:"covered_by_grant,omitempty"`
	CoveringGrant  string `json:"covering_grant,omitempty"`
	Allows         bool   `json:"allows"`
	Diagnosis      string `json:"diagnosis"`
	Status         string `json:"status"` // ok, error, warning, info
	Module         string `json:"module,omitempty"`
}

// PermissionsDebugSnapshot contains the full permissions diagnostic data.
type PermissionsDebugSnapshot struct {
	Verdict             string            `json:"verdict"`
	EnabledModules      []string          `json:"enabled_modules"`
	RequiredPermissions map[string]string `json:"required_permissions"` // permission -> module
	ClaimsPermissions   []string          `json:"claims_permissions"`
	PermissionChecks    map[string]bool   `json:"permission_checks"`
	MissingPermissions  []string          `json:"missing_permissions"`
	Entries             []PermissionEntry `json:"entries"`
	Summary             struct {
		ModuleCount  int `json:"module_count"`
		RequiredKeys int `json:"required_keys"`
		ClaimsKeys   int `json:"claims_keys"`
		MissingKeys  int `json:"missing_keys"`
	} `json:"summary"`
	NextActions []string `json:"next_actions"`
	UserInfo    struct {
		UserID   string `json:"user_id,omitempty"`
		Username string `json:"username,omitempty"`
		Role     string `json:"role,omitempty"`
		TenantID string `json:"tenant_id,omitempty"`
		OrgID    string `json:"org_id,omitempty"`
	} `json:"user_info"`
}

// PermissionsDebugPanel implements the DebugPanel interface for permissions diagnostics.
type PermissionsDebugPanel struct {
	admin *Admin
}

// NewPermissionsDebugPanel creates a new permissions debug panel.
func NewPermissionsDebugPanel(admin *Admin) *PermissionsDebugPanel {
	return &PermissionsDebugPanel{admin: admin}
}

// ID returns the panel identifier.
func (p *PermissionsDebugPanel) ID() string {
	return DebugPanelPermissions
}

// Label returns the panel display label.
func (p *PermissionsDebugPanel) Label() string {
	return "Permissions"
}

// Icon returns the panel icon class.
func (p *PermissionsDebugPanel) Icon() string {
	return "iconoir-shield-check"
}

// Span returns the panel grid span.
func (p *PermissionsDebugPanel) Span() int {
	return 2
}

// Collect gathers permissions diagnostic data.
func (p *PermissionsDebugPanel) Collect(ctx context.Context) map[string]any {
	snapshot := p.buildSnapshot(ctx)
	return map[string]any{
		"verdict":              snapshot.Verdict,
		"enabled_modules":      snapshot.EnabledModules,
		"required_permissions": snapshot.RequiredPermissions,
		"claims_permissions":   snapshot.ClaimsPermissions,
		"permission_checks":    snapshot.PermissionChecks,
		"missing_permissions":  snapshot.MissingPermissions,
		"entries":              snapshot.Entries,
		"summary":              snapshot.Summary,
		"next_actions":         snapshot.NextActions,
		"user_info":            snapshot.UserInfo,
	}
}

func (p *PermissionsDebugPanel) buildSnapshot(ctx context.Context) PermissionsDebugSnapshot {
	snapshot := PermissionsDebugSnapshot{
		RequiredPermissions: make(map[string]string),
		PermissionChecks:    make(map[string]bool),
	}

	if p.admin == nil {
		snapshot.Verdict = "error"
		snapshot.NextActions = []string{"Admin instance not available"}
		return snapshot
	}

	// Collect enabled modules
	snapshot.EnabledModules = p.collectEnabledModules()

	// Collect required permissions from panels and config
	snapshot.RequiredPermissions = p.collectRequiredPermissions()

	// Collect claims permissions from context
	snapshot.ClaimsPermissions = p.collectClaimsPermissions(ctx)

	// Collect user info
	p.collectUserInfo(ctx, &snapshot)

	grantCoverage := permissionGrantCoverage(snapshot.ClaimsPermissions, snapshot.RequiredPermissions)

	// Check each required permission against authorizer
	allPerms := p.collectAllPermissions(snapshot.RequiredPermissions, snapshot.ClaimsPermissions)
	for _, perm := range allPerms {
		allowed := p.checkPermission(ctx, perm)
		snapshot.PermissionChecks[perm] = allowed
	}

	// Identify true missing grants (not in claims and denied by authorizer).
	snapshot.MissingPermissions = p.findMissingPermissions(snapshot.RequiredPermissions, snapshot.ClaimsPermissions, grantCoverage, snapshot.PermissionChecks)

	// Build detailed entries with diagnosis
	snapshot.Entries = p.buildEntries(snapshot.RequiredPermissions, snapshot.ClaimsPermissions, grantCoverage, snapshot.PermissionChecks)

	// Compute verdict
	snapshot.Verdict = p.computeVerdict(&snapshot)

	// Compute summary
	snapshot.Summary.ModuleCount = len(snapshot.EnabledModules)
	snapshot.Summary.RequiredKeys = len(snapshot.RequiredPermissions)
	snapshot.Summary.ClaimsKeys = len(snapshot.ClaimsPermissions)
	snapshot.Summary.MissingKeys = len(snapshot.MissingPermissions)

	// Compute next actions
	snapshot.NextActions = p.computeNextActions(&snapshot)

	return snapshot
}

func (p *PermissionsDebugPanel) collectEnabledModules() []string {
	if p.admin.registry == nil {
		return nil
	}

	var modules []string
	for _, mod := range p.admin.registry.modules {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		if manifest.ID != "" {
			modules = append(modules, manifest.ID)
		}
	}
	sort.Strings(modules)
	return modules
}

func (p *PermissionsDebugPanel) collectRequiredPermissions() map[string]string {
	perms := make(map[string]string)

	// Collect from registered panels
	if p.admin.registry != nil {
		collectPanelPermissions(perms, p.admin.registry.Panels())
	}

	// Collect from config permissions
	cfg := p.admin.config
	configPerms := []struct {
		perm   string
		module string
	}{
		{cfg.SettingsPermission, "settings"},
		{cfg.SettingsUpdatePermission, "settings"},
		{cfg.FeatureFlagsViewPermission, "feature_flags"},
		{cfg.FeatureFlagsUpdatePermission, "feature_flags"},
		{cfg.NotificationsPermission, "notifications"},
		{cfg.NotificationsUpdatePermission, "notifications"},
		{cfg.JobsPermission, "jobs"},
		{cfg.JobsTriggerPermission, "jobs"},
		{cfg.PreferencesPermission, "preferences"},
		{cfg.PreferencesUpdatePermission, "preferences"},
		{cfg.ProfilePermission, "profile"},
		{cfg.ProfileUpdatePermission, "profile"},
		{cfg.UsersPermission, "users"},
		{cfg.UsersCreatePermission, "users"},
		{cfg.UsersImportPermission, "users"},
		{cfg.UsersUpdatePermission, "users"},
		{cfg.UsersDeletePermission, "users"},
		{cfg.RolesPermission, "roles"},
		{cfg.RolesCreatePermission, "roles"},
		{cfg.RolesUpdatePermission, "roles"},
		{cfg.RolesDeletePermission, "roles"},
		{cfg.TenantsPermission, "tenants"},
		{cfg.TenantsCreatePermission, "tenants"},
		{cfg.TenantsUpdatePermission, "tenants"},
		{cfg.TenantsDeletePermission, "tenants"},
		{cfg.OrganizationsPermission, "organizations"},
		{cfg.OrganizationsCreatePermission, "organizations"},
		{cfg.OrganizationsUpdatePermission, "organizations"},
		{cfg.OrganizationsDeletePermission, "organizations"},
		{cfg.Debug.Permission, "debug"},
	}

	for _, cp := range configPerms {
		if strings.TrimSpace(cp.perm) != "" {
			perms[strings.TrimSpace(cp.perm)] = cp.module
		}
	}

	return perms
}

func collectPanelPermissions(target map[string]string, panels map[string]*Panel) {
	for name, panel := range panels {
		if panel == nil {
			continue
		}
		panelPerms := panel.permissions
		if panelPerms.View != "" {
			target[panelPerms.View] = name
		}
		if panelPerms.Create != "" {
			target[panelPerms.Create] = name
		}
		if panelPerms.Edit != "" {
			target[panelPerms.Edit] = name
		}
		if panelPerms.Delete != "" {
			target[panelPerms.Delete] = name
		}
	}
}

func (p *PermissionsDebugPanel) collectClaimsPermissions(ctx context.Context) []string {
	if p == nil || p.admin == nil {
		return nil
	}
	perms := ResolvedPermissionsFromAuthorizer(ctx, p.admin.authorizer)
	if len(perms) == 0 {
		return nil
	}
	sort.Strings(perms)
	return perms
}

func (p *PermissionsDebugPanel) collectUserInfo(ctx context.Context, snapshot *PermissionsDebugSnapshot) {
	if ctx == nil {
		return
	}

	if claims, ok := auth.GetClaims(ctx); ok && claims != nil {
		snapshot.UserInfo.UserID = strings.TrimSpace(claims.UserID())
		snapshot.UserInfo.Role = strings.TrimSpace(claims.Role())
		if carrier, ok := claims.(interface{ Username() string }); ok {
			snapshot.UserInfo.Username = strings.TrimSpace(carrier.Username())
		}
	}

	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if snapshot.UserInfo.UserID == "" {
			snapshot.UserInfo.UserID = primitives.FirstNonEmptyRaw(strings.TrimSpace(actor.ActorID), strings.TrimSpace(actor.Subject))
		}
		if snapshot.UserInfo.Role == "" {
			snapshot.UserInfo.Role = strings.TrimSpace(actor.Role)
		}
		snapshot.UserInfo.TenantID = strings.TrimSpace(actor.TenantID)
		snapshot.UserInfo.OrgID = strings.TrimSpace(actor.OrganizationID)
	}
}

func (p *PermissionsDebugPanel) collectAllPermissions(required map[string]string, claims []string) []string {
	seen := make(map[string]bool)
	var all []string

	for perm := range required {
		if !seen[perm] {
			seen[perm] = true
			all = append(all, perm)
		}
	}

	for _, perm := range claims {
		if !seen[perm] {
			seen[perm] = true
			all = append(all, perm)
		}
	}

	sort.Strings(all)
	return all
}

func (p *PermissionsDebugPanel) checkPermission(ctx context.Context, permission string) bool {
	if p.admin.authorizer == nil {
		return false
	}
	// Split permission into action and resource
	// Format: resource.action (e.g., admin.users.view -> resource=admin.users, action=view)
	parts := strings.Split(permission, ".")
	if len(parts) < 2 {
		return p.admin.authorizer.Can(ctx, permission, "")
	}
	action := parts[len(parts)-1]
	resource := strings.Join(parts[:len(parts)-1], ".")
	return p.admin.authorizer.Can(ctx, action, resource)
}

func (p *PermissionsDebugPanel) classifyRequiredPermissions(
	required map[string]string,
	claims []string,
	grantCoverage map[string]string,
	checks map[string]bool,
) (missingGrants []string, claimsStale []string, scopeMismatch []string) {
	for perm := range required {
		inClaims := permissionExactListed(claims, perm)
		covered := grantCoverage[perm] != ""
		allows := checks[perm]
		switch {
		case !inClaims && !covered && !allows:
			missingGrants = append(missingGrants, perm)
		case !inClaims && !covered && allows:
			claimsStale = append(claimsStale, perm)
		case (inClaims || covered) && !allows:
			scopeMismatch = append(scopeMismatch, perm)
		}
	}
	sort.Strings(missingGrants)
	sort.Strings(claimsStale)
	sort.Strings(scopeMismatch)
	return missingGrants, claimsStale, scopeMismatch
}

func (p *PermissionsDebugPanel) findMissingPermissions(
	required map[string]string,
	claims []string,
	grantCoverage map[string]string,
	checks map[string]bool,
) []string {
	missingGrants, _, _ := p.classifyRequiredPermissions(required, claims, grantCoverage, checks)
	return missingGrants
}

func (p *PermissionsDebugPanel) buildEntries(required map[string]string, claims []string, grantCoverage map[string]string, checks map[string]bool) []PermissionEntry {
	// Build entries for all permissions (required + claims)
	seen := make(map[string]bool)
	var entries []PermissionEntry

	// First, add all required permissions
	for perm, module := range required {
		if seen[perm] {
			continue
		}
		seen[perm] = true
		inClaims := permissionExactListed(claims, perm)
		coveringGrant := ""
		if !inClaims {
			coveringGrant = grantCoverage[perm]
		}
		allows := checks[perm]
		diagnosis, status := p.diagnose(true, inClaims, coveringGrant, allows)
		entries = append(entries, PermissionEntry{
			Permission:     perm,
			Required:       true,
			InClaims:       inClaims,
			CoveredByGrant: coveringGrant != "",
			CoveringGrant:  coveringGrant,
			Allows:         allows,
			Diagnosis:      diagnosis,
			Status:         status,
			Module:         module,
		})
	}

	// Add claims permissions that aren't required
	for _, perm := range claims {
		if permissionRequired(required, perm) {
			continue
		}
		seenKey := strings.ToLower(strings.TrimSpace(perm))
		if seen[seenKey] {
			continue
		}
		seen[seenKey] = true
		allows := checks[perm]
		entries = append(entries, PermissionEntry{
			Permission: perm,
			Required:   false,
			InClaims:   true,
			Allows:     allows,
			Diagnosis:  "Extra permission (not required by any module)",
			Status:     "info",
		})
	}

	// Sort entries: errors first, then warnings, then ok, then info
	sort.Slice(entries, func(i, j int) bool {
		statusOrder := map[string]int{"error": 0, "warning": 1, "ok": 2, "info": 3}
		if statusOrder[entries[i].Status] != statusOrder[entries[j].Status] {
			return statusOrder[entries[i].Status] < statusOrder[entries[j].Status]
		}
		return entries[i].Permission < entries[j].Permission
	})

	return entries
}

func (p *PermissionsDebugPanel) diagnose(required, inClaims bool, coveringGrant string, allows bool) (string, string) {
	if !required {
		return "Unknown state", "info"
	}
	if coveringGrant != "" {
		return diagnoseCoveredGrant(coveringGrant, allows)
	}
	if inClaims {
		return diagnoseLiteralGrant(allows)
	}
	return diagnoseMissingLiteralGrant(allows)
}

func diagnoseCoveredGrant(coveringGrant string, allows bool) (string, string) {
	if allows {
		return "Covered by resolved grant " + coveringGrant, "ok"
	}
	return "Scope/policy mismatch - permission covered by resolved grant but authorizer denies", "warning"
}

func diagnoseLiteralGrant(allows bool) (string, string) {
	if allows {
		return "OK", "ok"
	}
	return "Scope/policy mismatch - permission listed but authorizer denies", "warning"
}

func diagnoseMissingLiteralGrant(allows bool) (string, string) {
	if allows {
		return "Permission list missing key while authorizer allows access", "warning"
	}
	return "Grant missing permission in role assignment", "error"
}

func (p *PermissionsDebugPanel) computeVerdict(snapshot *PermissionsDebugSnapshot) string {
	if snapshot == nil {
		return "error"
	}

	grantCoverage := permissionGrantCoverage(snapshot.ClaimsPermissions, snapshot.RequiredPermissions)

	missingGrants, claimsStale, scopeMismatch := p.classifyRequiredPermissions(
		snapshot.RequiredPermissions,
		snapshot.ClaimsPermissions,
		grantCoverage,
		snapshot.PermissionChecks,
	)

	if len(missingGrants) > 0 {
		return "missing_grants"
	}
	if len(scopeMismatch) > 0 {
		return "scope_mismatch"
	}
	if len(claimsStale) > 0 {
		return "claims_stale"
	}

	return "healthy"
}

func (p *PermissionsDebugPanel) computeNextActions(snapshot *PermissionsDebugSnapshot) []string {
	var actions []string
	if snapshot == nil {
		return []string{"Unable to determine next actions"}
	}

	grantCoverage := permissionGrantCoverage(snapshot.ClaimsPermissions, snapshot.RequiredPermissions)
	missingGrants, claimsStale, scopeMismatch := p.classifyRequiredPermissions(
		snapshot.RequiredPermissions,
		snapshot.ClaimsPermissions,
		grantCoverage,
		snapshot.PermissionChecks,
	)

	switch snapshot.Verdict {
	case "missing_grants":
		actions = append(actions, "Grant the following permissions to the user's role:")
		for _, perm := range missingGrants {
			actions = append(actions, "  - "+perm)
		}
		actions = append(actions, "After updating the role, reload the page")

	case "scope_mismatch":
		actions = append(actions, scopeMismatchSummary(scopeMismatch, snapshot.ClaimsPermissions, grantCoverage))
		actions = append(actions, "Mismatched permissions:")
		for _, perm := range scopeMismatch {
			actions = append(actions, formatScopeMismatchPermission(perm, snapshot.ClaimsPermissions, grantCoverage))
		}
		actions = append(actions, "Check tenant/organization scope restrictions")
		actions = append(actions, "Verify authorizer policy and resource binding configuration")
		actions = append(actions, "Review any conditional access rules that may apply")

	case "claims_stale":
		actions = append(actions, "Authorizer grants access but the resolved permissions list is missing keys")
		actions = append(actions, "Permissions missing in diagnostics list:")
		for _, perm := range claimsStale {
			actions = append(actions, "  - "+perm)
		}
		actions = append(actions, "Verify permission resolver output and cache behavior")

	case "healthy":
		actions = append(actions, "All permissions are properly configured")

	default:
		actions = append(actions, "Unable to determine next actions")
	}

	return actions
}

func scopeMismatchSummary(perms []string, claims []string, grantCoverage map[string]string) string {
	hasListed := false
	hasCovered := false
	for _, perm := range perms {
		if permissionExactListed(claims, perm) {
			hasListed = true
		}
		if grantCoverage[perm] != "" {
			hasCovered = true
		}
	}

	switch {
	case hasListed && hasCovered:
		return "Permission is listed or covered by a resolved grant, but authorizer denies access"
	case hasCovered:
		return "Permission is covered by a resolved grant, but authorizer denies access"
	default:
		return "Permission is listed but authorizer denies access"
	}
}

func formatScopeMismatchPermission(perm string, claims []string, grantCoverage map[string]string) string {
	switch {
	case grantCoverage[perm] != "":
		return "  - " + perm + " (covered by " + grantCoverage[perm] + ")"
	case permissionExactListed(claims, perm):
		return "  - " + perm + " (listed)"
	default:
		return "  - " + perm
	}
}

func permissionGrantCoverage(claims []string, required map[string]string) map[string]string {
	coverage := map[string]string{}
	if len(claims) == 0 || len(required) == 0 {
		return coverage
	}
	for perm := range required {
		grant := permissionGrantCovering(claims, perm)
		if grant == "" || strings.EqualFold(grant, perm) {
			continue
		}
		coverage[perm] = grant
	}
	return coverage
}

func permissionExactListed(claims []string, permission string) bool {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return false
	}
	for _, claim := range claims {
		if strings.EqualFold(strings.TrimSpace(claim), permission) {
			return true
		}
	}
	return false
}

func permissionRequired(required map[string]string, permission string) bool {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return false
	}
	for requiredPermission := range required {
		if strings.EqualFold(requiredPermission, permission) {
			return true
		}
	}
	return false
}

// RegisterPermissionsDebugPanel registers the permissions panel with the debug collector.
func RegisterPermissionsDebugPanel(admin *Admin) {
	if admin == nil || admin.debugCollector == nil {
		return
	}
	panel := NewPermissionsDebugPanel(admin)
	registerDebugPanelFromInterface(panel)
}

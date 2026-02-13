package admin

import (
	"context"
	"sort"
	"strings"

	auth "github.com/goliatone/go-auth"
)

const (
	DebugPanelPermissions = "permissions"
)

// PermissionEntry represents a single permission with its diagnostic status.
type PermissionEntry struct {
	Permission string `json:"permission"`
	Required   bool   `json:"required"`
	InClaims   bool   `json:"in_claims"`
	Allows     bool   `json:"allows"`
	Diagnosis  string `json:"diagnosis"`
	Status     string `json:"status"` // ok, error, warning, info
	Module     string `json:"module,omitempty"`
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

	// Build claims set for quick lookup
	claimsSet := make(map[string]bool, len(snapshot.ClaimsPermissions))
	for _, perm := range snapshot.ClaimsPermissions {
		claimsSet[perm] = true
	}

	// Check each required permission against authorizer
	allPerms := p.collectAllPermissions(snapshot.RequiredPermissions, snapshot.ClaimsPermissions)
	for _, perm := range allPerms {
		allowed := p.checkPermission(ctx, perm)
		snapshot.PermissionChecks[perm] = allowed
	}

	// Identify true missing grants (not in claims and denied by authorizer).
	snapshot.MissingPermissions = p.findMissingPermissions(snapshot.RequiredPermissions, claimsSet, snapshot.PermissionChecks)

	// Build detailed entries with diagnosis
	snapshot.Entries = p.buildEntries(snapshot.RequiredPermissions, claimsSet, snapshot.PermissionChecks)

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
		for name, panel := range p.admin.registry.Panels() {
			if panel == nil {
				continue
			}
			panelPerms := panel.permissions
			if panelPerms.View != "" {
				perms[panelPerms.View] = name
			}
			if panelPerms.Create != "" {
				perms[panelPerms.Create] = name
			}
			if panelPerms.Edit != "" {
				perms[panelPerms.Edit] = name
			}
			if panelPerms.Delete != "" {
				perms[panelPerms.Delete] = name
			}
		}
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

func (p *PermissionsDebugPanel) collectClaimsPermissions(ctx context.Context) []string {
	perms := permissionsFromContext(ctx)
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
			snapshot.UserInfo.UserID = firstNonEmpty(strings.TrimSpace(actor.ActorID), strings.TrimSpace(actor.Subject))
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
	claimsSet map[string]bool,
	checks map[string]bool,
) (missingGrants []string, claimsStale []string, scopeMismatch []string) {
	for perm := range required {
		inClaims := claimsSet[perm]
		allows := checks[perm]
		switch {
		case !inClaims && !allows:
			missingGrants = append(missingGrants, perm)
		case !inClaims && allows:
			claimsStale = append(claimsStale, perm)
		case inClaims && !allows:
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
	claimsSet map[string]bool,
	checks map[string]bool,
) []string {
	missingGrants, _, _ := p.classifyRequiredPermissions(required, claimsSet, checks)
	return missingGrants
}

func (p *PermissionsDebugPanel) buildEntries(required map[string]string, claimsSet map[string]bool, checks map[string]bool) []PermissionEntry {
	// Build entries for all permissions (required + claims)
	seen := make(map[string]bool)
	var entries []PermissionEntry

	// First, add all required permissions
	for perm, module := range required {
		if seen[perm] {
			continue
		}
		seen[perm] = true
		inClaims := claimsSet[perm]
		allows := checks[perm]
		diagnosis, status := p.diagnose(true, inClaims, allows)
		entries = append(entries, PermissionEntry{
			Permission: perm,
			Required:   true,
			InClaims:   inClaims,
			Allows:     allows,
			Diagnosis:  diagnosis,
			Status:     status,
			Module:     module,
		})
	}

	// Add claims permissions that aren't required
	for perm := range claimsSet {
		if seen[perm] {
			continue
		}
		seen[perm] = true
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

func (p *PermissionsDebugPanel) diagnose(required, inClaims, allows bool) (string, string) {
	if required && inClaims && allows {
		return "OK", "ok"
	}
	if required && !inClaims && !allows {
		return "Grant missing permission and refresh token", "error"
	}
	if required && !inClaims && allows {
		return "Claims payload missing permission; authorizer allows (refresh token/claims sync)", "warning"
	}
	if required && inClaims && !allows {
		return "Scope/policy mismatch - permission in claims but authorizer denies", "warning"
	}
	return "Unknown state", "info"
}

func (p *PermissionsDebugPanel) computeVerdict(snapshot *PermissionsDebugSnapshot) string {
	if snapshot == nil {
		return "error"
	}

	claimsSet := make(map[string]bool, len(snapshot.ClaimsPermissions))
	for _, perm := range snapshot.ClaimsPermissions {
		claimsSet[perm] = true
	}

	missingGrants, claimsStale, scopeMismatch := p.classifyRequiredPermissions(
		snapshot.RequiredPermissions,
		claimsSet,
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

	claimsSet := make(map[string]bool, len(snapshot.ClaimsPermissions))
	for _, perm := range snapshot.ClaimsPermissions {
		claimsSet[perm] = true
	}
	missingGrants, claimsStale, scopeMismatch := p.classifyRequiredPermissions(
		snapshot.RequiredPermissions,
		claimsSet,
		snapshot.PermissionChecks,
	)

	switch snapshot.Verdict {
	case "missing_grants":
		actions = append(actions, "Grant the following permissions to the user's role:")
		for _, perm := range missingGrants {
			actions = append(actions, "  - "+perm)
		}
		actions = append(actions, "After updating the role, ask the user to re-authenticate")

	case "scope_mismatch":
		actions = append(actions, "Permission exists in claims but authorizer denies access")
		actions = append(actions, "Mismatched permissions:")
		for _, perm := range scopeMismatch {
			actions = append(actions, "  - "+perm)
		}
		actions = append(actions, "Check tenant/organization scope restrictions")
		actions = append(actions, "Verify authorizer policy and resource binding configuration")
		actions = append(actions, "Review any conditional access rules that may apply")

	case "claims_stale":
		actions = append(actions, "Authorizer grants access but claims payload is missing permissions")
		actions = append(actions, "Permissions missing in claims:")
		for _, perm := range claimsStale {
			actions = append(actions, "  - "+perm)
		}
		actions = append(actions, "Ask the user to log out and log back in")
		actions = append(actions, "This refreshes the token with updated permissions")

	case "healthy":
		actions = append(actions, "All permissions are properly configured")

	default:
		actions = append(actions, "Unable to determine next actions")
	}

	return actions
}

// RegisterPermissionsDebugPanel registers the permissions panel with the debug collector.
func RegisterPermissionsDebugPanel(admin *Admin) {
	if admin == nil || admin.debugCollector == nil {
		return
	}
	panel := NewPermissionsDebugPanel(admin)
	registerDebugPanelFromInterface(panel)
}

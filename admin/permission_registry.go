package admin

import (
	"context"
	"sort"
	"strings"
)

type NavigationPermissionDeclaration struct {
	Permission string   `json:"permission"`
	Owner      string   `json:"owner,omitempty"`
	Resource   string   `json:"resource,omitempty"`
	Renames    []string `json:"renames,omitempty"`
}

type PermissionPolicyFinding struct {
	Permission string   `json:"permission"`
	Owner      string   `json:"owner,omitempty"`
	Resource   string   `json:"resource,omitempty"`
	Missing    []string `json:"missing,omitempty"`
	RenamedBy  string   `json:"renamed_by,omitempty"`
}

type PermissionPolicyReport struct {
	Declared int                       `json:"declared"`
	Roles    int                       `json:"roles"`
	Missing  []PermissionPolicyFinding `json:"missing,omitempty"`
	Stale    []PermissionPolicyFinding `json:"stale,omitempty"`
}

type NavigationPermissionRegistry struct {
	declarations map[string]NavigationPermissionDeclaration
}

func NewNavigationPermissionRegistry(declarations ...NavigationPermissionDeclaration) *NavigationPermissionRegistry {
	registry := &NavigationPermissionRegistry{declarations: map[string]NavigationPermissionDeclaration{}}
	registry.Register(declarations...)
	return registry
}

func (r *NavigationPermissionRegistry) Register(declarations ...NavigationPermissionDeclaration) {
	if r == nil {
		return
	}
	if r.declarations == nil {
		r.declarations = map[string]NavigationPermissionDeclaration{}
	}
	for _, declaration := range declarations {
		permission := strings.TrimSpace(declaration.Permission)
		if permission == "" {
			continue
		}
		declaration.Permission = permission
		declaration.Owner = strings.TrimSpace(declaration.Owner)
		declaration.Resource = strings.TrimSpace(declaration.Resource)
		declaration.Renames = normalizePermissionSlice(declaration.Renames)
		r.declarations[strings.ToLower(permission)] = declaration
	}
}

func (r *NavigationPermissionRegistry) Declarations() []NavigationPermissionDeclaration {
	if r == nil || len(r.declarations) == 0 {
		return nil
	}
	out := make([]NavigationPermissionDeclaration, 0, len(r.declarations))
	for _, declaration := range r.declarations {
		declaration.Renames = append([]string{}, declaration.Renames...)
		out = append(out, declaration)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Permission < out[j].Permission
	})
	return out
}

func (r *NavigationPermissionRegistry) ValidatePolicy(roles []RoleRecord) PermissionPolicyReport {
	declarations := r.Declarations()
	report := PermissionPolicyReport{Declared: len(declarations), Roles: len(roles)}
	for _, declaration := range declarations {
		missing := []string{}
		for _, role := range roles {
			if roleCoversPermission(role, declaration.Permission) {
				continue
			}
			missing = append(missing, rolePolicyName(role))
		}
		if len(missing) > 0 {
			report.Missing = append(report.Missing, PermissionPolicyFinding{
				Permission: declaration.Permission,
				Owner:      declaration.Owner,
				Resource:   declaration.Resource,
				Missing:    missing,
			})
		}
		for _, renamed := range declaration.Renames {
			for _, role := range roles {
				if roleHasExactPermission(role, renamed) && !roleCoversPermission(role, declaration.Permission) {
					report.Stale = append(report.Stale, PermissionPolicyFinding{
						Permission: renamed,
						Owner:      declaration.Owner,
						Resource:   declaration.Resource,
						RenamedBy:  declaration.Permission,
						Missing:    []string{rolePolicyName(role)},
					})
				}
			}
		}
	}
	return report
}

func (a *Admin) RegisterNavigationPermissions(declarations ...NavigationPermissionDeclaration) *Admin {
	if a == nil {
		return a
	}
	if a.navigationPermissionRegistry == nil {
		a.navigationPermissionRegistry = DefaultNavigationPermissionRegistry(a.config)
	}
	a.navigationPermissionRegistry.Register(declarations...)
	return a
}

func (a *Admin) NavigationPermissionRegistry() *NavigationPermissionRegistry {
	if a == nil {
		return NewNavigationPermissionRegistry()
	}
	if a.navigationPermissionRegistry == nil {
		a.navigationPermissionRegistry = DefaultNavigationPermissionRegistry(a.config)
	}
	return a.navigationPermissionRegistry
}

func (a *Admin) ValidateNavigationPolicy(roles []RoleRecord) PermissionPolicyReport {
	return a.NavigationPermissionRegistry().ValidatePolicy(roles)
}

func DefaultNavigationPermissionRegistry(cfg Config) *NavigationPermissionRegistry {
	return NewNavigationPermissionRegistry(defaultNavigationPermissionDeclarations(cfg)...)
}

func defaultNavigationPermissionDeclarations(cfg Config) []NavigationPermissionDeclaration {
	return []NavigationPermissionDeclaration{
		{Permission: firstNonEmpty(cfg.SettingsPermission, PermAdminSettingsView), Owner: "settings", Resource: "settings"},
		{Permission: firstNonEmpty(cfg.FeatureFlagsViewPermission, PermAdminFeatureFlagsView), Owner: "feature_flags", Resource: "feature_flags"},
		{Permission: firstNonEmpty(cfg.UsersPermission, PermAdminUsersView), Owner: "users", Resource: "users"},
		{Permission: firstNonEmpty(cfg.RolesPermission, PermAdminRolesView), Owner: "roles", Resource: "roles"},
		{Permission: firstNonEmpty(cfg.MediaPermission, PermAdminMediaView), Owner: "media", Resource: "media"},
		{Permission: firstNonEmpty(cfg.ActivityPermission, PermAdminActivityView), Owner: "activity", Resource: "activity"},
		{Permission: firstNonEmpty(cfg.JobsPermission, PermAdminJobsView), Owner: "jobs", Resource: "jobs"},
		{Permission: firstNonEmpty(cfg.PreferencesPermission, PermAdminPreferencesView), Owner: "preferences", Resource: "preferences"},
		{Permission: firstNonEmpty(cfg.ProfilePermission, PermAdminProfileView), Owner: "profile", Resource: "profile"},
		{Permission: PermAdminTranslationsView, Owner: "translations", Resource: "translations"},
	}
}

func roleCoversPermission(role RoleRecord, permission string) bool {
	for _, grant := range role.Permissions {
		if PermissionGrantMatches(grant, permission) {
			return true
		}
	}
	return false
}

func roleHasExactPermission(role RoleRecord, permission string) bool {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return false
	}
	for _, grant := range role.Permissions {
		if strings.EqualFold(strings.TrimSpace(grant), permission) {
			return true
		}
	}
	return false
}

func rolePolicyName(role RoleRecord) string {
	for _, value := range []string{role.RoleKey, role.Name, role.ID} {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return "unknown"
}

func navigationPermissionPolicyDoctorCheck() DoctorCheck {
	return DoctorCheck{
		ID:          "navigation.permission_policy",
		Label:       "Navigation Permission Policy",
		Description: "Checks declared navigation permissions against configured role grants.",
		Help:        "Missing grants can make navigation entries disappear or render disabled even when menu persistence is healthy.",
		Run: func(ctx context.Context, adm *Admin) DoctorCheckOutput {
			if adm == nil || adm.users == nil {
				return DoctorCheckOutput{}
			}
			roles, _, err := adm.users.ListRoles(ctx, ListOptions{PerPage: 500})
			if err != nil {
				return DoctorCheckOutput{Findings: []DoctorFinding{{
					Severity:  DoctorSeverityWarn,
					Code:      "navigation.permission_policy.roles_unavailable",
					Component: "navigation.permissions",
					Message:   "Navigation permission policy could not load roles",
					Hint:      "Check the user/role repository before trusting navigation permission diagnostics",
					Metadata:  map[string]any{"error": err.Error()},
				}}}
			}
			report := adm.ValidateNavigationPolicy(roles)
			findings := navigationPermissionPolicyFindings(report)
			return DoctorCheckOutput{
				Summary:  navigationPermissionPolicySummary(report),
				Findings: findings,
				Metadata: map[string]any{
					"declared": report.Declared,
					"roles":    report.Roles,
					"missing":  len(report.Missing),
					"stale":    len(report.Stale),
				},
			}
		},
	}
}

func navigationPermissionPolicyFindings(report PermissionPolicyReport) []DoctorFinding {
	findings := []DoctorFinding{}
	for _, finding := range report.Missing {
		findings = append(findings, DoctorFinding{
			Severity:  DoctorSeverityWarn,
			Code:      "navigation.permission_policy.missing_grant",
			Component: "navigation.permissions",
			Message:   "Declared navigation permission is missing from one or more roles: " + finding.Permission,
			Hint:      "Grant the permission, an admin wildcard, or an appropriate namespace wildcard to the affected roles",
			Metadata: map[string]any{
				"permission": finding.Permission,
				"owner":      finding.Owner,
				"resource":   finding.Resource,
				"roles":      append([]string{}, finding.Missing...),
			},
		})
	}
	for _, finding := range report.Stale {
		findings = append(findings, DoctorFinding{
			Severity:  DoctorSeverityWarn,
			Code:      "navigation.permission_policy.stale_rename",
			Component: "navigation.permissions",
			Message:   "Role grants a renamed navigation permission without the replacement: " + finding.Permission,
			Hint:      "Replace the stale permission with " + finding.RenamedBy,
			Metadata: map[string]any{
				"permission": finding.Permission,
				"renamed_by": finding.RenamedBy,
				"owner":      finding.Owner,
				"resource":   finding.Resource,
				"roles":      append([]string{}, finding.Missing...),
			},
		})
	}
	return findings
}

func navigationPermissionPolicySummary(report PermissionPolicyReport) string {
	if len(report.Missing) == 0 && len(report.Stale) == 0 {
		return "Navigation role policy covers declared permissions"
	}
	return "Navigation role policy has missing or stale grants"
}

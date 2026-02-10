package permissions

// Canonical e-sign admin permissions.
const (
	AdminESignView     = "admin.esign.view"
	AdminESignCreate   = "admin.esign.create"
	AdminESignEdit     = "admin.esign.edit"
	AdminESignSend     = "admin.esign.send"
	AdminESignVoid     = "admin.esign.void"
	AdminESignDownload = "admin.esign.download"
	AdminESignSettings = "admin.esign.settings"
)

// All returns the complete e-sign permission set used by module panels/routes.
func All() []string {
	return []string{
		AdminESignView,
		AdminESignCreate,
		AdminESignEdit,
		AdminESignSend,
		AdminESignVoid,
		AdminESignDownload,
		AdminESignSettings,
	}
}

// RolePermissionDefault defines the baseline permission mapping for a role key.
type RolePermissionDefault struct {
	RoleKey     string
	Name        string
	Description string
	Permissions []string
}

// DefaultRoleMappings returns baseline role permission defaults for e-sign operators.
func DefaultRoleMappings() []RolePermissionDefault {
	return []RolePermissionDefault{
		{
			RoleKey:     "esign_admin",
			Name:        "E-Sign Admin",
			Description: "Full e-sign administration access",
			Permissions: append([]string{}, All()...),
		},
		{
			RoleKey:     "esign_operator",
			Name:        "E-Sign Operator",
			Description: "Day-to-day sender operations without module settings",
			Permissions: []string{
				AdminESignView,
				AdminESignCreate,
				AdminESignEdit,
				AdminESignSend,
				AdminESignVoid,
				AdminESignDownload,
			},
		},
		{
			RoleKey:     "esign_viewer",
			Name:        "E-Sign Viewer",
			Description: "Read-only e-sign visibility and artifact access",
			Permissions: []string{
				AdminESignView,
				AdminESignDownload,
			},
		},
	}
}

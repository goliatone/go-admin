package permissions

import "testing"

func TestAllPermissionsIncludesRequiredESignMatrix(t *testing.T) {
	required := map[string]bool{
		AdminESignView:     true,
		AdminESignCreate:   true,
		AdminESignEdit:     true,
		AdminESignSend:     true,
		AdminESignVoid:     true,
		AdminESignDownload: true,
		AdminESignSettings: true,
	}
	for _, permission := range All() {
		delete(required, permission)
	}
	if len(required) != 0 {
		t.Fatalf("missing permissions from All(): %+v", required)
	}
}

func TestDefaultRoleMappingsIncludeAdminOperatorViewerProfiles(t *testing.T) {
	mappings := DefaultRoleMappings()
	if len(mappings) < 3 {
		t.Fatalf("expected at least 3 default role mappings, got %d", len(mappings))
	}
	lookup := map[string]RolePermissionDefault{}
	for _, mapping := range mappings {
		lookup[mapping.RoleKey] = mapping
	}
	adminMapping, ok := lookup["esign_admin"]
	if !ok {
		t.Fatalf("expected esign_admin mapping")
	}
	if len(adminMapping.Permissions) != len(All()) {
		t.Fatalf("expected admin mapping to include all permissions")
	}
	operator, ok := lookup["esign_operator"]
	if !ok {
		t.Fatalf("expected esign_operator mapping")
	}
	if hasPermission(operator.Permissions, AdminESignSettings) {
		t.Fatalf("expected operator mapping to exclude %s", AdminESignSettings)
	}
	viewer, ok := lookup["esign_viewer"]
	if !ok {
		t.Fatalf("expected esign_viewer mapping")
	}
	if !hasPermission(viewer.Permissions, AdminESignView) || !hasPermission(viewer.Permissions, AdminESignDownload) {
		t.Fatalf("expected viewer mapping to include view/download permissions")
	}
}

func hasPermission(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

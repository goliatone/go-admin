package handlers

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	testTenantID    = "tenant-1"
	testOrgID       = "org-1"
	testAdminUserID = "admin-user"
)

func defaultTestScope() stores.Scope {
	return stores.Scope{TenantID: testTenantID, OrgID: testOrgID}
}

func newScopeStoreFixture() (context.Context, stores.Scope, *stores.InMemoryStore) {
	scope := defaultTestScope()
	return context.Background(), scope, stores.NewInMemoryStore()
}

func copyAllowedPermissions(allowed map[string]bool) map[string]bool {
	if len(allowed) == 0 {
		return map[string]bool{}
	}
	cloned := make(map[string]bool, len(allowed))
	for key, value := range allowed {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		cloned[key] = value
	}
	return cloned
}

func allowedPermissions(perms ...string) map[string]bool {
	allowed := make(map[string]bool, len(perms))
	for _, perm := range perms {
		perm = strings.TrimSpace(perm)
		if perm == "" {
			continue
		}
		allowed[perm] = true
	}
	return allowed
}

func authorizerWithPermissions(perms ...string) mapAuthorizer {
	return mapAuthorizer{allowed: allowedPermissions(perms...)}
}

func authorizerFromAllowedMap(allowed map[string]bool) mapAuthorizer {
	return mapAuthorizer{allowed: copyAllowedPermissions(allowed)}
}

func draftWorkflowPermissionSet() map[string]bool {
	return allowedPermissions(
		DefaultPermissions.AdminCreate,
		DefaultPermissions.AdminView,
		DefaultPermissions.AdminEdit,
		DefaultPermissions.AdminSend,
	)
}

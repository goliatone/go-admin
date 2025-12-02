package setup

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-router"
)

// SetupAuth configures authentication and authorization for the admin panel
func SetupAuth(adm *admin.Admin, dataStores *stores.DataStores) {
	// Mock authenticator
	auth := &mockAuthenticator{userStore: dataStores.Users}
	adm.WithAuth(auth, &admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	})

	// Mock authorizer
	authz := &mockAuthorizer{userStore: dataStores.Users}
	adm.WithAuthorizer(authz)
}

// mockAuthenticator is a mock implementation of the Authenticator interface
type mockAuthenticator struct {
	userStore *stores.UserStore
}

func (a *mockAuthenticator) Wrap(c router.Context) error {
	// Mock: always authenticate as admin user
	// In real app, check session/token
	return nil
}

// mockAuthorizer is a mock implementation of the Authorizer interface
type mockAuthorizer struct {
	userStore *stores.UserStore
}

func (a *mockAuthorizer) Can(ctx context.Context, permission string, resource string) bool {
	// Mock: admin has all permissions, editor has limited
	// In real app, check user role from context
	if strings.Contains(permission, "delete") && strings.Contains(permission, "user") {
		return false // Only super admin can delete users
	}
	return true
}

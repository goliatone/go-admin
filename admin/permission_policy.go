package admin

import (
	"context"
	"strings"
)

func permissionAllowed(authorizer Authorizer, ctx context.Context, permission, resource string) bool {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return true
	}
	if authorizer == nil {
		return false
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return authorizer.Can(ctx, permission, strings.TrimSpace(resource))
}

func requirePermissionWithAuthorizer(authorizer Authorizer, ctx context.Context, permission, resource string) error {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return nil
	}
	if permissionAllowed(authorizer, ctx, permission, resource) {
		return nil
	}
	return permissionDenied(permission, resource)
}

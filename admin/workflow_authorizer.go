package admin

import (
	"context"
	"strings"

	authlib "github.com/goliatone/go-auth"
)

// RoleWorkflowAuthorizer enforces minimum role requirements and optional permission checks.
type RoleWorkflowAuthorizer struct {
	MinRole    string
	Resource   string
	Permission string
	Extra      func(context.Context, TransitionInput) bool
}

// RoleWorkflowAuthorizerOption customizes a RoleWorkflowAuthorizer.
type RoleWorkflowAuthorizerOption func(*RoleWorkflowAuthorizer)

// WithWorkflowPermission adds a permission check using authlib.Can.
func WithWorkflowPermission(resource, permission string) RoleWorkflowAuthorizerOption {
	return func(auth *RoleWorkflowAuthorizer) {
		if auth == nil {
			return
		}
		auth.Resource = strings.TrimSpace(resource)
		auth.Permission = strings.TrimSpace(permission)
	}
}

// WithWorkflowExtraCheck adds an extra custom check for workflow transitions.
func WithWorkflowExtraCheck(fn func(context.Context, TransitionInput) bool) RoleWorkflowAuthorizerOption {
	return func(auth *RoleWorkflowAuthorizer) {
		if auth == nil || fn == nil {
			return
		}
		auth.Extra = fn
	}
}

// NewRoleWorkflowAuthorizer builds a WorkflowAuthorizer enforcing a minimum role with optional checks.
func NewRoleWorkflowAuthorizer(minRole string, opts ...RoleWorkflowAuthorizerOption) WorkflowAuthorizer {
	authorizer := &RoleWorkflowAuthorizer{MinRole: strings.TrimSpace(minRole)}
	for _, opt := range opts {
		if opt != nil {
			opt(authorizer)
		}
	}
	return authorizer
}

// CanTransition validates the workflow transition against role + optional permission checks.
func (a *RoleWorkflowAuthorizer) CanTransition(ctx context.Context, input TransitionInput) bool {
	if a == nil {
		return true
	}
	minRole := strings.TrimSpace(a.MinRole)
	if minRole != "" {
		claims, ok := authlib.GetClaims(ctx)
		if !ok || claims == nil {
			return false
		}
		if !claims.HasRole(minRole) && !claims.IsAtLeast(minRole) {
			return false
		}
	}
	permission := strings.TrimSpace(a.Permission)
	if permission != "" {
		resource := strings.TrimSpace(a.Resource)
		if resource == "" {
			resource = input.EntityType
		}
		if !authlib.Can(ctx, resource, permission) {
			return false
		}
	}
	if a.Extra != nil {
		return a.Extra(ctx, input)
	}
	return true
}

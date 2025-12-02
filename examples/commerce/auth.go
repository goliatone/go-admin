package main

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-router"
)

func setupAuth(adm *admin.Admin) {
	auth := &headerAuthenticator{defaultUser: "store-admin", defaultRole: "admin"}
	adm.WithAuth(auth, &admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	})
	adm.WithAuthorizer(roleAuthorizer{})
}

type ctxUserIDKey struct{}
type ctxUserRoleKey struct{}

type headerAuthenticator struct {
	defaultUser string
	defaultRole string
}

func (a *headerAuthenticator) Wrap(c router.Context) error {
	userID := strings.TrimSpace(c.Header("X-User-ID"))
	if userID == "" {
		userID = a.defaultUser
	}
	role := strings.TrimSpace(c.Header("X-User-Role"))
	if role == "" {
		role = a.defaultRole
	}
	ctx := context.WithValue(c.Context(), ctxUserIDKey{}, userID)
	ctx = context.WithValue(ctx, ctxUserRoleKey{}, role)
	c.SetContext(ctx)
	return nil
}

type roleAuthorizer struct{}

func (roleAuthorizer) Can(ctx context.Context, action string, _ string) bool {
	role, _ := ctx.Value(ctxUserRoleKey{}).(string)
	if strings.Contains(action, "delete") && role != "admin" && role != "" {
		return false
	}
	return true
}

package admin

import router "github.com/goliatone/go-router"

// Authenticator wraps HTTP handlers with auth checks.
type Authenticator interface {
	Wrap(ctx router.Context) error
}

// DashboardHandle is a placeholder for dashboard accessors.
type DashboardHandle struct{}

// MenuHandle is a placeholder for navigation helpers.
type MenuHandle struct{}

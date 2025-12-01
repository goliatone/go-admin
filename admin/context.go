package admin

import (
	"context"

	router "github.com/goliatone/go-router"
)

// AdminContext carries request-scoped information into panel operations.
type AdminContext struct {
	Context context.Context
	UserID  string
	Locale  string
}

// Authorizer determines whether a subject can perform an action on a resource.
type Authorizer interface {
	Can(ctx context.Context, action string, resource string) bool
}

// newAdminContext builds an AdminContext from an HTTP request.
func newAdminContextFromRouter(c router.Context, locale string) AdminContext {
	return AdminContext{
		Context: c.Context(),
		UserID:  c.Header("X-User-ID"),
		Locale:  locale,
	}
}

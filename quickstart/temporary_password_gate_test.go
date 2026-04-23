package quickstart

import (
	"net/http"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestTemporaryPasswordGateRedirectsBrowserSessions(t *testing.T) {
	ctx := temporaryPasswordGateContext("/admin", "")
	ctx.On("Path").Return("/admin")
	ctx.On("Redirect", "/admin/profile", []int{http.StatusSeeOther}).Return(nil)

	called := false
	gate := TemporaryPasswordGateForAdmin(NewAdminConfig("/admin", "Admin", "en"), "user")
	err := gate(func(router.Context) error {
		called = true
		return nil
	})(ctx)

	require.NoError(t, err)
	require.False(t, called)
	require.Equal(t, http.StatusSeeOther, ctx.StatusCodeM)
	ctx.AssertExpectations(t)
}

func TestTemporaryPasswordGateReturnsJSONForAPISessions(t *testing.T) {
	ctx := temporaryPasswordGateContext("/admin/api/users", "application/json")
	ctx.On("Path").Return("/admin/api/users")
	ctx.On("JSON", http.StatusForbidden, mock.MatchedBy(func(payload map[string]any) bool {
		return payload["error"] == "password_change_required" &&
			payload["password_change_path"] == "/admin/profile"
	})).Return(nil)

	called := false
	gate := TemporaryPasswordGateForAdmin(NewAdminConfig("/admin", "Admin", "en"), "user")
	err := gate(func(router.Context) error {
		called = true
		return nil
	})(ctx)

	require.NoError(t, err)
	require.False(t, called)
	require.Equal(t, http.StatusForbidden, ctx.StatusCodeM)
	ctx.AssertExpectations(t)
}

func TestTemporaryPasswordGateAllowsChangePath(t *testing.T) {
	ctx := temporaryPasswordGateContext("/admin/profile", "")
	ctx.On("Path").Return("/admin/profile")

	called := false
	gate := TemporaryPasswordGateForAdmin(NewAdminConfig("/admin", "Admin", "en"), "user")
	err := gate(func(router.Context) error {
		called = true
		return nil
	})(ctx)

	require.NoError(t, err)
	require.True(t, called)
	ctx.AssertExpectations(t)
}

func TestSessionRequiresPasswordChange(t *testing.T) {
	session := &auth.SessionObject{
		Data: map[string]any{
			"metadata": map[string]any{
				auth.PasswordChangeRequiredMetadataKey: true,
			},
		},
	}

	require.True(t, SessionRequiresPasswordChange(session))
	require.False(t, SessionRequiresPasswordChange(&auth.SessionObject{}))
}

func temporaryPasswordGateContext(path, accept string) *router.MockContext {
	ctx := router.NewMockContext()
	ctx.HeadersM["Accept"] = accept
	ctx.LocalsMock["user"] = &auth.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "user-1",
		},
		UID:      "user-1",
		UserRole: string(auth.RoleAdmin),
		Metadata: map[string]any{
			auth.TemporaryPasswordMetadataKey:      true,
			auth.PasswordChangeRequiredMetadataKey: true,
		},
	}
	_ = path
	return ctx
}

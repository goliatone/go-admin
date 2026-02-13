package quickstart

import (
	"context"
	"net/http"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestUpdateEnvironmentSetsCookieAndResolve(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	handlers := newContentTypeBuilderHandlers(nil, cfg, nil, "", "")

	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.On("Body").Return([]byte(`{"environment":"staging"}`))
	ctx.On("Cookie", mock.Anything).Return()
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	if err := handlers.UpdateEnvironment(ctx); err != nil {
		t.Fatalf("update environment: %v", err)
	}
	if got := ctx.Cookies(environmentCookieName); got != "staging" {
		t.Fatalf("expected cookie %q=staging, got %q", environmentCookieName, got)
	}

	ctx.QueriesM["env"] = "staging"
	if env := resolveEnvironment(ctx); env != "staging" {
		t.Fatalf("expected resolveEnvironment to use explicit query env, got %q", env)
	}
}

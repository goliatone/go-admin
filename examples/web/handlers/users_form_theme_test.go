package handlers

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestUserHandlersPassResolvedSemanticThemeToFormgen(t *testing.T) {
	cfg := admin.Config{
		BasePath: "/admin",
		Title:    "Admin",
		Theme:    "test-theme",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithThemeProvider(func(_ context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
		return &admin.ThemeSelection{
			Name: selector.Name,
			Tokens: map[string]string{
				formgenrender.FormContainerMaxWidthToken: "100%",
			},
		}, nil
	})
	formGen, err := quickstart.NewFormGenerator(os.DirFS("../openapi"), nil)
	if err != nil {
		t.Fatalf("new form generator: %v", err)
	}
	handler := &UserHandlers{
		FormGenerator: formGen,
		Admin:         adm,
		Config:        cfg,
		WithNav: func(ctx router.ViewContext, _ *admin.Admin, _ admin.Config, _ string, _ context.Context, _ router.Context) router.ViewContext {
			return ctx
		},
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/users/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		html := strings.TrimSpace(anyToString(viewCtx["form_html"]))
		return strings.Contains(html, `data-formgen-semantic="true"`) &&
			strings.Contains(html, `max-width:var(--form-container-max-width)`)
	})).Return(nil).Once()

	if err := handler.renderUserForm(ctx, createUserOperation, formgenrender.RenderOptions{}); err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

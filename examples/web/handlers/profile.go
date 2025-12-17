package handlers

import (
	"context"
	"path"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

// ProfileHandlers renders a self-service HTML profile screen for the current session user.
type ProfileHandlers struct {
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewProfileHandlers(
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *ProfileHandlers {
	return &ProfileHandlers{
		Admin:  adm,
		Config: cfg,
		WithNav: func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
			if withNav == nil {
				return ctx
			}
			return withNav(ctx, adm, cfg, active, reqCtx)
		},
	}
}

func (h *ProfileHandlers) Show(c router.Context) error {
	if err := h.guard(c, h.Config.ProfilePermission); err != nil {
		return err
	}
	if h.Admin == nil || h.Admin.ProfileService() == nil {
		return goerrors.New("profile service not configured", goerrors.CategoryInternal).
			WithCode(500).
			WithTextCode("PROFILE_SERVICE_MISSING")
	}

	session := helpers.FilterSessionUser(helpers.BuildSessionUser(c.Context()), h.Config.Features)
	if strings.TrimSpace(session.ID) == "" {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	ctx := c.Context()
	profile, err := h.Admin.ProfileService().Get(ctx, session.ID)
	if err != nil {
		return err
	}
	if profile.Locale == "" {
		profile.Locale = h.Config.DefaultLocale
	}

	canEdit := hasPermission(ctx, h.Config.ProfileUpdatePermission)
	viewCtx := h.WithNav(router.ViewContext{
		"title":     h.Config.Title,
		"base_path": h.Config.BasePath,
		"resource":  "profile",
		"profile": map[string]any{
			"display_name": profile.DisplayName,
			"email":        profile.Email,
			"avatar_url":   profile.AvatarURL,
			"locale":       profile.Locale,
			"timezone":     profile.Timezone,
			"bio":          profile.Bio,
		},
		"can_edit": canEdit,
		"saved":    strings.TrimSpace(c.Query("saved")) != "",
	}, h.Admin, h.Config, "profile", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)

	return c.Render("resources/profile/show", viewCtx)
}

func (h *ProfileHandlers) Save(c router.Context) error {
	if err := h.guard(c, h.Config.ProfileUpdatePermission); err != nil {
		return err
	}
	if h.Admin == nil || h.Admin.ProfileService() == nil {
		return goerrors.New("profile service not configured", goerrors.CategoryInternal).
			WithCode(500).
			WithTextCode("PROFILE_SERVICE_MISSING")
	}

	session := helpers.FilterSessionUser(helpers.BuildSessionUser(c.Context()), h.Config.Features)
	if strings.TrimSpace(session.ID) == "" {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	input := map[string]string{
		"display_name": strings.TrimSpace(c.FormValue("display_name")),
		"email":        strings.TrimSpace(c.FormValue("email")),
		"avatar_url":   strings.TrimSpace(c.FormValue("avatar_url")),
		"locale":       strings.TrimSpace(c.FormValue("locale")),
		"timezone":     strings.TrimSpace(c.FormValue("timezone")),
		"bio":          strings.TrimSpace(c.FormValue("bio")),
	}
	errorsByField := validateProfileInput(input, h.Config.DefaultLocale)
	if len(errorsByField) > 0 {
		viewCtx := h.WithNav(router.ViewContext{
			"title":     h.Config.Title,
			"base_path": h.Config.BasePath,
			"resource":  "profile",
			"profile":   input,
			"errors":    errorsByField,
			"can_edit":  true,
		}, h.Admin, h.Config, "profile", c.Context())
		viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
		return c.Render("resources/profile/show", viewCtx)
	}

	ctx := c.Context()
	payload := admin.UserProfile{
		DisplayName: input["display_name"],
		Email:       input["email"],
		AvatarURL:   input["avatar_url"],
		Locale:      defaultLocale(input["locale"], h.Config.DefaultLocale),
		Timezone:    input["timezone"],
		Bio:         input["bio"],
		Raw: map[string]any{
			"display_name": input["display_name"],
			"email":        input["email"],
			"avatar_url":   input["avatar_url"],
			"locale":       defaultLocale(input["locale"], h.Config.DefaultLocale),
			"timezone":     input["timezone"],
			"bio":          input["bio"],
		},
	}
	if _, err := h.Admin.ProfileService().Save(ctx, session.ID, payload); err != nil {
		return err
	}

	return c.Redirect(path.Join(h.Config.BasePath, "profile") + "?saved=1")
}

func (h *ProfileHandlers) guard(c router.Context, permission string) error {
	if c == nil {
		return goerrors.New("missing context", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	claims, ok := authlib.GetClaims(c.Context())
	if !ok || claims == nil {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	if hasPermission(c.Context(), permission) {
		return nil
	}

	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

func validateProfileInput(input map[string]string, fallbackLocale string) map[string][]string {
	errorsByField := map[string][]string{}

	if strings.TrimSpace(input["display_name"]) == "" {
		errorsByField["display_name"] = append(errorsByField["display_name"], "Name is required")
	}
	email := strings.TrimSpace(input["email"])
	if email == "" {
		errorsByField["email"] = append(errorsByField["email"], "Email is required")
	} else if !strings.Contains(email, "@") || strings.ContainsAny(email, " \t\r\n") {
		errorsByField["email"] = append(errorsByField["email"], "Email must be valid")
	}
	locale := defaultLocale(input["locale"], fallbackLocale)
	if strings.TrimSpace(locale) == "" {
		errorsByField["locale"] = append(errorsByField["locale"], "Locale is required")
	}

	return errorsByField
}

func defaultLocale(locale, fallback string) string {
	trimmed := strings.TrimSpace(locale)
	if trimmed != "" {
		return trimmed
	}
	return strings.TrimSpace(fallback)
}

func hasPermission(ctx context.Context, permission string) bool {
	perm := strings.TrimSpace(permission)
	if perm == "" {
		return true
	}
	resource := permissionResource(perm)
	action := permissionAction(perm)
	if resource == "" || action == "" {
		return false
	}
	return authlib.Can(ctx, resource, action)
}

func permissionAction(permission string) string {
	action := strings.ToLower(strings.TrimSpace(permission))
	for _, sep := range []string{".", ":", "/"} {
		if strings.Contains(action, sep) {
			parts := strings.Split(action, sep)
			action = parts[len(parts)-1]
		}
	}
	switch action {
	case "view", "read", "list", "get", "search":
		return "read"
	case "edit", "update", "patch", "manage":
		return "edit"
	case "create", "add", "new":
		return "create"
	case "delete", "remove", "destroy":
		return "delete"
	case "trigger", "run", "execute", "dispatch":
		return "edit"
	default:
		return action
	}
}

func permissionResource(permission string) string {
	parts := strings.FieldsFunc(permission, func(r rune) bool {
		return r == '.' || r == ':' || r == '/'
	})
	if len(parts) <= 1 {
		return strings.TrimSpace(permission)
	}
	return strings.Join(parts[:len(parts)-1], ".")
}

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type userProfilesCRUDHarness struct {
	app  *fiber.App
	deps stores.UserDependencies
}

func setupUserProfilesCRUDApp(t *testing.T) userProfilesCRUDHarness {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))
	ctx := context.Background()

	deps, _, _, err := setup.SetupUsers(ctx, dsn)
	require.NoError(t, err)

	profileStore, err := stores.NewUserProfileStore(deps)
	require.NoError(t, err)

	app := fiber.New()
	authn := func(c *fiber.Ctx) error {
		role := c.Get("X-Role")
		if strings.TrimSpace(role) == "" {
			return fiber.ErrUnauthorized
		}

		resourceRole := ""
		switch role {
		case string(authlib.RoleAdmin):
			resourceRole = string(authlib.RoleOwner)
		case string(authlib.RoleMember):
			resourceRole = string(authlib.RoleMember)
		default:
			resourceRole = ""
		}

		claims := &authlib.JWTClaims{
			UserRole:  role,
			Resources: map[string]string{"admin.users": ""},
		}
		if strings.EqualFold(c.Get("X-Allow-Users"), "true") {
			claims.Resources["admin.users"] = resourceRole
		}

		reqCtx := authlib.WithClaimsContext(c.UserContext(), claims)
		if actor := authlib.ActorContextFromClaims(claims); actor != nil {
			reqCtx = authlib.WithActorContext(reqCtx, actor)
		}
		c.SetUserContext(reqCtx)
		return c.Next()
	}

	crudGroup := app.Group("/admin/crud", authn)
	encoder := crud.ProblemJSONErrorEncoder(crud.WithProblemJSONStatusResolver(userCRUDStatusResolver))
	adapter := crud.NewFiberAdapter(crudGroup)

	controller := crud.NewController(
		profileStore.Repository(),
		crud.WithErrorEncoder[*stores.UserProfile](encoder),
		crud.WithScopeGuard[*stores.UserProfile](userProfilesCRUDScopeGuard()),
	)
	controller.RegisterRoutes(adapter)
	registerCrudAliases(adapter, controller, "user-profiles")

	return userProfilesCRUDHarness{app: app, deps: deps}
}

func doUserProfilesRequest(t *testing.T, app *fiber.App, method, path string, body map[string]any, allow bool) (map[string]any, int) {
	t.Helper()
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		reader = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	if allow {
		req.Header.Set("X-Allow-Users", "true")
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := app.Test(req)
	require.NoError(t, err)

	payload := map[string]any{}
	if resp.Body != nil {
		raw, _ := io.ReadAll(resp.Body)
		if len(raw) > 0 {
			_ = json.Unmarshal(raw, &payload)
		}
	}
	return payload, resp.StatusCode
}

func TestUserProfilesCRUD_Unauthorized(t *testing.T) {
	h := setupUserProfilesCRUDApp(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/crud/user-profiles", nil)
	resp, err := h.app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestUserProfilesCRUD_Forbidden(t *testing.T) {
	h := setupUserProfilesCRUDApp(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/crud/user-profiles", nil)
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	resp, err := h.app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestUserProfilesCRUD_ListSeeded(t *testing.T) {
	h := setupUserProfilesCRUDApp(t)
	payload, status := doUserProfilesRequest(t, h.app, http.MethodGet, "/admin/crud/user-profiles", nil, true)
	require.Equal(t, http.StatusOK, status)

	data, ok := payload["data"].([]any)
	require.True(t, ok, "expected data array, got: %#v", payload)
	require.Greater(t, len(data), 0)
}

func TestUserProfilesCRUD_CreateUpdateDelete(t *testing.T) {
	h := setupUserProfilesCRUDApp(t)
	ctx := context.Background()

	userID := uuid.New()
	now := time.Now().UTC()
	createdUser, err := h.deps.RepoManager.Users().Create(ctx, &authlib.User{
		ID:        userID,
		Username:  "profile.test",
		Email:     "profile.test@example.com",
		Role:      authlib.RoleMember,
		Status:    authlib.UserStatusActive,
		CreatedAt: &now,
		Metadata:  map[string]any{},
	})
	require.NoError(t, err)
	require.NotNil(t, createdUser)

	createPayload := map[string]any{
		"id":           userID.String(),
		"display_name": "Profile Test",
		"email":        "profile.test@example.com",
		"locale":       "en",
		"timezone":     "UTC",
		"bio":          "Created via go-crud",
	}
	created, status := doUserProfilesRequest(t, h.app, http.MethodPost, "/admin/crud/user-profiles", createPayload, true)
	require.Contains(t, []int{http.StatusCreated, http.StatusOK}, status)
	createdData := extractDataMap(t, created)
	require.Equal(t, userID.String(), fmt.Sprint(createdData["id"]))

	updatePayload := map[string]any{
		"display_name": "Profile Test Updated",
	}
	updated, status := doUserProfilesRequest(t, h.app, http.MethodPut, "/admin/crud/user-profiles/"+userID.String(), updatePayload, true)
	require.Equal(t, http.StatusOK, status)
	updatedData := extractDataMap(t, updated)
	require.Equal(t, "Profile Test Updated", fmt.Sprint(updatedData["display_name"]))

	_, status = doUserProfilesRequest(t, h.app, http.MethodDelete, "/admin/crud/user-profiles/"+userID.String(), nil, true)
	require.Contains(t, []int{http.StatusOK, http.StatusNoContent}, status)

	_, status = doUserProfilesRequest(t, h.app, http.MethodGet, "/admin/crud/user-profiles/"+userID.String(), nil, true)
	require.Equal(t, http.StatusNotFound, status)
}

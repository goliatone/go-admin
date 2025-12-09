package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/stores"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	"github.com/stretchr/testify/require"
)

func setupContentCRUDApp(t *testing.T) *fiber.App {
	db, err := stores.SetupContentDatabase(context.Background(), "file::memory:?cache=shared&_fk=1")
	require.NoError(t, err)

	pageStore, err := stores.NewPageStore(db)
	require.NoError(t, err)
	postStore, err := stores.NewPostStore(db)
	require.NoError(t, err)
	mediaStore, err := stores.NewMediaStore(db)
	require.NoError(t, err)

	pageStore.Seed()
	postStore.Seed()
	mediaStore.Seed()

	app := fiber.New()
	crudGroup := app.Group("/admin/crud")
	crudGroup.Use(func(c *fiber.Ctx) error {
		role := c.Get("X-Role")
		if role == "" {
			return fiber.ErrUnauthorized
		}
		claims := &authlib.JWTClaims{
			UserRole: role,
			Resources: map[string]string{
				"admin.pages": role,
				"admin.posts": role,
				"admin.media": role,
			},
		}
		ctx := authlib.WithClaimsContext(c.UserContext(), claims)
		if actor := authlib.ActorContextFromClaims(claims); actor != nil {
			ctx = authlib.WithActorContext(ctx, actor)
		}
		c.SetUserContext(ctx)
		return c.Next()
	})

	encoder := crud.ProblemJSONErrorEncoder(crud.WithProblemJSONStatusResolver(userCRUDStatusResolver))
	adapter := crud.NewFiberAdapter(crudGroup)

	pageController := crud.NewController(
		pageStore.Repository(),
		crud.WithErrorEncoder[*stores.PageRecord](encoder),
		crud.WithScopeGuard[*stores.PageRecord](contentCRUDScopeGuard[*stores.PageRecord]("admin.pages")),
	)
	pageController.RegisterRoutes(adapter)
	registerCrudAliases(adapter, pageController, "pages")

	postController := crud.NewController(
		postStore.Repository(),
		crud.WithErrorEncoder[*stores.PostRecord](encoder),
		crud.WithScopeGuard[*stores.PostRecord](contentCRUDScopeGuard[*stores.PostRecord]("admin.posts")),
	)
	postController.RegisterRoutes(adapter)
	registerCrudAliases(adapter, postController, "posts")

	mediaController := crud.NewController(
		mediaStore.Repository(),
		crud.WithErrorEncoder[*stores.MediaRecord](encoder),
		crud.WithScopeGuard[*stores.MediaRecord](contentCRUDScopeGuard[*stores.MediaRecord]("admin.media")),
	)
	mediaController.RegisterRoutes(adapter)
	registerCrudAliases(adapter, mediaController, "media")

	return app
}

func TestContentCRUD_ListEndpoints(t *testing.T) {
	app := setupContentCRUDApp(t)
	client := []struct {
		path string
	}{
		{path: "/admin/crud/pages"},
		{path: "/admin/crud/posts"},
		{path: "/admin/crud/media"},
	}

	for _, tc := range client {
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)
		req.Header.Set("X-Role", string(authlib.RoleAdmin))
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode, tc.path)

		var payload map[string]any
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload), tc.path)
		data, ok := payload["data"].([]any)
		require.True(t, ok, tc.path)
		require.Greater(t, len(data), 0, tc.path)
	}
}

func TestContentCRUD_Unauthorized(t *testing.T) {
	app := setupContentCRUDApp(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/crud/pages", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestContentCRUD_CreateForbidden(t *testing.T) {
	app := setupContentCRUDApp(t)
	payload := map[string]any{
		"title":  "New Post",
		"slug":   "new-post",
		"status": "draft",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/crud/posts", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Role", string(authlib.RoleMember))

	resp, err := app.Test(req)
	require.NoError(t, err)
	if resp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(resp.Body)
		t.Logf("unexpected response: %s", string(body))
	}
	require.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestContentCRUD_NotFound(t *testing.T) {
	app := setupContentCRUDApp(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/crud/media/"+time.Now().Format("20060102150405"), nil)
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusNotFound, resp.StatusCode)
}

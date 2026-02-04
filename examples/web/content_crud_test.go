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
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	"github.com/stretchr/testify/require"
)

func setupContentCRUDApp(t *testing.T) (*fiber.App, admin.CMSOptions) {
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))
	ctx := context.Background()

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)

	contentSvc := cmsOpts.Container.ContentService()
	db, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)

	pageStore := stores.NewCMSPageStore(contentSvc, "en")
	postStore := stores.NewCMSPostStore(contentSvc, "en")
	mediaStore, err := stores.NewMediaStore(db)
	require.NoError(t, err)

	pageRepo := stores.NewPageRecordRepository(db)
	postRepo := stores.NewPostRecordRepository(db)

	if menuSvc := cmsOpts.Container.MenuService(); menuSvc != nil {
		_ = setup.SetupNavigation(ctx, menuSvc, "/admin", setup.NavigationMenuCode, "en")
	}

	app := fiber.New()
	authn := func(c *fiber.Ctx) error {
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
	}

	crudGroup := app.Group("/admin/crud", authn)

	encoder := crud.ProblemJSONErrorEncoder(crud.WithProblemJSONStatusResolver(userCRUDStatusResolver))
	adapter := crud.NewFiberAdapter(crudGroup)

	pageStoreAdapter := stores.NewAdminPageStoreAdapter(pageRepo, pageStore, "en")
	pageReadService := admin.AdminPageReadService(pageStoreAdapter)
	if provider, ok := cmsOpts.Container.(interface{ AdminPageReadService() admin.AdminPageReadService }); ok {
		if svc := provider.AdminPageReadService(); svc != nil {
			pageReadService = svc
		}
	}
	pageApp := admin.PageApplicationService{
		Read:  pageReadService,
		Write: pageStoreAdapter,
	}
	pageCRUDAdapter := stores.NewPageAppCRUDAdapter(pageApp, "en")
	pageController := crud.NewController(
		pageRepo,
		crud.WithErrorEncoder[*stores.PageRecord](encoder),
		crud.WithScopeGuard[*stores.PageRecord](contentCRUDScopeGuard[*stores.PageRecord]("admin.pages")),
		crud.WithReadService[*stores.PageRecord](crud.ReadOnlyService[*stores.PageRecord](pageCRUDAdapter)),
		crud.WithWriteService[*stores.PageRecord](crud.WriteOnlyService[*stores.PageRecord](pageCRUDAdapter)),
		crud.WithContextFactory[*stores.PageRecord](contentCRUDContextFactory("en")),
	)
	pageController.RegisterRoutes(adapter)
	registerCrudAliases(adapter, pageController, "pages")

	postController := crud.NewController(
		postRepo,
		crud.WithErrorEncoder[*stores.PostRecord](encoder),
		crud.WithScopeGuard[*stores.PostRecord](contentCRUDScopeGuard[*stores.PostRecord]("admin.posts")),
		crud.WithService[*stores.PostRecord](stores.NewPostCRUDService(postRepo, postStore)),
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

	apiGroup := app.Group("/admin/api", authn)
	apiGroup.Get("/navigation", func(c *fiber.Ctx) error {
		locale := strings.TrimSpace(c.Query("locale"))
		menuSvc := cmsOpts.Container.MenuService()
		if menuSvc == nil {
			return fiber.ErrNotFound
		}
		items, err := menuSvc.Menu(c.UserContext(), setup.NavigationMenuCode, locale)
		if (err != nil || items == nil || len(items.Items) == 0) && menuSvc != nil {
			_ = setup.SetupNavigation(c.UserContext(), menuSvc, "/admin", setup.NavigationMenuCode, "en")
			items, err = menuSvc.Menu(c.UserContext(), setup.NavigationMenuCode, locale)
		}
		if err != nil || items == nil {
			return err
		}
		if len(items.Items) == 0 {
			fallback := []any{map[string]any{
				"label": "Content",
				"id":    "content.fallback",
				"target": map[string]any{
					"type": "url",
					"path": "/admin/pages",
				},
			}}
			return c.JSON(map[string]any{"data": fallback})
		}
		return c.JSON(map[string]any{"data": items})
	})

	return app, cmsOpts
}

func TestContentCRUD_ListEndpoints(t *testing.T) {
	app, _ := setupContentCRUDApp(t)
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
	app, _ := setupContentCRUDApp(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/crud/pages", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestContentCRUD_CreateForbidden(t *testing.T) {
	app, _ := setupContentCRUDApp(t)
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
	app, _ := setupContentCRUDApp(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/crud/media/"+time.Now().Format("20060102150405"), nil)
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestContentCRUD_CreateAndUpdateFlows(t *testing.T) {
	app, _ := setupContentCRUDApp(t)

	pagePayload := map[string]any{
		"title":            "Integration Page",
		"slug":             "integration-page",
		"status":           "draft",
		"path":             "/integration/page",
		"meta_title":       "Integration Page Meta",
		"meta_description": "CMS-backed page",
		"content":          "Rendered from go-cms",
	}
	pageResp, pageStatus := doJSONRequest(t, app, http.MethodPost, "/admin/crud/pages", pagePayload)
	require.Contains(t, []int{http.StatusCreated, http.StatusOK}, pageStatus)
	pageData := extractDataMap(t, pageResp)
	pageID := fmt.Sprint(pageData["id"])
	require.NotEmpty(t, pageID)
	require.Equal(t, "integration-page", fmt.Sprint(pageData["slug"]))

	postPayload := map[string]any{
		"title":            "Integration Post",
		"slug":             "integration-post",
		"status":           "draft",
		"path":             "/posts/integration-post",
		"meta_title":       "Integration Post Meta",
		"meta_description": "CMS-backed post",
		"tags":             []string{"cms", "crud"},
		"content":          "Content from CMS",
	}
	postResp, postStatus := doJSONRequest(t, app, http.MethodPost, "/admin/crud/posts", postPayload)
	require.Contains(t, []int{http.StatusCreated, http.StatusOK}, postStatus)
	postData := extractDataMap(t, postResp)
	postID := fmt.Sprint(postData["id"])
	require.NotEmpty(t, postID)
	require.Equal(t, "integration-post", fmt.Sprint(postData["slug"]))

	mediaPayload := map[string]any{
		"filename":    "integration-asset.png",
		"url":         "/uploads/integration-asset.png",
		"type":        "image",
		"mime_type":   "image/png",
		"size":        5120,
		"uploaded_by": "crud-test",
	}
	mediaResp, mediaStatus := doJSONRequest(t, app, http.MethodPost, "/admin/crud/media", mediaPayload)
	require.Contains(t, []int{http.StatusCreated, http.StatusOK}, mediaStatus)
	mediaData := extractDataMap(t, mediaResp)
	mediaID := fmt.Sprint(mediaData["id"])
	require.NotEmpty(t, mediaID)

	_, mediaDeleteStatus := doJSONRequest(t, app, http.MethodDelete, "/admin/crud/media/"+mediaID, nil)
	require.Contains(t, []int{http.StatusNoContent, http.StatusOK}, mediaDeleteStatus)
}

func TestNavigationUsesCMSMenu(t *testing.T) {
	app, _ := setupContentCRUDApp(t)

	payload, status := doJSONRequest(t, app, http.MethodGet, "/admin/api/navigation", nil)
	require.Equal(t, http.StatusOK, status)

	rawMenu, ok := payload["data"].(map[string]any)
	require.Truef(t, ok, "expected CMS menu object, payload: %+v", payload)

	rawItems, ok := rawMenu["Items"].([]any)
	require.Truef(t, ok, "expected Items array in menu payload, payload: %+v", payload)
	require.NotEmptyf(t, rawItems, "navigation should return CMS items, payload: %+v", payload)

	groupFound := false
	dashboardFirst := false
	foundContent := false

	for _, raw := range rawItems {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		typ := strings.ToLower(fmt.Sprint(item["type"]))
		if typ != "group" {
			continue
		}
		groupFound = true
		children, _ := item["children"].([]any)
		if len(children) == 0 {
			continue
		}
		if first, ok := children[0].(map[string]any); ok {
			if strings.EqualFold(fmt.Sprint(first["label"]), "dashboard") {
				dashboardFirst = true
			}
		}
		for _, child := range children {
			cm, ok := child.(map[string]any)
			if !ok {
				continue
			}
			if strings.EqualFold(fmt.Sprint(cm["label"]), "content") {
				foundContent = true
			}
		}
	}
	require.Truef(t, groupFound, "expected CMS menu group, payload: %+v", payload)
	require.Truef(t, dashboardFirst, "expected Dashboard to be first item in menu group, payload: %+v", payload)
	require.Truef(t, foundContent, "expected CMS-backed Content menu entry, payload: %+v", payload)
}

func doJSONRequest(t *testing.T, app *fiber.App, method, path string, body map[string]any) (map[string]any, int) {
	t.Helper()
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reader = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("X-Role", string(authlib.RoleAdmin))

	resp, err := app.Test(req)
	require.NoError(t, err)

	raw := []byte{}
	var payload map[string]any
	if resp.Body != nil {
		raw, _ = io.ReadAll(resp.Body)
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &payload); err != nil {
				t.Fatalf("decode response for %s %s (status %d): %v\nbody: %s", method, path, resp.StatusCode, err, string(raw))
			}
		}
	}
	if resp.StatusCode >= http.StatusBadRequest {
		t.Logf("%s %s -> status %d body: %s", method, path, resp.StatusCode, string(raw))
	}
	return payload, resp.StatusCode
}

func extractDataMap(t *testing.T, payload map[string]any) map[string]any {
	t.Helper()
	raw := payload["data"]
	switch v := raw.(type) {
	case map[string]any:
		return v
	case []any:
		if len(v) > 0 {
			if m, ok := v[0].(map[string]any); ok {
				return m
			}
		}
	}
	if raw == nil && len(payload) > 0 {
		return payload
	}
	t.Fatalf("expected data map in response, got %T: %+v", raw, payload)
	return nil
}

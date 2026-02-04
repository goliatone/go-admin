package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/handlers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

type pageParityHarness struct {
	app     *fiber.App
	pageApp admin.PageApplicationService
	config  admin.Config
}

func setupPageParityHarness(t *testing.T) pageParityHarness {
	contextBase := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	cmsOpts, err := setup.SetupPersistentCMS(contextBase, "en", dsn)
	require.NoError(t, err)

	contentSvc := cmsOpts.Container.ContentService()
	require.NotNil(t, contentSvc)

	db, err := stores.SetupContentDatabase(contextBase, dsn)
	require.NoError(t, err)

	pageStore := stores.NewCMSPageStore(contentSvc, "en")
	pageRepo := stores.NewPageRecordRepository(db)

	workflow := coreadmin.NewSimpleWorkflowEngine()
	workflow.RegisterWorkflow("pages", coreadmin.WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []coreadmin.WorkflowTransition{
			{Name: "request_approval", Description: "Submit for review", From: "draft", To: "pending_approval"},
			{Name: "approve", Description: "Approve content", From: "pending_approval", To: "published"},
			{Name: "reject", Description: "Reject content", From: "pending_approval", To: "draft"},
		},
	})

	pageStoreAdapter := stores.NewAdminPageStoreAdapter(pageRepo, pageStore, "en")
	pageReadService := admin.AdminPageReadService(pageStoreAdapter)
	if provider, ok := cmsOpts.Container.(interface{ AdminPageReadService() admin.AdminPageReadService }); ok {
		if svc := provider.AdminPageReadService(); svc != nil {
			pageReadService = svc
		}
	}
	pageApp := admin.PageApplicationService{
		Read:     pageReadService,
		Write:    pageStoreAdapter,
		Workflow: workflow,
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

	cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en"}

	return pageParityHarness{app: app, pageApp: pageApp, config: cfg}
}

func TestPageFormValuesMatchListData(t *testing.T) {
	h := setupPageParityHarness(t)
	ctx := context.Background()

	created, err := h.pageApp.Create(ctx, map[string]any{
		"title":            "Parity Page",
		"slug":             "parity-page",
		"path":             "/parity/page",
		"status":           "draft",
		"locale":           "en",
		"meta_title":       "Parity Meta",
		"meta_description": "Parity Description",
	})
	require.NoError(t, err)
	require.NotNil(t, created)

	list, _, err := h.pageApp.List(ctx, admin.PageListOptions{})
	require.NoError(t, err)

	var listRecord *admin.AdminPageRecord
	for _, record := range list {
		if record.ID == created.ID {
			copy := record
			listRecord = &copy
			break
		}
	}
	require.NotNil(t, listRecord)

	listValues := h.pageApp.ToFormValues(*listRecord)
	fetched, err := h.pageApp.Get(ctx, created.ID, admin.PageGetOptions{})
	require.NoError(t, err)
	require.NotNil(t, fetched)

	editValues := h.pageApp.ToFormValues(*fetched)

	require.Equal(t, fmt.Sprint(listValues["title"]), fmt.Sprint(editValues["title"]))
	require.Equal(t, fmt.Sprint(listValues["path"]), fmt.Sprint(editValues["path"]))
	require.Equal(t, fmt.Sprint(listValues["meta_title"]), fmt.Sprint(editValues["meta_title"]))
	require.Equal(t, fmt.Sprint(listValues["meta_description"]), fmt.Sprint(editValues["meta_description"]))
}

func TestPageHandlersWriteRoutesThroughService(t *testing.T) {
	ctx := context.Background()
	claims := &authlib.JWTClaims{
		UserRole: string(authlib.RoleAdmin),
		Resources: map[string]string{
			"admin.pages": string(authlib.RoleAdmin),
		},
	}
	ctx = authlib.WithClaimsContext(ctx, claims)

	writeSvc := &recordingPageWriteService{}
	readSvc := &recordingPageReadService{record: admin.AdminPageRecord{ID: "page-1", ResolvedLocale: "en", Status: "draft"}}
	pageApp := admin.PageApplicationService{Read: readSvc, Write: writeSvc}
	cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en"}

	pageHandlers := handlers.NewPageHandlers(pageApp, nil, nil, cfg, func(view router.ViewContext, _ *admin.Admin, _ admin.Config, _ string, _ context.Context) router.ViewContext {
		return view
	})

	createCtx := router.NewMockContext()
	createCtx.HeadersM["X-User-ID"] = "user-1"
	createCtx.On("Context").Return(ctx)
	createCtx.On("FormValue", "title").Return("Create Title")
	createCtx.On("FormValue", "slug").Return("create-title")
	createCtx.On("FormValue", "path").Return("/create-title")
	createCtx.On("FormValue", "content").Return("Create content")
	createCtx.On("FormValue", "status").Return("draft")
	createCtx.On("FormValue", "locale").Return("en")
	createCtx.On("FormValue", "meta_title").Return("Create Meta")
	createCtx.On("FormValue", "meta_description").Return("Create Desc")
	createCtx.On("FormValue", "template_id").Return("")
	createCtx.On("FormValue", "parent_id").Return("")
	createCtx.On("FormValue", "translation_group_id").Return("")
	createCtx.On("FormValue", "blocks").Return("")
	createCtx.On("Redirect", "/admin/pages").Return(nil)

	require.NoError(t, pageHandlers.Create(createCtx))
	require.Equal(t, 1, writeSvc.createCalled)
	require.Equal(t, "Create Title", fmt.Sprint(writeSvc.lastCreatePayload["title"]))

	updateCtx := router.NewMockContext()
	updateCtx.HeadersM["X-User-ID"] = "user-1"
	updateCtx.ParamsM["id"] = "page-1"
	updateCtx.On("Context").Return(ctx)
	updateCtx.On("FormValue", "title").Return("Updated Title")
	updateCtx.On("FormValue", "slug").Return("updated-title")
	updateCtx.On("FormValue", "path").Return("/updated-title")
	updateCtx.On("FormValue", "content").Return("Updated content")
	updateCtx.On("FormValue", "status").Return("draft")
	updateCtx.On("FormValue", "locale").Return("en")
	updateCtx.On("FormValue", "meta_title").Return("Updated Meta")
	updateCtx.On("FormValue", "meta_description").Return("Updated Desc")
	updateCtx.On("FormValue", "template_id").Return("")
	updateCtx.On("FormValue", "parent_id").Return("")
	updateCtx.On("FormValue", "translation_group_id").Return("")
	updateCtx.On("FormValue", "blocks").Return("")
	updateCtx.On("Redirect", "/admin/pages").Return(nil)

	require.NoError(t, pageHandlers.Update(updateCtx))
	require.Equal(t, 1, writeSvc.updateCalled)
	require.Equal(t, "page-1", writeSvc.lastUpdateID)
	require.Equal(t, "Updated Title", fmt.Sprint(writeSvc.lastUpdatePayload["title"]))

	deleteCtx := router.NewMockContext()
	deleteCtx.HeadersM["X-User-ID"] = "user-1"
	deleteCtx.ParamsM["id"] = "page-1"
	deleteCtx.On("Context").Return(ctx)
	deleteCtx.On("Redirect", "/admin/pages").Return(nil)

	require.NoError(t, pageHandlers.Delete(deleteCtx))
	require.Equal(t, 1, writeSvc.deleteCalled)
	require.Equal(t, "page-1", writeSvc.lastDeleteID)
}

func TestPageJSONCRUDParityWithHTMLFlows(t *testing.T) {
	h := setupPageParityHarness(t)
	pageHandlers := handlers.NewPageHandlers(h.pageApp, nil, nil, h.config, func(view router.ViewContext, _ *admin.Admin, _ admin.Config, _ string, _ context.Context) router.ViewContext {
		return view
	})

	ctx := context.Background()
	claims := &authlib.JWTClaims{
		UserRole: string(authlib.RoleAdmin),
		Resources: map[string]string{
			"admin.pages": string(authlib.RoleAdmin),
		},
	}
	ctx = authlib.WithClaimsContext(ctx, claims)

	createCtx := router.NewMockContext()
	createCtx.HeadersM["X-User-ID"] = "user-1"
	createCtx.On("Context").Return(ctx)
	createCtx.On("FormValue", "title").Return("HTML Parity")
	createCtx.On("FormValue", "slug").Return("html-parity")
	createCtx.On("FormValue", "path").Return("/html/parity")
	createCtx.On("FormValue", "content").Return("HTML content")
	createCtx.On("FormValue", "status").Return("draft")
	createCtx.On("FormValue", "locale").Return("en")
	createCtx.On("FormValue", "meta_title").Return("HTML Meta")
	createCtx.On("FormValue", "meta_description").Return("HTML Description")
	createCtx.On("FormValue", "template_id").Return("")
	createCtx.On("FormValue", "parent_id").Return("")
	createCtx.On("FormValue", "translation_group_id").Return("")
	createCtx.On("FormValue", "blocks").Return("")
	createCtx.On("Redirect", "/admin/pages").Return(nil)

	require.NoError(t, pageHandlers.Create(createCtx))

	req := httptest.NewRequest(http.MethodGet, "/admin/crud/pages", nil)
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	resp, err := h.app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	payload := map[string]any{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))

	items := extractListItems(payload)
	var found map[string]any
	for _, item := range items {
		if strings.EqualFold(fmt.Sprint(item["slug"]), "html-parity") {
			found = item
			break
		}
	}
	require.NotNil(t, found)
	require.Equal(t, "HTML Parity", fmt.Sprint(found["title"]))
	require.Equal(t, "/html/parity", fmt.Sprint(found["path"]))
	require.Equal(t, "HTML Meta", fmt.Sprint(found["meta_title"]))
	require.Equal(t, "HTML Description", fmt.Sprint(found["meta_description"]))
}

func TestPageWorkflowTransitionsEnforcedAcrossHTMLAndJSON(t *testing.T) {
	h := setupPageParityHarness(t)

	ctx := context.Background()
	initial, err := h.pageApp.Create(ctx, map[string]any{
		"title":  "Workflow JSON",
		"slug":   "workflow-json",
		"path":   "/workflow/json",
		"status": "draft",
		"locale": "en",
	})
	require.NoError(t, err)
	require.NotNil(t, initial)

	_, badStatus := doJSONRequest(t, h.app, http.MethodPut, "/admin/crud/pages/"+initial.ID, map[string]any{
		"status": "published",
	})
	require.GreaterOrEqual(t, badStatus, http.StatusBadRequest)

	pageHandlers := handlers.NewPageHandlers(h.pageApp, nil, nil, h.config, func(view router.ViewContext, _ *admin.Admin, _ admin.Config, _ string, _ context.Context) router.ViewContext {
		return view
	})

	claims := &authlib.JWTClaims{
		UserRole: string(authlib.RoleAdmin),
		Resources: map[string]string{
			"admin.pages": string(authlib.RoleAdmin),
		},
	}
	ctx = authlib.WithClaimsContext(ctx, claims)

	updateCtx := router.NewMockContext()
	updateCtx.HeadersM["X-User-ID"] = "user-1"
	updateCtx.ParamsM["id"] = initial.ID
	updateCtx.On("Context").Return(ctx)
	updateCtx.On("FormValue", "title").Return("Workflow JSON")
	updateCtx.On("FormValue", "slug").Return("workflow-json")
	updateCtx.On("FormValue", "path").Return("/workflow/json")
	updateCtx.On("FormValue", "content").Return("")
	updateCtx.On("FormValue", "status").Return("pending_approval")
	updateCtx.On("FormValue", "locale").Return("en")
	updateCtx.On("FormValue", "meta_title").Return("")
	updateCtx.On("FormValue", "meta_description").Return("")
	updateCtx.On("FormValue", "template_id").Return("")
	updateCtx.On("FormValue", "parent_id").Return("")
	updateCtx.On("FormValue", "translation_group_id").Return("")
	updateCtx.On("FormValue", "blocks").Return("")
	updateCtx.On("Redirect", "/admin/pages").Return(nil)

	require.NoError(t, pageHandlers.Update(updateCtx))

	_, publishStatus := doJSONRequest(t, h.app, http.MethodPut, "/admin/crud/pages/"+initial.ID, map[string]any{
		"status": "published",
	})
	require.Equal(t, http.StatusOK, publishStatus)

	payload, fetchStatus := doJSONRequest(t, h.app, http.MethodGet, "/admin/crud/pages/"+initial.ID, nil)
	require.Equal(t, http.StatusOK, fetchStatus)
	record := extractDataMap(t, payload)
	require.Equal(t, "published", strings.ToLower(fmt.Sprint(record["status"])))
}

type recordingPageWriteService struct {
	createCalled      int
	updateCalled      int
	deleteCalled      int
	lastCreatePayload map[string]any
	lastUpdatePayload map[string]any
	lastUpdateID      string
	lastDeleteID      string
}

func (s *recordingPageWriteService) Create(_ context.Context, payload map[string]any) (*admin.AdminPageRecord, error) {
	s.createCalled++
	s.lastCreatePayload = cloneAnyMap(payload)
	return &admin.AdminPageRecord{
		ID:              "page-1",
		Title:           fmt.Sprint(payload["title"]),
		Slug:            fmt.Sprint(payload["slug"]),
		Path:            fmt.Sprint(payload["path"]),
		RequestedLocale: fmt.Sprint(payload["locale"]),
		ResolvedLocale:  fmt.Sprint(payload["locale"]),
		Status:          fmt.Sprint(payload["status"]),
	}, nil
}

func (s *recordingPageWriteService) Update(_ context.Context, id string, payload map[string]any) (*admin.AdminPageRecord, error) {
	s.updateCalled++
	s.lastUpdateID = id
	s.lastUpdatePayload = cloneAnyMap(payload)
	return &admin.AdminPageRecord{
		ID:              id,
		Title:           fmt.Sprint(payload["title"]),
		Slug:            fmt.Sprint(payload["slug"]),
		Path:            fmt.Sprint(payload["path"]),
		RequestedLocale: fmt.Sprint(payload["locale"]),
		ResolvedLocale:  fmt.Sprint(payload["locale"]),
		Status:          fmt.Sprint(payload["status"]),
	}, nil
}

func (s *recordingPageWriteService) Delete(_ context.Context, id string) error {
	s.deleteCalled++
	s.lastDeleteID = id
	return nil
}

func (s *recordingPageWriteService) Publish(ctx context.Context, id string, payload map[string]any) (*admin.AdminPageRecord, error) {
	return s.Update(ctx, id, payload)
}

func (s *recordingPageWriteService) Unpublish(ctx context.Context, id string, payload map[string]any) (*admin.AdminPageRecord, error) {
	return s.Update(ctx, id, payload)
}

type recordingPageReadService struct {
	record admin.AdminPageRecord
}

func (s *recordingPageReadService) List(_ context.Context, _ admin.AdminPageListOptions) ([]admin.AdminPageRecord, int, error) {
	if s == nil {
		return nil, 0, admin.ErrNotFound
	}
	if strings.TrimSpace(s.record.ID) == "" {
		return nil, 0, nil
	}
	return []admin.AdminPageRecord{s.record}, 1, nil
}

func (s *recordingPageReadService) Get(_ context.Context, id string, _ admin.AdminPageGetOptions) (*admin.AdminPageRecord, error) {
	if s == nil {
		return nil, admin.ErrNotFound
	}
	rec := s.record
	if strings.TrimSpace(rec.ID) == "" {
		rec.ID = id
	}
	if strings.TrimSpace(rec.ResolvedLocale) == "" {
		rec.ResolvedLocale = rec.RequestedLocale
	}
	return &rec, nil
}

func extractListItems(payload map[string]any) []map[string]any {
	if payload == nil {
		return nil
	}
	for _, key := range []string{"data", "records"} {
		if raw, ok := payload[key]; ok {
			switch items := raw.(type) {
			case []map[string]any:
				return items
			case []any:
				out := make([]map[string]any, 0, len(items))
				for _, item := range items {
					if m, ok := item.(map[string]any); ok {
						out = append(out, m)
					}
				}
				return out
			}
		}
	}
	return nil
}

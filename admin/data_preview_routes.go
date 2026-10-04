package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Render builds bytes without writing a response. Authorization is sealed AFTER
// all application query and template work, before the transport discloses bytes.
// Read must require the installed isolated context, never use a default route.
// Render returns the application's view as an HTML fragment; the module wraps
// it in the preview chrome (see data_preview_panels.go). Label names the view
// in that chrome and defaults to the surface ID.
type DataPreviewSurface struct {
	Read   func(context.Context, data.PreviewReadContext) (any, error)
	Render func(context.Context, data.PreviewReadContext, any) ([]byte, error)
	Label  string
}
type DataPreviewURLs struct {
	Capabilities string `json:"capabilities"`
	Open         string `json:"open"`
	Session      string `json:"session"`
	Close        string `json:"close"`
	Surface      string `json:"surface"`
	API          string `json:"api"`
}

func (m *DataModule) previewContract(c routing.ModuleContract) routing.ModuleContract {
	for key, d := range map[string]routing.RouteDeclaration{
		"capabilities": {Method: router.GET, Path: "api/preview/capabilities"},
		"open":         {Method: router.POST, Path: "api/preview/sessions"},
		"session":      {Method: router.GET, Path: "api/preview/sessions/:session"},
		"close":        {Method: router.POST, Path: "api/preview/sessions/:session/close"},
		"surface":      {Method: router.GET, Path: "preview/:session/surfaces/:surface"},
		"api":          {Method: router.GET, Path: "preview/:session/surfaces/:surface/api/report"},
		"effect":       {Method: router.POST, Path: "preview/:session/effects/:effect"},
	} {
		c.UIRouteDeclarations["data.preview."+key] = d
	}
	for _, key := range []string{"surface", "api"} {
		for _, method := range []router.HTTPMethod{router.POST, router.PUT, router.PATCH, router.DELETE} {
			d := c.UIRouteDeclarations["data.preview."+key]
			d.Method = method
			c.UIRouteDeclarations["data.preview."+key+"."+strings.ToLower(string(method))] = d
		}
	}
	return c
}
func (m *DataModule) resolvePreviewRoutes(ctx ModuleContext) (DataPreviewURLs, error) {
	get := func(key string) string { return ctx.Routing.RoutePath(routing.SurfaceUI, "data.preview."+key) }
	u := DataPreviewURLs{Capabilities: get("capabilities"), Open: get("open"), Session: get("session"), Close: get("close"), Surface: get("surface"), API: get("api")}
	for _, path := range []string{u.Capabilities, u.Open, u.Session, u.Close, u.Surface, u.API} {
		if path == "" || !safePreviewURL(path) {
			return u, data.Error(data.CodeInvalid)
		}
	}
	return u, nil
}
func safePreviewURL(path string) bool {
	u, err := url.Parse(path)
	return err == nil && !u.IsAbs() && u.Host == "" && strings.HasPrefix(path, "/") && !strings.HasPrefix(path, "//") && !strings.ContainsAny(path, "\\\r\n")
}
func previewLocatorURL(path string, s data.ApplicationPreviewSession) string {
	path = strings.ReplaceAll(path, ":session", url.PathEscape(s.SessionID))
	return strings.ReplaceAll(path, ":surface", url.PathEscape(s.SurfaceID))
}
func (m *DataModule) registerPreviewRoutes(ctx ModuleContext, u DataPreviewURLs) {
	mutation := func(handler router.HandlerFunc) router.HandlerFunc {
		return m.host.guard(func(c router.Context) error {
			if err := enforceAdminAuthenticatorBrowserCSRF(c, ctx.Admin); err != nil {
				return writeConsoleError(c, err)
			}
			return handler(c)
		})
	}
	for key, path := range map[string]string{"capabilities": u.Capabilities, "session": u.Session} {
		kind := key
		ctx.ProtectedRouter.Get(path, m.host.guard(func(c router.Context) error { return m.handlePreview(c, kind, u) }))
	}
	ctx.ProtectedRouter.Post(u.Open, mutation(func(c router.Context) error { return m.handlePreview(c, "open", u) }))
	ctx.ProtectedRouter.Post(u.Close, mutation(func(c router.Context) error { return m.handlePreview(c, "close", u) }))
	chrome := dataPreviewChromeRoutes{urls: u, page: m.host.routes.Page, assets: strings.TrimSpace(ctx.Admin.config.BasePath)}
	ctx.ProtectedRouter.Get(u.Surface, m.host.guard(func(c router.Context) error { return m.handlePreviewSurface(c, false, chrome) }))
	ctx.ProtectedRouter.Get(u.API, m.host.guard(func(c router.Context) error { return m.handlePreviewSurface(c, true, chrome) }))
	deny := m.host.guard(func(c router.Context) error {
		c.SetHeader("Cache-Control", "private, no-store")
		return writeConsoleError(c, data.Error(data.CodeDenied))
	})
	ctx.ProtectedRouter.Post(ctx.Routing.RoutePath(routing.SurfaceUI, "data.preview.effect"), deny)
	for _, path := range []string{u.Surface, u.API} {
		ctx.ProtectedRouter.Post(path, deny)
		ctx.ProtectedRouter.Put(path, deny)
		ctx.ProtectedRouter.Patch(path, deny)
		ctx.ProtectedRouter.Delete(path, deny)
	}
}
func (m *DataModule) previewHostCheck(identity console.Identity) data.InsightDeliveryCheck {
	return func(ctx context.Context) (context.Context, error) {
		next, _, err := m.host.current(ctx, identity)
		if err != nil {
			return next, err
		}
		if !m.host.acceptsIdentity(identity) {
			return next, ErrForbidden
		}
		return next, m.config.Service.ValidatePreviewHost(next, identity.ApplicationID, identity.EnvironmentID, identity.ActorID, identity.ScopeKey)
	}
}
func (m *DataModule) handlePreview(c router.Context, kind string, u DataPreviewURLs) error {
	c.SetHeader("Cache-Control", "private, no-store")
	ctx, identity, err := m.host.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err = m.config.Service.ValidatePreviewHost(ctx, identity.ApplicationID, identity.EnvironmentID, identity.ActorID, identity.ScopeKey); err != nil {
		return writeConsoleError(c, err)
	}
	q, err := m.parsePreviewMessage(c, kind)
	if err != nil {
		return writeConsoleError(c, err)
	}
	if err = q.Validate(); err != nil {
		return writeConsoleError(c, err)
	}
	wire, err := json.Marshal(q)
	if err != nil {
		return writeConsoleError(c, data.Error(data.CodeInvalid))
	}
	payload := map[string]any{}
	if err = json.Unmarshal(wire, &payload); err != nil {
		return writeConsoleError(c, data.Error(data.CodeInvalid))
	}
	if m.bus == nil {
		return writeConsoleError(c, data.Error(data.CodeUnavailable))
	}
	outcome, err := m.bus.DispatchByNameWithOutcome(ctx, q.Type(), payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	return m.writePreviewResult(c, ctx, identity, outcome.Result, u)
}
func (m *DataModule) parsePreviewMessage(c router.Context, kind string) (exploreQuery, error) {
	switch kind {
	case "capabilities":
		selection, err := decodeExploreSelection(c.Query("selection"))
		if err != nil {
			return nil, err
		}
		if selection.TargetID != m.config.TargetID {
			return nil, data.Error(data.CodeGone)
		}
		return data.PreviewCapabilitiesQuery{Selection: selection}, nil
	case "session":
		return data.ApplicationPreviewSessionQuery{SessionID: c.Param("session", "")}, nil
	case "close":
		body := string(c.Body())
		if body != "" && body != "null" && body != "{}" {
			return nil, data.Error(data.CodeInvalid)
		}
		return data.CloseApplicationPreviewCommand{SessionID: c.Param("session", "")}, nil
	case "open":
		return m.parsePreviewOpen(c.Body())
	default:
		return nil, data.Error(data.CodeInvalid)
	}
}
func (m *DataModule) parsePreviewOpen(body []byte) (data.OpenApplicationPreviewInput, error) {
	var in data.OpenApplicationPreviewInput
	if len(body) > 8<<10 {
		return in, data.Error(data.CodeInvalid)
	}
	d := json.NewDecoder(bytes.NewReader(body))
	d.DisallowUnknownFields()
	if err := d.Decode(&in); err != nil {
		return in, data.Error(data.CodeInvalid)
	}
	var extra any
	if err := d.Decode(&extra); !errors.Is(err, io.EOF) {
		return in, data.Error(data.CodeInvalid)
	}
	if in.Selection.TargetID != m.config.TargetID {
		return in, data.Error(data.CodeGone)
	}
	if surface, ok := m.config.PreviewSurfaces[in.SurfaceID]; !ok || surface.Read == nil {
		return in, data.Error(data.CodeUnavailable)
	}
	return in, in.Validate()
}
func (m *DataModule) writePreviewResult(c router.Context, ctx context.Context, identity console.Identity, result any, u DataPreviewURLs) error {
	switch out := result.(type) {
	case data.PreviewCapability:
		return m.writePreviewCapability(c, ctx, identity, out)
	case data.ApplicationPreviewSession:
		return m.writePreviewSession(c, ctx, identity, out, u)
	default:
		return writeConsoleError(c, data.Error(data.CodeProvider))
	}
}
func (m *DataModule) writePreviewCapability(c router.Context, ctx context.Context, identity console.Identity, out data.PreviewCapability) error {
	readable := []data.PreviewSurface{}
	for _, surface := range out.Surfaces {
		if registered, ok := m.config.PreviewSurfaces[surface.ID]; ok && registered.Read != nil {
			readable = append(readable, surface)
		}
	}
	out.Surfaces = readable
	if len(readable) == 0 {
		out.Supported = false
		if out.Reason == "" {
			out.Reason = "not_supported"
		}
	}
	if err := m.config.Service.ValidatePreviewCapabilitiesDelivery(ctx, out, m.previewHostCheck(identity)); err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	return writeJSON(c, out)
}
func (m *DataModule) writePreviewSession(c router.Context, ctx context.Context, identity console.Identity, out data.ApplicationPreviewSession, u DataPreviewURLs) (err error) {
	// Error responses can themselves write successfully, so track launch success
	// independently of the router handler's returned error.
	delivered := false
	defer func() {
		if !delivered {
			err = errors.Join(err, m.config.Service.DiscardPreviewLaunch(ctx, out))
		}
	}()
	if out.Selection.TargetID != m.config.TargetID {
		return writeConsoleError(c, data.Error(data.CodeGone))
	}
	if out.State == data.PreviewReady {
		if surface, ok := m.config.PreviewSurfaces[out.SurfaceID]; !ok || surface.Read == nil {
			return writeConsoleError(c, data.Error(data.CodeUnavailable))
		}
		out.LaunchURL = previewLocatorURL(u.Surface, out)
	}
	selection, err := json.Marshal(out.Selection)
	if err != nil {
		return writeConsoleError(c, data.Error(data.CodeProvider))
	}
	out.ReturnURL = m.host.routes.Page + "?" + url.Values{"selection": {string(selection)}}.Encode()
	if !safePreviewURL(out.ReturnURL) || out.LaunchURL != "" && !safePreviewURL(out.LaunchURL) {
		return writeConsoleError(c, data.Error(data.CodeProvider))
	}
	if err = m.config.Service.ValidatePreviewDelivery(ctx, out, m.previewHostCheck(identity)); err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	err = writeJSON(c, out)
	delivered = err == nil
	return err
}

// writePreviewSurfaceError refuses a preview read. Browser navigations to a
// preview page get a small HTML page with the same status; API reads and
// other clients get the console error envelope.
func (m *DataModule) writePreviewSurfaceError(c router.Context, err error, api bool, chrome dataPreviewChromeRoutes) error {
	if api || !previewAcceptsHTML(c) {
		return writeConsoleError(c, err)
	}
	presented, status := DefaultErrorPresenter().PresentWithContext(c, consoleHTTPError(err))
	if presented == nil {
		status = http.StatusInternalServerError
	}
	body, renderErr := renderDataPreviewFailurePage(status, chrome)
	if renderErr != nil {
		return writeConsoleError(c, err)
	}
	c.SetHeader("Content-Type", "text/html; charset=utf-8")
	c.Status(status)
	return c.Send(body)
}

func (m *DataModule) handlePreviewSurface(c router.Context, api bool, chrome dataPreviewChromeRoutes) error {
	c.SetHeader("Cache-Control", "private, no-store")
	c.SetHeader("X-Content-Type-Options", "nosniff")
	fail := func(err error) error { return m.writePreviewSurfaceError(c, err, api, chrome) }
	ctx, identity, err := m.host.request(c)
	if err != nil {
		return fail(err)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err = m.config.Service.ValidatePreviewHost(ctx, identity.ApplicationID, identity.EnvironmentID, identity.ActorID, identity.ScopeKey); err != nil {
		return fail(err)
	}
	id := c.Param("surface", "")
	surface, ok := m.config.PreviewSurfaces[id]
	if !ok || surface.Read == nil {
		return fail(data.Error(data.CodeGone))
	}
	ctx, read, err := m.config.Service.WithApplicationPreview(ctx, data.ApplicationPreviewSessionQuery{SessionID: c.Param("session", "")}, id)
	if err != nil {
		return fail(dataConsoleReadError(err))
	}
	if read.Session.Selection.TargetID != m.config.TargetID {
		return fail(data.Error(data.CodeGone))
	}
	out, err := surface.Read(ctx, read)
	if err != nil {
		return fail(dataConsoleReadError(err))
	}
	var body []byte
	contentType := "application/json"
	if surface.Render != nil && !api {
		body, err = surface.Render(ctx, read, out)
		if err == nil {
			body, err = renderDataPreviewPage(c, chrome, read, surface.Label, m.previewNames(ctx, read.Session.Selection), body, time.Now())
		}
		contentType = "text/html; charset=utf-8"
	} else {
		body, err = json.Marshal(out)
	}
	if err != nil || len(body) > data.ExploreMaxResponseBytes {
		return fail(data.Error(data.CodeProvider))
	}
	if err = m.config.Service.ValidatePreviewDelivery(ctx, read.Session, m.previewHostCheck(identity)); err != nil {
		return fail(dataConsoleReadError(err))
	}
	c.SetHeader("Content-Type", contentType)
	return c.Send(body)
}

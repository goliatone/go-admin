package quickstart

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
)

type staticCall struct {
	prefix string
	root   string
	config router.Static
}

type stubRouter struct {
	staticCalls []staticCall
}

func (s *stubRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = method, path, handler
	_ = middlewares
	return nil
}
func (s *stubRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return s
}
func (s *stubRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return s
}
func (s *stubRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(s)
	}
	_ = path
	return s
}
func (s *stubRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return s
}
func (s *stubRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	call := staticCall{prefix: prefix, root: root}
	if len(config) > 0 {
		call.config = config[0]
	}
	s.staticCalls = append(s.staticCalls, call)
	return s
}
func (s *stubRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}
func (s *stubRouter) Routes() []router.RouteDefinition { return nil }
func (s *stubRouter) ValidateRoutes() []error          { return nil }
func (s *stubRouter) PrintRoutes()                     {}
func (s *stubRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return s
}

func findStaticCall(calls []staticCall, prefix string) (staticCall, bool) {
	for _, call := range calls {
		if call.prefix == prefix {
			return call, true
		}
	}
	return staticCall{}, false
}

func TestNewStaticAssetsPrefersDiskAssets(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	diskFS := fstest.MapFS{
		"assets/app.js": {Data: []byte("disk")},
	}
	embeddedFS := fstest.MapFS{
		"assets/app.js": {Data: []byte("embedded")},
	}

	NewStaticAssets(r, cfg, embeddedFS, WithDiskAssetsFS(diskFS))

	call, ok := findStaticCall(r.staticCalls, "/admin/assets")
	if !ok {
		t.Fatalf("expected assets mount")
	}
	if call.config.FS == nil {
		t.Fatalf("expected static FS configured")
	}
	data, err := fs.ReadFile(call.config.FS, "app.js")
	if err != nil {
		t.Fatalf("read static asset: %v", err)
	}
	if string(data) != "disk" {
		t.Fatalf("expected disk asset override, got %q", string(data))
	}
}

func TestNewStaticAssetsPrefersDiskAssetsWhenDiskFSIsAlreadyAssetRoot(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	diskFS := fstest.MapFS{
		"logo.svg": {Data: []byte("disk-logo")},
	}
	embeddedFS := fstest.MapFS{
		"assets/logo.svg": {Data: []byte("embedded-logo")},
	}

	NewStaticAssets(r, cfg, embeddedFS, WithDiskAssetsFS(diskFS))

	call, ok := findStaticCall(r.staticCalls, "/admin/assets")
	if !ok {
		t.Fatalf("expected assets mount")
	}
	if call.config.FS == nil {
		t.Fatalf("expected static FS configured")
	}
	data, err := fs.ReadFile(call.config.FS, "logo.svg")
	if err != nil {
		t.Fatalf("read static asset: %v", err)
	}
	if string(data) != "disk-logo" {
		t.Fatalf("expected disk asset root override, got %q", string(data))
	}
}

func TestNewStaticAssetsTreatsExtraAssetsAsOrderedFallbacks(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	adminAssets := fstest.MapFS{
		"assets/output.css": {Data: []byte("admin")},
	}
	productAssets := fstest.MapFS{
		"dist/product/product.css": {Data: []byte("product")},
		"output.css":               {Data: []byte("must-not-shadow-admin")},
	}

	NewStaticAssets(r, cfg, adminAssets, WithExtraAssetsFS(productAssets))

	call, ok := findStaticCall(r.staticCalls, "/admin/assets")
	if !ok {
		t.Fatal("expected assets mount")
	}
	adminCSS, err := fs.ReadFile(call.config.FS, "output.css")
	if err != nil {
		t.Fatalf("read admin stylesheet: %v", err)
	}
	if got := string(adminCSS); got != "admin" {
		t.Fatalf("expected primary admin asset to win, got %q", got)
	}
	productCSS, err := fs.ReadFile(call.config.FS, "dist/product/product.css")
	if err != nil {
		t.Fatalf("read product stylesheet: %v", err)
	}
	if got := string(productCSS); got != "product" {
		t.Fatalf("expected product fallback asset, got %q", got)
	}
}

func TestNewStaticAssetsServesExtraProductStylesheetAtCustomPrefix(t *testing.T) {
	cfg := admin.Config{BasePath: "/console"}
	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	productAssets := fstest.MapFS{
		"dist/product/product.css": {Data: []byte(".product-card{display:block}")},
	}
	NewStaticAssets(
		server.Router(),
		cfg,
		client.Assets(),
		WithAssetsPrefix("/console/static"),
		WithExtraAssetsFS(productAssets),
	)
	server.Init()

	resp, err := server.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, "/console/static/dist/product/product.css", nil))
	if err != nil {
		t.Fatalf("request product stylesheet: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected product stylesheet 200, got %d", resp.StatusCode)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.Contains(contentType, "text/css") {
		t.Fatalf("expected CSS media type, got %q", contentType)
	}

	for _, target := range []string{
		"/console/static/dist/product/missing.css",
		"/console/static/%2e%2e/go.mod",
	} {
		missing, requestErr := server.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, target, nil))
		if requestErr != nil {
			t.Fatalf("request %q: %v", target, requestErr)
		}
		_ = missing.Body.Close()
		if missing.StatusCode == http.StatusOK {
			t.Fatalf("expected %q not to resolve", target)
		}
	}
}

func TestResolveAssetsFSUsesAssetsSubdirForBundleRoot(t *testing.T) {
	base := fstest.MapFS{
		"assets/app.js": {Data: []byte("bundle")},
	}

	resolved := resolveAssetsFS(base)
	data, err := fs.ReadFile(resolved, "app.js")
	if err != nil {
		t.Fatalf("read resolved asset: %v", err)
	}
	if string(data) != "bundle" {
		t.Fatalf("expected bundle asset from assets subdir, got %q", string(data))
	}
}

func TestResolveAssetsFSKeepsDirectAssetRoot(t *testing.T) {
	base := fstest.MapFS{
		"logo.svg": {Data: []byte("root-logo")},
	}

	resolved := resolveAssetsFS(base)
	data, err := fs.ReadFile(resolved, "logo.svg")
	if err != nil {
		t.Fatalf("read resolved asset: %v", err)
	}
	if string(data) != "root-logo" {
		t.Fatalf("expected direct asset root, got %q", string(data))
	}
}

func TestNewStaticAssetsMountsExpectedRoutes(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	assetsFS := fstest.MapFS{
		"app.js": {Data: []byte("assets")},
	}

	NewStaticAssets(r, cfg, assetsFS)

	expected := map[string]bool{
		"/admin/assets":             false,
		"/admin/runtime":            false,
		"/admin/formgen":            false,
		"/dashboard/assets/echarts": false,
		"/dashboard/assets/shell":   false,
		"/runtime":                  false,
	}

	for _, call := range r.staticCalls {
		if _, ok := expected[call.prefix]; ok {
			expected[call.prefix] = true
		}
	}

	for prefix, found := range expected {
		if !found {
			t.Fatalf("expected static mount for %s", prefix)
		}
	}
}

func TestLegacyDocumentAssetAliasesPreferRealFilesAndMapMissingVendorPaths(t *testing.T) {
	assets := legacyDocumentAssetAliasesFS{FS: fstest.MapFS{
		"dist/vendor/custom.css":             {Data: []byte("legacy override")},
		"dist/third-party/custom.css":        {Data: []byte("packaged custom")},
		"dist/third-party/iconoir/icons.css": {Data: []byte("packaged icons")},
	}}

	override, err := fs.ReadFile(assets, "dist/vendor/custom.css")
	if err != nil {
		t.Fatalf("read real legacy override: %v", err)
	}
	if got := string(override); got != "legacy override" {
		t.Fatalf("expected real legacy file to win, got %q", got)
	}

	aliased, err := fs.ReadFile(assets, "dist/vendor/iconoir/icons.css")
	if err != nil {
		t.Fatalf("read aliased packaged asset: %v", err)
	}
	if got := string(aliased); got != "packaged icons" {
		t.Fatalf("expected packaged alias, got %q", got)
	}
}

func TestNewStaticAssetsIncludesPackagedDocumentDependencies(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}

	NewStaticAssets(r, cfg, client.Assets())

	call, ok := findStaticCall(r.staticCalls, "/admin/assets")
	if !ok {
		t.Fatal("expected admin assets mount")
	}
	for _, advertisedPath := range []string{
		admin.DefaultIconoirCSSAssetPath,
		admin.DefaultDataTablesCSSAssetPath,
		admin.DefaultEChartsJSAssetPath,
	} {
		assetPath := strings.TrimPrefix(advertisedPath, "assets/")
		info, err := fs.Stat(call.config.FS, assetPath)
		if err != nil {
			t.Errorf("advertised dependency %q is not served by the admin asset FS: %v", advertisedPath, err)
			continue
		}
		if info.Size() == 0 {
			t.Errorf("advertised dependency %q is empty", advertisedPath)
		}
	}
}

func TestPackagedDocumentDependencyRoutesReturnSuccess(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	NewStaticAssets(server.Router(), cfg, client.Assets())
	server.Init()

	for _, advertisedPath := range []string{
		admin.DefaultIconoirCSSAssetPath,
		admin.DefaultDataTablesCSSAssetPath,
		admin.DefaultEChartsJSAssetPath,
	} {
		target := "/" + path.Join(strings.TrimPrefix(cfg.BasePath, "/"), advertisedPath)
		resp, err := server.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, target, nil))
		if err != nil {
			t.Errorf("request advertised dependency %q: %v", target, err)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected advertised dependency %q to return 200, got %d", target, resp.StatusCode)
		}
		if resp.ContentLength == 0 {
			t.Errorf("expected advertised dependency %q to have a response body", target)
		}
		_ = resp.Body.Close()
	}
}

func TestRegisterSyncClientAssetsMountsSuppliedFilesystem(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	syncFS := fstest.MapFS{
		"index.js": {Data: []byte("export const syncCore = true;")},
	}

	RegisterSyncClientAssets(r, cfg, syncFS)

	call, ok := findStaticCall(r.staticCalls, "/admin/sync-client/sync-core")
	if !ok {
		t.Fatalf("expected sync-client mount")
	}
	if call.root != "." {
		t.Fatalf("expected sync-client root '.', got %q", call.root)
	}
	if call.config.FS == nil {
		t.Fatalf("expected sync-client static FS configured")
	}
	data, err := fs.ReadFile(call.config.FS, "index.js")
	if err != nil {
		t.Fatalf("read sync-client asset: %v", err)
	}
	if string(data) != "export const syncCore = true;" {
		t.Fatalf("expected supplied sync-client asset, got %q", string(data))
	}
}

func TestResolveStaticAssetPrefixesIncludesRuntimeAliasAndSharedMounts(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}

	got := ResolveStaticAssetPrefixes(cfg)
	want := []string{
		"/admin/assets",
		"/admin/runtime",
		"/admin/formgen",
		"/admin/sync-client/sync-core",
		"/dashboard/assets/echarts",
		"/dashboard/assets/shell",
		"/runtime",
	}
	if len(got) != len(want) {
		t.Fatalf("expected static prefixes %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected static prefixes %v, got %v", want, got)
		}
	}
}

func TestResolveDashboardShellAssetsPrefixTracksStaticAssetOverrides(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}

	got := ResolveDashboardShellAssetsPrefix(cfg, WithDashboardShellPrefix("/charts/shell/"))
	if got != "/charts/shell" {
		t.Fatalf("expected dashboard shell prefix override, got %q", got)
	}
}

func TestResolveSiteFallbackReservedPrefixesTracksStaticAssetOverrides(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}

	got := ResolveSiteFallbackReservedPrefixes(
		cfg,
		WithAssetsPrefix("/public-assets"),
		WithRuntimePrefix("/ops/runtime"),
		WithFormgenPrefix("/widgets/formgen"),
		WithSyncClientPrefix("/ops/sync-client"),
		WithEChartsPrefix("/charts/echarts"),
		WithDashboardShellPrefix("/charts/shell"),
	)
	want := []string{
		"/.well-known",
		"/admin",
		"/api",
		"/api/v1",
		"/assets",
		"/charts/echarts",
		"/charts/shell",
		"/ops/runtime",
		"/ops/sync-client",
		"/public-assets",
		"/runtime",
		"/static",
		"/widgets/formgen",
	}
	if len(got) != len(want) {
		t.Fatalf("expected reserved prefixes %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected reserved prefixes %v, got %v", want, got)
		}
	}
}

func TestResolveSiteFallbackStaticInputTracksStaticAssetOverrides(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}

	got := ResolveSiteFallbackStaticInput(
		cfg,
		WithAssetsPrefix("/public-assets"),
		WithRuntimePrefix("/ops/runtime"),
		WithFormgenPrefix("/widgets/formgen"),
		WithSyncClientPrefix("/ops/sync-client"),
		WithEChartsPrefix("/charts/echarts"),
		WithDashboardShellPrefix("/charts/shell"),
	)

	if got.AssetsPrefix != "/public-assets" {
		t.Fatalf("expected assets prefix override, got %+v", got)
	}
	if got.RuntimePrefix != "/ops/runtime" {
		t.Fatalf("expected runtime prefix override, got %+v", got)
	}
	if got.FormgenPrefix != "/widgets/formgen" {
		t.Fatalf("expected formgen prefix override, got %+v", got)
	}
	if got.SyncClientPrefix != "/ops/sync-client" {
		t.Fatalf("expected sync-client prefix override, got %+v", got)
	}
	if got.EChartsPrefix != "/charts/echarts" {
		t.Fatalf("expected echarts prefix override, got %+v", got)
	}
	if got.ShellPrefix != "/charts/shell" {
		t.Fatalf("expected shell prefix override, got %+v", got)
	}
}

func TestNewStaticAssetsMountsDashboardShellAssets(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}

	NewStaticAssets(r, cfg, fstest.MapFS{"app.js": {Data: []byte("assets")}})

	call, ok := findStaticCall(r.staticCalls, "/dashboard/assets/shell")
	if !ok {
		t.Fatalf("expected dashboard shell static mount")
	}
	if call.config.FS == nil {
		t.Fatalf("expected dashboard shell static FS configured")
	}
	if _, err := fs.ReadFile(call.config.FS, "shell.css"); err != nil {
		t.Fatalf("expected shell.css from dashboard shell FS: %v", err)
	}
	if _, err := fs.ReadFile(call.config.FS, "shell.js"); err != nil {
		t.Fatalf("expected shell.js from dashboard shell FS: %v", err)
	}
}

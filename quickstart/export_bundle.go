package quickstart

import (
	"context"
	"encoding/json"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-export/adapters/exportapi"
	exportrouter "github.com/goliatone/go-export/adapters/router"
	"github.com/goliatone/go-export/export"
	exportcrud "github.com/goliatone/go-export/sources/crud"
	router "github.com/goliatone/go-router"
)

const defaultExportPathSuffix = "exports"

// ExportBundle wires go-export integrations for go-admin.
type ExportBundle struct {
	Runner    *export.Runner
	Service   export.Service
	Registry  admin.ExportRegistry
	Registrar admin.ExportHTTPRegistrar
	Metadata  admin.ExportMetadataProvider
}

// ExportBundleOption customizes NewExportBundle behavior.
type ExportBundleOption func(*exportBundleOptions)

type exportBundleOptions struct {
	basePath              string
	pathSuffix            string
	historyPath           string
	guard                 export.Guard
	actorProvider         export.ActorProvider
	store                 export.ArtifactStore
	tracker               export.ProgressTracker
	logger                export.Logger
	deliveryPolicy        export.DeliveryPolicy
	asyncRequesterFactory AsyncRequesterFactory
	requestDecoder        exportapi.RequestDecoder
	queryRequestDecoder   exportapi.RequestDecoder
	maxBufferBytes        int64
}

// WithExportBasePath overrides the default export base path.
// Provide a full path ("/admin/exports") or a suffix ("exports").
func WithExportBasePath(path string) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.basePath = strings.TrimSpace(path)
	}
}

// WithExportPathSuffix overrides the default base path suffix when no base path is set.
func WithExportPathSuffix(suffix string) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.pathSuffix = strings.TrimSpace(suffix)
	}
}

// WithExportHistoryPath overrides the history endpoint path.
func WithExportHistoryPath(path string) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.historyPath = strings.TrimSpace(path)
	}
}

// WithExportGuard sets the go-export guard.
func WithExportGuard(guard export.Guard) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.guard = guard
	}
}

// WithExportActorProvider sets the actor provider for export requests.
func WithExportActorProvider(provider export.ActorProvider) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.actorProvider = provider
	}
}

// WithExportStore sets the artifact store used by go-export.
func WithExportStore(store export.ArtifactStore) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.store = store
	}
}

// WithExportTracker sets the progress tracker used by go-export.
func WithExportTracker(tracker export.ProgressTracker) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.tracker = tracker
	}
}

// WithExportLogger sets the go-export logger.
func WithExportLogger(logger export.Logger) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.logger = logger
	}
}

// WithExportDeliveryPolicy overrides the delivery policy defaults.
func WithExportDeliveryPolicy(policy export.DeliveryPolicy) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.deliveryPolicy = policy
	}
}

// WithExportRequestDecoder overrides the JSON request decoder.
func WithExportRequestDecoder(decoder exportapi.RequestDecoder) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.requestDecoder = decoder
	}
}

// WithExportQueryRequestDecoder overrides the querystring request decoder.
func WithExportQueryRequestDecoder(decoder exportapi.RequestDecoder) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.queryRequestDecoder = decoder
	}
}

// WithExportMaxBufferBytes sets the max buffer size for sync downloads.
func WithExportMaxBufferBytes(maxBytes int64) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.maxBufferBytes = maxBytes
	}
}

// NewExportBundle constructs default go-export wiring for go-admin.
func NewExportBundle(opts ...ExportBundleOption) *ExportBundle {
	options := exportBundleOptions{
		pathSuffix: defaultExportPathSuffix,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	store := options.store
	if store == nil {
		store = export.NewMemoryStore()
	}
	tracker := options.tracker
	if tracker == nil {
		tracker = export.NewMemoryTracker()
	}

	runner := export.NewRunner()
	runner.Store = store
	runner.Tracker = tracker
	runner.Guard = options.guard
	runner.ActorProvider = options.actorProvider
	if options.logger != nil {
		runner.Logger = options.logger
	}
	if !isZeroDeliveryPolicy(options.deliveryPolicy) {
		runner.DeliveryPolicy = options.deliveryPolicy
	}

	service := export.NewService(export.ServiceConfig{
		Runner:         runner,
		Tracker:        tracker,
		Store:          store,
		Guard:          options.guard,
		DeliveryPolicy: options.deliveryPolicy,
	})

	requestDecoder := options.requestDecoder
	if requestDecoder == nil {
		requestDecoder = exportapi.JSONRequestDecoder{
			QueryDecoder: decodeDatagridQuery,
		}
	}

	asyncRequester := exportapi.AsyncRequester(nil)
	if options.asyncRequesterFactory != nil {
		asyncRequester = options.asyncRequesterFactory(service, runner.Logger)
	}

	registrar := &exportHTTPRegistrar{
		service:             service,
		runner:              runner,
		store:               store,
		guard:               options.guard,
		actorProvider:       options.actorProvider,
		deliveryPolicy:      options.deliveryPolicy,
		asyncRequester:      asyncRequester,
		requestDecoder:      requestDecoder,
		queryRequestDecoder: options.queryRequestDecoder,
		basePath:            options.basePath,
		historyPath:         options.historyPath,
		pathSuffix:          options.pathSuffix,
		maxBufferBytes:      options.maxBufferBytes,
		logger:              options.logger,
	}

	return &ExportBundle{
		Runner:    runner,
		Service:   service,
		Registry:  exportRegistryAdapter{registry: runner.Definitions},
		Registrar: registrar,
		Metadata:  exportMetadataAdapter{registry: runner.Definitions},
	}
}

type exportRegistryAdapter struct {
	registry *export.DefinitionRegistry
}

func (a exportRegistryAdapter) ListDefinitions(ctx context.Context) ([]admin.ExportDefinition, error) {
	_ = ctx
	if a.registry == nil {
		return nil, nil
	}
	defs := a.registry.List()
	out := make([]admin.ExportDefinition, 0, len(defs))
	for _, def := range defs {
		out = append(out, adaptDefinition(def))
	}
	return out, nil
}

func (a exportRegistryAdapter) GetDefinition(ctx context.Context, name string) (admin.ExportDefinition, error) {
	_ = ctx
	if a.registry == nil {
		return admin.ExportDefinition{}, export.NewError(export.KindNotFound, "export registry not configured", nil)
	}
	def, ok := a.registry.Get(name)
	if !ok {
		return admin.ExportDefinition{}, export.NewError(export.KindNotFound, "export definition not found", nil)
	}
	return adaptDefinition(def), nil
}

func adaptDefinition(def export.ExportDefinition) admin.ExportDefinition {
	variants := make([]string, 0, len(def.SourceVariants))
	for key := range def.SourceVariants {
		variants = append(variants, key)
	}
	sort.Strings(variants)

	label := strings.TrimSpace(def.Resource)
	if label == "" {
		label = def.Name
	}
	return admin.ExportDefinition{
		Name:     def.Name,
		Label:    label,
		Variants: variants,
	}
}

type exportMetadataAdapter struct {
	registry *export.DefinitionRegistry
}

func (a exportMetadataAdapter) ExportMetadata(ctx context.Context, definition, variant string) (admin.ExportMetadata, error) {
	_ = ctx
	if a.registry == nil {
		return admin.ExportMetadata{}, export.NewError(export.KindNotFound, "export registry not configured", nil)
	}
	resolved, err := a.registry.Resolve(export.ExportRequest{
		Definition:    definition,
		SourceVariant: variant,
	})
	if err != nil {
		return admin.ExportMetadata{}, err
	}

	formats := make([]string, 0, len(resolved.AllowedFormats))
	for _, format := range resolved.AllowedFormats {
		formats = append(formats, string(format))
	}

	columns := make([]admin.ExportColumn, 0, len(resolved.Schema.Columns))
	for _, col := range resolved.Schema.Columns {
		label := strings.TrimSpace(col.Label)
		if label == "" {
			label = col.Name
		}
		columns = append(columns, admin.ExportColumn{
			Key:   col.Name,
			Label: label,
		})
	}

	return admin.ExportMetadata{
		Formats: formats,
		Columns: columns,
	}, nil
}

type exportHTTPRegistrar struct {
	service             export.Service
	runner              *export.Runner
	store               export.ArtifactStore
	guard               export.Guard
	actorProvider       export.ActorProvider
	deliveryPolicy      export.DeliveryPolicy
	asyncRequester      exportapi.AsyncRequester
	requestDecoder      exportapi.RequestDecoder
	queryRequestDecoder exportapi.RequestDecoder
	basePath            string
	historyPath         string
	pathSuffix          string
	maxBufferBytes      int64
	logger              export.Logger
}

func (r *exportHTTPRegistrar) RegisterExportRoutes(router admin.AdminRouter, opts admin.ExportRouteOptions) error {
	if r == nil || router == nil {
		return nil
	}

	basePath := resolveExportPath(opts.BasePath, r.basePath, r.pathSuffix)
	historyPath := ""
	if strings.TrimSpace(r.historyPath) != "" {
		historyPath = resolveExportPath(opts.BasePath, r.historyPath, "")
	}

	handler := exportrouter.NewHandler(exportapi.Config{
		Service:             r.service,
		Runner:              r.runner,
		Store:               r.store,
		Guard:               r.guard,
		ActorProvider:       r.actorProvider,
		DeliveryPolicy:      r.deliveryPolicy,
		AsyncRequester:      r.asyncRequester,
		BasePath:            basePath,
		HistoryPath:         historyPath,
		RequestDecoder:      r.requestDecoder,
		QueryRequestDecoder: r.queryRequestDecoder,
		MaxBufferBytes:      r.maxBufferBytes,
		Logger:              r.logger,
	})

	handler.RegisterRoutes(wrapExportRouter(router, opts.Wrap))
	return nil
}

type exportRouterWrapper struct {
	router admin.AdminRouter
	wrap   admin.ExportRouteWrapper
}

func wrapExportRouter(router admin.AdminRouter, wrap admin.ExportRouteWrapper) admin.AdminRouter {
	if wrap == nil {
		return router
	}
	return exportRouterWrapper{router: router, wrap: wrap}
}

func (w exportRouterWrapper) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return w.router.Get(path, w.wrapHandler(handler), mw...)
}

func (w exportRouterWrapper) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return w.router.Post(path, w.wrapHandler(handler), mw...)
}

func (w exportRouterWrapper) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return w.router.Put(path, w.wrapHandler(handler), mw...)
}

func (w exportRouterWrapper) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return w.router.Delete(path, w.wrapHandler(handler), mw...)
}

func (w exportRouterWrapper) wrapHandler(handler router.HandlerFunc) router.HandlerFunc {
	if w.wrap == nil {
		return handler
	}
	return w.wrap(handler)
}

func resolveExportPath(basePath, override, suffix string) string {
	override = strings.TrimSpace(override)
	if override != "" {
		if strings.HasPrefix(override, "/") {
			return path.Join("/", override)
		}
		return path.Join("/", basePath, override)
	}

	suffix = strings.TrimSpace(suffix)
	if suffix == "" {
		suffix = defaultExportPathSuffix
	}
	return path.Join("/", basePath, suffix)
}

func decodeDatagridQuery(_ string, _ string, raw json.RawMessage) (any, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var query exportcrud.Query
	if err := json.Unmarshal(raw, &query); err != nil {
		return nil, export.NewError(export.KindValidation, "invalid export query", err)
	}
	return query, nil
}

func isZeroDeliveryPolicy(policy export.DeliveryPolicy) bool {
	return policy == export.DeliveryPolicy{}
}

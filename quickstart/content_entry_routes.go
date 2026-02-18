package quickstart

import (
	"fmt"
	"io/fs"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// ContentEntryUIOption customizes content entry UI routes.
type ContentEntryUIOption func(*contentEntryUIOptions)

type templateExistsFunc func(string) bool

type contentEntryUIOptions struct {
	basePath           string
	listTemplate       string
	formTemplate       string
	detailTemplate     string
	viewContext        UIViewContextBuilder
	permission         string
	authResource       string
	formRenderer       *admin.FormgenSchemaValidator
	templateExists     templateExistsFunc
	defaultRenderers   map[string]string
	translationUX      bool
	dataGridStateStore PanelDataGridStateStoreOptions
	dataGridURLState   PanelDataGridURLStateOptions
}

const textCodeTranslationFallbackEditBlocked = "TRANSLATION_FALLBACK_EDIT_BLOCKED"

var recommendedContentEntryDefaultRenderers = map[string]string{
	"blocks":               "blocks_chips",
	"block-library-picker": "blocks_chips",
}

// RecommendedContentEntryDefaultRenderers returns a copy of the recommended
// default renderer map used by WithContentEntryRecommendedDefaults.
func RecommendedContentEntryDefaultRenderers() map[string]string {
	return cloneStringMap(recommendedContentEntryDefaultRenderers)
}

// WithContentEntryUIBasePath overrides the base path used to build content entry routes.
func WithContentEntryUIBasePath(basePath string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithContentEntryUITemplates overrides template names for content entry routes.
func WithContentEntryUITemplates(listTemplate, formTemplate, detailTemplate string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(listTemplate) != "" {
			opts.listTemplate = strings.TrimSpace(listTemplate)
		}
		if strings.TrimSpace(formTemplate) != "" {
			opts.formTemplate = strings.TrimSpace(formTemplate)
		}
		if strings.TrimSpace(detailTemplate) != "" {
			opts.detailTemplate = strings.TrimSpace(detailTemplate)
		}
	}
}

// WithContentEntryUIViewContext overrides the view context builder for content entry routes.
func WithContentEntryUIViewContext(builder UIViewContextBuilder) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithContentEntryUIPermission sets the permission used for authz checks.
func WithContentEntryUIPermission(permission string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.permission = strings.TrimSpace(permission)
		}
	}
}

// WithContentEntryUIAuthResource overrides the go-auth resource used for checks.
func WithContentEntryUIAuthResource(resource string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.authResource = strings.TrimSpace(resource)
		}
	}
}

// WithContentEntryFormRenderer overrides the form renderer used for content entry forms.
func WithContentEntryFormRenderer(renderer *admin.FormgenSchemaValidator) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil && renderer != nil {
			opts.formRenderer = renderer
		}
	}
}

// WithContentEntryUITemplateExists sets a template existence checker used to resolve panel template fallbacks.
func WithContentEntryUITemplateExists(checker func(name string) bool) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil || checker == nil {
			return
		}
		opts.templateExists = checker
	}
}

// WithContentEntryUITemplateFS configures deterministic template fallback resolution from filesystem sources.
func WithContentEntryUITemplateFS(fsys ...fs.FS) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil || len(fsys) == 0 {
			return
		}
		if checker := templateExistsFromFS(fsys...); checker != nil {
			opts.templateExists = checker
		}
	}
}

// WithContentEntryDefaultRenderers replaces the configured default renderer map.
// Values are used when ui_schema does not specify a renderer.
func WithContentEntryDefaultRenderers(renderers map[string]string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.defaultRenderers = contentEntryNormalizeDefaultRenderers(renderers)
	}
}

// WithContentEntryMergeDefaultRenderers merges renderer defaults into the existing map.
// Keys in renderers override existing configured values.
func WithContentEntryMergeDefaultRenderers(renderers map[string]string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.defaultRenderers = contentEntryMergeDefaultRenderers(opts.defaultRenderers, renderers)
	}
}

// WithContentEntryRecommendedDefaults merges recommended content-entry defaults.
func WithContentEntryRecommendedDefaults() ContentEntryUIOption {
	return WithContentEntryMergeDefaultRenderers(RecommendedContentEntryDefaultRenderers())
}

// WithContentEntryTranslationUX enables translation list UX enhancements
// (grouped/matrix view mode wiring and grouped URL sync) for translation-enabled panels.
func WithContentEntryTranslationUX(enabled bool) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.translationUX = enabled
		}
	}
}

// WithContentEntryDataGridStateStore configures DataGrid persisted-state storage for content list templates.
func WithContentEntryDataGridStateStore(cfg PanelDataGridStateStoreOptions) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.dataGridStateStore = cfg
	}
}

// WithContentEntryDataGridURLState configures DataGrid URL-state limits for content list templates.
func WithContentEntryDataGridURLState(cfg PanelDataGridURLStateOptions) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.dataGridURLState = cfg
	}
}

// RegisterContentEntryUIRoutes registers HTML routes for content entries.
func RegisterContentEntryUIRoutes[T any](
	r router.Router[T],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...ContentEntryUIOption,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	options := contentEntryUIOptions{
		basePath:       strings.TrimSpace(cfg.BasePath),
		listTemplate:   "resources/content/list",
		formTemplate:   "resources/content/form",
		detailTemplate: "resources/content/detail",
		authResource:   "admin",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.basePath == "" {
		options.basePath = "/"
	}
	if options.viewContext == nil {
		options.viewContext = defaultUIViewContextBuilder(adm, cfg)
	}
	if options.formRenderer == nil {
		apiBase := ""
		if adm != nil {
			apiBase = adm.AdminAPIBasePath()
		}
		renderer, err := admin.NewFormgenSchemaValidatorWithAPIBase(cfg.BasePath, apiBase)
		if err != nil {
			return err
		}
		options.formRenderer = renderer
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	handlers := newContentEntryHandlers(adm, cfg, options.viewContext, options)
	// TODO: Make configurable, use URLKit and url manager
	base := path.Join(options.basePath, "content")
	listPath := path.Join(base, ":name")
	newPath := path.Join(base, ":name", "new")
	createPath := path.Join(base, ":name")
	detailPath := path.Join(base, ":name", ":id")
	editPath := path.Join(base, ":name", ":id", "edit")
	updatePath := path.Join(base, ":name", ":id")
	deletePath := path.Join(base, ":name", ":id", "delete")

	r.Get(listPath, wrap(handlers.List))
	r.Get(newPath, wrap(handlers.New))
	r.Post(createPath, wrap(handlers.Create))
	r.Get(detailPath, wrap(handlers.Detail))
	r.Get(editPath, wrap(handlers.Edit))
	r.Post(updatePath, wrap(handlers.Update))
	r.Post(deletePath, wrap(handlers.Delete))
	registerCanonicalContentEntryPanelRoutes(r, adm, wrap, handlers)
	return nil
}

type contentEntryHandlers struct {
	admin              *admin.Admin
	cfg                admin.Config
	viewContext        UIViewContextBuilder
	listTemplate       string
	formTemplate       string
	detailTemplate     string
	permission         string
	authResource       string
	contentTypes       admin.CMSContentTypeService
	formRenderer       *admin.FormgenSchemaValidator
	templateExists     templateExistsFunc
	defaultRenderers   map[string]string
	translationUX      bool
	dataGridStateStore PanelDataGridStateStoreOptions
	dataGridURLState   PanelDataGridURLStateOptions
}

func newContentEntryHandlers(adm *admin.Admin, cfg admin.Config, viewCtx UIViewContextBuilder, opts contentEntryUIOptions) *contentEntryHandlers {
	var contentTypes admin.CMSContentTypeService
	if adm != nil {
		contentTypes = adm.ContentTypeService()
	}
	return &contentEntryHandlers{
		admin:              adm,
		cfg:                cfg,
		viewContext:        viewCtx,
		listTemplate:       opts.listTemplate,
		formTemplate:       opts.formTemplate,
		detailTemplate:     opts.detailTemplate,
		permission:         strings.TrimSpace(opts.permission),
		authResource:       strings.TrimSpace(opts.authResource),
		contentTypes:       contentTypes,
		formRenderer:       opts.formRenderer,
		templateExists:     opts.templateExists,
		defaultRenderers:   cloneStringMap(opts.defaultRenderers),
		translationUX:      opts.translationUX,
		dataGridStateStore: opts.dataGridStateStore,
		dataGridURLState:   opts.dataGridURLState,
	}
}

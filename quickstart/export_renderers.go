package quickstart

import (
	"fmt"
	"io/fs"
	"strings"
	"time"

	exportpdf "github.com/goliatone/go-export/adapters/pdf"
	exporttemplate "github.com/goliatone/go-export/adapters/template"
	exportgotemplate "github.com/goliatone/go-export/adapters/template/go-template"
	"github.com/goliatone/go-export/export"
	gotemplate "github.com/goliatone/go-template"
)

// ExportTemplateOption customizes the default export template renderers.
type ExportTemplateOption func(*exportTemplateOptions)

type exportTemplateOptions struct {
	templateFuncs map[string]any
	templateName  string
	maxRows       int
	pdfBuilder    func(exporttemplate.Renderer) (exportpdf.Renderer, error)
	pdfConfig     ExportPDFConfig
}

// ExportPDFConfig controls default PDF renderer behavior.
type ExportPDFConfig struct {
	Engine            string        `json:"engine"`
	WKHTMLToPDFPath   string        `json:"wkhtml_to_pdf_path"`
	BrowserPath       string        `json:"browser_path"`
	Timeout           time.Duration `json:"timeout"`
	PageSize          string        `json:"page_size"`
	PrintBackground   bool          `json:"print_background"`
	PreferCSSPageSize bool          `json:"prefer_css_page_size"`
	Headless          bool          `json:"headless"`
	Args              []string      `json:"args"`
}

// DefaultExportPDFConfig returns baseline PDF settings.
func DefaultExportPDFConfig() ExportPDFConfig {
	return ExportPDFConfig{
		Engine:            "chromium",
		Timeout:           30 * time.Second,
		PrintBackground:   true,
		PreferCSSPageSize: true,
		Headless:          true,
		Args:              []string{"--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"},
	}
}

// WithExportTemplateFuncs sets the template helpers used by the export renderer.
func WithExportTemplateFuncs(funcs map[string]any) ExportTemplateOption {
	return func(opts *exportTemplateOptions) {
		if opts != nil {
			opts.templateFuncs = funcs
		}
	}
}

// WithExportTemplateName overrides the default template name ("export").
func WithExportTemplateName(name string) ExportTemplateOption {
	return func(opts *exportTemplateOptions) {
		if opts != nil {
			opts.templateName = strings.TrimSpace(name)
		}
	}
}

// WithExportTemplateMaxRows overrides the buffered template row limit.
func WithExportTemplateMaxRows(rows int) ExportTemplateOption {
	return func(opts *exportTemplateOptions) {
		if opts != nil && rows > 0 {
			opts.maxRows = rows
		}
	}
}

// WithExportPDFConfig overrides default PDF renderer settings.
func WithExportPDFConfig(cfg ExportPDFConfig) ExportTemplateOption {
	return func(opts *exportTemplateOptions) {
		if opts == nil {
			return
		}
		normalized := normalizeExportPDFConfig(cfg)
		opts.pdfConfig = normalized
	}
}

// WithExportPDFRenderer overrides the default PDF renderer builder.
func WithExportPDFRenderer(builder func(exporttemplate.Renderer) (exportpdf.Renderer, error)) ExportTemplateOption {
	return func(opts *exportTemplateOptions) {
		if opts != nil && builder != nil {
			opts.pdfBuilder = builder
		}
	}
}

// ConfigureExportRenderers registers template + PDF renderers using the provided templates FS.
func ConfigureExportRenderers(bundle *ExportBundle, templatesFS fs.FS, opts ...ExportTemplateOption) error {
	if bundle == nil || bundle.Runner == nil || bundle.Runner.Renderers == nil {
		return nil
	}
	if templatesFS == nil {
		return fmt.Errorf("export templates filesystem is required")
	}

	options := exportTemplateOptions{
		templateName: "export",
		maxRows:      5000,
		pdfConfig:    DefaultExportPDFConfig(),
	}
	options.pdfBuilder = func(renderer exporttemplate.Renderer) (exportpdf.Renderer, error) {
		return buildPDFRenderer(options.pdfConfig, renderer)
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	engine, err := exportgotemplate.NewEngine(
		gotemplate.WithFS(templatesFS),
		gotemplate.WithExtension(".html"),
		gotemplate.WithTemplateFunc(options.templateFuncs),
	)
	if err != nil {
		return err
	}

	templateRenderer := exporttemplate.Renderer{
		Enabled:      true,
		Templates:    exportgotemplate.NewExecutor(engine),
		TemplateName: options.templateName,
		Strategy:     exporttemplate.BufferedStrategy{MaxRows: options.maxRows},
	}
	if err := bundle.Runner.Renderers.Register(export.FormatTemplate, templateRenderer); err != nil {
		return err
	}

	if options.pdfBuilder != nil {
		pdfRenderer, err := options.pdfBuilder(templateRenderer)
		if err != nil {
			return err
		}
		if err := bundle.Runner.Renderers.Register(export.FormatPDF, pdfRenderer); err != nil {
			return err
		}
	}

	return nil
}

func buildPDFRenderer(cfg ExportPDFConfig, templateRenderer exporttemplate.Renderer) (exportpdf.Renderer, error) {
	cfg = normalizeExportPDFConfig(cfg)
	engineName := strings.ToLower(strings.TrimSpace(cfg.Engine))
	if engineName == "" {
		engineName = "chromium"
	}

	switch engineName {
	case "wkhtmltopdf":
		return exportpdf.Renderer{
			Enabled:      true,
			HTMLRenderer: templateRenderer,
			Engine: exportpdf.WKHTMLTOPDFEngine{
				Command: strings.TrimSpace(cfg.WKHTMLToPDFPath),
				Timeout: cfg.Timeout,
			},
		}, nil
	case "chromium", "chromedp":
	default:
		return exportpdf.Renderer{}, fmt.Errorf("unsupported export pdf engine: %s", engineName)
	}

	return exportpdf.Renderer{
		Enabled:      true,
		HTMLRenderer: templateRenderer,
		Engine: &exportpdf.ChromiumEngine{
			BrowserPath: strings.TrimSpace(cfg.BrowserPath),
			Headless:    cfg.Headless,
			Args:        append([]string{}, cfg.Args...),
			Timeout:     cfg.Timeout,
			DefaultPDF: export.PDFOptions{
				PageSize:          strings.TrimSpace(cfg.PageSize),
				PrintBackground:   &cfg.PrintBackground,
				PreferCSSPageSize: &cfg.PreferCSSPageSize,
			},
		},
	}, nil
}

func normalizeExportPDFConfig(cfg ExportPDFConfig) ExportPDFConfig {
	defaults := DefaultExportPDFConfig()
	if strings.TrimSpace(cfg.Engine) == "" {
		cfg.Engine = defaults.Engine
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = defaults.Timeout
	}
	if len(cfg.Args) == 0 {
		cfg.Args = append([]string{}, defaults.Args...)
	}
	return cfg
}

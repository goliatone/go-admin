package quickstart

import (
	"fmt"
	"io/fs"
	"os"
	"strconv"
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
		pdfBuilder:   buildPDFRenderer,
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

func buildPDFRenderer(templateRenderer exporttemplate.Renderer) (exportpdf.Renderer, error) {
	engineName := strings.ToLower(strings.TrimSpace(os.Getenv("EXPORT_PDF_ENGINE")))
	if engineName == "" {
		engineName = "chromium"
	}

	switch engineName {
	case "wkhtmltopdf":
		return exportpdf.Renderer{
			Enabled:      true,
			HTMLRenderer: templateRenderer,
			Engine: exportpdf.WKHTMLTOPDFEngine{
				Command: strings.TrimSpace(os.Getenv("WKHTMLTOPDF_PATH")),
				Timeout: envDurationSeconds("EXPORT_PDF_TIMEOUT_SECONDS", 30),
			},
		}, nil
	case "chromium", "chromedp":
	default:
		return exportpdf.Renderer{}, fmt.Errorf("unsupported export pdf engine: %s", engineName)
	}

	printBackground := exportEnvBool("EXPORT_PDF_PRINT_BACKGROUND", true)
	preferCSS := exportEnvBool("EXPORT_PDF_PREFER_CSS_PAGE_SIZE", true)
	headless := exportEnvBool("EXPORT_PDF_HEADLESS", true)
	args := envCSV("EXPORT_PDF_ARGS")
	if len(args) == 0 {
		args = []string{"--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"}
	}

	return exportpdf.Renderer{
		Enabled:      true,
		HTMLRenderer: templateRenderer,
		Engine: &exportpdf.ChromiumEngine{
			BrowserPath: strings.TrimSpace(os.Getenv("EXPORT_PDF_BROWSER_PATH")),
			Headless:    headless,
			Args:        args,
			Timeout:     envDurationSeconds("EXPORT_PDF_TIMEOUT_SECONDS", 30),
			DefaultPDF: export.PDFOptions{
				PageSize:          strings.TrimSpace(os.Getenv("EXPORT_PDF_PAGE_SIZE")),
				PrintBackground:   &printBackground,
				PreferCSSPageSize: &preferCSS,
			},
		},
	}, nil
}

func envDurationSeconds(key string, fallback int) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return time.Duration(fallback) * time.Second
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return time.Duration(fallback) * time.Second
	}
	return time.Duration(value) * time.Second
}

func exportEnvBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func envCSV(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';'
	})
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

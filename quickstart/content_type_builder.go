package quickstart

import (
	"fmt"
	"html/template"

	"github.com/goliatone/go-admin/admin"
)

// DefaultContentTypePreviewFallback returns the standard preview error HTML.
func DefaultContentTypePreviewFallback() admin.SchemaPreviewFallback {
	return func(_ admin.AdminContext, _ map[string]any, _ admin.SchemaValidationOptions, err error) (string, bool) {
		if err == nil {
			return "", false
		}
		fallback := fmt.Sprintf(
			`<div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">`+
				`<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Preview unavailable</p>`+
				`<p class="text-xs text-amber-600 dark:text-amber-400 mt-1">%s</p>`+
				`</div>`,
			template.HTMLEscapeString(err.Error()),
		)
		return fallback, true
	}
}

// NewContentTypeBuilderModule builds a content type builder module with quickstart defaults.
func NewContentTypeBuilderModule(cfg admin.Config, menuParent string, opts ...admin.ContentTypeBuilderOption) admin.Module {
	moduleOpts := []admin.ContentTypeBuilderOption{
		admin.WithContentTypeBuilderBasePath(cfg.BasePath),
		admin.WithContentTypeBuilderMenu(cfg.NavMenuCode, menuParent),
		admin.WithContentTypeBuilderEntryMenuParent(menuParent),
		admin.WithContentTypeBuilderPreviewFallback(DefaultContentTypePreviewFallback()),
	}
	moduleOpts = append(moduleOpts, opts...)
	return admin.NewContentTypeBuilderModule(moduleOpts...)
}

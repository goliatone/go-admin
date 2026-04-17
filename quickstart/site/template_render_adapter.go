package site

import (
	"strings"

	"github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
)

func renderSiteTemplate(c router.Context, templateName string, viewCtx router.ViewContext) error {
	if c == nil {
		return nil
	}
	templateName = strings.TrimSpace(templateName)
	if templateName == "" {
		return c.SendStatus(500)
	}
	return templateview.RenderTemplateView(c, templateName, siteTemplateContext(c, viewCtx))
}

func siteTemplateContext(c router.Context, viewCtx router.ViewContext) router.ViewContext {
	ctx := MergeViewContext(cloneViewContext(viewCtx), c)
	if raw, ok := ctx["site_theme"].(map[string]any); ok && raw != nil {
		ctx["site_theme"] = cloneSiteThemeContract(raw)
	}
	ctx = applySiteContentAwareViewContext(ctx)
	siteContent := anyMap(ctx["site_content"])
	sitePage := anyMap(ctx["site_page"])
	ctx["site_runtime"] = map[string]any{
		"theme_name":            strings.TrimSpace(anyString(ctx["theme_name"])),
		"theme_variant":         strings.TrimSpace(anyString(ctx["theme_variant"])),
		"base_path":             strings.TrimSpace(anyString(ctx["base_path"])),
		"asset_base_path":       strings.TrimSpace(anyString(ctx["asset_base_path"])),
		"active_path":           strings.TrimSpace(anyString(ctx["active_path"])),
		"locale":                strings.TrimSpace(anyString(ctx["locale"])),
		"default_locale":        strings.TrimSpace(anyString(ctx["default_locale"])),
		"supported_locales":     cloneStrings(anyStringSlice(ctx["supported_locales"])),
		"is_preview":            anyBool(ctx["is_preview"]),
		"preview_token_present": anyBool(ctx["preview_token_present"]),
		"preview_token_valid":   anyBool(ctx["preview_token_valid"]),
		"content_kind":          strings.TrimSpace(anyString(siteContent["kind"])),
		"page_kind":             strings.TrimSpace(anyString(sitePage["kind"])),
		"template_candidates":   cloneStrings(anyStringSlice(sitePage["template_candidates"])),
	}
	if currentLocale := strings.TrimSpace(anyString(ctx["resolved_locale"])); currentLocale != "" {
		ctx["current_locale"] = currentLocale
	} else if currentLocale := strings.TrimSpace(anyString(ctx["locale"])); currentLocale != "" {
		ctx["current_locale"] = currentLocale
	}
	return ctx
}

func anyStringSlice(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return typed
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if value := strings.TrimSpace(anyString(item)); value != "" {
				out = append(out, value)
			}
		}
		return out
	default:
		return nil
	}
}

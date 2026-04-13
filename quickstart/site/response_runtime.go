package site

import (
	"maps"
	"strings"

	router "github.com/goliatone/go-router"
)

type siteTemplateResponse struct {
	JSONStatus     int
	TemplateStatus int
	TemplateNames  []string
	JSONPayload    map[string]any
	ViewContext    router.ViewContext
	FallbackError  SiteRuntimeError
}

func siteTemplateResponsePayload(templateName string, viewCtx router.ViewContext, extra map[string]any) map[string]any {
	out := map[string]any{}
	maps.Copy(out, extra)
	out["template"] = resolveSiteResponseTemplateName(templateName, viewCtx)
	out["context"] = cloneViewContext(viewCtx)
	return out
}

func resolveSiteResponseTemplateName(templateName string, viewCtx router.ViewContext) string {
	for _, source := range []map[string]any{
		cloneAnyMap(anyMap(viewCtx["site_content"])),
		cloneAnyMap(anyMap(viewCtx["site_page"])),
		cloneAnyMap(anyMap(viewCtx)),
	} {
		if len(source) == 0 {
			continue
		}
		for _, key := range []string{"response_template", "site_response_template"} {
			if candidate := strings.TrimSpace(anyString(source[key])); candidate != "" {
				return candidate
			}
		}
	}
	return strings.TrimSpace(templateName)
}

func renderSiteTemplateResponse(c router.Context, state RequestState, cfg ResolvedSiteConfig, response siteTemplateResponse) error {
	if wantsJSONResponse(c) {
		status := response.JSONStatus
		if status <= 0 {
			status = 200
		}
		return c.JSON(status, response.JSONPayload)
	}

	if response.TemplateStatus > 0 {
		c.Status(response.TemplateStatus)
	}
	for _, templateName := range response.TemplateNames {
		if strings.TrimSpace(templateName) == "" {
			continue
		}
		if err := renderSiteTemplate(c, templateName, response.ViewContext); err == nil {
			return nil
		}
	}
	return renderSiteRuntimeError(c, state, cfg, response.FallbackError)
}

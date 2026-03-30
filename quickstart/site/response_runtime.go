package site

import (
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
	for key, value := range extra {
		out[key] = value
	}
	out["template"] = strings.TrimSpace(templateName)
	out["context"] = cloneViewContext(viewCtx)
	return out
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

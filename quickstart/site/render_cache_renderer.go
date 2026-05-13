package site

import (
	"context"

	router "github.com/goliatone/go-router"
)

// RenderCacheTemplateRenderer captures a site template render without writing
// through router.Context.Render.
type RenderCacheTemplateRenderer interface {
	RenderSiteTemplate(ctx context.Context, templateName string, viewCtx router.ViewContext) (RenderedTemplate, error)
}

// RenderedTemplate is the controlled output from RenderCacheTemplateRenderer.
type RenderedTemplate struct {
	ContentType string              `json:"content_type"`
	Headers     map[string][]string `json:"headers"`
	Body        []byte              `json:"body"`
}

package quickstart

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// DefaultAdminUIViewContextBuilder returns the default admin UI view-context builder.
func DefaultAdminUIViewContextBuilder(adm *admin.Admin, cfg admin.Config) UIViewContextBuilder {
	return defaultUIViewContextBuilder(adm, cfg)
}

func adminPageChromeFromViewContext(ctx router.ViewContext, fallbackTitle, active string) admin.AdminPageChrome {
	chrome := admin.AdminPageChrome{
		Header: admin.AdminPageHeader{
			Title:    pageChromeString(ctx, "page_title", fallbackTitle),
			Pretitle: pageChromeString(ctx, "page_pretitle", ""),
			Subtitle: pageChromeString(ctx, "page_subtitle", ""),
		},
		Active:      pageChromeString(ctx, "active", active),
		BodyClasses: pageChromeString(ctx, "body_classes", ""),
	}
	if value, ok := ctx["hide_page_header"].(bool); ok {
		chrome.Header.HideHeader = value
	}
	if value, ok := ctx["hide_breadcrumbs"].(bool); ok {
		chrome.Header.HideBreadcrumbs = value
	}
	if items, ok := ctx[ViewKeyBreadcrumbs].([]BreadcrumbItem); ok {
		chrome.Header.Breadcrumbs = make([]admin.AdminPageHeaderBreadcrumb, 0, len(items))
		for _, item := range items {
			chrome.Header.Breadcrumbs = append(chrome.Header.Breadcrumbs, admin.AdminPageHeaderBreadcrumb{
				Label: item.Label, Href: item.Href, Current: item.Current,
			})
		}
	}
	return chrome
}

func pageChromeString(ctx router.ViewContext, key, fallback string) string {
	if ctx == nil {
		return strings.TrimSpace(fallback)
	}
	value, ok := ctx[key]
	if !ok {
		return strings.TrimSpace(fallback)
	}
	var normalized string
	switch typed := value.(type) {
	case string:
		normalized = strings.TrimSpace(typed)
	case fmt.Stringer:
		normalized = strings.TrimSpace(typed.String())
	}
	if normalized != "" {
		return normalized
	}
	return strings.TrimSpace(fallback)
}

// WithAdminUIViewContext applies the default admin UI view-context builder.
func WithAdminUIViewContext(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, c router.Context) router.ViewContext {
	builder := defaultUIViewContextBuilder(adm, cfg)
	if builder == nil {
		return ctx
	}
	return builder(ctx, active, c)
}

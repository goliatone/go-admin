package site_test

import (
	"net/http"

	"github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
)

// ExampleRenderSiteErrorHTML demonstrates a host-owned JSON schema with the
// shared quickstart HTML renderer used only for browser responses.
func ExampleRenderSiteErrorHTML() {
	renderHostError := func(c router.Context, cfg site.ResolvedSiteConfig, wantsJSON bool) error {
		siteErr := site.SiteRuntimeError{Code: "not_found", Status: http.StatusNotFound}
		if wantsJSON {
			return c.JSON(http.StatusNotFound, map[string]any{
				"code": siteErr.Code,
			})
		}
		_, err := site.RenderSiteErrorHTML(c, cfg, site.SiteErrorRenderRequest{
			Error: siteErr,
		})
		return err
	}

	_ = renderHostError
}

package admin

import (
	"encoding/json"
	"strings"

	"github.com/goliatone/go-admin/console"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
)

// ConsolePageTemplate is the packaged neutral console page shell. Hosts may
// pass a template that extends it to change wording or chrome.
const ConsolePageTemplate = "resources/console/base"

// ConsolePageRenderer returns a ConsoleHostConfig.RenderPage adapter that
// renders the console shell inside the admin layout. The bootstrap is
// serialized once with encoding/json, whose default HTML escaping keeps it
// safe inside the page's JSON script element.
func ConsolePageRenderer(adm *Admin, template string, chrome AdminPageChrome) func(router.Context, console.Bootstrap) error {
	template = strings.TrimSpace(template)
	if template == "" {
		template = ConsolePageTemplate
	}
	return func(c router.Context, bootstrap console.Bootstrap) error {
		encoded, err := json.Marshal(bootstrap)
		if err != nil {
			return err
		}
		pageChrome := chrome.Clone()
		if strings.TrimSpace(pageChrome.Header.Title) == "" {
			pageChrome.Header.Title = bootstrap.Title
		}
		if strings.TrimSpace(pageChrome.Active) == "" {
			pageChrome.Active = bootstrap.ConsoleID
		}
		view := router.ViewContext{
			"title":                  bootstrap.Title,
			"console_id":             bootstrap.ConsoleID,
			"console_title":          bootstrap.Title,
			"console_bootstrap_json": string(encoded),
		}
		view = buildAdminLayoutViewContextWithChrome(adm, c, view, pageChrome)
		return templateview.RenderTemplateView(c, template, view)
	}
}

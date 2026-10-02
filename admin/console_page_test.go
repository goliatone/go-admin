package admin

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/console"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestConsolePageRendererSerializesBootstrapForTheConsoleShell(t *testing.T) {
	c := router.NewMockContext()
	c.On("Context").Return(context.Background()).Maybe()
	c.On("Locals", mock.Anything).Return(nil).Maybe()
	c.On("Path").Return("/admin/data").Maybe()
	c.On("Query", mock.Anything, mock.Anything).Return("").Maybe()
	c.On("Query", mock.Anything).Return("").Maybe()
	var template string
	var view router.ViewContext
	c.On("Render", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		template = args.String(0)
		var ok bool
		view, ok = args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("unexpected render context: %T", args.Get(1))
		}
	}).Return(nil)

	identity := console.Identity{ConsoleID: "data", ApplicationID: "crm", EnvironmentID: "staging", ActorID: "operator-1", ScopeKey: "org"}
	bootstrap := console.Bootstrap{
		Identity: identity,
		Title:    "Data </script><script>alert(1)</script>",
		URLs:     console.Routes{Snapshot: "/admin/data/api/snapshot", Live: "/admin/data/ws"},
		Snapshot: console.Snapshot{Identity: identity, Watermark: 3, Panels: []console.PanelSnapshot{}},
	}
	if err := ConsolePageRenderer(nil, "", AdminPageChrome{})(c, bootstrap); err != nil {
		t.Fatalf("render console page: %v", err)
	}
	if template != ConsolePageTemplate {
		t.Fatalf("template = %q", template)
	}
	encoded, ok := view["console_bootstrap_json"].(string)
	if !ok {
		t.Fatalf("unexpected bootstrap JSON: %T", view["console_bootstrap_json"])
	}
	if strings.Contains(encoded, "</script>") || !strings.Contains(encoded, "\\u003c/script\\u003e") {
		t.Fatalf("bootstrap JSON is not HTML-safe for a script element: %s", encoded)
	}
	var decoded console.Bootstrap
	if err := json.Unmarshal([]byte(encoded), &decoded); err != nil || decoded.Identity != identity || decoded.URLs.Live != "/admin/data/ws" {
		t.Fatalf("bootstrap JSON does not round-trip: %+v (%v)", decoded, err)
	}
	if view["console_id"] != "data" || view["console_title"] != bootstrap.Title {
		t.Fatalf("console view context = %+v", view)
	}
}

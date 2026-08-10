package client

import (
	"strings"
	"testing"
	"testing/fstest"

	pongo2 "github.com/flosch/pongo2/v6"
)

func TestPongoShellOwnedBlocksAndDynamicLeafIncludesCompose(t *testing.T) {
	templates := fstest.MapFS{
		"layout.html": {Data: []byte(`
<main>
  <header>
    {% block page_breadcrumbs %}{% include admin_partials.breadcrumbs %}{% endblock %}
    <h1>{% block page_title %}Default{% endblock %}</h1>
    <div>{% block page_header_actions %}{% block header_actions %}Default action{% endblock %}{% endblock %}</div>
  </header>
  {% block page_below_header %}{% endblock %}
  {% block shell_content %}{% block content %}{% endblock %}{% endblock %}
</main>`)},
		"base.html": {Data: []byte(`{% extends "layout.html" %}
{% block page_title %}Base title{% endblock %}
{% block header_actions %}Base action{% endblock %}
{% block content %}Base content{% endblock %}`)},
		"page.html": {Data: []byte(`{% extends "base.html" %}
{% block page_title %}Child title{% endblock %}
{% block header_actions %}<button id="child-action">Child action</button>{% endblock %}
{% block page_below_header %}<div id="child-status">Saved</div>{% endblock %}`)},
		"partials/default.html": {Data: []byte(`<nav>Default crumbs</nav>`)},
		"partials/host.html":    {Data: []byte(`<nav data-host-breadcrumbs>Host crumbs</nav>`)},
	}
	set := pongo2.NewSet("admin-shell-contract", templateFSLoader{fsys: templates})
	tpl, err := set.FromFile("page.html")
	if err != nil {
		t.Fatalf("parse multi-level shell fixture: %v", err)
	}
	out, err := tpl.Execute(pongo2.Context{
		"admin_partials": map[string]any{"breadcrumbs": "partials/host.html"},
	})
	if err != nil {
		t.Fatalf("render multi-level shell fixture: %v", err)
	}
	for _, fragment := range []string{"Child title", `id="child-action"`, `id="child-status"`, "data-host-breadcrumbs", "Base content"} {
		if !strings.Contains(out, fragment) {
			t.Fatalf("rendered shell omitted %q: %s", fragment, out)
		}
	}
}

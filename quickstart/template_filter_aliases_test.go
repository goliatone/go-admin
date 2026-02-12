package quickstart

import (
	"testing"

	"github.com/flosch/pongo2/v6"
)

func TestRegisterTemplateFilterAliasesToJSON(t *testing.T) {
	registerTemplateFilterAliases()
	if !pongo2.FilterExists("tojson") {
		t.Fatalf("expected tojson filter alias to be registered")
	}

	payload := struct {
		Enabled bool `json:"enabled"`
	}{Enabled: true}

	encoded, err := pongo2.ApplyFilter("tojson", pongo2.AsValue(payload), nil)
	if err != nil {
		t.Fatalf("apply tojson filter: %v", err)
	}
	if got := encoded.String(); got != `{"enabled":true}` {
		t.Fatalf("unexpected tojson output: %s", got)
	}
}


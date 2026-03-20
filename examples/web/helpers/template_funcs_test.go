package helpers

import (
	"testing"

	"github.com/goliatone/go-admin/quickstart"
)

func TestTemplateFuncOptionsExposeAdminURL(t *testing.T) {
	funcs := quickstart.DefaultTemplateFuncs(
		append(TemplateFuncOptions(), quickstart.WithTemplateBasePath("/admin"))...,
	)
	adminURL, ok := funcs["adminURL"].(func(string) string)
	if !ok {
		t.Fatal("expected adminURL helper to be present in example template funcs")
	}

	if got := adminURL("assets/dist/dashboard/index.js"); got != "/admin/assets/dist/dashboard/index.js" {
		t.Fatalf("expected adminURL helper to prefix admin base path, got %q", got)
	}
}

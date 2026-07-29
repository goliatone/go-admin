package data

import "testing"

func TestTemplatesFSContainsAdminShellOverlays(t *testing.T) {
	for _, path := range []string{
		"templates/login-demo.html",
		"templates/partials/demo-credentials.html",
	} {
		if _, err := TemplatesFS.Open(path); err != nil {
			t.Fatalf("open embedded template %q: %v", path, err)
		}
	}
}

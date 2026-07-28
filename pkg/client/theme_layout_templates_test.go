package client

import (
	"strings"
	"testing"
)

func TestAdminAndAuthLayoutsRenderSafeThemeProjectionAndFavicon(t *testing.T) {
	for _, name := range []string{"layout.html", "login-layout.html"} {
		template := mustReadClientTemplate(t, name)
		for _, fragment := range []string{
			`<link rel="icon" href="{{ theme.assets.favicon }}">`,
			`:root { {{ theme.styles.root|safe }} }`,
		} {
			if !strings.Contains(template, fragment) {
				t.Fatalf("%s missing theme contract fragment %q", name, fragment)
			}
		}
		if strings.Contains(template, `{{ theme.tokens.primary }}`) {
			t.Fatalf("%s directly emits unvalidated token values", name)
		}
	}
}

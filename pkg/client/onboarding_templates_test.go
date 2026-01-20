package client

import (
	"io/fs"
	"strings"
	"testing"
)

func TestPasswordResetTemplateFeedbackMessages(t *testing.T) {
	t.Helper()

	content := readTemplate(t, "password_reset.html")
	requireTemplateContains(t, "password_reset.html", content, "password_policy_hints")
	requireTemplateContains(t, "password_reset.html", content, "RESET_RATE_LIMIT")
	requireTemplateContains(t, "password_reset.html", content, "TOKEN_EXPIRED")
	requireTemplateContains(t, "password_reset.html", content, "token_type=password_reset")
	requireTemplateContains(t, "password_reset.html", content, "token_metadata_path")
}

func TestRegisterTemplateFeedbackMessages(t *testing.T) {
	t.Helper()

	content := readTemplate(t, "register.html")
	requireTemplateContains(t, "register.html", content, "password_policy_hints")
	requireTemplateContains(t, "register.html", content, "TOKEN_EXPIRED")
	requireTemplateContains(t, "register.html", content, "token_type=register")
	requireTemplateContains(t, "register.html", content, "Registration link expires")
	requireTemplateContains(t, "register.html", content, "token_metadata_path")
}

func readTemplate(t *testing.T, name string) string {
	t.Helper()

	data, err := fs.ReadFile(Templates(), name)
	if err != nil {
		t.Fatalf("read template %s: %v", name, err)
	}
	return string(data)
}

func requireTemplateContains(t *testing.T, name, content, fragment string) {
	t.Helper()

	if !strings.Contains(content, fragment) {
		t.Fatalf("expected template %s to contain %q", name, fragment)
	}
}

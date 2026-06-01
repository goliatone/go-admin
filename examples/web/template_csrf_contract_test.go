package main

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/client"
)

func TestProfileTemplateIncludesCSRFField(t *testing.T) {
	raw, err := fs.ReadFile(client.Templates(), "resources/profile/show.html")
	if err != nil {
		t.Fatalf("read profile template: %v", err)
	}
	template := string(raw)
	if !strings.Contains(template, `{{ csrf_field|safe }}`) {
		t.Fatal("expected profile template to render the shared csrf field helper")
	}
}

func TestMediaFormTemplateIncludesCSRFField(t *testing.T) {
	raw, err := fs.ReadFile(client.Templates(), "resources/media/form.html")
	if err != nil {
		t.Fatalf("read media form template: %v", err)
	}
	template := string(raw)
	if !strings.Contains(template, `{{ csrf_field|safe }}`) {
		t.Fatal("expected media form template to render the shared csrf field helper")
	}
}

func TestSidebarLogoutUsesPOSTWithCSRFField(t *testing.T) {
	raw, err := fs.ReadFile(client.Templates(), "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read sidebar template: %v", err)
	}
	template := string(raw)
	for _, required := range []string{
		`<form method="post" action="{{ adminURL("logout") }}">`,
		`{{ csrf_field|safe }}`,
		`<button type="submit"`,
	} {
		if !strings.Contains(template, required) {
			t.Fatalf("expected sidebar logout template to include %q", required)
		}
	}
	if strings.Contains(template, `<a href="{{ adminURL("logout") }}"`) {
		t.Fatal("expected sidebar logout to avoid GET logout link")
	}
}

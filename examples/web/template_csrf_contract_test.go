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

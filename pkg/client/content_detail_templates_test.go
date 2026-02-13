package client

import (
	"io/fs"
	"strings"
	"testing"
)

func TestSharedDetailTemplateDefinesContentHooks(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/shared/detail-base.html")

	required := []string{
		"{% block detail_content %}",
		"{% block detail_content_pre %}",
		"{% block detail_content_post %}",
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected shared detail template fragment not found: %q", fragment)
	}
}

func TestContentDetailTemplateUsesPreHookWithoutBlockSuper(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/detail.html")

	if !strings.Contains(template, "{% block detail_content_pre %}") {
		t.Fatalf("expected content detail template to extend detail_content_pre hook")
	}
	if strings.Contains(template, "{% block detail_content %}") {
		t.Fatalf("content detail template must not override detail_content directly")
	}
	if strings.Contains(template, "{{ block.super }}") {
		t.Fatalf("content detail template must not depend on block.super")
	}
	if !strings.Contains(template, `partials/translation-summary.html`) {
		t.Fatalf("expected content detail template to render translation summary include")
	}
}

func TestContentFormTemplateInfersFallbackModeFromMissingRequestedLocale(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/form.html")

	required := []string{
		"{% set fallback_missing_requested_locale = resource_item.missing_requested_locale %}",
		"{% if fallback_missing_requested_locale %}",
		`data-fallback-mode="true"`,
		`partials/translation-summary.html`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected content form template fragment not found: %q", fragment)
	}
}

func mustReadClientTemplate(t *testing.T, name string) string {
	t.Helper()

	data, err := fs.ReadFile(Templates(), name)
	if err != nil {
		t.Fatalf("read embedded template %s: %v", name, err)
	}
	return string(data)
}

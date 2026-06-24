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
		`data-panel-detail-actions`,
		`initPanelDetailActions`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected shared detail template fragment not found: %q", fragment)
	}
	if strings.Contains(template, "resource_item.actions.edit") {
		t.Fatalf("shared detail template must not hard-code resource_item.actions.edit")
	}
	if strings.Contains(template, "confirmDelete(") {
		t.Fatalf("shared detail template must not use legacy confirmDelete helper")
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
	for _, fragment := range []string{
		`translation_family_url=resource_item.translation_family_url`,
		`translation_locale_urls=resource_item.translation_locale_urls`,
	} {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected content detail template fragment not found: %q", fragment)
	}
}

func TestContentFormTemplateInfersFallbackModeFromMissingRequestedLocale(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/form.html")

	required := []string{
		"{% set fallback_missing_requested_locale = resource_item.missing_requested_locale %}",
		"{% if fallback_missing_requested_locale %}",
		`data-fallback-mode="true"`,
		`partials/translation-summary.html`,
		`translation_family_url=resource_item.translation_family_url`,
		`translation_locale_urls=resource_item.translation_locale_urls`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected content form template fragment not found: %q", fragment)
	}
}

func TestContentFormTemplateBootstrapsRelationshipActions(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/form.html")

	required := []string{
		`assets/dist/runtime/cms-relationship-actions.js`,
		`const relationshipActions = window.GoAdminRelationshipActions;`,
		`relationshipActions.initFormgenRelationships(api, {`,
		`relationshipActions.buildInitConfig({`,
		`api.initRelationships();`,
		`panel: {% if panel_name %}{{ toJSON(panel_name)|safe }}{% else %}""{% endif %}`,
		`recordId: {% if is_edit and resource_item %}{{ toJSON(resource_item.id)|safe }}{% else %}""{% endif %}`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected content form relationship action fragment not found: %q", fragment)
	}

	normalizationIndex := strings.Index(template, `document.querySelectorAll("[data-endpoint-url]")`)
	configIndex := strings.Index(template, `relationshipActions.initFormgenRelationships`)
	if normalizationIndex < 0 || configIndex < 0 || normalizationIndex > configIndex {
		t.Fatalf("expected endpoint normalization to run before relationship action config")
	}
}

func TestTranslationFamilyDetailTemplateBootstrapsClientRenderer(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/translations/family-detail.html")

	required := []string{
		`id="translation-family-detail-root"`,
		`data-endpoint="{{ translation_family_api_path|default:"" }}"`,
		`data-content-base-path="{{ translation_content_base|default:"" }}"`,
		`data-formgen-auto-init="true"`,
		`runtime/formgen-relationships.min.js`,
		`data-endpoint-renderer="{{ translation_family_detail_ssr.Assignee.endpoint_renderer|default:"typeahead" }}"`,
		`const enhancedAction = {{ toJSON(translation_family_detail_ssr.Enhancement.enhanced_action)|safe }};`,
		`initTranslationFamilyDetailPage`,
		`enhancedAction: enhancedAction || undefined`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected translation family detail template fragment not found: %q", fragment)
	}
}

func TestTranslationFamiliesTemplateBootstrapsClientRenderer(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/translations/families.html")

	required := []string{
		`id="translation-families-root"`,
		`data-endpoint="{{ translation_families_api_path|default:"" }}"`,
		`data-base-path="{{ base_path|default:"/admin" }}"`,
		`data-family-base-path="{{ translation_family_base_path|default:"" }}"`,
		`data-matrix-path="{{ translation_matrix_path|default:"" }}"`,
		`data-queue-path="{{ translation_queue_path|default:"" }}"`,
		`data-title="Translation Families"`,
		`data-surface="translation-families"`,
		`data-action-menu`,
		`data-action-menu-trigger`,
		`data-action-menu-content`,
		`Translation family views`,
		`dist/shared/action-menu.js`,
		`initActionMenus(familyListMenuRoot`,
		`translationFamilyListActionMenusStandalone`,
		`initTranslationFamilyListPage`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected translation families template fragment not found: %q", fragment)
	}
}

func TestTranslationFamiliesTemplateLetsStatusBadgeMapReadinessLabel(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/translations/families.html")

	required := `{% include "partials/status-badge.html" with badge_status=family.readiness_state %}`
	if !strings.Contains(template, required) {
		t.Fatalf("expected families template to let status badge map readiness tone and label")
	}
	if strings.Contains(template, `badge_label=family.readiness_state`) {
		t.Fatalf("families template must not pass raw readiness_state as a badge label")
	}
	if strings.Contains(template, `{% set readiness_tone`) {
		t.Fatalf("families template must not carry a local readiness tone switch; the status badge partial resolves tones")
	}
}

func TestTranslationDashboardTemplateUsesSharedStatusBadgeForRows(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/translations/dashboard.html")

	required := []string{
		`partials/status-badge.html`,
		`badge_status=row.status|default:row.queue_state|default:"unknown"`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected dashboard template fragment not found: %q", fragment)
	}
	if strings.Contains(template, `dashboard_status_tone`) {
		t.Fatalf("dashboard template must not carry a local status tone switch; the status badge partial resolves tones")
	}
	if strings.Contains(template, `<span class="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{{ row.display_status`) {
		t.Fatalf("dashboard rows must use the shared status badge partial")
	}
}

func TestStatusBadgeTemplateFallsBackToMappedLabel(t *testing.T) {
	template := mustReadClientTemplate(t, "partials/status-badge.html")

	for _, fragment := range []string{
		`{% set label = badge.label|default:badge_label|default:status_label %}`,
		`{{ label|default:status|capfirst }}`,
		`{% set tone = badge.tone|default:badge_tone|default:registry_tone|default:"neutral" %}`,
	} {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected status badge template fragment not found: %q", fragment)
	}
	if strings.Contains(template, `{% set label = badge.label|default:badge_label|default:status %}`) {
		t.Fatalf("status badge label must not default to raw status before mapped labels")
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

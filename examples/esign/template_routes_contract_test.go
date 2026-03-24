package main

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/client"
)

func TestESignAgreementFormTemplateUsesModuleBootstrapOnly(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-agreements/form.html")

	if !strings.Contains(template, `resources/shared/esign-form-base.html`) {
		t.Fatal("expected agreement form template to extend the shared e-sign form shell")
	}
	if strings.Contains(template, `{% extends "layout.html" %}`) {
		t.Fatal("expected agreement form template to avoid extending layout.html directly")
	}
	if !strings.Contains(template, `partials/admin-page-heading.html`) {
		t.Fatal("expected agreement form template to use the shared admin page heading partial")
	}
	if !strings.Contains(template, `partials/esign-visual-primitives.html`) {
		t.Fatal("expected agreement form template to include shared e-sign visual primitives")
	}
	if !strings.Contains(template, `<script id="esign-page-config" type="application/json">`) {
		t.Fatal("expected form template to expose esign-page-config bootstrap payload")
	}
	if !strings.Contains(template, `<script type="module" src="{{ esign_module_path }}"></script>`) {
		t.Fatal("expected form template to load the e-sign module script")
	}
	if !strings.Contains(template, `<script type="module" src="{{ adminURL("assets/dist/esign/agreement-form.js") }}"></script>`) {
		t.Fatal("expected form template to include fallback agreement-form module script path")
	}
	if strings.Contains(template, "document.addEventListener('DOMContentLoaded'") {
		t.Fatal("expected form template to avoid legacy inline wizard bootstrap")
	}
	if strings.Contains(template, "draftEndpointWithUserID") {
		t.Fatal("expected form template to keep draft/sync implementation in TypeScript runtime only")
	}
	if !strings.Contains(template, `{{ esign_page_config_json|default:"{}"|safe }}`) {
		t.Fatal("expected form template to expose the server-authored e-sign page config payload")
	}
	if strings.Contains(template, `"storage_scope": "{{ agreement_form_storage_scope|default:"" }}"`) {
		t.Fatal("expected form template to avoid manually assembling storage scope JSON")
	}
	if strings.Contains(template, `id="active-tab-take-control-btn"`) || strings.Contains(template, `id="active-tab-reload-btn"`) {
		t.Fatal("expected form template to remove dead take-control ownership controls")
	}
}

func TestESignAgreementDetailTemplateUsesCanonicalPanelActionAndArtifactRoutes(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-agreements/detail.html")

	if !strings.Contains(template, `partials/esign-visual-primitives.html`) {
		t.Fatal("expected agreement detail template to include shared e-sign visual primitives")
	}
	if strings.Contains(template, `<style>`) {
		t.Fatal("expected agreement detail template to avoid inline style blocks for shared visual rules")
	}
	if !strings.Contains(template, "${apiBase}/panels/${panelName}/${agreementId}/artifact/${assetType}") {
		t.Fatal("expected detail template to use canonical panel artifact endpoint")
	}
	if !strings.Contains(template, "${apiBase}/panels/${panelName}/actions/${action}") {
		t.Fatal("expected detail template to use canonical panel action endpoint")
	}
	if strings.Contains(template, "${apiBase}/${panelName}/actions/${action}") {
		t.Fatal("expected detail template to avoid non-canonical action endpoint")
	}
	if !strings.Contains(template, `resource_item.review.status != "none" and resource_item.review.status != "in_review"`) {
		t.Fatal(`expected review CTA label to treat status "none" as a new request, not a reopen`)
	}
	if !strings.Contains(template, `{{ toJSON(resource_item.review)|safe }}`) {
		t.Fatal("expected agreement review bootstrap payload to serialize the full review object with toJSON")
	}
	if strings.Contains(template, `"participant_type": "{{ participant.participant_type|default:"recipient"|escapejs }}"`) {
		t.Fatal("expected agreement review bootstrap payload to avoid manual participant JSON field assembly")
	}
}

func TestESignDocumentDetailTemplateUsesCanonicalPanelSourceRoute(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-documents/detail.html")

	if !strings.Contains(template, `data-pdf-url="{{ api_base_path }}/panels/{{ panel_name|default:"esign_documents" }}/{{ resource_item.id }}/source/pdf"`) {
		t.Fatal("expected document detail template to use canonical panel source endpoint for preview")
	}
	if !strings.Contains(template, `href="{{ api_base_path }}/panels/{{ panel_name|default:"esign_documents" }}/{{ resource_item.id }}/source/pdf?disposition=attachment"`) {
		t.Fatal("expected document detail template to use canonical panel source endpoint for download")
	}
	if strings.Contains(template, `data-pdf-url="{{ api_base_path }}/{{ panel_name|default:"esign_documents" }}/{{ resource_item.id }}/source/pdf"`) {
		t.Fatal("expected document detail template to avoid non-canonical source endpoint")
	}
}

func TestESignDocumentFormTemplateUsesSharedShell(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-documents/form.html")

	if !strings.Contains(template, `resources/shared/esign-form-base.html`) {
		t.Fatal("expected document form template to extend the shared e-sign form shell")
	}
	if strings.Contains(template, `{% extends "layout.html" %}`) {
		t.Fatal("expected document form template to avoid extending layout.html directly")
	}
	if !strings.Contains(template, `partials/admin-page-heading.html`) {
		t.Fatal("expected document form template to use the shared admin page heading partial")
	}
}

func TestESignSourceTemplatesUseSharedDetailShell(t *testing.T) {
	cases := []struct {
		name             string
		templatePath     string
		expectedSnippet  string
		forbiddenSnippet string
	}{
		{
			name:             "source detail",
			templatePath:     "resources/esign-sources/detail.html",
			expectedSnippet:  `partials/esign-source-breadcrumbs.html`,
			forbiddenSnippet: `container mx-auto px-4 py-6`,
		},
		{
			name:             "source revisions",
			templatePath:     "resources/esign-sources/revisions.html",
			expectedSnippet:  `partials/esign-source-breadcrumbs.html`,
			forbiddenSnippet: `container mx-auto px-4 py-6`,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			template := mustReadESignTemplate(t, tc.templatePath)

			if !strings.Contains(template, `resources/shared/esign-detail-base.html`) {
				t.Fatal("expected source template to extend the shared e-sign detail shell")
			}
			if strings.Contains(template, `{% extends "layout.html" %}`) {
				t.Fatal("expected source template to avoid extending layout.html directly")
			}
			if !strings.Contains(template, tc.expectedSnippet) {
				t.Fatalf("expected source template to contain %q", tc.expectedSnippet)
			}
			if !strings.Contains(template, `{% block detail_scripts %}`) {
				t.Fatal("expected source template scripts to render through the shared detail_scripts block")
			}
			if strings.Contains(template, tc.forbiddenSnippet) {
				t.Fatalf("expected source template to avoid legacy shell class %q", tc.forbiddenSnippet)
			}
		})
	}
}

func TestESignGoogleIntegrationTemplateUsesServerAuthoredConfigPayload(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-integrations/google.html")

	if !strings.Contains(template, `data-esign-page="{{ esign_page|default:"admin.integrations.google" }}"`) {
		t.Fatal("expected google integration template to expose a page marker for module bootstrap")
	}
	if !strings.Contains(template, `{{ esign_page_config_json|default:"{}"|safe }}`) {
		t.Fatal("expected google integration template to emit the server-authored page config payload")
	}
	if strings.Contains(template, `esign_module_path|default:base_path + "/assets/dist/esign/index.js"`) {
		t.Fatal("expected google integration template to avoid pongo2 default-plus concatenation for the module path")
	}
	if strings.Contains(template, `bootstrapGoogleIntegration`) {
		t.Fatal("expected google integration template to avoid inline bootstrap logic")
	}
}

func TestESignSourceManagementRuntimeTemplateUsesServerAuthoredBootstrapPayloads(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-source-management/runtime.html")

	if !strings.Contains(template, `data-esign-page="{{ esign_page|default:'admin.sources.browser' }}"`) {
		t.Fatal("expected source-management runtime template to expose the page marker")
	}
	if !strings.Contains(template, `{{ esign_page_config_json|default:"{}"|safe }}`) {
		t.Fatal("expected source-management runtime template to emit the page config payload")
	}
	if !strings.Contains(template, `{{ source_management_page_model_json|default:"{}"|safe }}`) {
		t.Fatal("expected source-management runtime template to emit the page model payload")
	}
	if !strings.Contains(template, `data-source-management-runtime-root`) {
		t.Fatal("expected source-management runtime template to expose the live workspace root")
	}
	if !strings.Contains(template, `<script type="module" src="{{ esign_module_path }}"></script>`) {
		t.Fatal("expected source-management runtime template to load the resolved e-sign module path")
	}
	if strings.Count(template, `<script type="module" src="`) != 1 {
		t.Fatal("expected source-management runtime template to load the e-sign module exactly once")
	}
	if strings.Contains(template, "max-w-7xl mx-auto") {
		t.Fatal("expected source-management runtime template to use the shared full-width admin shell instead of a custom max-width wrapper")
	}
	if !strings.Contains(template, `partials/admin-action-toolbar.html`) {
		t.Fatal("expected source-management runtime template to use the shared admin action toolbar partial")
	}
	if !strings.Contains(template, `partials/admin-page-heading.html`) {
		t.Fatal("expected source-management runtime template to use the shared admin page heading partial")
	}
	if !strings.Contains(template, `source_management_primary_nav_links`) || !strings.Contains(template, `source_management_overflow_nav_links`) {
		t.Fatal("expected source-management runtime template to render grouped header actions for visible buttons and overflow menu")
	}
	if strings.Contains(template, `source_management_page_section`) || strings.Contains(template, `source_management_page_summary`) {
		t.Fatal("expected source-management runtime template to avoid bespoke header pretitle/summary layers")
	}

	toolbarPartial := mustReadESignTemplate(t, "partials/admin-action-toolbar.html")
	if !strings.Contains(toolbarPartial, `btn btn-primary`) || !strings.Contains(toolbarPartial, `btn btn-secondary`) {
		t.Fatal("expected shared admin action toolbar partial to use shared admin button styles")
	}

	headingPartial := mustReadESignTemplate(t, "partials/admin-page-heading.html")
	if !strings.Contains(headingPartial, `partials/breadcrumbs.html`) || !strings.Contains(headingPartial, `page_heading_title`) {
		t.Fatal("expected shared admin page heading partial to render breadcrumbs and title")
	}

	esignDetailBase := mustReadESignTemplate(t, "resources/shared/esign-detail-base.html")
	if strings.Contains(esignDetailBase, `max-w-7xl mx-auto`) {
		t.Fatal("expected shared e-sign detail shell to avoid bespoke max-width wrappers")
	}
	if !strings.Contains(esignDetailBase, `partials/admin-page-heading.html`) {
		t.Fatal("expected shared e-sign detail shell to use the shared admin page heading partial")
	}

	esignFormBase := mustReadESignTemplate(t, "resources/shared/esign-form-base.html")
	if strings.Contains(esignFormBase, `max-w-7xl mx-auto`) {
		t.Fatal("expected shared e-sign form shell to avoid bespoke max-width wrappers")
	}
	if !strings.Contains(esignFormBase, `partials/admin-page-heading.html`) {
		t.Fatal("expected shared e-sign form shell to use the shared admin page heading partial")
	}

	visualPrimitives := mustReadESignTemplate(t, "partials/esign-visual-primitives.html")
	for _, token := range []string{`.review-action-btn`, `.inline-status`, `.placement-field-item.linked-flash`} {
		if !strings.Contains(visualPrimitives, token) {
			t.Fatalf("expected shared e-sign visual primitives partial to contain %q", token)
		}
	}
}

func mustReadESignTemplate(t *testing.T, name string) string {
	t.Helper()
	body, err := fs.ReadFile(client.Templates(), strings.TrimSpace(name))
	if err != nil {
		t.Fatalf("read template %q: %v", name, err)
	}
	return string(body)
}

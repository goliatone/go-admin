package main

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/client"
)

func TestESignAgreementFormTemplateUsesModuleBootstrapOnly(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-agreements/form.html")

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
	if !strings.Contains(template, `btn btn-primary`) || !strings.Contains(template, `btn btn-secondary`) {
		t.Fatal("expected source-management runtime template header actions to use shared admin button styles")
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

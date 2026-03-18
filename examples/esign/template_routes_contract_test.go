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
	if !strings.Contains(template, `<script type="module" src="{{ base_path|default:"/admin" }}/assets/dist/esign/index.js"></script>`) {
		t.Fatal("expected form template to include fallback e-sign module script path")
	}
	if strings.Contains(template, "document.addEventListener('DOMContentLoaded'") {
		t.Fatal("expected form template to avoid legacy inline wizard bootstrap")
	}
	if strings.Contains(template, "draftEndpointWithUserID") {
		t.Fatal("expected form template to keep draft/sync implementation in TypeScript runtime only")
	}
	if !strings.Contains(template, `"storage_scope": "{{ agreement_form_storage_scope|default:"" }}"`) {
		t.Fatal("expected form template to expose server-authored storage scope")
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

func mustReadESignTemplate(t *testing.T, name string) string {
	t.Helper()
	body, err := fs.ReadFile(client.Templates(), strings.TrimSpace(name))
	if err != nil {
		t.Fatalf("read template %q: %v", name, err)
	}
	return string(body)
}

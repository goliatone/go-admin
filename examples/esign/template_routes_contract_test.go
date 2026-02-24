package main

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/client"
)

func TestESignAgreementFormTemplateUsesPUTKeepaliveForDraftForceSync(t *testing.T) {
	template := mustReadESignTemplate(t, "resources/esign-agreements/form.html")

	if strings.Contains(template, "navigator.sendBeacon(draftEndpointWithUserID") {
		t.Fatal("expected form template to avoid navigator.sendBeacon for draft update endpoint")
	}
	if !strings.Contains(template, "await fetch(draftEndpointWithUserID(`${draftsEndpoint}/${state.serverDraftId}`), {") {
		t.Fatal("expected force sync to issue a fetch request to draft detail endpoint")
	}
	if !strings.Contains(template, "method: 'PUT'") {
		t.Fatal("expected force sync request method to be PUT")
	}
	if !strings.Contains(template, "keepalive: true") {
		t.Fatal("expected force sync request to use keepalive fetch")
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

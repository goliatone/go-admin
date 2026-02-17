package modules

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

type permissionAuthorizer struct {
	allowed map[string]bool
}

func (a permissionAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if len(a.allowed) == 0 {
		return false
	}
	return a.allowed[strings.TrimSpace(action)]
}

func TestESignModuleAgreementArtifactSubresourceAllowsAdminDownloadExecutedAndCertificate(t *testing.T) {
	module, server, scope := setupESignModuleArtifactSubresourceTest(t, permissionAuthorizer{
		allowed: map[string]bool{
			permissions.AdminESignView:     true,
			permissions.AdminESignCreate:   true,
			permissions.AdminESignEdit:     true,
			permissions.AdminESignDownload: true,
		},
	})
	agreementID := seedAgreementWithArtifacts(t, module, server, scope)

	for _, asset := range []string{"executed", "certificate"} {
		req := httptest.NewRequest(http.MethodGet, fmt.Sprintf(
			"/admin/api/v1/panels/esign_agreements/%s/artifact/%s?tenant_id=%s&org_id=%s&disposition=attachment",
			agreementID,
			asset,
			scope.TenantID,
			scope.OrgID,
		), nil)
		req.Header.Set("X-User-ID", "ops-user")
		req.Header.Set("User-Agent", "artifact-subresource-test")
		resp, err := server.WrappedRouter().Test(req, -1)
		if err != nil {
			t.Fatalf("request %s failed: %v", asset, err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected status 200 for %s, got %d body=%s", asset, resp.StatusCode, strings.TrimSpace(string(body)))
		}
		if contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type"))); !strings.Contains(contentType, "application/pdf") {
			t.Fatalf("expected application/pdf content type for %s, got %q", asset, resp.Header.Get("Content-Type"))
		}
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("read response body for %s: %v", asset, err)
		}
		if !strings.HasPrefix(string(body), "%PDF-") {
			t.Fatalf("expected pdf payload for %s, got %q", asset, string(body))
		}
	}

	events, err := module.store.ListForAgreement(context.Background(), scope, agreementID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	downloaded := map[string]bool{}
	for _, event := range events {
		if strings.TrimSpace(event.EventType) != "admin.agreement.artifact_downloaded" {
			continue
		}
		meta := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &meta); err != nil {
			t.Fatalf("unmarshal metadata: %v", err)
		}
		asset := strings.TrimSpace(toString(meta["asset"]))
		if asset != "" {
			downloaded[asset] = true
		}
		if got := strings.TrimSpace(toString(meta["user_id"])); got != "ops-user" {
			t.Fatalf("expected metadata user_id ops-user, got %q", got)
		}
	}
	if !downloaded["executed"] || !downloaded["certificate"] {
		t.Fatalf("expected executed and certificate audit events, got %+v", downloaded)
	}
}

func TestESignModuleAgreementArtifactSubresourceDeniesMissingDownloadPermission(t *testing.T) {
	module, server, scope := setupESignModuleArtifactSubresourceTest(t, permissionAuthorizer{
		allowed: map[string]bool{
			permissions.AdminESignView:   true,
			permissions.AdminESignCreate: true,
			permissions.AdminESignEdit:   true,
		},
	})
	agreementID := seedAgreementWithArtifacts(t, module, server, scope)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf(
		"/admin/api/v1/panels/esign_agreements/%s/artifact/executed?tenant_id=%s&org_id=%s",
		agreementID,
		scope.TenantID,
		scope.OrgID,
	), nil)
	req.Header.Set("X-User-ID", "ops-user")
	resp, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 403, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	payload := map[string]any{}
	raw, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("unmarshal response payload: %v payload=%s", err, strings.TrimSpace(string(raw)))
	}
	errorPayload := payload
	if nested, ok := payload["error"].(map[string]any); ok && nested != nil {
		errorPayload = nested
	}
	metadata := map[string]any{}
	switch rawMeta := errorPayload["metadata"].(type) {
	case map[string]any:
		metadata = rawMeta
	case map[string]string:
		for key, value := range rawMeta {
			metadata[key] = value
		}
	default:
		t.Fatalf("expected metadata payload for forbidden response, got %+v", payload)
	}
	if got := strings.TrimSpace(toString(metadata["permission"])); got != permissions.AdminESignDownload {
		t.Fatalf("expected forbidden metadata permission %q, got %+v", permissions.AdminESignDownload, metadata)
	}
}

func TestESignModuleAgreementArtifactSubresourceDoesNotMatchDynamicPanelAlias(t *testing.T) {
	module, server, scope := setupESignModuleArtifactSubresourceTest(t, permissionAuthorizer{
		allowed: map[string]bool{
			permissions.AdminESignView:     true,
			permissions.AdminESignCreate:   true,
			permissions.AdminESignEdit:     true,
			permissions.AdminESignDownload: true,
		},
	})
	agreementID := seedAgreementWithArtifacts(t, module, server, scope)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf(
		"/admin/api/v1/panels/esign_agreements@staging/%s/artifact/executed?tenant_id=%s&org_id=%s",
		agreementID,
		scope.TenantID,
		scope.OrgID,
	), nil)
	req.Header.Set("X-User-ID", "ops-user")
	resp, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 404 for non-canonical panel alias route, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
}

func TestESignModuleDocumentSourceSubresourceAllowsAdminView(t *testing.T) {
	_, server, scope := setupESignModuleArtifactSubresourceTest(t, permissionAuthorizer{
		allowed: map[string]bool{
			permissions.AdminESignView:   true,
			permissions.AdminESignCreate: true,
			permissions.AdminESignEdit:   true,
		},
	})
	documentID := seedDocumentForSourceSubresource(t, server, scope)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf(
		"/admin/api/v1/panels/esign_documents/%s/source/pdf?tenant_id=%s&org_id=%s&disposition=attachment",
		documentID,
		scope.TenantID,
		scope.OrgID,
	), nil)
	req.Header.Set("X-User-ID", "ops-user")
	resp, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	if contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type"))); !strings.Contains(contentType, "application/pdf") {
		t.Fatalf("expected application/pdf content type, got %q", resp.Header.Get("Content-Type"))
	}
	if disposition := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Disposition"))); !strings.Contains(disposition, "attachment") {
		t.Fatalf("expected attachment content disposition, got %q", resp.Header.Get("Content-Disposition"))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.HasPrefix(string(body), "%PDF-") {
		t.Fatalf("expected pdf payload, got %q", string(body))
	}
}

func TestESignModuleDocumentSourceSubresourceDeniesMissingViewPermission(t *testing.T) {
	_, server, scope := setupESignModuleArtifactSubresourceTest(t, permissionAuthorizer{
		allowed: map[string]bool{
			permissions.AdminESignCreate: true,
			permissions.AdminESignEdit:   true,
		},
	})
	documentID := seedDocumentForSourceSubresource(t, server, scope)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf(
		"/admin/api/v1/panels/esign_documents/%s/source/pdf?tenant_id=%s&org_id=%s",
		documentID,
		scope.TenantID,
		scope.OrgID,
	), nil)
	req.Header.Set("X-User-ID", "ops-user")
	resp, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 403, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	payload := map[string]any{}
	raw, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("unmarshal response payload: %v payload=%s", err, strings.TrimSpace(string(raw)))
	}
	errorPayload := payload
	if nested, ok := payload["error"].(map[string]any); ok && nested != nil {
		errorPayload = nested
	}
	metadata := map[string]any{}
	switch rawMeta := errorPayload["metadata"].(type) {
	case map[string]any:
		metadata = rawMeta
	case map[string]string:
		for key, value := range rawMeta {
			metadata[key] = value
		}
	default:
		t.Fatalf("expected metadata payload for forbidden response, got %+v", payload)
	}
	if got := strings.TrimSpace(toString(metadata["permission"])); got != permissions.AdminESignView {
		t.Fatalf("expected forbidden metadata permission %q, got %+v", permissions.AdminESignView, metadata)
	}
}

func TestESignModuleDocumentSourceSubresourceDoesNotMatchDynamicPanelAlias(t *testing.T) {
	_, server, scope := setupESignModuleArtifactSubresourceTest(t, permissionAuthorizer{
		allowed: map[string]bool{
			permissions.AdminESignView:   true,
			permissions.AdminESignCreate: true,
			permissions.AdminESignEdit:   true,
		},
	})
	documentID := seedDocumentForSourceSubresource(t, server, scope)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf(
		"/admin/api/v1/panels/esign_documents@staging/%s/source/pdf?tenant_id=%s&org_id=%s",
		documentID,
		scope.TenantID,
		scope.OrgID,
	), nil)
	req.Header.Set("X-User-ID", "ops-user")
	resp, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 404 for non-canonical panel alias route, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
}

func setupESignModuleArtifactSubresourceTest(t *testing.T, authz coreadmin.Authorizer) (*ESignModule, router.Server[*fiber.App], stores.Scope) {
	t.Helper()
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })

	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Artifact Test", "en")
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithFeatureDefaults(map[string]bool{"esign": true}),
	)
	if err != nil {
		t.Fatalf("quickstart.NewAdmin: %v", err)
	}
	if authz != nil {
		adm.WithAuthorizer(authz)
	}

	module := NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).WithUploadDir(t.TempDir())
	if err := adm.RegisterModule(module); err != nil {
		t.Fatalf("RegisterModule: %v", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("Initialize: %v", err)
	}
	return module, server, defaultModuleScope
}

func seedDocumentForSourceSubresource(t *testing.T, server router.Server[*fiber.App], scope stores.Scope) string {
	t.Helper()
	return createPanelRecord(t, server, fmt.Sprintf(
		"/admin/api/v1/panels/esign_documents?tenant_id=%s&org_id=%s",
		scope.TenantID,
		scope.OrgID,
	), map[string]any{
		"title":             "Source Subresource Test Document",
		"source_object_key": fmt.Sprintf("tenant/%s/org/%s/docs/source-subresource-test.pdf", scope.TenantID, scope.OrgID),
		"pdf_base64":        encodeTestPDF(1),
	})
}

func seedAgreementWithArtifacts(t *testing.T, module *ESignModule, server router.Server[*fiber.App], scope stores.Scope) string {
	t.Helper()

	documentID := createPanelRecord(t, server, fmt.Sprintf(
		"/admin/api/v1/panels/esign_documents?tenant_id=%s&org_id=%s",
		scope.TenantID,
		scope.OrgID,
	), map[string]any{
		"title":             "Artifact Test Document",
		"source_object_key": fmt.Sprintf("tenant/%s/org/%s/docs/artifact-test.pdf", scope.TenantID, scope.OrgID),
		"pdf_base64":        encodeTestPDF(1),
	})
	agreementID := createPanelRecord(t, server, fmt.Sprintf(
		"/admin/api/v1/panels/esign_agreements?tenant_id=%s&org_id=%s",
		scope.TenantID,
		scope.OrgID,
	), map[string]any{
		"document_id": documentID,
		"title":       "Artifact Test Agreement",
		"message":     "Artifact download test",
	})

	executedPDF := services.GenerateDeterministicPDF(1)
	certificatePDF := services.GenerateDeterministicPDF(2)
	executedKey := fmt.Sprintf("tenant/%s/org/%s/agreements/%s/executed.pdf", scope.TenantID, scope.OrgID, agreementID)
	certificateKey := fmt.Sprintf("tenant/%s/org/%s/agreements/%s/certificate.pdf", scope.TenantID, scope.OrgID, agreementID)

	if module.UploadManager() == nil {
		t.Fatal("expected upload manager")
	}
	if _, err := module.UploadManager().UploadFile(context.Background(), executedKey, executedPDF); err != nil {
		t.Fatalf("upload executed artifact: %v", err)
	}
	if _, err := module.UploadManager().UploadFile(context.Background(), certificateKey, certificatePDF); err != nil {
		t.Fatalf("upload certificate artifact: %v", err)
	}
	if _, err := module.store.SaveAgreementArtifacts(context.Background(), scope, stores.AgreementArtifactRecord{
		AgreementID:          agreementID,
		ExecutedObjectKey:    executedKey,
		ExecutedSHA256:       sha256Hex(executedPDF),
		CertificateObjectKey: certificateKey,
		CertificateSHA256:    sha256Hex(certificatePDF),
		CorrelationID:        "artifact-subresource-seed",
	}); err != nil {
		t.Fatalf("SaveAgreementArtifacts: %v", err)
	}
	return agreementID
}

func sha256Hex(raw []byte) string {
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

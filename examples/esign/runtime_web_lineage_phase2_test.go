package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRuntimeDetailPagesRenderSeededLineageFixtures(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("newESignRuntimeWebFixtureForTestsWithGoogleEnabled: %v", err)
	}

	fixtureSet, urls, err := seedESignRuntimeFixtures(context.Background(), "/admin", fixture.Module, fixture.Bootstrap)
	if err != nil {
		t.Fatalf("seedESignRuntimeFixtures: %v", err)
	}
	if urls.UploadOnlyDocumentURL == "" || urls.ImportedAgreementURL == "" {
		t.Fatalf("expected seeded fixture urls, got %+v", urls)
	}

	authCookie := loginESignRuntimeAdmin(t, fixture.App)
	query := url.Values{
		"tenant_id": []string{fixture.Module.DefaultScope().TenantID},
		"org_id":    []string{fixture.Module.DefaultScope().OrgID},
	}.Encode()

	documentCases := []struct {
		id                 string
		title              string
		expectGoogleFileID string
		expectSourceType   string
		expectHTML         []string
		diagnosticsURL     string
	}{
		{
			id:                 fixtureSet.UploadOnlyDocumentID,
			title:              "Upload Only Fixture",
			expectGoogleFileID: "",
			expectSourceType:   "upload",
			expectHTML: []string{
				"Source Provenance",
				"No source lineage",
			},
			diagnosticsURL: "/admin/debug/lineage/documents/" + fixtureSet.UploadOnlyDocumentID,
		},
		{
			id:                 fixtureSet.ImportedDocumentID,
			title:              "Imported Fixture Source",
			expectGoogleFileID: "fixture-google-file-1",
			expectSourceType:   "google_drive",
			expectHTML: []string{
				"Source Provenance",
				"Fingerprint Pending",
				"fixture-google-file-1",
				"Potential continuity candidate requires operator review",
			},
			diagnosticsURL: "/admin/debug/lineage/documents/" + fixtureSet.ImportedDocumentID,
		},
		{
			id:                 fixtureSet.RepeatedImportDocumentID,
			title:              "Imported Fixture Source Rev 2",
			expectGoogleFileID: "fixture-google-file-1",
			expectSourceType:   "google_drive",
			expectHTML: []string{
				"Source Provenance",
				"Fingerprint Failed",
				"fixture-google-file-1",
			},
			diagnosticsURL: "/admin/debug/lineage/documents/" + fixtureSet.RepeatedImportDocumentID,
		},
	}
	for _, tc := range documentCases {
		t.Run("document-"+tc.title, func(t *testing.T) {
			pageResp := doRequestWithCookie(t, fixture.App, http.MethodGet, "/admin/content/esign_documents/"+tc.id+"?"+query, authCookie)
			defer pageResp.Body.Close()
			if pageResp.StatusCode != http.StatusOK {
				body, _ := io.ReadAll(pageResp.Body)
				t.Fatalf("expected document detail status 200, got %d body=%s", pageResp.StatusCode, strings.TrimSpace(string(body)))
			}
			body, err := io.ReadAll(pageResp.Body)
			if err != nil {
				t.Fatalf("read document detail body: %v", err)
			}
			if !strings.Contains(string(body), tc.title) {
				t.Fatalf("expected document detail body to contain %q", tc.title)
			}
			for _, snippet := range tc.expectHTML {
				if !strings.Contains(string(body), snippet) {
					t.Fatalf("expected document detail body to contain %q", snippet)
				}
			}
			if !strings.Contains(string(body), tc.diagnosticsURL) {
				t.Fatalf("expected document detail body to contain diagnostics link %q", tc.diagnosticsURL)
			}

			panelDetail := fetchRuntimePanelDetail(t, fixture.App, authCookie, "/admin/api/v1/panels/esign_documents/"+tc.id+"?"+query)
			if got := strings.TrimSpace(fmt.Sprint(panelDetail["source_google_file_id"])); got != tc.expectGoogleFileID {
				t.Fatalf("expected source_google_file_id=%q, got %q detail=%+v", tc.expectGoogleFileID, got, panelDetail)
			}
			if got := strings.TrimSpace(fmt.Sprint(panelDetail["source_type"])); got != tc.expectSourceType {
				t.Fatalf("expected source_type=%q, got %q detail=%+v", tc.expectSourceType, got, panelDetail)
			}

			pdfResp := doRequestWithCookie(t, fixture.App, http.MethodGet, "/admin/api/v1/panels/esign_documents/"+tc.id+"/source/pdf?"+query, authCookie)
			defer pdfResp.Body.Close()
			if pdfResp.StatusCode != http.StatusOK {
				payload, _ := io.ReadAll(pdfResp.Body)
				t.Fatalf("expected source pdf 200, got %d body=%s", pdfResp.StatusCode, strings.TrimSpace(string(payload)))
			}
			pdfBody, err := io.ReadAll(pdfResp.Body)
			if err != nil {
				t.Fatalf("read source pdf body: %v", err)
			}
			if len(pdfBody) == 0 {
				t.Fatalf("expected non-empty source pdf for %s", tc.title)
			}

			diagnosticsResp := doRequestWithCookie(t, fixture.App, http.MethodGet, tc.diagnosticsURL+"?"+query, authCookie)
			defer diagnosticsResp.Body.Close()
			if diagnosticsResp.StatusCode != http.StatusOK {
				payload, _ := io.ReadAll(diagnosticsResp.Body)
				t.Fatalf("expected diagnostics 200, got %d body=%s", diagnosticsResp.StatusCode, strings.TrimSpace(string(payload)))
			}
			diagnosticsPayload := decodeRuntimeJSONBody(t, diagnosticsResp.Body)
			if got := strings.TrimSpace(fmt.Sprint(diagnosticsPayload["resource_id"])); got != tc.id {
				t.Fatalf("expected diagnostics resource_id=%q, got %+v", tc.id, diagnosticsPayload)
			}
		})
	}

	agreementResp := doRequestWithCookie(t, fixture.App, http.MethodGet, "/admin/content/esign_agreements/"+fixtureSet.ImportedAgreementID+"?"+query, authCookie)
	defer agreementResp.Body.Close()
	if agreementResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementResp.Body)
		t.Fatalf("expected agreement detail status 200, got %d body=%s", agreementResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementBody, err := io.ReadAll(agreementResp.Body)
	if err != nil {
		t.Fatalf("read agreement detail body: %v", err)
	}
	if !strings.Contains(string(agreementBody), "Imported Fixture Agreement") {
		t.Fatalf("expected agreement detail body to contain fixture title")
	}
	for _, snippet := range []string{
		"Pinned Source Provenance",
		"Newer source exists",
		"/admin/debug/lineage/agreements/" + fixtureSet.ImportedAgreementID,
		"Potential continuity candidate requires operator review",
	} {
		if !strings.Contains(string(agreementBody), snippet) {
			t.Fatalf("expected agreement detail body to contain %q", snippet)
		}
	}

	agreementDetail := fetchRuntimePanelDetail(t, fixture.App, authCookie, "/admin/api/v1/panels/esign_agreements/"+fixtureSet.ImportedAgreementID+"?"+query)
	if got := strings.TrimSpace(fmt.Sprint(agreementDetail["source_google_file_id"])); got != "fixture-google-file-1" {
		t.Fatalf("expected agreement source_google_file_id fixture-google-file-1, got %q detail=%+v", got, agreementDetail)
	}
	if got := strings.TrimSpace(fmt.Sprint(agreementDetail["source_exported_at"])); got == "" || got == "<nil>" {
		t.Fatalf("expected agreement source_exported_at to be populated, got %+v", agreementDetail)
	}
	if got := strings.TrimSpace(fmt.Sprint(agreementDetail["document_id"])); got != fixtureSet.ImportedDocumentID {
		t.Fatalf("expected agreement document_id=%q, got %q detail=%+v", fixtureSet.ImportedDocumentID, got, agreementDetail)
	}

	agreementDiagnosticsResp := doRequestWithCookie(t, fixture.App, http.MethodGet, "/admin/debug/lineage/agreements/"+fixtureSet.ImportedAgreementID+"?"+query, authCookie)
	defer agreementDiagnosticsResp.Body.Close()
	if agreementDiagnosticsResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementDiagnosticsResp.Body)
		t.Fatalf("expected agreement diagnostics status 200, got %d body=%s", agreementDiagnosticsResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementDiagnostics := decodeRuntimeJSONBody(t, agreementDiagnosticsResp.Body)
	if got := strings.TrimSpace(fmt.Sprint(agreementDiagnostics["resource_kind"])); got != "agreement" {
		t.Fatalf("expected agreement diagnostics resource_kind=agreement, got %+v", agreementDiagnostics)
	}
}

func loginESignRuntimeAdmin(t *testing.T, app *fiber.App) *http.Cookie {
	t.Helper()

	form := url.Values{}
	form.Set("identifier", "admin@example.com")
	form.Set("password", "admin.pwd")
	form.Set("remember", "1")

	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	if loginResp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(loginResp.Body)
		t.Fatalf("expected login redirect, got %d body=%s", loginResp.StatusCode, strings.TrimSpace(string(body)))
	}
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}
	return authCookie
}

func fetchRuntimePanelDetail(t *testing.T, app *fiber.App, authCookie *http.Cookie, endpoint string) map[string]any {
	t.Helper()

	resp := doRequestWithCookie(t, app, http.MethodGet, endpoint, authCookie)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected panel detail status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode panel detail payload: %v", err)
	}
	if record, ok := payload["record"].(map[string]any); ok && record != nil {
		return record
	}
	if data, ok := payload["data"].(map[string]any); ok && data != nil {
		return data
	}
	return payload
}

func decodeRuntimeJSONBody(t *testing.T, body io.Reader) map[string]any {
	t.Helper()

	payload := map[string]any{}
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		t.Fatalf("decode json body: %v", err)
	}
	return payload
}

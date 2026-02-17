package modules

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

func TestESignModuleGoogleDriveImportAsyncUsesGoogleImporter(t *testing.T) {
	_ = registry.Stop(context.Background())
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	t.Setenv(services.EnvGoogleProviderMode, services.GoogleProviderModeDeterministic)
	t.Setenv(services.EnvGoogleCredentialActiveKey, "test-google-credential-key")

	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithFeatureDefaults(map[string]bool{
			"esign":        true,
			"esign_google": true,
		}),
	)
	if err != nil {
		t.Fatalf("quickstart.NewAdmin: %v", err)
	}
	adm.WithAuthorizer(allowAllAuthorizer{})

	module := NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode)
	t.Cleanup(module.Close)
	if err := adm.RegisterModule(module); err != nil {
		t.Fatalf("RegisterModule: %v", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("Initialize: %v", err)
	}

	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-code-async"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectReq.Header.Set("X-User-ID", "ops-user")
	connectReq.Header.Set("X-Forwarded-Proto", "https")
	connectResp, err := server.WrappedRouter().Test(connectReq, -1)
	if err != nil {
		t.Fatalf("google connect request failed: %v", err)
	}
	if connectResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(connectResp.Body)
		_ = connectResp.Body.Close()
		t.Fatalf("expected connect status 200, got %d body=%s", connectResp.StatusCode, string(payload))
	}
	_ = connectResp.Body.Close()

	body := `{"google_file_id":"google-file-1","document_title":"Contract Doc","agreement_title":"Contract Agreement","source_version_hint":"v1"}`
	createReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/google-drive/imports?user_id=ops-user", bytes.NewBufferString(body))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-User-ID", "ops-user")
	createReq.Header.Set("X-Forwarded-Proto", "https")
	createResp, err := server.WrappedRouter().Test(createReq, -1)
	if err != nil {
		t.Fatalf("google async import request failed: %v", err)
	}
	if createResp.StatusCode != http.StatusAccepted {
		payload, _ := io.ReadAll(createResp.Body)
		_ = createResp.Body.Close()
		t.Fatalf("expected status 202, got %d body=%s", createResp.StatusCode, string(payload))
	}
	createPayload := decodeJSONMap(t, createResp.Body)
	_ = createResp.Body.Close()

	importRunID := strings.TrimSpace(toString(createPayload["import_run_id"]))
	statusURL := strings.TrimSpace(toString(createPayload["status_url"]))
	if importRunID == "" || statusURL == "" {
		t.Fatalf("expected import_run_id/status_url, got %+v", createPayload)
	}

	var final map[string]any
	for i := 0; i < 50; i++ {
		statusReq := httptest.NewRequest(http.MethodGet, statusURL+"?user_id=ops-user", nil)
		statusReq.Header.Set("X-User-ID", "ops-user")
		statusReq.Header.Set("X-Forwarded-Proto", "https")
		statusResp, pollErr := server.WrappedRouter().Test(statusReq, -1)
		if pollErr != nil {
			t.Fatalf("status poll failed: %v", pollErr)
		}
		final = decodeJSONMap(t, statusResp.Body)
		_ = statusResp.Body.Close()
		if strings.TrimSpace(toString(final["status"])) == "succeeded" {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	if strings.TrimSpace(toString(final["status"])) != "succeeded" {
		t.Fatalf("expected terminal succeeded status, got %+v", final)
	}
}

func decodeJSONMap(t *testing.T, body io.Reader) map[string]any {
	t.Helper()
	decoded := map[string]any{}
	if err := json.NewDecoder(body).Decode(&decoded); err != nil {
		t.Fatalf("decode json response: %v", err)
	}
	return decoded
}

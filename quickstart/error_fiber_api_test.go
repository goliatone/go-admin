package quickstart

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
)

func TestFiberErrorHandlerPreservesAPI404ForUnmatchedRoutes(t *testing.T) {
	cfg := admin.Config{
		BasePath: "/admin",
		Errors: admin.ErrorConfig{
			InternalMessage: "An unexpected error occurred",
		},
	}
	app := fiber.New(fiber.Config{
		ErrorHandler: NewFiberErrorHandler(nil, cfg, false),
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/v1/missing-route", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer closeResponseBody(t, resp)

	if resp.StatusCode != http.StatusNotFound {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("read response body: %v", err)
		}
		t.Fatalf("expected status 404, got %d body=%s", resp.StatusCode, string(body))
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode response payload: %v body=%s", err, string(raw))
	}
	errPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error envelope, got %+v", payload)
	}
	if code := fmt.Sprint(errPayload["code"]); code != "404" {
		t.Fatalf("expected error code 404, got %q payload=%+v", code, errPayload)
	}
	if textCode := strings.TrimSpace(fmt.Sprint(errPayload["text_code"])); textCode != "NOT_FOUND" {
		t.Fatalf("expected text_code NOT_FOUND, got %q payload=%+v", textCode, errPayload)
	}
}

func TestErrorPresenterWithAdminIdentityUsesResolvedIdentity(t *testing.T) {
	adm, err := admin.New(admin.Config{
		Deployment: admin.DeploymentIdentityConfig{
			InstanceName: "calm-otter",
			InstanceID:   "instance-quickstart",
		},
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("construct admin: %v", err)
	}
	presenter := errorPresenterWithAdminIdentity(admin.NewErrorPresenter(admin.ErrorConfig{}), adm)
	if got := presenter.DeploymentIdentity(); got != adm.DeploymentIdentity() {
		t.Fatalf("presenter identity mismatch: got=%+v want=%+v", got, adm.DeploymentIdentity())
	}

	standalone := errorPresenterWithAdminIdentity(admin.NewErrorPresenter(admin.ErrorConfig{}), nil)
	if got := standalone.DeploymentIdentity(); got.InstanceID != "" {
		t.Fatalf("standalone presenter unexpectedly resolved identity: %+v", got)
	}
}

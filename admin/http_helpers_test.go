package admin

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestWriteErrorReturnsStructuredPayload(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Get("/err", func(c router.Context) error {
		return writeError(c, ErrFeatureDisabled)
	})

	req := httptest.NewRequest("GET", "/err", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if code := int(errPayload["code"].(float64)); code != 404 {
		t.Fatalf("expected code 404, got %d", code)
	}
	if text := errPayload["text_code"]; text != "FEATURE_DISABLED" {
		t.Fatalf("expected text_code FEATURE_DISABLED, got %v", text)
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["path"] != "/err" {
		t.Fatalf("expected path metadata, got %v", meta)
	}
}

func TestWriteErrorIncludesValidationFields(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/validate", func(c router.Context) error {
		return writeError(c, SettingsValidationErrors{Fields: map[string]string{"admin.title": "required"}})
	})

	req := httptest.NewRequest("POST", "/validate", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	fields, _ := meta["fields"].(map[string]any)
	if fields["admin.title"] != "required" {
		t.Fatalf("expected validation fields preserved, got %v", fields)
	}
	if errPayload["text_code"] != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %v", errPayload["text_code"])
	}
}

func TestWriteErrorMapsFeatureConfigIssues(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Get("/features", func(c router.Context) error {
		return writeError(c, InvalidFeatureConfigError{
			Issues: []FeatureDependencyError{
				{Feature: "export", Missing: []string{"commands", "jobs"}},
			},
		})
	})

	req := httptest.NewRequest("GET", "/features", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400, got %d", rr.Code)
	}

	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if errPayload["text_code"] != "INVALID_FEATURE_CONFIG" {
		t.Fatalf("expected INVALID_FEATURE_CONFIG text code, got %v", errPayload["text_code"])
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	issues, _ := meta["issues"].([]any)
	if len(issues) != 1 {
		t.Fatalf("expected one issue, got %v", issues)
	}
	issue, _ := issues[0].(map[string]any)
	if issue["feature"] != "export" {
		t.Fatalf("expected feature export, got %v", issue["feature"])
	}
	rawMissing, _ := issue["missing"].([]any)
	missing := map[string]bool{}
	for _, item := range rawMissing {
		if s, ok := item.(string); ok {
			missing[s] = true
		}
	}
	if !missing["commands"] || !missing["jobs"] {
		t.Fatalf("expected missing commands and jobs, got %v", rawMissing)
	}
	if meta["path"] != "/features" {
		t.Fatalf("expected path metadata, got %v", meta["path"])
	}
}

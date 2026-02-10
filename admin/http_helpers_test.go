package admin

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
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

func TestWriteErrorMapsSchemaValidationErrors(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/schema", func(c router.Context) error {
		return writeError(c, &jsonschema.ValidationError{
			InstanceLocation: "/title",
			Message:          "is required",
		})
	})

	req := httptest.NewRequest("POST", "/schema", nil)
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
	if fields["title"] != "is required" {
		t.Fatalf("expected schema field mapped, got %v", fields)
	}
}

func TestWriteErrorMapsTranslationMissingConflict(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/publish", func(c router.Context) error {
		return writeError(c, MissingTranslationsError{
			EntityType:      "pages",
			PolicyEntity:    "pages",
			EntityID:        "page_123",
			Transition:      "publish",
			Environment:     "production",
			RequestedLocale: "en",
			MissingLocales:  []string{"es", "fr"},
		})
	})

	req := httptest.NewRequest("POST", "/publish", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if errPayload["text_code"] != TextCodeTranslationMissing {
		t.Fatalf("expected %s, got %v", TextCodeTranslationMissing, errPayload["text_code"])
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["transition"] != "publish" {
		t.Fatalf("expected transition publish, got %v", meta["transition"])
	}
	if meta["entity_type"] != "pages" || meta["policy_entity"] != "pages" {
		t.Fatalf("expected entity metadata, got %v", meta)
	}
	if meta["requested_locale"] != "en" || meta["environment"] != "production" {
		t.Fatalf("expected locale/environment metadata, got %v", meta)
	}
	locales, _ := meta["missing_locales"].([]any)
	if len(locales) != 2 {
		t.Fatalf("expected missing locales [es fr], got %v", meta["missing_locales"])
	}
}

func TestWriteErrorMapsTranslationMissingNormalizesEntityTypeMetadata(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/publish", func(c router.Context) error {
		return writeError(c, MissingTranslationsError{
			EntityType:      "posts@staging",
			PolicyEntity:    "posts@staging",
			EntityID:        "post_123",
			Transition:      "publish",
			Environment:     "staging",
			RequestedLocale: "en",
			MissingLocales:  []string{"fr"},
		})
	})

	req := httptest.NewRequest("POST", "/publish", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["entity_type"] != "posts" || meta["policy_entity"] != "posts" {
		t.Fatalf("expected normalized entity metadata, got %v", meta)
	}
}

func TestWriteErrorMapsTranslationMissingUnprocessableWhenFieldFailuresPresent(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/publish", func(c router.Context) error {
		return writeError(c, MissingTranslationsError{
			EntityType:              "pages",
			EntityID:                "page_123",
			Transition:              "publish",
			RequestedLocale:         "en",
			MissingLocales:          []string{"fr"},
			MissingFieldsByLocale:   map[string][]string{"fr": {"title", "path"}},
			RequiredFieldsEvaluated: true,
		})
	})

	req := httptest.NewRequest("POST", "/publish", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 422 {
		t.Fatalf("expected 422, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	rawFields, ok := meta["missing_fields_by_locale"].(map[string]any)
	if !ok {
		t.Fatalf("expected missing_fields_by_locale metadata, got %v", meta)
	}
	frFields, _ := rawFields["fr"].([]any)
	if len(frFields) != 2 {
		t.Fatalf("expected fr field failures, got %v", rawFields["fr"])
	}
}

func TestWriteErrorMapsTranslationAlreadyExists(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/translate", func(c router.Context) error {
		return writeError(c, TranslationAlreadyExistsError{
			Panel:              "pages",
			EntityID:           "page_123",
			Locale:             "es",
			TranslationGroupID: "tg_123",
		})
	})

	req := httptest.NewRequest("POST", "/translate", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if errPayload["text_code"] != TextCodeTranslationExists {
		t.Fatalf("expected %s, got %v", TextCodeTranslationExists, errPayload["text_code"])
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["locale"] != "es" || meta["translation_group_id"] != "tg_123" {
		t.Fatalf("expected locale/group metadata, got %v", meta)
	}
}

func TestWriteErrorMapsTranslationQueueConflict(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/queue/conflict", func(c router.Context) error {
		return writeError(c, TranslationAssignmentConflictError{
			AssignmentID:         "tqa_2",
			ExistingAssignmentID: "tqa_1",
			TranslationGroupID:   "tg_123",
			EntityType:           "pages",
			SourceLocale:         "en",
			TargetLocale:         "es",
		})
	})

	req := httptest.NewRequest("POST", "/queue/conflict", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if errPayload["text_code"] != TextCodeTranslationQueueConflict {
		t.Fatalf("expected %s, got %v", TextCodeTranslationQueueConflict, errPayload["text_code"])
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["existing_assignment_id"] != "tqa_1" || meta["target_locale"] != "es" {
		t.Fatalf("expected queue conflict metadata, got %v", meta)
	}
}

func TestWriteErrorMapsTranslationQueueVersionConflict(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/queue/version-conflict", func(c router.Context) error {
		return writeError(c, TranslationAssignmentVersionConflictError{
			AssignmentID:    "tqa_1",
			ExpectedVersion: 2,
			ActualVersion:   3,
		})
	})

	req := httptest.NewRequest("POST", "/queue/version-conflict", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if errPayload["text_code"] != TextCodeTranslationQueueVersionConflict {
		t.Fatalf("expected %s, got %v", TextCodeTranslationQueueVersionConflict, errPayload["text_code"])
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["expected_version"] != float64(2) || meta["actual_version"] != float64(3) {
		t.Fatalf("expected version conflict metadata, got %v", meta)
	}
}

func TestWriteErrorMapsTranslationExchangeUnsupportedFormat(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/exchange", func(c router.Context) error {
		return writeError(c, TranslationExchangeUnsupportedFormatError{
			Format:    "xml",
			Supported: []string{"csv", "json"},
		})
	})

	req := httptest.NewRequest("POST", "/exchange", nil)
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
	if errPayload["text_code"] != TextCodeTranslationExchangeUnsupportedFormat {
		t.Fatalf("expected %s, got %v", TextCodeTranslationExchangeUnsupportedFormat, errPayload["text_code"])
	}
}

func TestWriteErrorMapsTranslationExchangeConflict(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/exchange-conflict", func(c router.Context) error {
		return writeError(c, TranslationExchangeConflictError{
			Type:               "stale_source_hash",
			Index:              2,
			Resource:           "pages",
			EntityID:           "page_123",
			TranslationGroupID: "tg_123",
			TargetLocale:       "es",
			FieldPath:          "title",
			CurrentSourceHash:  "aaaa",
			ProvidedSourceHash: "bbbb",
		})
	})

	req := httptest.NewRequest("POST", "/exchange-conflict", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	if errPayload["text_code"] != TextCodeTranslationExchangeStaleSourceHash {
		t.Fatalf("expected %s, got %v", TextCodeTranslationExchangeStaleSourceHash, errPayload["text_code"])
	}
}

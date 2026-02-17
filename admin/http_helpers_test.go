package admin

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
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

func TestWriteErrorMapsTranslationMissingIncludesMandatoryMetadataKeys(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/publish", func(c router.Context) error {
		return writeError(c, MissingTranslationsError{
			EntityType: "pages",
			EntityID:   "page_123",
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
	if _, ok := meta["missing_locales"]; !ok {
		t.Fatalf("expected missing_locales metadata key, got %v", meta)
	}
	locales, _ := meta["missing_locales"].([]any)
	if len(locales) != 0 {
		t.Fatalf("expected empty missing_locales, got %v", locales)
	}
	if transition, _ := meta["transition"].(string); transition != "unknown" {
		t.Fatalf("expected transition fallback unknown, got %q", transition)
	}
	if _, ok := meta["missing_fields_by_locale"]; ok {
		t.Fatalf("expected missing_fields_by_locale omitted when required-fields checks are disabled, got %v", meta["missing_fields_by_locale"])
	}
}

func TestWriteErrorMapsTranslationMissingIncludesFieldMapWhenRequiredFieldChecksEnabled(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/publish", func(c router.Context) error {
		return writeError(c, MissingTranslationsError{
			EntityType:              "pages",
			EntityID:                "page_123",
			Transition:              "publish",
			MissingLocales:          []string{"fr"},
			RequiredFieldsEvaluated: true,
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
	rawFields, ok := meta["missing_fields_by_locale"]
	if !ok {
		t.Fatalf("expected missing_fields_by_locale key when required-fields checks are enabled, got %v", meta)
	}
	fields, ok := rawFields.(map[string]any)
	if !ok {
		t.Fatalf("expected missing_fields_by_locale object, got %T", rawFields)
	}
	if len(fields) != 0 {
		t.Fatalf("expected empty missing_fields_by_locale object when no field data is available, got %v", fields)
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

func TestWriteErrorMapsAutosaveConflict(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/autosave", func(c router.Context) error {
		return writeError(c, AutosaveConflictError{
			Panel:           "posts",
			EntityID:        "post_123",
			Version:         "2",
			ExpectedVersion: "1",
			LatestStatePath: "/admin/api/panels/posts/post_123",
		})
	})

	req := httptest.NewRequest("POST", "/autosave", nil)
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
	if errPayload["text_code"] != TextCodeAutosaveConflict {
		t.Fatalf("expected %s, got %v", TextCodeAutosaveConflict, errPayload["text_code"])
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["version"] != "2" || meta["expected_version"] != "1" {
		t.Fatalf("expected autosave version metadata, got %v", meta)
	}
	if meta["latest_server_state"] != "/admin/api/panels/posts/post_123" {
		t.Fatalf("expected latest server state pointer, got %v", meta["latest_server_state"])
	}
}

func TestWriteErrorMapsGoCMSTranslationAlreadyExists(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/translate", func(c router.Context) error {
		groupID := uuid.New()
		return writeError(c, &cmscontent.TranslationAlreadyExistsError{
			EntityID:           uuid.New(),
			SourceLocale:       "en",
			TargetLocale:       "fr",
			TranslationGroupID: &groupID,
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
	if meta["locale"] != "fr" {
		t.Fatalf("expected locale fr metadata, got %v", meta)
	}
}

func TestWriteErrorMapsGoCMSTranslationValidationAndNotFound(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Post("/translate/invalid-locale", func(c router.Context) error {
		return writeError(c, &cmspages.InvalidLocaleError{TargetLocale: "xx"})
	})
	server.Router().Post("/translate/source-missing", func(c router.Context) error {
		return writeError(c, cmscontent.ErrSourceNotFound)
	})

	reqInvalid := httptest.NewRequest("POST", "/translate/invalid-locale", nil)
	rrInvalid := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rrInvalid, reqInvalid)
	if rrInvalid.Code != 400 {
		t.Fatalf("expected 400 for invalid locale, got %d", rrInvalid.Code)
	}
	var invalidBody map[string]any
	_ = json.Unmarshal(rrInvalid.Body.Bytes(), &invalidBody)
	invalidErr, _ := invalidBody["error"].(map[string]any)
	if invalidErr["text_code"] != TextCodeValidationError {
		t.Fatalf("expected %s, got %v", TextCodeValidationError, invalidErr["text_code"])
	}

	reqMissing := httptest.NewRequest("POST", "/translate/source-missing", nil)
	rrMissing := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rrMissing, reqMissing)
	if rrMissing.Code != 404 {
		t.Fatalf("expected 404 for source not found, got %d", rrMissing.Code)
	}
	var missingBody map[string]any
	_ = json.Unmarshal(rrMissing.Body.Bytes(), &missingBody)
	missingErr, _ := missingBody["error"].(map[string]any)
	if missingErr["text_code"] != TextCodeNotFound {
		t.Fatalf("expected %s, got %v", TextCodeNotFound, missingErr["text_code"])
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

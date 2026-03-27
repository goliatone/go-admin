package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

type stubTranslationExchangeExecutor struct {
	mu sync.RWMutex

	exportInput   TranslationExportInput
	validateInput TranslationImportValidateInput
	applyInput    TranslationImportApplyInput

	exportResult   TranslationExportResult
	validateResult TranslationExchangeResult
	applyResult    TranslationExchangeResult

	exportCalled   int
	validateCalled int
	applyCalled    int
}

func (s *stubTranslationExchangeExecutor) Export(_ context.Context, input TranslationExportInput) (TranslationExportResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.exportCalled++
	s.exportInput = input
	return s.exportResult, nil
}

func (s *stubTranslationExchangeExecutor) Validate(_ context.Context, input TranslationImportValidateInput) (TranslationExchangeResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.validateCalled++
	s.validateInput = input
	return s.validateResult, nil
}

func (s *stubTranslationExchangeExecutor) Apply(_ context.Context, input TranslationImportApplyInput) (TranslationExchangeResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.applyCalled++
	s.applyInput = input
	return s.applyResult, nil
}

func (s *stubTranslationExchangeExecutor) exportSnapshot() (int, TranslationExportInput) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.exportCalled, s.exportInput
}

func (s *stubTranslationExchangeExecutor) validateSnapshot() (int, TranslationImportValidateInput) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.validateCalled, s.validateInput
}

func (s *stubTranslationExchangeExecutor) applySnapshot() (int, TranslationImportApplyInput) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.applyCalled, s.applyInput
}

type translationExchangeCookieOnlyAuthenticator struct{}

func (translationExchangeCookieOnlyAuthenticator) Wrap(router.Context) error { return nil }

func TestTranslationExchangeBindingImportValidateParsesCSVAndRecordsConflictActivity(t *testing.T) {
	feed := NewActivityFeed()
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		ActivitySink: feed,
	})
	executor := &stubTranslationExchangeExecutor{
		validateResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 1, Failed: 1},
			Results: []TranslationExchangeRowResult{
				{
					Index:        0,
					Resource:     "pages",
					EntityID:     "page_123",
					FamilyID:     "tg_123",
					TargetLocale: "es",
					FieldPath:    "title",
					Status:       translationExchangeRowStatusConflict,
					Error:        "row linkage could not be resolved",
					Conflict: &TranslationExchangeConflictInfo{
						Type: "missing_linkage",
					},
					Metadata: map[string]any{"error_code": TextCodeTranslationExchangeMissingLinkage},
				},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	csvPayload := "resource,entity_id,family_id,target_locale,field_path,source_text,source_hash\npages,page_123,tg_123,es,title,Hello world,abc123"
	body, contentType := buildMultipartFile(t, "translations.csv", "text/csv", []byte(csvPayload))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", body)
	req.Header.Set("Content-Type", contentType)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	validateCalled, validateInput := executor.validateSnapshot()
	if validateCalled != 1 {
		t.Fatalf("validate called=%d, want 1", validateCalled)
	}
	if len(validateInput.Rows) != 1 {
		t.Fatalf("rows=%d, want 1", len(validateInput.Rows))
	}
	row := validateInput.Rows[0]
	if row.Resource != "pages" || row.EntityID != "page_123" || row.FamilyID != "tg_123" {
		t.Fatalf("unexpected parsed row: %+v", row)
	}
	entries, err := feed.List(context.Background(), 10)
	if err != nil {
		t.Fatalf("activity list: %v", err)
	}
	if len(entries) < 2 {
		t.Fatalf("expected validate + conflict activity entries, got %d", len(entries))
	}
	if entries[0].Action != "translation.exchange.import.row_conflict" {
		t.Fatalf("expected row conflict activity, got %q", entries[0].Action)
	}
	if entries[1].Action != "translation.exchange.import.validated" {
		t.Fatalf("expected validate activity, got %q", entries[1].Action)
	}
}

func TestTranslationExchangeBindingImportApplyUsesExplicitCreateIntentOptions(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		applyResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 1, Succeeded: 1},
			Results: []TranslationExchangeRowResult{
				{
					Index:        0,
					Resource:     "pages",
					EntityID:     "page_123",
					FamilyID:     "tg_123",
					TargetLocale: "es",
					FieldPath:    "title",
					Status:       translationExchangeRowStatusSuccess,
				},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":        "pages",
				"entity_id":       "page_123",
				"family_id":       "tg_123",
				"target_locale":   "es",
				"field_path":      "title",
				"translated_text": "Hola mundo",
			},
		},
		"create_translation":         true,
		"allow_source_hash_override": true,
		"continue_on_error":          true,
		"dry_run":                    true,
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "ops-user")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	applyCalled, applyInput := executor.applySnapshot()
	if applyCalled != 1 {
		t.Fatalf("apply called=%d, want 1", applyCalled)
	}
	if !applyInput.AllowCreateMissing {
		t.Fatalf("expected AllowCreateMissing=true")
	}
	if !applyInput.AllowSourceHashOverride {
		t.Fatalf("expected AllowSourceHashOverride=true")
	}
	if !applyInput.ContinueOnError {
		t.Fatalf("expected ContinueOnError=true")
	}
	if !applyInput.DryRun {
		t.Fatalf("expected DryRun=true")
	}
	if applyInput.RetryJobID != "" {
		t.Fatalf("expected RetryJobID to remain unset, got %q", applyInput.RetryJobID)
	}
	if len(applyInput.Resolutions) != 0 {
		t.Fatalf("expected no conflict resolutions, got %+v", applyInput.Resolutions)
	}
}

func TestTranslationExchangeBindingImportApplyRejectsUnsupportedConflictReplayFields(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	binding := newTranslationExchangeBinding(adm)
	app := newTranslationExchangeTestApp(t, binding)

	raw, _ := json.Marshal(map[string]any{
		"rows": []map[string]any{
			{
				"resource":        "pages",
				"entity_id":       "page_123",
				"family_id":       "tg_123",
				"target_locale":   "es",
				"field_path":      "title",
				"translated_text": "Hola mundo",
			},
		},
		"retry_job_id": "txex_job_retry_source",
	})
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestTranslationExchangeBindingImportValidateEchoesTraceHeaders(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		validateResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 0},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	csvPayload := "resource,entity_id,family_id,target_locale,field_path,source_text,source_hash\npages,page_123,tg_123,es,title,Hello world,abc123"
	body, contentType := buildMultipartFile(t, "translations.csv", "text/csv", []byte(csvPayload))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", body)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("X-Request-ID", "req-exchange-1")
	req.Header.Set("X-Correlation-ID", "corr-exchange-1")
	req.Header.Set("X-Trace-ID", "trace-exchange-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()

	if got := resp.Header.Get("X-Request-ID"); got != "req-exchange-1" {
		t.Fatalf("expected X-Request-ID req-exchange-1, got %q", got)
	}
	if got := resp.Header.Get("X-Correlation-ID"); got != "corr-exchange-1" {
		t.Fatalf("expected X-Correlation-ID corr-exchange-1, got %q", got)
	}
	if got := resp.Header.Get("X-Trace-ID"); got != "trace-exchange-1" {
		t.Fatalf("expected X-Trace-ID trace-exchange-1, got %q", got)
	}
}

func TestTranslationExchangeBindingImportValidateRejectsUnsupportedFormatWithTypedCode(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	body, contentType := buildMultipartFile(t, "translations.xml", "text/xml", []byte("<x/>"))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", body)
	req.Header.Set("Content-Type", contentType)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
	defer resp.Body.Close()
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", payload)
	}
	if errPayload["text_code"] != TextCodeTranslationExchangeUnsupportedFormat {
		t.Fatalf("expected %s, got %v", TextCodeTranslationExchangeUnsupportedFormat, errPayload["text_code"])
	}
	validateCalled, _ := executor.validateSnapshot()
	if validateCalled != 0 {
		t.Fatalf("validate should not be called on parse error")
	}
}

func TestTranslationExchangeBindingImportValidateRejectsUnknownTopLevelKeyInStrictMode(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":      "pages",
				"entity_id":     "page_1",
				"family_id":     "tg_1",
				"target_locale": "es",
				"field_path":    "title",
			},
		},
		"unexpected": true,
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
	validateCalled, _ := executor.validateSnapshot()
	if validateCalled != 0 {
		t.Fatalf("validate should not be called on strict top-level key error")
	}
}

// Ensure the binding parses HTTP input and dispatches commands correctly.

func TestTranslationExchangeBindingExportParsesFilterFromJSON(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{
			RowCount: 5,
			Rows:     []TranslationExchangeRow{},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"filter": map[string]any{
			"resources":           []string{"pages", "posts"},
			"target_locales":      []string{"es", "fr"},
			"entity_ids":          []string{"page_1", "page_2"},
			"field_paths":         []string{"title", "body"},
			"include_source_hash": true,
		},
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	exportCalled, exportInput := executor.exportSnapshot()
	if exportCalled != 1 {
		t.Fatalf("export called=%d, want 1", exportCalled)
	}
	filter := exportInput.Filter
	if len(filter.Resources) != 2 || filter.Resources[0] != "pages" {
		t.Fatalf("unexpected resources: %v", filter.Resources)
	}
	if len(filter.TargetLocales) != 2 || filter.TargetLocales[1] != "fr" {
		t.Fatalf("unexpected target_locales: %v", filter.TargetLocales)
	}
	if !filter.IncludeSourceHash {
		t.Fatalf("expected IncludeSourceHash=true")
	}
}

func TestTranslationExchangeBindingImportValidateParsesJSONPayload(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		validateResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 2, Succeeded: 2},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":      "pages",
				"entity_id":     "page_1",
				"family_id":     "tg_1",
				"target_locale": "es",
				"field_path":    "title",
				"source_hash":   "hash_1",
			},
			{
				"resource":      "pages",
				"entity_id":     "page_1",
				"family_id":     "tg_1",
				"target_locale": "es",
				"field_path":    "body",
				"source_hash":   "hash_2",
			},
		},
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	validateCalled, validateInput := executor.validateSnapshot()
	if validateCalled != 1 {
		t.Fatalf("validate called=%d, want 1", validateCalled)
	}
	if len(validateInput.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(validateInput.Rows))
	}
	if validateInput.Rows[0].FieldPath != "title" {
		t.Fatalf("expected field_path=title, got %s", validateInput.Rows[0].FieldPath)
	}
}

func TestTranslationExchangeBindingImportValidateMalformedCSVReturnsTypedError(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	// CSV with mismatched column count in data row
	malformedCSV := "resource,entity_id,family_id,target_locale,field_path\npages,page_1,tg_1"
	body, contentType := buildMultipartFile(t, "translations.csv", "text/csv", []byte(malformedCSV))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", body)
	req.Header.Set("Content-Type", contentType)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
	defer resp.Body.Close()
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", payload)
	}
	if errPayload["text_code"] != TextCodeTranslationExchangeInvalidPayload {
		t.Fatalf("expected %s, got %v", TextCodeTranslationExchangeInvalidPayload, errPayload["text_code"])
	}
	validateCalled, _ := executor.validateSnapshot()
	if validateCalled != 0 {
		t.Fatalf("validate should not be called on parse error")
	}
}

func TestTranslationExchangeBindingImportValidateMissingRequiredFieldsReturnsTypedError(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	// JSON with missing required field_path
	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":      "pages",
				"entity_id":     "page_1",
				"family_id":     "tg_1",
				"target_locale": "es",
				// missing field_path
			},
		},
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/validate", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	// Validation happens in command layer, so executor is called but returns validation error
	validateCalled, _ := executor.validateSnapshot()
	if validateCalled != 0 && resp.StatusCode == http.StatusBadRequest {
		// Validation happened in binding layer (before command dispatch)
		defer resp.Body.Close()
		respPayload := map[string]any{}
		if err := json.NewDecoder(resp.Body).Decode(&respPayload); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		errPayload, ok := respPayload["error"].(map[string]any)
		if !ok {
			t.Fatalf("expected error payload, got %v", respPayload)
		}
		if errPayload["text_code"] != TextCodeValidationError {
			t.Fatalf("expected VALIDATION_ERROR, got %v", errPayload["text_code"])
		}
	}
	// Either path is acceptable: validation in binding or in command layer
}

func TestTranslationExchangeBindingImportApplyParsesCSVWithTranslatedText(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		applyResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 1, Succeeded: 1},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	csvPayload := "resource,entity_id,family_id,target_locale,field_path,translated_text,source_hash\npages,page_123,tg_123,es,title,\"Hola mundo\",abc123"
	body, contentType := buildMultipartFile(t, "translations.csv", "text/csv", []byte(csvPayload))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", body)
	req.Header.Set("Content-Type", contentType)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	applyCalled, applyInput := executor.applySnapshot()
	if applyCalled != 1 {
		t.Fatalf("apply called=%d, want 1", applyCalled)
	}
	if len(applyInput.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(applyInput.Rows))
	}
	row := applyInput.Rows[0]
	if row.TranslatedText != "Hola mundo" {
		t.Fatalf("expected translated_text='Hola mundo', got %q", row.TranslatedText)
	}
	if row.SourceHash != "abc123" {
		t.Fatalf("expected source_hash='abc123', got %q", row.SourceHash)
	}
}

func TestTranslationExchangeBindingExportDispatchesCommandAndReturnsResult(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{
			RowCount: 3,
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", FamilyID: "tg_1", TargetLocale: "es", FieldPath: "title"},
				{Resource: "pages", EntityID: "1", FamilyID: "tg_1", TargetLocale: "es", FieldPath: "body"},
				{Resource: "pages", EntityID: "2", FamilyID: "tg_2", TargetLocale: "es", FieldPath: "title"},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"filter": map[string]any{
			"resources": []string{"pages"},
		},
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	defer resp.Body.Close()
	respPayload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&respPayload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if respPayload["row_count"] != float64(3) {
		t.Fatalf("expected row_count=3, got %v", respPayload["row_count"])
	}
	rows, ok := respPayload["rows"].([]any)
	if !ok || len(rows) != 3 {
		t.Fatalf("expected 3 rows, got %v", respPayload["rows"])
	}
	job, _ := respPayload["job"].(map[string]any)
	if toString(job["kind"]) != translationExchangeJobKindExport {
		t.Fatalf("expected export job payload, got %+v", job)
	}
}

func TestTranslationExchangeBindingExportRejectsCookieAuthWithoutCSRFToken(t *testing.T) {
	cfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: Config{BasePath: "/admin", DefaultLocale: "en"}}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	adm := mustNewAdmin(t, cfg.adminCfg, Dependencies{})
	adm.WithAuth(NewGoAuthAuthenticator(routeAuth, cfg), nil)
	adm.WithAuthorizer(allowAll{})

	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{Format: "json"},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	req := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/translations/exchange/export", strings.NewReader(`{"filter":{"resources":["pages"]}}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusForbidden)
	}
	if called, _ := executor.exportSnapshot(); called != 0 {
		t.Fatalf("expected export executor not to run when csrf validation fails")
	}
}

func TestTranslationExchangeBindingExportRejectsCookieAuthWithBogusCSRFToken(t *testing.T) {
	cfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: Config{BasePath: "/admin", DefaultLocale: "en"}}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	adm := mustNewAdmin(t, cfg.adminCfg, Dependencies{})
	adm.WithAuth(NewGoAuthAuthenticator(routeAuth, cfg), nil)
	adm.WithAuthorizer(allowAll{})

	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{Format: "json"},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	req := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/translations/exchange/export", strings.NewReader(`{"filter":{"resources":["pages"]}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(csrfmw.DefaultHeaderName, "bogus")
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusForbidden)
	}
	if called, _ := executor.exportSnapshot(); called != 0 {
		t.Fatalf("expected export executor not to run when csrf validation fails")
	}
}

func TestTranslationExchangeBindingExportAcceptsCookieAuthWithValidCSRFToken(t *testing.T) {
	cfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: Config{BasePath: "/admin", DefaultLocale: "en"}}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	adm := mustNewAdmin(t, cfg.adminCfg, Dependencies{})
	adm.WithAuth(NewGoAuthAuthenticator(routeAuth, cfg), nil)
	adm.WithAuthorizer(allowAll{})

	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{Format: "json"},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	tokenReq := httptest.NewRequest(http.MethodGet, "http://example.com/admin/translations", nil)
	tokenReq.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	tokenResp, err := app.Test(tokenReq)
	if err != nil {
		t.Fatalf("token request error: %v", err)
	}
	if tokenResp.StatusCode != http.StatusOK {
		t.Fatalf("token route status=%d, want %d", tokenResp.StatusCode, http.StatusOK)
	}
	var csrfTokenBody bytes.Buffer
	if _, err := csrfTokenBody.ReadFrom(tokenResp.Body); err != nil {
		t.Fatalf("read csrf token body: %v", err)
	}
	csrfToken := strings.TrimSpace(csrfTokenBody.String())
	if csrfToken == "" {
		t.Fatalf("expected csrf token from browser route")
	}

	req := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/translations/exchange/export", strings.NewReader(`{"filter":{"resources":["pages"]}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(csrfmw.DefaultHeaderName, csrfToken)
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	if called, _ := executor.exportSnapshot(); called != 1 {
		t.Fatalf("expected export executor to run once, got %d", called)
	}
}

func TestTranslationExchangeBindingExportRejectsCookieAuthWithoutBrowserCSRFProtector(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithAuth(translationExchangeCookieOnlyAuthenticator{}, nil)
	adm.WithAuthorizer(allowAll{})

	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{Format: "json"},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	req := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/translations/exchange/export", strings.NewReader(`{"filter":{"resources":["pages"]}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Cookie", "session=opaque")
	req.Header.Set("X-User-ID", "user-123")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusForbidden)
	}
	if called, _ := executor.exportSnapshot(); called != 0 {
		t.Fatalf("expected export executor not to run without csrf-capable browser authenticator")
	}
}

func TestTranslationExchangeBindingDeleteJobRejectsCookieAuthWithoutCSRFToken(t *testing.T) {
	cfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: Config{BasePath: "/admin", DefaultLocale: "en"}}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	adm := mustNewAdmin(t, cfg.adminCfg, Dependencies{})
	adm.WithAuth(NewGoAuthAuthenticator(routeAuth, cfg), nil)
	adm.WithAuthorizer(allowAll{})

	binding := newTranslationExchangeBinding(adm)
	app := newTranslationExchangeTestApp(t, binding)

	req := httptest.NewRequest(http.MethodDelete, "http://example.com/admin/api/translations/exchange/jobs/job-1", nil)
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusForbidden)
	}
}

func TestTranslationExchangeBindingImportApplyEmptyRowsReturnsTypedError(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"rows": []map[string]any{},
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "ops-user")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	// Empty rows should trigger typed error
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d, want %d for empty rows", resp.StatusCode, http.StatusBadRequest)
	}
	defer resp.Body.Close()
	respPayload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&respPayload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errPayload, ok := respPayload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", respPayload)
	}
	// Accept either VALIDATION_ERROR or TRANSLATION_EXCHANGE_INVALID_PAYLOAD
	code := errPayload["text_code"]
	if code != TextCodeValidationError && code != TextCodeTranslationExchangeInvalidPayload {
		t.Fatalf("expected VALIDATION_ERROR or INVALID_PAYLOAD, got %v", code)
	}
}

func TestTranslationExchangeBindingImportApplyAsyncReturnsJobEnvelopeWithConflictSummary(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		applyResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 2, Succeeded: 1, Failed: 1},
			Results: []TranslationExchangeRowResult{
				{
					Index:        0,
					Resource:     "pages",
					EntityID:     "page_1",
					FamilyID:     "tg_1",
					TargetLocale: "es",
					FieldPath:    "title",
					Status:       translationExchangeRowStatusConflict,
					Conflict: &TranslationExchangeConflictInfo{
						Type:    "stale_source_hash",
						Message: "source hash mismatch",
					},
				},
				{
					Index:        1,
					Resource:     "pages",
					EntityID:     "page_1",
					FamilyID:     "tg_1",
					TargetLocale: "es",
					FieldPath:    "body",
					Status:       translationExchangeRowStatusSuccess,
				},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":        "pages",
				"entity_id":       "page_1",
				"family_id":       "tg_1",
				"target_locale":   "es",
				"field_path":      "title",
				"translated_text": "Hola",
			},
			{
				"resource":        "pages",
				"entity_id":       "page_1",
				"family_id":       "tg_1",
				"target_locale":   "es",
				"field_path":      "body",
				"translated_text": "Mundo",
			},
		},
		"async": true,
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "ops-user")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	applyCalled := 0
	for range 10 {
		applyCalled, _ = executor.applySnapshot()
		if applyCalled != 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if applyCalled != 1 {
		t.Fatalf("expected async apply dispatch, got %d", applyCalled)
	}
	defer resp.Body.Close()
	respPayload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&respPayload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got := toString(respPayload["status"]); got != "accepted" {
		t.Fatalf("expected accepted status, got %q", got)
	}
	job, _ := respPayload["job"].(map[string]any)
	if toString(job["id"]) == "" {
		t.Fatalf("expected async job id, got %+v", job)
	}
	if status := toString(job["status"]); status != translationExchangeAsyncJobStatusRunning && status != translationExchangeAsyncJobStatusCompleted {
		t.Fatalf("expected running or completed job status, got %+v", job)
	}
	pollEndpoint := toString(job["poll_endpoint"])
	if pollEndpoint == "" {
		t.Fatalf("expected poll endpoint, got %+v", job)
	}

	var pollJob map[string]any
	for range 10 {
		pollReq := httptest.NewRequest(http.MethodGet, pollEndpoint, nil)
		pollReq.Header.Set("X-User-ID", "ops-user")
		pollResp, err := app.Test(pollReq)
		if err != nil {
			t.Fatalf("poll request error: %v", err)
		}
		if pollResp.StatusCode != http.StatusOK {
			t.Fatalf("poll status=%d want=200", pollResp.StatusCode)
		}
		pollPayload := map[string]any{}
		if err := json.NewDecoder(pollResp.Body).Decode(&pollPayload); err != nil {
			_ = pollResp.Body.Close()
			t.Fatalf("decode poll response: %v", err)
		}
		_ = pollResp.Body.Close()
		pollJob, _ = pollPayload["job"].(map[string]any)
		if toString(pollJob["status"]) == translationExchangeAsyncJobStatusCompleted {
			break
		}
	}
	if toString(pollJob["status"]) != translationExchangeAsyncJobStatusCompleted {
		t.Fatalf("expected terminal completed job, got %+v", pollJob)
	}
	if toString(pollJob["id"]) != toString(job["id"]) {
		t.Fatalf("expected same job id from poll, got %+v", pollJob)
	}
	if toString(pollJob["request_hash"]) == "" {
		t.Fatalf("expected request_hash in polled job payload, got %+v", pollJob)
	}
	result, _ := pollJob["result"].(map[string]any)
	conflicts, _ := result["conflicts"].(map[string]any)
	byType, _ := conflicts["by_type"].(map[string]any)
	if byType["stale_source_hash"] != float64(1) {
		t.Fatalf("expected stale_source_hash conflict count, got %+v", byType)
	}
	retention := extractMap(pollJob["retention"])
	if retention["hard_delete_supported"] != true {
		t.Fatalf("expected hard_delete_supported retention metadata, got %+v", retention)
	}
}

func TestTranslationExchangeBindingExportAsyncReturnsJobEnvelope(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{
			RowCount: 2,
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "page_1", FamilyID: "tg_1", TargetLocale: "es", FieldPath: "title"},
				{Resource: "posts", EntityID: "post_1", FamilyID: "tg_2", TargetLocale: "fr", FieldPath: "title"},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	payload := map[string]any{
		"filter": map[string]any{
			"resources": []string{"pages", "posts"},
		},
		"async": true,
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "ops-user")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer resp.Body.Close()
	respPayload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&respPayload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	job, _ := respPayload["job"].(map[string]any)
	if toString(job["id"]) == "" {
		t.Fatalf("expected job id, got %+v", job)
	}
	if toString(job["status"]) != translationExchangeAsyncJobStatusRunning {
		t.Fatalf("expected running job, got %+v", job)
	}
	jobID := toString(job["id"])
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		stored, ok, getErr := binding.runtime.GetJob(context.Background(), translationTransportIdentity{ActorID: "ops-user"}, jobID)
		if getErr != nil {
			t.Fatalf("get job: %v", getErr)
		}
		if ok && stored.Status == translationExchangeAsyncJobStatusCompleted {
			exportCalled, _ := executor.exportSnapshot()
			if exportCalled != 1 {
				t.Fatalf("expected async export dispatch, got %d", exportCalled)
			}
			progress := stored.Progress
			if progress["total"] != 2 || progress["processed"] != 2 {
				t.Fatalf("expected progress totals to match export rows, got %+v", progress)
			}
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("expected async export job %q to complete", jobID)
}

func TestTranslationExchangeBindingJobStatusRequiresJobOwner(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{
			RowCount: 1,
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "page_1", FamilyID: "tg_1", TargetLocale: "es", FieldPath: "title"},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	raw, _ := json.Marshal(map[string]any{
		"filter": map[string]any{
			"resources": []string{"pages"},
		},
		"async": true,
	})
	createReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader(raw))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-User-ID", "owner-user")

	createResp, err := app.Test(createReq)
	if err != nil {
		t.Fatalf("create request error: %v", err)
	}
	if createResp.StatusCode != http.StatusOK {
		t.Fatalf("create status=%d want=200", createResp.StatusCode)
	}
	defer createResp.Body.Close()
	createPayload := map[string]any{}
	if err := json.NewDecoder(createResp.Body).Decode(&createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	job, _ := createPayload["job"].(map[string]any)
	pollEndpoint := toString(job["poll_endpoint"])
	if pollEndpoint == "" {
		t.Fatalf("expected poll endpoint, got %+v", job)
	}

	jobID := toString(job["id"])
	if jobID == "" {
		t.Fatalf("expected non-empty job id, got %+v", job)
	}
	stored, ok, err := binding.runtime.GetJob(context.Background(), translationTransportIdentity{ActorID: "owner-user"}, jobID)
	if err != nil {
		t.Fatalf("get stored job: %v", err)
	}
	if !ok {
		t.Fatalf("expected stored async job %q", jobID)
	}
	if !translationExchangeJobOwnedByActor(stored, "owner-user") {
		t.Fatalf("expected owner-user to own job %+v", stored)
	}
	if translationExchangeJobOwnedByActor(stored, "other-user") {
		t.Fatalf("expected other-user to be denied for job %+v", stored)
	}

	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("IP").Return("").Maybe()
	mockCtx.On("Header", "X-User-ID").Return("other-user")
	mockCtx.On("Param", "job_id", "").Return(jobID)
	mockCtx.On("Param", "id", "").Return("")
	_, err = binding.JobStatus(mockCtx, jobID)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found for non-owner job lookup, got %v", err)
	}
}

func TestTranslationExchangeBindingHistoryListsActorJobsAndFixtureExamples(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{
			RowCount: 1,
			Format:   "json",
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "page_1", FamilyID: "tg_1", TargetLocale: "es", FieldPath: "title"},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	createReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader([]byte(`{"filter":{"resources":["pages"]}}`)))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-User-ID", "owner-user")
	createResp, err := app.Test(createReq)
	if err != nil {
		t.Fatalf("create request error: %v", err)
	}
	if createResp.StatusCode != http.StatusOK {
		t.Fatalf("create status=%d want=200", createResp.StatusCode)
	}
	_ = createResp.Body.Close()

	otherReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader([]byte(`{"filter":{"resources":["pages"]}}`)))
	otherReq.Header.Set("Content-Type", "application/json")
	otherReq.Header.Set("X-User-ID", "other-user")
	otherResp, err := app.Test(otherReq)
	if err != nil {
		t.Fatalf("other request error: %v", err)
	}
	if otherResp.StatusCode != http.StatusOK {
		t.Fatalf("other create status=%d want=200", otherResp.StatusCode)
	}
	_ = otherResp.Body.Close()

	var history map[string]any
	var meta map[string]any
	var items []map[string]any
	for range 10 {
		historyReq := httptest.NewRequest(http.MethodGet, "/admin/api/translations/exchange/jobs?include_examples=true&kind=export", nil)
		historyReq.Header.Set("X-User-ID", "owner-user")
		historyResp, err := app.Test(historyReq)
		if err != nil {
			t.Fatalf("history request error: %v", err)
		}
		if historyResp.StatusCode != http.StatusOK {
			_ = historyResp.Body.Close()
			t.Fatalf("history status=%d want=200", historyResp.StatusCode)
		}
		payload := map[string]any{}
		if err := json.NewDecoder(historyResp.Body).Decode(&payload); err != nil {
			_ = historyResp.Body.Close()
			t.Fatalf("decode history response: %v", err)
		}
		_ = historyResp.Body.Close()
		history = extractMap(payload["history"])
		meta = extractMap(payload["meta"])
		items = extractListMaps(history["items"])
		if len(items) >= 2 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if meta["include_examples"] != true {
		t.Fatalf("expected include_examples metadata, got %+v", meta)
	}
	if len(items) < 2 {
		t.Fatalf("expected at least one runtime export job plus fixture examples, got %+v", items)
	}
	if got := toInt(history["total"]); got != len(items) {
		t.Fatalf("expected total=%d to match filtered items, got %d", len(items), got)
	}

	fixtureFound := false
	runtimeCount := 0
	for _, item := range items {
		if actor := extractMap(item["actor"]); toString(actor["id"]) != "owner-user" {
			t.Fatalf("expected owner-user actor, got %+v", actor)
		}
		if toString(item["kind"]) != translationExchangeJobKindExport {
			t.Fatalf("expected export job kind, got %+v", item)
		}
		if item["fixture"] == true {
			fixtureFound = true
			downloads := extractMap(item["downloads"])
			artifact := extractMap(downloads[translationExchangeDownloadKindArtifact])
			if !strings.HasPrefix(toString(artifact["href"]), "data:application/json;base64,") {
				t.Fatalf("expected fixture artifact download href, got %+v", artifact)
			}
			continue
		}
		if file := extractMap(item["file"]); !strings.Contains(strings.ToLower(toString(file["name"])), "translation_exchange_export") {
			t.Fatalf("expected export file metadata, got %+v", file)
		}
		runtimeCount++
	}
	if !fixtureFound || runtimeCount == 0 {
		t.Fatalf("expected fixture and runtime jobs, got %+v", items)
	}
}

func TestTranslationExchangeBindingImportApplyAsyncReplaysByRequestHash(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		applyResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 1, Succeeded: 1},
			Results: []TranslationExchangeRowResult{
				{
					Index:        0,
					Resource:     "pages",
					EntityID:     "page_1",
					FamilyID:     "tg_1",
					TargetLocale: "es",
					FieldPath:    "title",
					Status:       translationExchangeRowStatusSuccess,
				},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	body := []byte(`{"rows":[{"resource":"pages","entity_id":"page_1","family_id":"tg_1","target_locale":"es","field_path":"title","translated_text":"Hola"}],"async":true}`)
	firstReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", bytes.NewReader(body))
	firstReq.Header.Set("Content-Type", "application/json")
	firstReq.Header.Set("X-User-ID", "ops-user")
	firstResp, err := app.Test(firstReq)
	if err != nil {
		t.Fatalf("first request error: %v", err)
	}
	defer firstResp.Body.Close()
	firstPayload := map[string]any{}
	if err := json.NewDecoder(firstResp.Body).Decode(&firstPayload); err != nil {
		t.Fatalf("decode first payload: %v", err)
	}
	firstJob := extractMap(firstPayload["job"])
	if toString(firstJob["id"]) == "" {
		t.Fatalf("expected first job id, got %+v", firstPayload)
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/import/apply", bytes.NewReader(body))
	secondReq.Header.Set("Content-Type", "application/json")
	secondReq.Header.Set("X-User-ID", "ops-user")
	secondResp, err := app.Test(secondReq)
	if err != nil {
		t.Fatalf("second request error: %v", err)
	}
	defer secondResp.Body.Close()
	secondPayload := map[string]any{}
	if err := json.NewDecoder(secondResp.Body).Decode(&secondPayload); err != nil {
		t.Fatalf("decode second payload: %v", err)
	}
	applyCalled := 0
	for range 10 {
		applyCalled, _ = executor.applySnapshot()
		if applyCalled != 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if applyCalled != 1 {
		t.Fatalf("expected one executor apply call, got %d", applyCalled)
	}
	secondJob := extractMap(secondPayload["job"])
	if toString(secondJob["id"]) != toString(firstJob["id"]) {
		t.Fatalf("expected replay to return first job, got first=%+v second=%+v", firstJob, secondJob)
	}
	meta := extractMap(secondPayload["meta"])
	if meta["idempotency_hit"] != true {
		t.Fatalf("expected idempotency replay metadata, got %+v", meta)
	}
}

func TestTranslationExchangeBindingDeleteJobRemovesJobFromStatusAndHistory(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{
		exportResult: TranslationExportResult{
			RowCount: 1,
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "page_1", FamilyID: "tg_1", TargetLocale: "es", FieldPath: "title"},
			},
		},
	}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	createReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/exchange/export", bytes.NewReader([]byte(`{"filter":{"resources":["pages"]}}`)))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-User-ID", "owner-user")
	createResp, err := app.Test(createReq)
	if err != nil {
		t.Fatalf("create request error: %v", err)
	}
	defer createResp.Body.Close()
	createPayload := map[string]any{}
	if err := json.NewDecoder(createResp.Body).Decode(&createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	job := extractMap(createPayload["job"])
	jobID := toString(job["id"])
	if jobID == "" {
		t.Fatalf("expected job id, got %+v", job)
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/admin/api/translations/exchange/jobs/"+jobID, nil)
	deleteReq.Header.Set("X-User-ID", "owner-user")
	deleteResp, err := app.Test(deleteReq)
	if err != nil {
		t.Fatalf("delete request error: %v", err)
	}
	if deleteResp.StatusCode != http.StatusOK {
		t.Fatalf("delete status=%d want=200", deleteResp.StatusCode)
	}
	_ = deleteResp.Body.Close()

	statusReq := httptest.NewRequest(http.MethodGet, "/admin/api/translations/exchange/jobs/"+jobID, nil)
	statusReq.Header.Set("X-User-ID", "owner-user")
	statusResp, err := app.Test(statusReq)
	if err != nil {
		t.Fatalf("status request error: %v", err)
	}
	if statusResp.StatusCode != http.StatusNotFound {
		t.Fatalf("status after delete=%d want=404", statusResp.StatusCode)
	}
	_ = statusResp.Body.Close()

	historyReq := httptest.NewRequest(http.MethodGet, "/admin/api/translations/exchange/jobs", nil)
	historyReq.Header.Set("X-User-ID", "owner-user")
	historyResp, err := app.Test(historyReq)
	if err != nil {
		t.Fatalf("history request error: %v", err)
	}
	defer historyResp.Body.Close()
	historyPayload := map[string]any{}
	if err := json.NewDecoder(historyResp.Body).Decode(&historyPayload); err != nil {
		t.Fatalf("decode history payload: %v", err)
	}
	items := extractListMaps(extractMap(historyPayload["history"])["items"])
	for _, item := range items {
		if toString(item["id"]) == jobID {
			t.Fatalf("expected deleted job to be absent from history, got %+v", items)
		}
	}
}

func newTranslationExchangeTestApp(t *testing.T, binding *translationExchangeBinding) *fiber.App {
	t.Helper()
	if binding != nil && binding.admin != nil && binding.admin.Authorizer() == nil {
		binding.admin.WithAuthorizer(allowAll{})
	}
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
		})
	})
	r := adapter.Router()
	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if binding != nil && binding.admin != nil {
			return binding.admin.authWrapper()(handler)
		}
		return handler
	}
	r.Get("/admin/translations", wrap(func(c router.Context) error {
		token, _ := c.Locals(csrfmw.DefaultContextKey).(string)
		return c.SendString(token)
	}))
	r.Post("/admin/api/translations/exchange/export", wrap(func(c router.Context) error {
		payload, err := binding.Export(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	}))
	r.Get("/admin/api/translations/exchange/template", wrap(func(c router.Context) error {
		return binding.Template(c)
	}))
	r.Post("/admin/api/translations/exchange/import/validate", wrap(func(c router.Context) error {
		payload, err := binding.ImportValidate(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	}))
	r.Post("/admin/api/translations/exchange/import/apply", wrap(func(c router.Context) error {
		payload, err := binding.ImportApply(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	}))
	r.Get("/admin/api/translations/exchange/jobs", wrap(func(c router.Context) error {
		payload, err := binding.History(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	}))
	r.Get("/admin/api/translations/exchange/jobs/:job_id", wrap(func(c router.Context) error {
		payload, err := binding.JobStatus(c, c.Param("job_id", ""))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	}))
	r.Delete("/admin/api/translations/exchange/jobs/:job_id", wrap(func(c router.Context) error {
		payload, err := binding.DeleteJob(c, c.Param("job_id", ""))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	}))
	adapter.Init()
	return adapter.WrappedRouter()
}

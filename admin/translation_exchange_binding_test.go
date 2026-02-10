package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	router "github.com/goliatone/go-router"
)

type stubTranslationExchangeExecutor struct {
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
	s.exportCalled++
	s.exportInput = input
	return s.exportResult, nil
}

func (s *stubTranslationExchangeExecutor) Validate(_ context.Context, input TranslationImportValidateInput) (TranslationExchangeResult, error) {
	s.validateCalled++
	s.validateInput = input
	return s.validateResult, nil
}

func (s *stubTranslationExchangeExecutor) Apply(_ context.Context, input TranslationImportApplyInput) (TranslationExchangeResult, error) {
	s.applyCalled++
	s.applyInput = input
	return s.applyResult, nil
}

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
					Index:              0,
					Resource:           "pages",
					EntityID:           "page_123",
					TranslationGroupID: "tg_123",
					TargetLocale:       "es",
					FieldPath:          "title",
					Status:             translationExchangeRowStatusConflict,
					Error:              "row linkage could not be resolved",
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

	csvPayload := "resource,entity_id,translation_group_id,target_locale,field_path,source_text,source_hash\npages,page_123,tg_123,es,title,Hello world,abc123"
	body, contentType := buildMultipartFile(t, "translations.csv", "text/csv", []byte(csvPayload))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/import/validate", body)
	req.Header.Set("Content-Type", contentType)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	if executor.validateCalled != 1 {
		t.Fatalf("validate called=%d, want 1", executor.validateCalled)
	}
	if len(executor.validateInput.Rows) != 1 {
		t.Fatalf("rows=%d, want 1", len(executor.validateInput.Rows))
	}
	row := executor.validateInput.Rows[0]
	if row.Resource != "pages" || row.EntityID != "page_123" || row.TranslationGroupID != "tg_123" {
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
					Index:              0,
					Resource:           "pages",
					EntityID:           "page_123",
					TranslationGroupID: "tg_123",
					TargetLocale:       "es",
					FieldPath:          "title",
					Status:             translationExchangeRowStatusSuccess,
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
				"resource":             "pages",
				"entity_id":            "page_123",
				"translation_group_id": "tg_123",
				"target_locale":        "es",
				"field_path":           "title",
				"translated_text":      "Hola mundo",
			},
		},
		"create_translation":         true,
		"allow_source_hash_override": true,
		"continue_on_error":          true,
		"dry_run":                    true,
	}
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/import/apply", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusOK)
	}
	if executor.applyCalled != 1 {
		t.Fatalf("apply called=%d, want 1", executor.applyCalled)
	}
	if !executor.applyInput.AllowCreateMissing {
		t.Fatalf("expected AllowCreateMissing=true")
	}
	if !executor.applyInput.AllowSourceHashOverride {
		t.Fatalf("expected AllowSourceHashOverride=true")
	}
	if !executor.applyInput.ContinueOnError {
		t.Fatalf("expected ContinueOnError=true")
	}
	if !executor.applyInput.DryRun {
		t.Fatalf("expected DryRun=true")
	}
}

func TestTranslationExchangeBindingImportValidateRejectsUnsupportedFormatWithTypedCode(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	executor := &stubTranslationExchangeExecutor{}
	binding := newTranslationExchangeBinding(adm)
	binding.executor = executor
	app := newTranslationExchangeTestApp(t, binding)

	body, contentType := buildMultipartFile(t, "translations.xml", "text/xml", []byte("<x/>"))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/import/validate", body)
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
	if executor.validateCalled != 0 {
		t.Fatalf("validate should not be called on parse error")
	}
}

func newTranslationExchangeTestApp(t *testing.T, binding *translationExchangeBinding) *fiber.App {
	t.Helper()
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
		})
	})
	r := adapter.Router()
	r.Post("/admin/api/translations/export", func(c router.Context) error {
		payload, err := binding.Export(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/template", func(c router.Context) error {
		return binding.Template(c)
	})
	r.Post("/admin/api/translations/import/validate", func(c router.Context) error {
		payload, err := binding.ImportValidate(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/import/apply", func(c router.Context) error {
		payload, err := binding.ImportApply(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	adapter.Init()
	return adapter.WrappedRouter()
}

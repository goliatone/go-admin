package admin

import (
	"context"
	"errors"
	"testing"
)

type stubTranslationExchangeStore struct {
	resolve map[string]TranslationExchangeLinkage
	apply   []TranslationExchangeApplyRequest
}

func (s *stubTranslationExchangeStore) ExportRows(_ context.Context, _ TranslationExportFilter) ([]TranslationExchangeRow, error) {
	return nil, nil
}

func (s *stubTranslationExchangeStore) ResolveLinkage(_ context.Context, key TranslationExchangeLinkageKey) (TranslationExchangeLinkage, error) {
	if s == nil || s.resolve == nil {
		return TranslationExchangeLinkage{}, ErrTranslationExchangeLinkageNotFound
	}
	val, ok := s.resolve[key.String()]
	if !ok {
		return TranslationExchangeLinkage{}, ErrTranslationExchangeLinkageNotFound
	}
	return val, nil
}

func (s *stubTranslationExchangeStore) ApplyTranslation(_ context.Context, req TranslationExchangeApplyRequest) error {
	s.apply = append(s.apply, req)
	return nil
}

func TestResolveTranslationExchangeLinkageKeyCanonicalizesDeterministically(t *testing.T) {
	row := TranslationExchangeRow{
		Resource:           "  Pages ",
		EntityID:           " 123 ",
		TranslationGroupID: " tg_1 ",
		TargetLocale:       " ES ",
		FieldPath:          " title ",
	}

	key, err := ResolveTranslationExchangeLinkageKey(row)
	if err != nil {
		t.Fatalf("expected key, got %v", err)
	}
	if key.Resource != "pages" {
		t.Fatalf("expected normalized resource, got %q", key.Resource)
	}
	if key.TargetLocale != "es" {
		t.Fatalf("expected normalized locale, got %q", key.TargetLocale)
	}
	if got := key.String(); got != "pages::123::tg_1::es::title" {
		t.Fatalf("unexpected deterministic key: %q", got)
	}
}

func TestTranslationExchangeServiceValidateImportDetectsSourceHashConflict(t *testing.T) {
	store := &stubTranslationExchangeStore{
		resolve: map[string]TranslationExchangeLinkage{
			"pages::1::tg_1::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "1",
					TranslationGroupID: "tg_1",
					TargetLocale:       "es",
					FieldPath:          "title",
				},
				SourceHash: "current_hash",
			},
		},
	}
	service := NewTranslationExchangeService(store)
	result, err := service.ValidateImport(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				SourceHash:         "stale_hash",
			},
		},
	})
	if err != nil {
		t.Fatalf("validate import failed: %v", err)
	}
	if len(result.Results) != 1 {
		t.Fatalf("expected one result, got %d", len(result.Results))
	}
	row := result.Results[0]
	if row.Status != translationExchangeRowStatusConflict {
		t.Fatalf("expected conflict status, got %q", row.Status)
	}
	if row.Conflict == nil || row.Conflict.Type != "stale_source_hash" {
		t.Fatalf("expected stale_source_hash conflict, got %+v", row.Conflict)
	}
	if code := toString(row.Metadata["error_code"]); code != TextCodeTranslationExchangeStaleSourceHash {
		t.Fatalf("expected stale_source_hash error_code, got %q", code)
	}
}

func TestTranslationExchangeServiceApplyImportRequiresCreateIntentForMissingTarget(t *testing.T) {
	store := &stubTranslationExchangeStore{
		resolve: map[string]TranslationExchangeLinkage{
			"pages::1::tg_1::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "1",
					TranslationGroupID: "tg_1",
					TargetLocale:       "es",
					FieldPath:          "title",
				},
				TargetExists: false,
			},
		},
	}
	service := NewTranslationExchangeService(store)
	result, err := service.ApplyImport(context.Background(), TranslationImportApplyInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola",
			},
		},
		ContinueOnError: true,
	})
	if err != nil {
		t.Fatalf("apply import failed: %v", err)
	}
	if len(result.Results) != 1 {
		t.Fatalf("expected one result, got %d", len(result.Results))
	}
	if result.Results[0].Status != translationExchangeRowStatusError {
		t.Fatalf("expected error status, got %q", result.Results[0].Status)
	}
	if code := toString(result.Results[0].Metadata["error_code"]); code != TextCodeTranslationExchangeInvalidPayload {
		t.Fatalf("expected invalid payload error_code, got %q", code)
	}
	if len(store.apply) != 0 {
		t.Fatalf("expected no writes without explicit create intent")
	}
}

func TestTranslationExchangeServiceApplyImportContinueOnErrorFalseSkipsRemainingRows(t *testing.T) {
	store := &stubTranslationExchangeStore{
		resolve: map[string]TranslationExchangeLinkage{
			"pages::1::tg_1::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "1",
					TranslationGroupID: "tg_1",
					TargetLocale:       "es",
					FieldPath:          "title",
				},
				TargetExists: false,
			},
			"pages::2::tg_2::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "2",
					TranslationGroupID: "tg_2",
					TargetLocale:       "es",
					FieldPath:          "title",
				},
				TargetExists: true,
			},
		},
	}
	service := NewTranslationExchangeService(store)

	result, err := service.ApplyImport(context.Background(), TranslationImportApplyInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola",
			},
			{
				Resource:           "pages",
				EntityID:           "2",
				TranslationGroupID: "tg_2",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Bonjour",
			},
		},
		ContinueOnError: false,
	})
	if err != nil {
		t.Fatalf("apply import failed: %v", err)
	}
	if len(result.Results) != 2 {
		t.Fatalf("expected two results, got %d", len(result.Results))
	}
	if result.Results[0].Status != translationExchangeRowStatusError {
		t.Fatalf("expected first row error, got %q", result.Results[0].Status)
	}
	if result.Results[1].Status != translationExchangeRowStatusSkipped {
		t.Fatalf("expected second row skipped, got %q", result.Results[1].Status)
	}
	if len(store.apply) != 0 {
		t.Fatalf("expected no writes after first error with continue_on_error=false")
	}
}

func TestTranslationExchangeServiceApplyImportForcesDraftWorkflowStatus(t *testing.T) {
	store := &stubTranslationExchangeStore{
		resolve: map[string]TranslationExchangeLinkage{
			"pages::1::tg_1::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "1",
					TranslationGroupID: "tg_1",
					TargetLocale:       "es",
					FieldPath:          "title",
				},
				TargetExists: true,
			},
		},
	}
	service := NewTranslationExchangeService(store)
	result, err := service.ApplyImport(context.Background(), TranslationImportApplyInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola",
				Status:             "published",
			},
		},
		ContinueOnError: true,
	})
	if err != nil {
		t.Fatalf("apply import failed: %v", err)
	}
	if len(result.Results) != 1 || result.Results[0].Status != translationExchangeRowStatusSuccess {
		t.Fatalf("expected successful apply, got %+v", result.Results)
	}
	if len(store.apply) != 1 {
		t.Fatalf("expected one write, got %d", len(store.apply))
	}
	if store.apply[0].WorkflowStatus != translationExchangeWorkflowDraft {
		t.Fatalf("expected workflow status %q, got %q", translationExchangeWorkflowDraft, store.apply[0].WorkflowStatus)
	}
}

func TestTranslationExchangeServiceValidateImportHandlesUnexpectedResolveErrors(t *testing.T) {
	errBoom := errors.New("boom")
	store := &stubTranslationExchangeStore{
		resolve: map[string]TranslationExchangeLinkage{},
	}
	service := NewTranslationExchangeService(store)
	store.resolve = nil
	service.store = &resolveErrorStore{err: errBoom}
	result, err := service.ValidateImport(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
			},
		},
	})
	if err != nil {
		t.Fatalf("validate import failed: %v", err)
	}
	if len(result.Results) != 1 || result.Results[0].Status != translationExchangeRowStatusError {
		t.Fatalf("expected row error for resolve failure, got %+v", result.Results)
	}
}

type resolveErrorStore struct {
	err error
}

func (s *resolveErrorStore) ExportRows(_ context.Context, _ TranslationExportFilter) ([]TranslationExchangeRow, error) {
	return nil, nil
}

func (s *resolveErrorStore) ResolveLinkage(_ context.Context, _ TranslationExchangeLinkageKey) (TranslationExchangeLinkage, error) {
	return TranslationExchangeLinkage{}, s.err
}

func (s *resolveErrorStore) ApplyTranslation(_ context.Context, _ TranslationExchangeApplyRequest) error {
	return nil
}

package admin

import (
	"context"
	"errors"
	"sync"
	"testing"
)

type stubTranslationExchangeStore struct {
	mu      sync.Mutex
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
	s.mu.Lock()
	defer s.mu.Unlock()
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

func TestTranslationExchangeServiceValidateImportIncludesCreateHintForMissingTargets(t *testing.T) {
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
	result, err := service.ValidateImport(context.Background(), TranslationImportValidateInput{
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
	})
	if err != nil {
		t.Fatalf("validate import failed: %v", err)
	}
	if len(result.Results) != 1 || result.Results[0].Status != translationExchangeRowStatusSuccess {
		t.Fatalf("expected successful validate result, got %+v", result.Results)
	}
	if hint, _ := result.Results[0].Metadata["create_translation_hint"].(bool); !hint {
		t.Fatalf("expected create_translation_hint=true, got %+v", result.Results[0].Metadata)
	}
}

func TestTranslationExchangeServiceApplyImportSupportsExplicitRowResolutions(t *testing.T) {
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
				SourceHash:   "current_hash",
				TargetExists: true,
			},
			"pages::2::tg_2::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "2",
					TranslationGroupID: "tg_2",
					TargetLocale:       "es",
					FieldPath:          "title",
				},
				TargetExists: false,
			},
			"pages::3::tg_3::es::title": {
				Key: TranslationExchangeLinkageKey{
					Resource:           "pages",
					EntityID:           "3",
					TranslationGroupID: "tg_3",
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
				Index:              0,
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola",
				SourceHash:         "stale_hash",
			},
			{
				Index:              1,
				Resource:           "pages",
				EntityID:           "2",
				TranslationGroupID: "tg_2",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Bonjour",
			},
			{
				Index:              2,
				Resource:           "pages",
				EntityID:           "3",
				TranslationGroupID: "tg_3",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Ciao",
			},
		},
		ContinueOnError: true,
		Resolutions: []TranslationExchangeConflictResolution{
			{Row: 0, Decision: translationExchangeResolutionOverrideSourceHash, ConflictType: translationExchangeConflictTypeStaleSource},
			{Row: 1, Decision: translationExchangeResolutionCreateMissing},
			{Row: 2, Decision: translationExchangeResolutionSkip},
		},
	})
	if err != nil {
		t.Fatalf("apply import failed: %v", err)
	}
	if len(result.Results) != 3 {
		t.Fatalf("expected three results, got %d", len(result.Results))
	}
	if result.Results[0].Status != translationExchangeRowStatusSuccess {
		t.Fatalf("expected first row success, got %+v", result.Results[0])
	}
	if override, _ := result.Results[0].Metadata["source_hash_override"].(bool); !override {
		t.Fatalf("expected source_hash_override=true, got %+v", result.Results[0].Metadata)
	}
	if result.Results[1].Status != translationExchangeRowStatusSuccess {
		t.Fatalf("expected second row success, got %+v", result.Results[1])
	}
	if decision := toString(result.Results[1].Metadata["resolution_decision"]); decision != translationExchangeResolutionCreateMissing {
		t.Fatalf("expected create_missing resolution metadata, got %+v", result.Results[1].Metadata)
	}
	if result.Results[2].Status != translationExchangeRowStatusSkipped {
		t.Fatalf("expected third row skipped, got %+v", result.Results[2])
	}
	if decision := toString(result.Results[2].Metadata["resolution_decision"]); decision != translationExchangeResolutionSkip {
		t.Fatalf("expected skip resolution metadata, got %+v", result.Results[2].Metadata)
	}
	if len(store.apply) != 2 {
		t.Fatalf("expected two writes after one skip, got %d", len(store.apply))
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

func TestTranslationExchangeServiceApplyImportDedupesRepeatedWritesByLinkageAndPayloadHash(t *testing.T) {
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
	input := TranslationImportApplyInput{
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
	}

	first, err := service.ApplyImport(context.Background(), input)
	if err != nil {
		t.Fatalf("first apply import failed: %v", err)
	}
	second, err := service.ApplyImport(context.Background(), input)
	if err != nil {
		t.Fatalf("second apply import failed: %v", err)
	}
	if len(store.apply) != 1 {
		t.Fatalf("expected a single write across replayed applies, got %d", len(store.apply))
	}
	if hit, _ := second.Results[0].Metadata["idempotency_hit"].(bool); !hit {
		t.Fatalf("expected idempotency_hit=true on replay, got %+v", second.Results[0].Metadata)
	}
	if first.Results[0].Metadata["payload_hash"] == "" || second.Results[0].Metadata["payload_hash"] == "" {
		t.Fatalf("expected payload hashes in row metadata, got first=%+v second=%+v", first.Results[0].Metadata, second.Results[0].Metadata)
	}
}

func TestTranslationExchangeServiceApplyImportStressRemainsDeterministicForLargeJobs(t *testing.T) {
	resolve := map[string]TranslationExchangeLinkage{}
	rows := make([]TranslationExchangeRow, 0, 50_000)
	for i := range 50_000 {
		entityID := "page_" + itoa(i)
		groupID := "tg_" + itoa(i)
		key := TranslationExchangeLinkageKey{
			Resource:           "pages",
			EntityID:           entityID,
			TranslationGroupID: groupID,
			TargetLocale:       "es",
			FieldPath:          "title",
		}
		resolve[key.String()] = TranslationExchangeLinkage{Key: key, TargetExists: true}
		rows = append(rows, TranslationExchangeRow{
			Resource:           "pages",
			EntityID:           entityID,
			TranslationGroupID: groupID,
			TargetLocale:       "es",
			FieldPath:          "title",
			TranslatedText:     "Hola " + itoa(i),
		})
	}
	store := &stubTranslationExchangeStore{resolve: resolve}
	service := NewTranslationExchangeService(store)

	first, err := service.ApplyImport(context.Background(), TranslationImportApplyInput{
		Rows:            rows,
		ContinueOnError: true,
	})
	if err != nil {
		t.Fatalf("first stress apply failed: %v", err)
	}
	second, err := service.ApplyImport(context.Background(), TranslationImportApplyInput{
		Rows:            rows,
		ContinueOnError: true,
	})
	if err != nil {
		t.Fatalf("second stress apply failed: %v", err)
	}
	if first.Summary.Processed != 50_000 || second.Summary.Processed != 50_000 {
		t.Fatalf("expected both runs to process 50k rows, got first=%+v second=%+v", first.Summary, second.Summary)
	}
	if len(store.apply) != 50_000 {
		t.Fatalf("expected only initial writes to hit the store, got %d", len(store.apply))
	}
	if first.Summary.Succeeded != second.Summary.Succeeded || first.Summary.Failed != second.Summary.Failed {
		t.Fatalf("expected deterministic summaries, got first=%+v second=%+v", first.Summary, second.Summary)
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

func TestTranslationExchangeServiceValidateImportMissingTranslationGroupIDReturnsInvalidPayload(t *testing.T) {
	service := NewTranslationExchangeService(&stubTranslationExchangeStore{})
	result, err := service.ValidateImport(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:     "pages",
				EntityID:     "1",
				TargetLocale: "es",
				FieldPath:    "title",
			},
		},
	})
	if err != nil {
		t.Fatalf("validate import failed: %v", err)
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
}

func TestTranslationExchangeServiceValidateImportInvalidLocaleFieldPathReturnsMissingLinkageConflict(t *testing.T) {
	service := NewTranslationExchangeService(&stubTranslationExchangeStore{resolve: map[string]TranslationExchangeLinkage{}})
	result, err := service.ValidateImport(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "zz-invalid",
				FieldPath:          "unsupported.field",
			},
		},
	})
	if err != nil {
		t.Fatalf("validate import failed: %v", err)
	}
	if len(result.Results) != 1 {
		t.Fatalf("expected one result, got %d", len(result.Results))
	}
	if result.Results[0].Status != translationExchangeRowStatusConflict {
		t.Fatalf("expected conflict status, got %q", result.Results[0].Status)
	}
	if code := toString(result.Results[0].Metadata["error_code"]); code != TextCodeTranslationExchangeMissingLinkage {
		t.Fatalf("expected missing linkage error_code, got %q", code)
	}
}

func TestTranslationExchangeServiceValidateImportDuplicateRowsReturnConflict(t *testing.T) {
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
				SourceHash:         "current_hash",
			},
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				SourceHash:         "current_hash",
			},
		},
	})
	if err != nil {
		t.Fatalf("validate import failed: %v", err)
	}
	if len(result.Results) != 2 {
		t.Fatalf("expected two results, got %d", len(result.Results))
	}
	if result.Results[0].Status != translationExchangeRowStatusSuccess {
		t.Fatalf("expected first row success, got %q", result.Results[0].Status)
	}
	if result.Results[1].Status != translationExchangeRowStatusConflict {
		t.Fatalf("expected duplicate row conflict, got %q", result.Results[1].Status)
	}
	if code := toString(result.Results[1].Metadata["error_code"]); code != TextCodeTranslationExchangeDuplicateRow {
		t.Fatalf("expected duplicate row error_code, got %q", code)
	}
	if duplicateOf := result.Results[1].Metadata["duplicate_of_row"]; duplicateOf != 0 {
		t.Fatalf("expected duplicate_of_row=0, got %v", duplicateOf)
	}
	if result.Summary.Conflicts != 1 || !result.Summary.PartialSuccess {
		t.Fatalf("expected summary conflict/partial success, got %+v", result.Summary)
	}
}

func TestTranslationExchangeServiceApplyImportDuplicateRowsSkipSecondWrite(t *testing.T) {
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
			},
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola 2",
			},
		},
		ContinueOnError: true,
	})
	if err != nil {
		t.Fatalf("apply import failed: %v", err)
	}
	if len(result.Results) != 2 {
		t.Fatalf("expected two results, got %d", len(result.Results))
	}
	if result.Results[0].Status != translationExchangeRowStatusSuccess {
		t.Fatalf("expected first row success, got %q", result.Results[0].Status)
	}
	if result.Results[1].Status != translationExchangeRowStatusConflict {
		t.Fatalf("expected duplicate row conflict, got %q", result.Results[1].Status)
	}
	if len(store.apply) != 1 {
		t.Fatalf("expected one write for duplicate rows, got %d", len(store.apply))
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

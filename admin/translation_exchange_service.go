package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
)

var (
	// ErrTranslationExchangeLinkageNotFound indicates missing deterministic row linkage.
	ErrTranslationExchangeLinkageNotFound = errors.New("translation exchange linkage not found")
)

type TranslationExchangeLinkageKey struct {
	Resource           string
	EntityID           string
	TranslationGroupID string
	TargetLocale       string
	FieldPath          string
}

func (k TranslationExchangeLinkageKey) String() string {
	return strings.Join([]string{
		strings.TrimSpace(k.Resource),
		strings.TrimSpace(k.EntityID),
		strings.TrimSpace(k.TranslationGroupID),
		strings.TrimSpace(k.TargetLocale),
		strings.TrimSpace(k.FieldPath),
	}, "::")
}

type TranslationExchangeLinkage struct {
	Key          TranslationExchangeLinkageKey
	SourceHash   string
	TargetExists bool
}

type TranslationExchangeApplyRequest struct {
	Key               TranslationExchangeLinkageKey
	TranslatedText    string
	CreateTranslation bool
	WorkflowStatus    string
}

// TranslationExchangeStore abstracts deterministic linkage resolution and row writes.
type TranslationExchangeStore interface {
	ExportRows(ctx context.Context, filter TranslationExportFilter) ([]TranslationExchangeRow, error)
	ResolveLinkage(ctx context.Context, key TranslationExchangeLinkageKey) (TranslationExchangeLinkage, error)
	ApplyTranslation(ctx context.Context, req TranslationExchangeApplyRequest) error
}

// TranslationExchangeService contains transport-agnostic exchange domain behavior.
type TranslationExchangeService struct {
	store TranslationExchangeStore
}

func NewTranslationExchangeService(store TranslationExchangeStore) *TranslationExchangeService {
	return &TranslationExchangeService{store: store}
}

func (s *TranslationExchangeService) Export(ctx context.Context, input TranslationExportInput) (TranslationExportResult, error) {
	if s == nil || s.store == nil {
		return TranslationExportResult{}, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}
	rows, err := s.store.ExportRows(ctx, input.Filter)
	if err != nil {
		return TranslationExportResult{}, err
	}
	if input.Filter.IncludeSourceHash {
		for i := range rows {
			if strings.TrimSpace(rows[i].SourceHash) == "" {
				rows[i].SourceHash = translationExchangeSourceHash(rows[i].SourceText)
			}
		}
	}
	return TranslationExportResult{
		RowCount: len(rows),
		Rows:     rows,
	}, nil
}

func (s *TranslationExchangeService) ValidateImport(ctx context.Context, input TranslationImportValidateInput) (TranslationExchangeResult, error) {
	if s == nil || s.store == nil {
		return TranslationExchangeResult{}, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}
	result := TranslationExchangeResult{
		Results:   make([]TranslationExchangeRowResult, 0, len(input.Rows)),
		TotalRows: len(input.Rows),
	}
	seen := map[string]int{}
	for i, row := range input.Rows {
		rowResult := translationExchangeRowResult(i, row)
		key, err := ResolveTranslationExchangeLinkageKey(row)
		if err != nil {
			rowResult.Status = translationExchangeRowStatusError
			rowResult.Error = err.Error()
			rowResult.Metadata = map[string]any{
				"error_code": TextCodeTranslationExchangeInvalidPayload,
			}
			result.Add(rowResult)
			continue
		}
		keyString := key.String()
		if firstIndex, duplicate := seen[keyString]; duplicate {
			rowResult.Status = translationExchangeRowStatusConflict
			rowResult.Error = "duplicate row linkage in import payload"
			rowResult.Conflict = &TranslationExchangeConflictInfo{
				Type:    "duplicate_row",
				Message: "duplicate linkage key in import payload",
			}
			rowResult.Metadata = map[string]any{
				"error_code":       TextCodeTranslationExchangeInvalidPayload,
				"duplicate_of_row": firstIndex,
			}
			result.Add(rowResult)
			continue
		}
		seen[keyString] = rowResult.Index
		linkage, err := s.store.ResolveLinkage(ctx, key)
		if err != nil {
			if errors.Is(err, ErrTranslationExchangeLinkageNotFound) || errors.Is(err, ErrNotFound) {
				rowResult.Status = translationExchangeRowStatusConflict
				rowResult.Error = "row linkage could not be resolved"
				rowResult.Conflict = &TranslationExchangeConflictInfo{
					Type:    "missing_linkage",
					Message: "resource/entity linkage not found",
				}
				rowResult.Metadata = map[string]any{
					"error_code": TextCodeTranslationExchangeMissingLinkage,
				}
				result.Add(rowResult)
				continue
			}
			rowResult.Status = translationExchangeRowStatusError
			rowResult.Error = err.Error()
			result.Add(rowResult)
			continue
		}
		if hasSourceHashConflict(row, linkage) {
			rowResult.Status = translationExchangeRowStatusConflict
			rowResult.Error = "source hash mismatch"
			rowResult.Conflict = &TranslationExchangeConflictInfo{
				Type:               "stale_source_hash",
				Message:            "source hash mismatch",
				CurrentSourceHash:  strings.TrimSpace(linkage.SourceHash),
				ProvidedSourceHash: normalizeProvidedSourceHash(row),
			}
			rowResult.Metadata = map[string]any{
				"error_code":           TextCodeTranslationExchangeStaleSourceHash,
				"current_source_hash":  strings.TrimSpace(linkage.SourceHash),
				"provided_source_hash": normalizeProvidedSourceHash(row),
			}
			result.Add(rowResult)
			continue
		}
		rowResult.Status = translationExchangeRowStatusSuccess
		result.Add(rowResult)
	}
	return result, nil
}

func (s *TranslationExchangeService) ApplyImport(ctx context.Context, input TranslationImportApplyInput) (TranslationExchangeResult, error) {
	if s == nil || s.store == nil {
		return TranslationExchangeResult{}, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}

	result := TranslationExchangeResult{
		Results:   make([]TranslationExchangeRowResult, 0, len(input.Rows)),
		TotalRows: len(input.Rows),
	}
	seen := map[string]int{}

	for i, row := range input.Rows {
		rowResult := translationExchangeRowResult(i, row)

		key, err := ResolveTranslationExchangeLinkageKey(row)
		if err != nil {
			rowResult.Status = translationExchangeRowStatusError
			rowResult.Error = err.Error()
			rowResult.Metadata = map[string]any{
				"error_code": TextCodeTranslationExchangeInvalidPayload,
			}
			result.Add(rowResult)
			if !input.ContinueOnError {
				appendSkippedRows(&result, input.Rows, i+1)
				break
			}
			continue
		}
		keyString := key.String()
		if firstIndex, duplicate := seen[keyString]; duplicate {
			rowResult.Status = translationExchangeRowStatusConflict
			rowResult.Error = "duplicate row linkage in import payload"
			rowResult.Conflict = &TranslationExchangeConflictInfo{
				Type:    "duplicate_row",
				Message: "duplicate linkage key in import payload",
			}
			rowResult.Metadata = map[string]any{
				"error_code":       TextCodeTranslationExchangeInvalidPayload,
				"duplicate_of_row": firstIndex,
			}
			result.Add(rowResult)
			if !input.ContinueOnError {
				appendSkippedRows(&result, input.Rows, i+1)
				break
			}
			continue
		}
		seen[keyString] = rowResult.Index

		linkage, err := s.store.ResolveLinkage(ctx, key)
		if err != nil {
			if errors.Is(err, ErrTranslationExchangeLinkageNotFound) || errors.Is(err, ErrNotFound) {
				rowResult.Status = translationExchangeRowStatusConflict
				rowResult.Error = "row linkage could not be resolved"
				rowResult.Conflict = &TranslationExchangeConflictInfo{
					Type:    "missing_linkage",
					Message: "resource/entity linkage not found",
				}
				rowResult.Metadata = map[string]any{
					"error_code": TextCodeTranslationExchangeMissingLinkage,
				}
			} else {
				rowResult.Status = translationExchangeRowStatusError
				rowResult.Error = err.Error()
			}
			result.Add(rowResult)
			if !input.ContinueOnError {
				appendSkippedRows(&result, input.Rows, i+1)
				break
			}
			continue
		}

		if !input.AllowSourceHashOverride && hasSourceHashConflict(row, linkage) {
			rowResult.Status = translationExchangeRowStatusConflict
			rowResult.Error = "source hash mismatch"
			rowResult.Conflict = &TranslationExchangeConflictInfo{
				Type:               "stale_source_hash",
				Message:            "source hash mismatch",
				CurrentSourceHash:  strings.TrimSpace(linkage.SourceHash),
				ProvidedSourceHash: normalizeProvidedSourceHash(row),
			}
			rowResult.Metadata = map[string]any{
				"error_code":           TextCodeTranslationExchangeStaleSourceHash,
				"current_source_hash":  strings.TrimSpace(linkage.SourceHash),
				"provided_source_hash": normalizeProvidedSourceHash(row),
			}
			result.Add(rowResult)
			if !input.ContinueOnError {
				appendSkippedRows(&result, input.Rows, i+1)
				break
			}
			continue
		}

		createTranslation := !linkage.TargetExists
		if createTranslation && !input.AllowCreateMissing {
			rowResult.Status = translationExchangeRowStatusError
			rowResult.Error = "target locale record missing; explicit create intent required"
			rowResult.Metadata = map[string]any{
				"create_translation_required": true,
				"error_code":                  TextCodeTranslationExchangeInvalidPayload,
			}
			result.Add(rowResult)
			if !input.ContinueOnError {
				appendSkippedRows(&result, input.Rows, i+1)
				break
			}
			continue
		}

		if input.DryRun {
			rowResult.Status = translationExchangeRowStatusSuccess
			rowResult.Metadata = map[string]any{
				"dry_run": true,
			}
			result.Add(rowResult)
			continue
		}

		err = s.store.ApplyTranslation(ctx, TranslationExchangeApplyRequest{
			Key:               key,
			TranslatedText:    strings.TrimSpace(row.TranslatedText),
			CreateTranslation: createTranslation,
			WorkflowStatus:    translationExchangeWorkflowDraft,
		})
		if err != nil {
			rowResult.Status = translationExchangeRowStatusError
			rowResult.Error = err.Error()
			result.Add(rowResult)
			if !input.ContinueOnError {
				appendSkippedRows(&result, input.Rows, i+1)
				break
			}
			continue
		}

		rowResult.Status = translationExchangeRowStatusSuccess
		rowResult.Metadata = map[string]any{
			"create_translation": createTranslation,
			"workflow_status":    translationExchangeWorkflowDraft,
		}
		result.Add(rowResult)
	}

	return result, nil
}

// ResolveTranslationExchangeLinkageKey canonicalizes deterministic row linkage identifiers.
func ResolveTranslationExchangeLinkageKey(row TranslationExchangeRow) (TranslationExchangeLinkageKey, error) {
	key := TranslationExchangeLinkageKey{
		Resource:           strings.ToLower(strings.TrimSpace(row.Resource)),
		EntityID:           strings.TrimSpace(row.EntityID),
		TranslationGroupID: strings.TrimSpace(row.TranslationGroupID),
		TargetLocale:       strings.ToLower(strings.TrimSpace(row.TargetLocale)),
		FieldPath:          strings.TrimSpace(row.FieldPath),
	}
	if key.Resource == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("resource", map[string]any{"component": "translation_exchange"})
	}
	if key.EntityID == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("entity_id", map[string]any{"component": "translation_exchange"})
	}
	if key.TranslationGroupID == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("translation_group_id", map[string]any{"component": "translation_exchange"})
	}
	if key.TargetLocale == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("target_locale", map[string]any{"component": "translation_exchange"})
	}
	if key.FieldPath == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("field_path", map[string]any{"component": "translation_exchange"})
	}
	return key, nil
}

func translationExchangeSourceHash(sourceText string) string {
	hash := sha256.Sum256([]byte(strings.TrimSpace(sourceText)))
	return hex.EncodeToString(hash[:])
}

func hasSourceHashConflict(row TranslationExchangeRow, linkage TranslationExchangeLinkage) bool {
	provided := normalizeProvidedSourceHash(row)
	current := strings.TrimSpace(strings.ToLower(linkage.SourceHash))
	if provided == "" || current == "" {
		return false
	}
	return provided != current
}

func normalizeProvidedSourceHash(row TranslationExchangeRow) string {
	if sourceHash := strings.TrimSpace(strings.ToLower(row.SourceHash)); sourceHash != "" {
		return sourceHash
	}
	if sourceText := strings.TrimSpace(row.SourceText); sourceText != "" {
		return strings.ToLower(translationExchangeSourceHash(sourceText))
	}
	return ""
}

func translationExchangeRowResult(index int, row TranslationExchangeRow) TranslationExchangeRowResult {
	out := TranslationExchangeRowResult{
		Index:              row.Index,
		Resource:           strings.TrimSpace(row.Resource),
		EntityID:           strings.TrimSpace(row.EntityID),
		TranslationGroupID: strings.TrimSpace(row.TranslationGroupID),
		TargetLocale:       strings.TrimSpace(row.TargetLocale),
		FieldPath:          strings.TrimSpace(row.FieldPath),
	}
	if out.Index <= 0 {
		out.Index = index
	}
	return out
}

func appendSkippedRows(result *TranslationExchangeResult, rows []TranslationExchangeRow, from int) {
	if result == nil {
		return
	}
	for i := from; i < len(rows); i++ {
		rowResult := translationExchangeRowResult(i, rows[i])
		rowResult.Status = translationExchangeRowStatusSkipped
		rowResult.Error = "skipped due to previous row failure and continue_on_error=false"
		result.Add(rowResult)
	}
}

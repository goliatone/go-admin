package admin

const (
	translationExchangeRowStatusSuccess  = "success"
	translationExchangeRowStatusError    = "error"
	translationExchangeRowStatusConflict = "conflict"
	translationExchangeRowStatusSkipped  = "skipped"

	translationExchangeWorkflowDraft  = "draft"
	translationExchangeWorkflowReview = "review"
)

// TranslationExchangeRow defines a normalized translation row used by command handlers.
type TranslationExchangeRow struct {
	Index              int            `json:"index,omitempty"`
	Resource           string         `json:"resource"`
	EntityID           string         `json:"entity_id"`
	TranslationGroupID string         `json:"translation_group_id"`
	SourceLocale       string         `json:"source_locale,omitempty"`
	TargetLocale       string         `json:"target_locale"`
	FieldPath          string         `json:"field_path"`
	SourceText         string         `json:"source_text,omitempty"`
	TranslatedText     string         `json:"translated_text,omitempty"`
	SourceHash         string         `json:"source_hash,omitempty"`
	Path               string         `json:"path,omitempty"`
	Title              string         `json:"title,omitempty"`
	Status             string         `json:"status,omitempty"`
	Notes              string         `json:"notes,omitempty"`
	Metadata           map[string]any `json:"metadata,omitempty"`
}

// TranslationExportFilter captures normalized export criteria.
type TranslationExportFilter struct {
	Resources         []string       `json:"resources"`
	EntityIDs         []string       `json:"entity_ids,omitempty"`
	SourceLocale      string         `json:"source_locale,omitempty"`
	TargetLocales     []string       `json:"target_locales,omitempty"`
	FieldPaths        []string       `json:"field_paths,omitempty"`
	IncludeSourceHash bool           `json:"include_source_hash,omitempty"`
	Options           map[string]any `json:"options,omitempty"`
}

// TranslationExportResult captures exported rows and aggregate metadata.
type TranslationExportResult struct {
	RowCount int                      `json:"row_count"`
	Format   string                   `json:"format,omitempty"`
	Rows     []TranslationExchangeRow `json:"rows,omitempty"`
}

// TranslationExchangeSummary captures aggregate validate/apply outcomes.
type TranslationExchangeSummary struct {
	Processed int `json:"processed"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
}

// TranslationExchangeConflictInfo captures deterministic row conflict metadata.
type TranslationExchangeConflictInfo struct {
	Type               string `json:"type"`
	Message            string `json:"message,omitempty"`
	CurrentSourceHash  string `json:"current_source_hash,omitempty"`
	ProvidedSourceHash string `json:"provided_source_hash,omitempty"`
}

// TranslationExchangeRowResult captures per-row validate/apply status.
type TranslationExchangeRowResult struct {
	Index              int                              `json:"index"`
	Resource           string                           `json:"resource"`
	EntityID           string                           `json:"entity_id"`
	TranslationGroupID string                           `json:"translation_group_id"`
	TargetLocale       string                           `json:"target_locale"`
	FieldPath          string                           `json:"field_path"`
	Status             string                           `json:"status"`
	Error              string                           `json:"error,omitempty"`
	Conflict           *TranslationExchangeConflictInfo `json:"conflict,omitempty"`
	Metadata           map[string]any                   `json:"metadata,omitempty"`
}

// TranslationExchangeResult captures structured validate/apply responses.
type TranslationExchangeResult struct {
	Summary   TranslationExchangeSummary     `json:"summary"`
	Results   []TranslationExchangeRowResult `json:"results"`
	TotalRows int                            `json:"total_rows,omitempty"`
}

// Add appends a row result and updates aggregate counters.
func (r *TranslationExchangeResult) Add(row TranslationExchangeRowResult) {
	if r == nil {
		return
	}
	row.Status = normalizeTranslationExchangeRowStatus(row.Status)
	r.Results = append(r.Results, row)
	r.Summary.Processed++
	switch row.Status {
	case translationExchangeRowStatusSuccess:
		r.Summary.Succeeded++
	case translationExchangeRowStatusError, translationExchangeRowStatusConflict:
		r.Summary.Failed++
	}
}

// TranslationImportRunResult captures the optional run-command two-step result.
type TranslationImportRunResult struct {
	Validate TranslationExchangeResult `json:"validate"`
	Apply    TranslationExchangeResult `json:"apply"`
}

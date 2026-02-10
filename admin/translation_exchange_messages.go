package admin

import "strings"

const (
	translationExportCommandName         = "admin.translations.exchange.export"
	translationImportValidateCommandName = "admin.translations.exchange.import.validate"
	translationImportApplyCommandName    = "admin.translations.exchange.import.apply"
	translationImportRunCommandName      = "admin.translations.exchange.import.run"
)

// TranslationExportInput is the typed export command input.
type TranslationExportInput struct {
	Filter TranslationExportFilter  `json:"filter"`
	Output *TranslationExportResult `json:"-"`
}

func (TranslationExportInput) Type() string { return translationExportCommandName }

func (m TranslationExportInput) Validate() error {
	if len(m.Filter.Resources) == 0 {
		return validationDomainError("resources required", map[string]any{
			"field": "resources",
		})
	}
	return nil
}

// TranslationImportValidateInput is the typed import-validate command input.
type TranslationImportValidateInput struct {
	Rows   []TranslationExchangeRow   `json:"rows"`
	Result *TranslationExchangeResult `json:"-"`
}

func (TranslationImportValidateInput) Type() string { return translationImportValidateCommandName }

func (m TranslationImportValidateInput) Validate() error {
	return validateExchangeRows(m.Rows, false)
}

// TranslationImportApplyInput is the typed import-apply command input.
type TranslationImportApplyInput struct {
	Rows                    []TranslationExchangeRow   `json:"rows"`
	AllowCreateMissing      bool                       `json:"allow_create_missing,omitempty"`
	AllowSourceHashOverride bool                       `json:"allow_source_hash_override,omitempty"`
	ContinueOnError         bool                       `json:"continue_on_error,omitempty"`
	DryRun                  bool                       `json:"dry_run,omitempty"`
	Result                  *TranslationExchangeResult `json:"-"`
}

func (TranslationImportApplyInput) Type() string { return translationImportApplyCommandName }

func (m TranslationImportApplyInput) Validate() error {
	return validateExchangeRows(m.Rows, true)
}

// TranslationImportRunInput is an optional typed wrapper that composes validate+apply.
type TranslationImportRunInput struct {
	ValidateInput TranslationImportValidateInput `json:"validate"`
	ApplyInput    TranslationImportApplyInput    `json:"apply"`
	Result        *TranslationImportRunResult    `json:"-"`
}

func (TranslationImportRunInput) Type() string { return translationImportRunCommandName }

func (m TranslationImportRunInput) Validate() error {
	if err := m.ValidateInput.Validate(); err != nil {
		return err
	}
	return m.ApplyInput.Validate()
}

func validateExchangeRows(rows []TranslationExchangeRow, requireTranslatedText bool) error {
	if len(rows) == 0 {
		return validationDomainError("rows required", map[string]any{
			"field": "rows",
		})
	}
	for i, row := range rows {
		index := row.Index
		if index <= 0 {
			index = i
		}
		if strings.TrimSpace(row.Resource) == "" {
			return validationDomainError("row resource required", map[string]any{
				"field": "resource",
				"row":   index,
			})
		}
		if strings.TrimSpace(row.EntityID) == "" {
			return validationDomainError("row entity_id required", map[string]any{
				"field": "entity_id",
				"row":   index,
			})
		}
		if strings.TrimSpace(row.TranslationGroupID) == "" {
			return validationDomainError("row translation_group_id required", map[string]any{
				"field": "translation_group_id",
				"row":   index,
			})
		}
		if strings.TrimSpace(row.TargetLocale) == "" {
			return validationDomainError("row target_locale required", map[string]any{
				"field": "target_locale",
				"row":   index,
			})
		}
		if strings.TrimSpace(row.FieldPath) == "" {
			return validationDomainError("row field_path required", map[string]any{
				"field": "field_path",
				"row":   index,
			})
		}
		if requireTranslatedText && strings.TrimSpace(row.TranslatedText) == "" {
			return validationDomainError("row translated_text required", map[string]any{
				"field": "translated_text",
				"row":   index,
			})
		}
	}
	return nil
}

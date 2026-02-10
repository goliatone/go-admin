package admin

import (
	"encoding/json"
	"strings"
)

// RegisterTranslationExchangeCommandFactories installs name-based factory dispatch for exchange commands.
func RegisterTranslationExchangeCommandFactories(bus *CommandBus) error {
	if err := RegisterMessageFactory(bus, translationExportCommandName, buildTranslationExportInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationImportValidateCommandName, buildTranslationImportValidateInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationImportApplyCommandName, buildTranslationImportApplyInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationImportRunCommandName, buildTranslationImportRunInput); err != nil {
		return err
	}
	return RegisterMessageFactory(bus, translationImportRunTriggerCommandName, buildTranslationImportRunTriggerInput)
}

func buildTranslationExportInput(payload map[string]any, _ []string) (TranslationExportInput, error) {
	if payload == nil {
		return TranslationExportInput{}, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	filterPayload := extractMap(payload["filter"])
	if len(filterPayload) == 0 {
		filterPayload = payload
	}

	input := TranslationExportInput{
		Filter: TranslationExportFilter{
			Resources: nonEmptyStrings(
				toStringSlice(filterPayload["resources"]),
				toStringSlice(filterPayload["resource"]),
			),
			EntityIDs: nonEmptyStrings(
				toStringSlice(filterPayload["entity_ids"]),
				toStringSlice(filterPayload["entity_id"]),
				toStringSlice(filterPayload["ids"]),
				[]string{toString(filterPayload["id"])},
			),
			SourceLocale: strings.TrimSpace(firstNonEmpty(
				toString(filterPayload["source_locale"]),
				toString(filterPayload["locale"]),
			)),
			TargetLocales: nonEmptyStrings(
				toStringSlice(filterPayload["target_locales"]),
				toStringSlice(filterPayload["target_locale"]),
			),
			FieldPaths: nonEmptyStrings(
				toStringSlice(filterPayload["field_paths"]),
				toStringSlice(filterPayload["field_path"]),
			),
			IncludeSourceHash: resolveBoolField(filterPayload, payload, "include_source_hash"),
			Options:           extractMap(filterPayload["options"]),
		},
	}
	if len(input.Filter.Resources) == 0 {
		return input, validationDomainError("resources required", map[string]any{
			"field": "resources",
		})
	}
	return input, nil
}

func buildTranslationImportValidateInput(payload map[string]any, _ []string) (TranslationImportValidateInput, error) {
	rowsPayload, err := resolveRowsPayload(payload, nil, "rows")
	if err != nil {
		return TranslationImportValidateInput{}, err
	}
	msg := TranslationImportValidateInput{Rows: rowsPayload}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationImportApplyInput(payload map[string]any, _ []string) (TranslationImportApplyInput, error) {
	applyPayload := extractMap(payload["apply"])
	rowsPayload, err := resolveRowsPayload(payload, applyPayload, "rows")
	if err != nil {
		return TranslationImportApplyInput{}, err
	}
	msg := TranslationImportApplyInput{
		Rows:                    rowsPayload,
		AllowCreateMissing:      exchangeCreateTranslationRequested(applyPayload) || exchangeCreateTranslationRequested(payload),
		AllowSourceHashOverride: resolveBoolField(applyPayload, payload, "allow_source_hash_override"),
		ContinueOnError:         resolveBoolField(applyPayload, payload, "continue_on_error"),
		DryRun:                  resolveBoolField(applyPayload, payload, "dry_run"),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationImportRunInput(payload map[string]any, _ []string) (TranslationImportRunInput, error) {
	if payload == nil {
		return TranslationImportRunInput{}, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	validatePayload := extractMap(payload["validate"])
	applyPayload := extractMap(payload["apply"])

	validateRows, err := resolveRowsPayload(payload, validatePayload, "rows")
	if err != nil {
		return TranslationImportRunInput{}, err
	}
	applyRows, err := resolveRowsPayload(payload, applyPayload, "rows")
	if err != nil {
		return TranslationImportRunInput{}, err
	}

	msg := TranslationImportRunInput{
		ValidateInput: TranslationImportValidateInput{
			Rows: validateRows,
		},
		ApplyInput: TranslationImportApplyInput{
			Rows:                    applyRows,
			AllowCreateMissing:      exchangeCreateTranslationRequested(applyPayload) || exchangeCreateTranslationRequested(payload),
			AllowSourceHashOverride: resolveBoolField(applyPayload, payload, "allow_source_hash_override"),
			ContinueOnError:         resolveBoolField(applyPayload, payload, "continue_on_error"),
			DryRun:                  resolveBoolField(applyPayload, payload, "dry_run"),
		},
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationImportRunTriggerInput(payload map[string]any, _ []string) (TranslationImportRunTriggerInput, error) {
	if len(payload) == 0 {
		return TranslationImportRunTriggerInput{}, nil
	}
	runInput, err := buildTranslationImportRunInput(payload, nil)
	if err != nil {
		return TranslationImportRunTriggerInput{}, err
	}
	return TranslationImportRunTriggerInput{
		RunInput: &runInput,
	}, nil
}

func resolveRowsPayload(root map[string]any, nested map[string]any, field string) ([]TranslationExchangeRow, error) {
	if root == nil {
		return nil, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	var rowsRaw any
	if nested != nil {
		rowsRaw = nested[field]
	}
	if rowsRaw == nil {
		rowsRaw = root[field]
	}
	if rowsRaw == nil {
		return nil, validationDomainError("rows required", map[string]any{
			"field": field,
		})
	}
	return decodeTranslationExchangeRows(rowsRaw, field)
}

func decodeTranslationExchangeRows(raw any, field string) ([]TranslationExchangeRow, error) {
	switch typed := raw.(type) {
	case []TranslationExchangeRow:
		return append([]TranslationExchangeRow{}, typed...), nil
	}

	encoded, err := json.Marshal(raw)
	if err != nil {
		return nil, validationDomainError("rows must be an array", map[string]any{
			"field": field,
		})
	}
	rows := []TranslationExchangeRow{}
	if err := json.Unmarshal(encoded, &rows); err != nil {
		return nil, validationDomainError("rows must be an array", map[string]any{
			"field": field,
		})
	}
	return rows, nil
}

func resolveBoolField(primary, fallback map[string]any, key string) bool {
	if primary != nil {
		if raw, ok := primary[key]; ok {
			return toBool(raw)
		}
	}
	if fallback == nil {
		return false
	}
	return toBool(fallback[key])
}

package admin

import "encoding/json"

func settingsDocumentSizeError() error {
	return validationDomainError("settings document exceeds size limit", nil)
}

// Size is measured on compact canonical JSON, never the database's formatting.
// PostgreSQL adds at most one space per separator to canonical writes; allow that
// bounded read envelope before decoding, then enforce the canonical byte limit.
func canonicalSettingsDocument(raw []byte, limit int) (map[string]any, []byte, error) {
	if len(raw) > limit && len(raw)-limit > limit {
		return nil, nil, settingsDocumentSizeError()
	}
	values := map[string]any{}
	if len(raw) != 0 {
		if err := decodeDocumentJSON(raw, &values); err != nil {
			return nil, nil, err
		}
	}
	if values == nil {
		return nil, nil, validationDomainError("invalid settings document", nil)
	}
	if err := normalizeSettingsDocumentNumbers(values, limit); err != nil {
		return nil, nil, err
	}
	encoded, err := json.Marshal(values)
	if err != nil {
		return nil, nil, err
	}
	if len(encoded) > limit {
		return nil, nil, settingsDocumentSizeError()
	}
	return values, encoded, nil
}

func normalizeSettingsDocumentNumbers(value any, limit int) error {
	switch values := value.(type) {
	case map[string]any:
		for key, child := range values {
			normalized, err := normalizeSettingsDocumentValue(child, limit)
			if err != nil {
				return err
			}
			values[key] = normalized
		}
	case []any:
		for index, child := range values {
			normalized, err := normalizeSettingsDocumentValue(child, limit)
			if err != nil {
				return err
			}
			values[index] = normalized
		}
	}
	return nil
}

func normalizeSettingsDocumentValue(value any, limit int) (any, error) {
	if number, ok := value.(json.Number); ok {
		return canonicalSettingsNumber(number, limit)
	}
	return value, normalizeSettingsDocumentNumbers(value, limit)
}

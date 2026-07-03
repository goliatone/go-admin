package services

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

func toBool(value any, fallback bool) bool {
	if parsed, ok := primitives.BoolFromAny(value); ok {
		return parsed
	}
	return fallback
}

func toTime(value any) (*time.Time, error) {
	raw := strings.TrimSpace(primitives.StringFromAny(value))
	if raw == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, err
	}
	parsed = parsed.UTC()
	return &parsed, nil
}

func parseJSONMap(raw []byte) (map[string]any, error) {
	if len(raw) == 0 {
		return map[string]any{}, nil
	}
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func toBytesJSON(payload any) []byte {
	if payload == nil {
		return nil
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil
	}
	return raw
}

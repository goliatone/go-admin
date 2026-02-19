package admin

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"reflect"

	router "github.com/goliatone/go-router"
)

// WidgetPayload is the canonical widget payload container.
// Providers must return typed structs (or pointers to structs) wrapped in WidgetPayload.
type WidgetPayload struct {
	value any
}

// WidgetPayloadOf wraps a typed payload for dashboard providers.
func WidgetPayloadOf[T any](value T) WidgetPayload {
	return WidgetPayload{value: value}
}

// EmptyWidgetPayload returns an empty payload object.
func EmptyWidgetPayload() WidgetPayload {
	return WidgetPayload{value: struct{}{}}
}

// Value returns the wrapped payload value.
func (p WidgetPayload) Value() any {
	return p.value
}

// DecodeWidgetConfig strictly decodes provider config into a typed struct.
// Unknown fields are rejected.
func DecodeWidgetConfig[T any](cfg map[string]any) (T, error) {
	var out T
	raw := []byte("{}")
	if cfg != nil {
		encoded, err := json.Marshal(cfg)
		if err != nil {
			return out, fmt.Errorf("encode widget config: %w", err)
		}
		raw = encoded
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&out); err != nil {
		return out, fmt.Errorf("decode widget config: %w", err)
	}
	if err := ensureDashboardJSONEOF(dec); err != nil {
		return out, fmt.Errorf("decode widget config trailing data: %w", err)
	}
	return out, nil
}

func encodeWidgetPayload(payload WidgetPayload) (map[string]any, error) {
	value := payload.value
	if value == nil {
		return map[string]any{}, nil
	}
	if isNilWidgetPayloadValue(value) {
		return map[string]any{}, nil
	}
	if err := validateWidgetPayloadRoot(value); err != nil {
		return nil, err
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode widget payload: %w", err)
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	out := map[string]any{}
	if err := dec.Decode(&out); err != nil {
		return nil, fmt.Errorf("decode widget payload object: %w", err)
	}
	if err := ensureDashboardJSONEOF(dec); err != nil {
		return nil, fmt.Errorf("decode widget payload trailing data: %w", err)
	}
	out = sanitizeDashboardWidgetData(out)
	serialized, err := router.SerializeAsContext(out)
	if err != nil {
		return nil, fmt.Errorf("serialize widget payload context: %w", err)
	}
	return serialized, nil
}

func validateWidgetPayloadRoot(value any) error {
	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return nil
	}
	for rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return nil
		}
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Struct {
		return fmt.Errorf("widget payload root must be struct or pointer to struct, got %T", value)
	}
	return nil
}

func isNilWidgetPayloadValue(value any) bool {
	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return true
	}
	for rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return true
		}
		rv = rv.Elem()
	}
	return false
}

func ensureDashboardJSONEOF(dec *json.Decoder) error {
	var trailing any
	err := dec.Decode(&trailing)
	if err == io.EOF {
		return nil
	}
	if err != nil {
		return err
	}
	return io.ErrUnexpectedEOF
}

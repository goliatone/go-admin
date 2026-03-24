package primitives

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

var trueStringValues = map[string]bool{
	"1":    true,
	"t":    true,
	"true": true,
	"y":    true,
	"yes":  true,
	"on":   true,
}

var falseStringValues = map[string]bool{
	"0":     true,
	"f":     true,
	"false": true,
	"n":     true,
	"no":    true,
	"off":   true,
}

// StringFromAny converts common scalar values into a trimmed string.
func StringFromAny(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(typed)
	case []byte:
		return strings.TrimSpace(string(typed))
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
	}
}

// BoolFromAny converts common scalar values into a boolean.
func BoolFromAny(value any) (bool, bool) {
	switch typed := value.(type) {
	case nil:
		return false, false
	case bool:
		return typed, true
	case string:
		normalized := strings.ToLower(strings.TrimSpace(typed))
		if normalized == "" {
			return false, false
		}
		if trueStringValues[normalized] {
			return true, true
		}
		if falseStringValues[normalized] {
			return false, true
		}
		return false, false
	case int:
		return typed != 0, true
	case int8:
		return typed != 0, true
	case int16:
		return typed != 0, true
	case int32:
		return typed != 0, true
	case int64:
		return typed != 0, true
	case uint:
		return typed != 0, true
	case uint8:
		return typed != 0, true
	case uint16:
		return typed != 0, true
	case uint32:
		return typed != 0, true
	case uint64:
		return typed != 0, true
	case float32:
		if !isFiniteFloat64(float64(typed)) {
			return false, false
		}
		return typed != 0, true
	case float64:
		if !isFiniteFloat64(typed) {
			return false, false
		}
		return typed != 0, true
	default:
		return false, false
	}
}

// IntFromAny converts common scalar values into int when the value fits.
func IntFromAny(value any) (int, bool) {
	switch typed := value.(type) {
	case nil:
		return 0, false
	case int:
		return typed, true
	case int8:
		return int(typed), true
	case int16:
		return int(typed), true
	case int32:
		return int(typed), true
	case int64:
		return intFromInt64(typed)
	case uint:
		return IntFromUint(typed)
	case uint8:
		return int(typed), true
	case uint16:
		return int(typed), true
	case uint32:
		return IntFromUint64(uint64(typed))
	case uint64:
		return IntFromUint64(typed)
	case float32:
		return intFromFloat64(float64(typed))
	case float64:
		return intFromFloat64(typed)
	case string:
		return intFromString(typed)
	default:
		return 0, false
	}
}

// Int64FromAny converts common scalar values into int64 when the value fits.
func Int64FromAny(value any) (int64, bool) {
	switch typed := value.(type) {
	case nil:
		return 0, false
	case int:
		return int64(typed), true
	case int8:
		return int64(typed), true
	case int16:
		return int64(typed), true
	case int32:
		return int64(typed), true
	case int64:
		return typed, true
	case uint:
		return Int64FromUint(typed)
	case uint8:
		return int64(typed), true
	case uint16:
		return int64(typed), true
	case uint32:
		return int64(typed), true
	case uint64:
		return Int64FromUint64(typed)
	case float32:
		return int64FromFloat64(float64(typed))
	case float64:
		return int64FromFloat64(typed)
	case string:
		return int64FromString(typed)
	default:
		return 0, false
	}
}

// Float64FromAny converts common scalar values into float64.
func Float64FromAny(value any) (float64, bool) {
	switch typed := value.(type) {
	case nil:
		return 0, false
	case float64:
		if !isFiniteFloat64(typed) {
			return 0, false
		}
		return typed, true
	case float32:
		value := float64(typed)
		if !isFiniteFloat64(value) {
			return 0, false
		}
		return value, true
	case int:
		return float64(typed), true
	case int8:
		return float64(typed), true
	case int16:
		return float64(typed), true
	case int32:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case uint:
		return float64(typed), true
	case uint8:
		return float64(typed), true
	case uint16:
		return float64(typed), true
	case uint32:
		return float64(typed), true
	case uint64:
		return float64(typed), true
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0, false
		}
		parsed, err := strconv.ParseFloat(trimmed, 64)
		if err != nil || !isFiniteFloat64(parsed) {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

// StringSliceFromAny normalizes []string and []any into a trimmed string slice.
func StringSliceFromAny(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case []string:
		return normalizeStringSlice(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			text := StringFromAny(item)
			if text == "" {
				continue
			}
			out = append(out, text)
		}
		return normalizeStringSlice(out)
	default:
		return nil
	}
}

// CSVStringSliceFromAny normalizes strings and arrays into a trimmed string slice.
func CSVStringSliceFromAny(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case string:
		return splitCSVStrings(typed)
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			out = append(out, splitCSVStrings(item)...)
		}
		return normalizeStringSlice(out)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			out = append(out, splitCSVStrings(StringFromAny(item))...)
		}
		return normalizeStringSlice(out)
	default:
		text := StringFromAny(value)
		if text == "" {
			return nil
		}
		return splitCSVStrings(text)
	}
}

func normalizeStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func splitCSVStrings(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	return normalizeStringSlice(parts)
}

func intFromString(value string) (int, bool) {
	if int64Value, ok := int64FromString(value); ok {
		return intFromInt64(int64Value)
	}
	return 0, false
}

func int64FromString(value string) (int64, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, false
	}
	if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
		return parsed, true
	}
	if parsed, err := strconv.ParseUint(value, 10, 64); err == nil {
		return Int64FromUint64(parsed)
	}
	if parsed, err := strconv.ParseFloat(value, 64); err == nil {
		return int64FromFloat64(parsed)
	}
	return 0, false
}

func intFromFloat64(value float64) (int, bool) {
	if !isFiniteFloat64(value) {
		return 0, false
	}
	truncated := math.Trunc(value)
	maxInt := float64(int(^uint(0) >> 1))
	minInt := -maxInt - 1
	if truncated < minInt || truncated > maxInt {
		return 0, false
	}
	return int(truncated), true
}

func int64FromFloat64(value float64) (int64, bool) {
	if !isFiniteFloat64(value) {
		return 0, false
	}
	truncated := math.Trunc(value)
	if truncated < math.MinInt64 || truncated > math.MaxInt64 {
		return 0, false
	}
	return int64(truncated), true
}

func intFromInt64(value int64) (int, bool) {
	maxInt := int64(^uint(0) >> 1)
	minInt := -maxInt - 1
	if value < minInt || value > maxInt {
		return 0, false
	}
	return int(value), true
}

func isFiniteFloat64(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

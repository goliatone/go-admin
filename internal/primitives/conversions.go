package primitives

import (
	"fmt"
	"math"
	"reflect"
	"sort"
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

// FirstNonEmptyFromAny converts values to strings and returns the first non-empty result.
func FirstNonEmptyFromAny(values ...any) string {
	for _, value := range values {
		if text := StringFromAny(value); text != "" {
			return text
		}
	}
	return ""
}

// BoolFromAny converts common scalar values into a boolean.
func BoolFromAny(value any) (bool, bool) {
	switch typed := value.(type) {
	case nil:
		return false, false
	case bool:
		return typed, true
	case string:
		return boolFromString(typed)
	default:
		number, ok := numericFloat64(value)
		if !ok || !isFiniteFloat64(number) {
			return false, false
		}
		return number != 0, true
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
		number, ok := numericFloat64(value)
		if !ok || !isFiniteFloat64(number) {
			return 0, false
		}
		return number, true
	}
}

func boolFromString(value string) (bool, bool) {
	normalized := strings.ToLower(strings.TrimSpace(value))
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
}

func numericFloat64(value any) (float64, bool) {
	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return 0, false
	}
	switch rv.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(rv.Int()), true
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(rv.Uint()), true
	case reflect.Float32, reflect.Float64:
		return rv.Float(), true
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
		return NormalizeStringSlice(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			text := StringFromAny(item)
			if text == "" {
				continue
			}
			out = append(out, text)
		}
		return NormalizeStringSlice(out)
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
		return NormalizeStringSlice(out)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			out = append(out, splitCSVStrings(StringFromAny(item))...)
		}
		return NormalizeStringSlice(out)
	default:
		text := StringFromAny(value)
		if text == "" {
			return nil
		}
		return splitCSVStrings(text)
	}
}

// CSVStringSliceFromAnyEmpty normalizes strings and arrays, returning an empty slice when empty.
func CSVStringSliceFromAnyEmpty(value any) []string {
	out := CSVStringSliceFromAny(value)
	if out == nil {
		return []string{}
	}
	return out
}

// NormalizeStringSlice trims values and removes blank entries, returning nil when empty.
func NormalizeStringSlice(values []string) []string {
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

// NormalizeStringSliceEmpty trims values and removes blank entries, returning an empty slice when empty.
func NormalizeStringSliceEmpty(values []string) []string {
	out := NormalizeStringSlice(values)
	if out == nil {
		return []string{}
	}
	return out
}

// NormalizeUniqueStringSlice trims values, removes blanks, and keeps first occurrences.
func NormalizeUniqueStringSlice(values []string) []string {
	return normalizeUniqueStringSlice(values, false, false)
}

// NormalizeUniqueStringSliceEmpty trims values, removes blanks, keeps first occurrences, and returns an empty slice when empty.
func NormalizeUniqueStringSliceEmpty(values []string) []string {
	out := normalizeUniqueStringSlice(values, false, true)
	if out == nil {
		return []string{}
	}
	return out
}

// NormalizeUniqueStringSliceFold trims values and removes duplicates case-insensitively.
func NormalizeUniqueStringSliceFold(values []string) []string {
	return normalizeUniqueStringSlice(values, true, false)
}

// NormalizeLowerUniqueStringSlice trims, lowercases, dedupes, and returns nil when empty.
func NormalizeLowerUniqueStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// NormalizeLowerUniqueStringSliceSorted trims, lowercases, dedupes, sorts, and returns nil when empty.
func NormalizeLowerUniqueStringSliceSorted(values []string) []string {
	out := NormalizeLowerUniqueStringSlice(values)
	if len(out) == 0 {
		return nil
	}
	sort.Strings(out)
	return out
}

func normalizeUniqueStringSlice(values []string, fold bool, emptyOnEmpty bool) []string {
	if len(values) == 0 {
		if emptyOnEmpty {
			return []string{}
		}
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := trimmed
		if fold {
			key = strings.ToLower(key)
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 && !emptyOnEmpty {
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
	return NormalizeStringSlice(parts)
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

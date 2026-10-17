package quickstart

import (
	"bytes"
	"encoding/json"
	"math/big"
	"reflect"
	"strings"

	"github.com/goliatone/go-export/export"
)

// Native tracker/job decoding uses float64 for interface-valued JSON. A digest
// of the retained bytes alone does not guarantee that generation uses the same
// numeric values. Reject lossy queued inputs before returning a usable review.
func legacyRequestReplaySafe(payload []byte, native export.ExportRequest) error {
	if len(payload) == 0 {
		return nil // The existing queued-request guard handles absent requests.
	}
	var exact export.ExportRequest
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	if err := decoder.Decode(&exact); err != nil {
		return durableExportInvalid("invalid retained legacy request")
	}
	values := make([]any, 2)
	for i, request := range []export.ExportRequest{exact, native} {
		raw, err := json.Marshal(request)
		if err != nil {
			return durableExportInvalid("invalid retained legacy request")
		}
		decoder = json.NewDecoder(bytes.NewReader(raw))
		decoder.UseNumber()
		if err = decoder.Decode(&values[i]); err != nil {
			return durableExportInvalid("invalid retained legacy request")
		}
	}
	if !legacyJSONEqual(values[0], values[1]) {
		return durableExportInvalid("retained legacy request loses numeric precision during native replay")
	}
	return nil
}

func legacyJSONEqual(exact, native any) bool {
	switch value := exact.(type) {
	case map[string]any:
		other, ok := native.(map[string]any)
		if !ok || len(value) != len(other) {
			return false
		}
		for key, child := range value {
			next, exists := other[key]
			if !exists || !legacyJSONEqual(child, next) {
				return false
			}
		}
		return true
	case []any:
		other, ok := native.([]any)
		if !ok || len(value) != len(other) {
			return false
		}
		for i, child := range value {
			if !legacyJSONEqual(child, other[i]) {
				return false
			}
		}
		return true
	case json.Number:
		other, ok := native.(json.Number)
		return ok && legacyNumberKey(value) == legacyNumberKey(other)
	default:
		return reflect.DeepEqual(exact, native)
	}
}

// Normalize exact decimal digits and a decimal exponent without allocating a
// power of ten. Equivalent spellings (1, 1.0, 1e0) remain valid, including zero
// with arbitrarily large exponents; typed int64 fields retain their precision.
func legacyNumberKey(number json.Number) string {
	value := number.String()
	sign := ""
	if strings.HasPrefix(value, "-") {
		sign, value = "-", value[1:]
	}
	var exponent big.Int
	if index := strings.IndexAny(value, "eE"); index >= 0 {
		exponent.SetString(value[index+1:], 10) // JSON decoding validated the exponent.
		value = value[:index]
	}
	fractional := 0
	if index := strings.IndexByte(value, '.'); index >= 0 {
		fractional = len(value) - index - 1
		value = value[:index] + value[index+1:]
	}
	value = strings.TrimLeft(value, "0")
	if value == "" {
		return "0"
	}
	digits := strings.TrimRight(value, "0")
	exponent.Add(&exponent, big.NewInt(int64(len(value)-len(digits)-fractional)))
	return sign + digits + "e" + exponent.String()
}

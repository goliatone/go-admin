package admin

import (
	"encoding/json"
	"math/big"
	"reflect"
	"regexp"
	"strconv"
	"strings"
)

var settingsNumberPattern = regexp.MustCompile(`^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$`)

// A normalized decimal coefficient/exponent compares exact JSON numbers without
// float conversion or allocating a potentially enormous expanded exponent.
type settingsNumber struct {
	negative bool
	digits   string
	exponent big.Int
}

func parseSettingsNumber(text string) (settingsNumber, bool) {
	parts := settingsNumberPattern.FindStringSubmatch(text)
	if parts == nil {
		return settingsNumber{}, false
	}
	digits := strings.TrimLeft(parts[2]+parts[3], "0")
	if digits == "" {
		return settingsNumber{digits: "0"}, true
	}
	number := settingsNumber{negative: parts[1] == "-"}
	if parts[4] != "" {
		if _, ok := number.exponent.SetString(parts[4], 10); !ok {
			return settingsNumber{}, false
		}
	}
	number.digits = strings.TrimRight(digits, "0")
	shift := int64(len(digits) - len(number.digits) - len(parts[3]))
	number.exponent.Add(&number.exponent, big.NewInt(shift))
	return number, true
}

func settingsNumberText(value any) (string, bool) {
	switch number := value.(type) {
	case json.Number:
		return string(number), true
	case int:
		return strconv.Itoa(number), true
	case int64:
		return strconv.FormatInt(number, 10), true
	case float32:
		return strconv.FormatFloat(float64(number), 'g', -1, 32), true
	case float64:
		return strconv.FormatFloat(number, 'g', -1, 64), true
	default:
		return "", false
	}
}

func validSettingsNumber(value any) bool {
	text, numeric := settingsNumberText(value)
	if !numeric {
		return false
	}
	_, valid := parseSettingsNumber(text)
	return valid
}

func equalSettingsOptionValue(left, right any) bool {
	leftText, leftNumeric := settingsNumberText(left)
	rightText, rightNumeric := settingsNumberText(right)
	if !leftNumeric && !rightNumeric {
		return reflect.DeepEqual(left, right)
	}
	leftNumber, leftValid := parseSettingsNumber(leftText)
	rightNumber, rightValid := parseSettingsNumber(rightText)
	return leftNumeric && rightNumeric && leftValid && rightValid &&
		leftNumber.negative == rightNumber.negative && leftNumber.digits == rightNumber.digits &&
		leftNumber.exponent.Cmp(&rightNumber.exponent) == 0
}

// Documents use plain decimal JSON so PostgreSQL cannot expand an exponent after
// accepting a small write. Check the expanded length before allocating it.
func canonicalSettingsNumber(value json.Number, limit int) (json.Number, error) {
	number, valid := parseSettingsNumber(string(value))
	if !valid {
		return "", expectedTypeDomainError("number", nil)
	}
	if !number.exponent.IsInt64() {
		return "", settingsDocumentSizeError()
	}
	exponent := number.exponent.Int64()
	sign := ""
	if number.negative {
		sign = "-"
	}
	point, fits := settingsNumberFits(number.digits, sign, exponent, limit)
	if !fits {
		return "", settingsDocumentSizeError()
	}
	return json.Number(sign + renderSettingsNumber(number.digits, point, int(exponent))), nil
}

func settingsNumberFits(digits, sign string, exponent int64, limit int) (int, bool) {
	remaining := int64(limit) - int64(len(digits)) - int64(len(sign))
	if remaining < 0 {
		return 0, false
	}
	if exponent >= 0 {
		if exponent > remaining {
			return 0, false
		}
		return len(digits) + int(exponent), true
	}
	if exponent < -int64(limit) {
		return 0, false
	}
	point := int64(len(digits)) + exponent
	if point > 0 {
		return int(point), remaining >= 1 // decimal point inside coefficient
	}
	return int(point), remaining >= 2 && -point <= remaining-2 // "0." and padding
}

func renderSettingsNumber(digits string, point, exponent int) string {
	switch {
	case exponent >= 0:
		return digits + strings.Repeat("0", exponent)
	case point > 0:
		return digits[:point] + "." + digits[point:]
	default:
		return "0." + strings.Repeat("0", -point) + digits
	}
}

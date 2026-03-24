package primitives

import "math"

// IntFromInt64 converts a signed 64-bit integer to int when it fits on the current platform.
func IntFromInt64(value int64) (int, bool) {
	maxInt := int64(int(^uint(0) >> 1))
	minInt := -maxInt - 1
	if value < minInt || value > maxInt {
		return 0, false
	}
	return int(value), true
}

// IntFromUint converts an unsigned int to int when it fits on the current platform.
func IntFromUint(value uint) (int, bool) {
	return IntFromUint64(uint64(value))
}

// IntFromUint64 converts an unsigned 64-bit integer to int when it fits.
func IntFromUint64(value uint64) (int, bool) {
	parsed, ok := Int64FromUint64(value)
	if !ok {
		return 0, false
	}
	return IntFromInt64(parsed)
}

// Int64FromUint converts an unsigned int to int64 when it fits.
func Int64FromUint(value uint) (int64, bool) {
	return Int64FromUint64(uint64(value))
}

// Int64FromUint64 converts an unsigned 64-bit integer to int64 when it fits.
func Int64FromUint64(value uint64) (int64, bool) {
	if value > math.MaxInt64 {
		return 0, false
	}
	return int64(value), true
}

// Uint16FromInt converts an int to uint16 when it is within bounds.
func Uint16FromInt(value int) (uint16, bool) {
	if value < 0 || value > math.MaxUint16 {
		return 0, false
	}
	return uint16(value), true
}

package primitives

import (
	"math"
	"testing"
)

func TestIntFromInt64(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		value int64
		ok    bool
	}{
		{name: "zero", value: 0, ok: true},
		{name: "positive", value: 42, ok: true},
		{name: "negative", value: -42, ok: true},
		{name: "max platform int", value: int64(int(^uint(0) >> 1)), ok: true},
		{name: "min platform int", value: -int64(int(^uint(0)>>1)) - 1, ok: true},
		{name: "overflow positive", value: math.MaxInt64, ok: int64(int(^uint(0)>>1)) == math.MaxInt64},
		{name: "overflow negative", value: math.MinInt64, ok: -int64(int(^uint(0)>>1))-1 == math.MinInt64},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, ok := IntFromInt64(tt.value)
			if ok != tt.ok {
				t.Fatalf("IntFromInt64(%d) ok=%v, want %v", tt.value, ok, tt.ok)
			}
		})
	}
}

func TestIntFromUint64(t *testing.T) {
	t.Parallel()

	maxInt := uint64(int(^uint(0) >> 1))
	tests := []struct {
		name  string
		value uint64
		ok    bool
	}{
		{name: "zero", value: 0, ok: true},
		{name: "max platform int", value: maxInt, ok: true},
		{name: "overflow", value: maxInt + 1, ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, ok := IntFromUint64(tt.value)
			if ok != tt.ok {
				t.Fatalf("IntFromUint64(%d) ok=%v, want %v", tt.value, ok, tt.ok)
			}
		})
	}
}

func TestInt64FromUint64(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		value uint64
		ok    bool
	}{
		{name: "zero", value: 0, ok: true},
		{name: "max int64", value: math.MaxInt64, ok: true},
		{name: "overflow", value: math.MaxInt64 + 1, ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, ok := Int64FromUint64(tt.value)
			if ok != tt.ok {
				t.Fatalf("Int64FromUint64(%d) ok=%v, want %v", tt.value, ok, tt.ok)
			}
		})
	}
}

func TestUint16FromInt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		value int
		ok    bool
	}{
		{name: "zero", value: 0, ok: true},
		{name: "max uint16", value: math.MaxUint16, ok: true},
		{name: "negative", value: -1, ok: false},
		{name: "overflow", value: math.MaxUint16 + 1, ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, ok := Uint16FromInt(tt.value)
			if ok != tt.ok {
				t.Fatalf("Uint16FromInt(%d) ok=%v, want %v", tt.value, ok, tt.ok)
			}
		})
	}
}

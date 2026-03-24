package primitives

import (
	"fmt"
	"math"
	"testing"
)

type stringerValue struct {
	value string
}

func (s stringerValue) String() string {
	return s.value
}

func TestStringFromAny(t *testing.T) {
	tests := []struct {
		name  string
		input any
		want  string
	}{
		{name: "nil", input: nil, want: ""},
		{name: "string", input: "  value  ", want: "value"},
		{name: "bytes", input: []byte(" bytes "), want: "bytes"},
		{name: "stringer", input: stringerValue{value: " named "}, want: "named"},
		{name: "number", input: 42, want: "42"},
	}
	for _, test := range tests {
		if got := StringFromAny(test.input); got != test.want {
			t.Fatalf("%s: got %q want %q", test.name, got, test.want)
		}
	}
}

func TestBoolFromAny(t *testing.T) {
	tests := []struct {
		name  string
		input any
		want  bool
		ok    bool
	}{
		{name: "bool", input: true, want: true, ok: true},
		{name: "true string", input: " yes ", want: true, ok: true},
		{name: "false string", input: "off", want: false, ok: true},
		{name: "int", input: 2, want: true, ok: true},
		{name: "float", input: 0.0, want: false, ok: true},
		{name: "invalid", input: "maybe", want: false, ok: false},
		{name: "nan", input: math.NaN(), want: false, ok: false},
	}
	for _, test := range tests {
		got, ok := BoolFromAny(test.input)
		if got != test.want || ok != test.ok {
			t.Fatalf("%s: got (%v,%v) want (%v,%v)", test.name, got, ok, test.want, test.ok)
		}
	}
}

func TestIntFromAny(t *testing.T) {
	tests := []struct {
		name  string
		input any
		want  int
		ok    bool
	}{
		{name: "int", input: int64(7), want: 7, ok: true},
		{name: "uint", input: uint(9), want: 9, ok: true},
		{name: "float truncates", input: 7.9, want: 7, ok: true},
		{name: "string int", input: " 11 ", want: 11, ok: true},
		{name: "string float", input: "11.9", want: 11, ok: true},
		{name: "blank", input: " ", want: 0, ok: false},
		{name: "inf", input: math.Inf(1), want: 0, ok: false},
	}
	for _, test := range tests {
		got, ok := IntFromAny(test.input)
		if got != test.want || ok != test.ok {
			t.Fatalf("%s: got (%v,%v) want (%v,%v)", test.name, got, ok, test.want, test.ok)
		}
	}
}

func TestIntFromAnyOverflow(t *testing.T) {
	maxInt := int(^uint(0) >> 1)
	if _, ok := IntFromAny(uint64(maxInt) + 1); ok {
		t.Fatal("expected uint64 overflow to be rejected")
	}
}

func TestInt64FromAny(t *testing.T) {
	got, ok := Int64FromAny(uint64(math.MaxInt64))
	if !ok || got != math.MaxInt64 {
		t.Fatalf("unexpected int64 conversion result (%d,%v)", got, ok)
	}
	if _, ok := Int64FromAny(uint64(math.MaxInt64) + 1); ok {
		t.Fatal("expected uint64 overflow to be rejected")
	}
}

func TestFloat64FromAny(t *testing.T) {
	tests := []struct {
		name  string
		input any
		want  float64
		ok    bool
	}{
		{name: "float", input: float32(1.5), want: 1.5, ok: true},
		{name: "int", input: 3, want: 3, ok: true},
		{name: "string", input: "2.25", want: 2.25, ok: true},
		{name: "nan string", input: "NaN", want: 0, ok: false},
	}
	for _, test := range tests {
		got, ok := Float64FromAny(test.input)
		if ok != test.ok {
			t.Fatalf("%s: got ok=%v want %v", test.name, ok, test.ok)
		}
		if ok && got != test.want {
			t.Fatalf("%s: got %v want %v", test.name, got, test.want)
		}
	}
}

func TestStringSliceFromAny(t *testing.T) {
	got := StringSliceFromAny([]any{" a ", "", 12, []byte("ignored?")})
	want := []string{"a", "12", "ignored?"}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("got %v want %v", got, want)
	}
	if got := StringSliceFromAny([]string{" ", ""}); got != nil {
		t.Fatalf("expected nil result, got %v", got)
	}
}

func TestCSVStringSliceFromAny(t *testing.T) {
	got := CSVStringSliceFromAny([]any{" a,b ", " c ", 12})
	want := []string{"a", "b", "c", "12"}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("got %v want %v", got, want)
	}
}

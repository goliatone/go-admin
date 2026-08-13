package pathutil

import "testing"

func TestNormalizeAbsolutePath(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  string
	}{
		{name: "empty", value: "  ", want: ""},
		{name: "root", value: " / ", want: "/"},
		{name: "relative", value: " admin/pages ", want: "/admin/pages"},
		{name: "internal duplicate slashes", value: "//admin///pages//", want: "/admin///pages"},
		{name: "dot segments preserved", value: "/admin/../site/pages", want: "/admin/../site/pages"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := NormalizeAbsolutePath(test.value); got != test.want {
				t.Fatalf("NormalizeAbsolutePath(%q) = %q, want %q", test.value, got, test.want)
			}
		})
	}
}

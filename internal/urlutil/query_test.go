package urlutil

import "testing"

func TestRawQueryFromOriginalURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		raw  string
		want string
	}{
		{name: "empty", raw: "", want: ""},
		{name: "full url", raw: "https://example.com/admin/content/pages?channel=prod&tab=translations", want: "channel=prod&tab=translations"},
		{name: "path only", raw: "/admin/content/pages?channel=prod&tab=translations", want: "channel=prod&tab=translations"},
		{name: "no query", raw: "/admin/content/pages", want: ""},
		{name: "fallback parse", raw: "%%%?channel=prod", want: "channel=prod"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := RawQueryFromOriginalURL(tt.raw); got != tt.want {
				t.Fatalf("RawQueryFromOriginalURL(%q) = %q, want %q", tt.raw, got, tt.want)
			}
		})
	}
}

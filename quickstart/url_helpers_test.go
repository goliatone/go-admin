package quickstart

import (
	"testing"

	urlkit "github.com/goliatone/go-urlkit"
)

type staticURLResolver map[string]string

func (r staticURLResolver) Resolve(groupPath, route string, _ urlkit.Params, _ urlkit.Query) (string, error) {
	return r[groupPath+"."+route], nil
}

func TestPrefixBasePathAppendsBeforeAbsoluteURLQueryAndFragment(t *testing.T) {
	tests := []struct {
		name   string
		base   string
		suffix string
		want   string
	}{
		{
			name:   "query",
			base:   "https://example.com/admin/content/posts/123?tenant=acme",
			suffix: "edit",
			want:   "https://example.com/admin/content/posts/123/edit?tenant=acme",
		},
		{
			name:   "fragment",
			base:   "https://example.com/admin/content/posts/123#section",
			suffix: "preview",
			want:   "https://example.com/admin/content/posts/123/preview#section",
		},
		{
			name:   "query and fragment",
			base:   "https://example.com/admin/content/posts/123?tenant=acme#section",
			suffix: "edit",
			want:   "https://example.com/admin/content/posts/123/edit?tenant=acme#section",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := prefixBasePath(tt.base, tt.suffix); got != tt.want {
				t.Fatalf("prefixBasePath(%q, %q) = %q, want %q", tt.base, tt.suffix, got, tt.want)
			}
		})
	}
}

func TestResolveAdminPanelEditAndPreviewURLsAppendBeforeAbsoluteURLQuery(t *testing.T) {
	urls := staticURLResolver{
		"admin.content.panel.id": "https://example.com/admin/content/posts/123?tenant=acme",
	}

	if got, want := ResolveAdminPanelEditURL(urls, "/admin", "posts", "123"), "https://example.com/admin/content/posts/123/edit?tenant=acme"; got != want {
		t.Fatalf("ResolveAdminPanelEditURL = %q, want %q", got, want)
	}
	if got, want := ResolveAdminPanelPreviewURL(urls, "/admin", "posts", "123"), "https://example.com/admin/content/posts/123/preview?tenant=acme"; got != want {
		t.Fatalf("ResolveAdminPanelPreviewURL = %q, want %q", got, want)
	}
}

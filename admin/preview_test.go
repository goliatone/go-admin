package admin

import "testing"

func TestResolveContentPreviewPath(t *testing.T) {
	tests := []struct {
		name     string
		record   map[string]any
		expected string
	}{
		{
			name:     "top-level path",
			record:   map[string]any{"path": "about"},
			expected: "/about",
		},
		{
			name:     "top-level preview url",
			record:   map[string]any{"preview_url": "/articles/launch"},
			expected: "/articles/launch",
		},
		{
			name:     "absolute top-level preview url",
			record:   map[string]any{"preview_url": "https://preview.example.test/articles/launch"},
			expected: "https://preview.example.test/articles/launch",
		},
		{
			name:     "nested path",
			record:   map[string]any{"data": map[string]any{"path": "legal/privacy"}},
			expected: "/legal/privacy",
		},
		{
			name:     "nested preview url",
			record:   map[string]any{"data": map[string]any{"preview_url": "/preview/page"}},
			expected: "/preview/page",
		},
		{
			name:     "absolute nested preview url",
			record:   map[string]any{"data": map[string]any{"preview_url": "https://preview.example.test/preview/page"}},
			expected: "https://preview.example.test/preview/page",
		},
		{
			name:     "slug fallback",
			record:   map[string]any{"slug": "home"},
			expected: "/home",
		},
		{
			name:     "no path",
			record:   map[string]any{"title": "Untitled"},
			expected: "",
		},
		{
			name:     "nil record",
			record:   nil,
			expected: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := ResolveContentPreviewPath(tc.record); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestBuildSitePreviewURL(t *testing.T) {
	tests := []struct {
		name       string
		targetPath string
		token      string
		expected   string
	}{
		{
			name:       "appends query",
			targetPath: "/about",
			token:      "token 123",
			expected:   "/about?preview_token=token+123",
		},
		{
			name:       "appends to existing query",
			targetPath: "/about?lang=en",
			token:      "token-123",
			expected:   "/about?lang=en&preview_token=token-123",
		},
		{
			name:       "places query before fragment",
			targetPath: "/about#draft",
			token:      "token-123",
			expected:   "/about?preview_token=token-123#draft",
		},
		{
			name:       "replaces stale preview token",
			targetPath: "/about?preview_token=old&lang=en",
			token:      "fresh-token",
			expected:   "/about?lang=en&preview_token=fresh-token",
		},
		{
			name:       "rejects absolute url without allowlist",
			targetPath: "https://preview.example.test/about?lang=en#draft",
			token:      "fresh-token",
			expected:   "",
		},
		{
			name:       "empty path",
			targetPath: "",
			token:      "token-123",
			expected:   "",
		},
		{
			name:       "empty token",
			targetPath: "/about",
			token:      "",
			expected:   "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := BuildSitePreviewURL(tc.targetPath, tc.token); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestBuildSitePreviewURLWithAllowedHosts(t *testing.T) {
	tests := []struct {
		name         string
		targetPath   string
		token        string
		allowedHosts []string
		expected     string
	}{
		{
			name:         "supports allowed absolute url",
			targetPath:   "https://preview.example.test/about?lang=en#draft",
			token:        "fresh-token",
			allowedHosts: []string{"preview.example.test"},
			expected:     "https://preview.example.test/about?lang=en&preview_token=fresh-token#draft",
		},
		{
			name:         "normalizes allowlist urls to hosts",
			targetPath:   "https://preview.example.test/about",
			token:        "fresh-token",
			allowedHosts: []string{"https://preview.example.test/base"},
			expected:     "https://preview.example.test/about?preview_token=fresh-token",
		},
		{
			name:         "rejects unlisted absolute url",
			targetPath:   "https://evil.example.test/about",
			token:        "fresh-token",
			allowedHosts: []string{"preview.example.test"},
			expected:     "",
		},
		{
			name:         "rejects non-http absolute url",
			targetPath:   "javascript:alert(1)",
			token:        "fresh-token",
			allowedHosts: []string{"preview.example.test"},
			expected:     "",
		},
		{
			name:         "rejects protocol relative url",
			targetPath:   "//preview.example.test/about",
			token:        "fresh-token",
			allowedHosts: []string{"preview.example.test"},
			expected:     "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := BuildSitePreviewURLWithAllowedHosts(tc.targetPath, tc.token, tc.allowedHosts); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

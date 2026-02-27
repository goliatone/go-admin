package admin

import "testing"

func TestCanonicalContentPath(t *testing.T) {
	if got := CanonicalContentPath("posts", "hello-world"); got != "/posts/hello-world" {
		t.Fatalf("expected /posts/hello-world, got %q", got)
	}
	if got := CanonicalContentPath("", "hello-world"); got != "/hello-world" {
		t.Fatalf("expected /hello-world, got %q", got)
	}
}

func TestCanonicalContentURL(t *testing.T) {
	if got := CanonicalContentURL("https://example.com", "posts", "hello"); got != "https://example.com/posts/hello" {
		t.Fatalf("expected absolute canonical URL, got %q", got)
	}
	if got := CanonicalContentURL("not-a-url", "posts", "hello"); got != "/posts/hello" {
		t.Fatalf("expected fallback path on invalid base URL, got %q", got)
	}
}

func TestCanonicalPath(t *testing.T) {
	if got := CanonicalPath("about", ""); got != "/about" {
		t.Fatalf("expected /about, got %q", got)
	}
	if got := CanonicalPath("", "fallback"); got != "/fallback" {
		t.Fatalf("expected /fallback, got %q", got)
	}
	if got := CanonicalPath("https://example.com/about", ""); got != "https://example.com/about" {
		t.Fatalf("expected absolute URL unchanged, got %q", got)
	}
}

func TestExtractContentPath(t *testing.T) {
	if got := ExtractContentPath(map[string]any{"path": "home"}, nil, "fallback"); got != "/home" {
		t.Fatalf("expected data path to win, got %q", got)
	}
	if got := ExtractContentPath(map[string]any{}, map[string]any{"path": "/"}, "fallback"); got != "/" {
		t.Fatalf("expected metadata path fallback, got %q", got)
	}
	if got := ExtractContentPath(nil, nil, "fallback"); got != "/fallback" {
		t.Fatalf("expected fallback slug path, got %q", got)
	}
}

func TestResolveContentPath(t *testing.T) {
	record := CMSContent{
		Slug:     "home",
		Data:     map[string]any{},
		Metadata: map[string]any{"path": "/"},
	}
	if got := ResolveContentPath(record, ""); got != "/" {
		t.Fatalf("expected metadata path /, got %q", got)
	}

	record = CMSContent{Slug: "home"}
	if got := ResolveContentPath(record, ""); got != "/home" {
		t.Fatalf("expected slug fallback /home, got %q", got)
	}
}

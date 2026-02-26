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

package quickstart

import "testing"

type stubRequestIPContext struct {
	headers map[string]string
	ip      string
}

func (s stubRequestIPContext) Header(name string) string {
	if s.headers == nil {
		return ""
	}
	return s.headers[name]
}

func (s stubRequestIPContext) IP() string {
	return s.ip
}

func TestResolveRequestIPDefaultsToDirectPeer(t *testing.T) {
	ctx := stubRequestIPContext{
		ip: "10.0.0.10",
		headers: map[string]string{
			"X-Forwarded-For": "203.0.113.9",
		},
	}
	got := ResolveRequestIP(ctx, RequestIPOptions{})
	if got != "10.0.0.10" {
		t.Fatalf("expected direct ip 10.0.0.10, got %q", got)
	}
}

func TestResolveRequestIPTrustsForwardedHeadersWhenEnabled(t *testing.T) {
	ctx := stubRequestIPContext{
		ip: "10.0.0.10",
		headers: map[string]string{
			"X-Forwarded-For": "203.0.113.9, 10.1.1.5",
		},
	}
	got := ResolveRequestIP(ctx, RequestIPOptions{TrustForwardedHeaders: true})
	if got != "203.0.113.9" {
		t.Fatalf("expected forwarded ip 203.0.113.9, got %q", got)
	}
}

func TestResolveRequestIPParsesRFC7239ForwardedHeader(t *testing.T) {
	ctx := stubRequestIPContext{
		ip: "10.0.0.10",
		headers: map[string]string{
			"Forwarded": `for="[2001:db8::2]:8443";proto=https;by=203.0.113.10`,
		},
	}
	got := ResolveRequestIP(ctx, RequestIPOptions{TrustForwardedHeaders: true})
	if got != "2001:db8::2" {
		t.Fatalf("expected forwarded ipv6 2001:db8::2, got %q", got)
	}
}

func TestResolveRequestIPFallsBackWhenForwardedHeaderInvalid(t *testing.T) {
	ctx := stubRequestIPContext{
		ip: "10.0.0.10",
		headers: map[string]string{
			"X-Forwarded-For": "bad-value",
		},
	}
	got := ResolveRequestIP(ctx, RequestIPOptions{TrustForwardedHeaders: true})
	if got != "10.0.0.10" {
		t.Fatalf("expected direct fallback ip 10.0.0.10, got %q", got)
	}
}

func TestResolveRequestIPReturnsUnknownWhenNoValidIPAvailable(t *testing.T) {
	ctx := stubRequestIPContext{
		ip:      "",
		headers: map[string]string{},
	}
	got := ResolveRequestIP(ctx, RequestIPOptions{})
	if got != "unknown" {
		t.Fatalf("expected unknown, got %q", got)
	}
}

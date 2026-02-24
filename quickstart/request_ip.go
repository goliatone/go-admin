package quickstart

import (
	"net"
	"strconv"
	"strings"
)

// RequestIPContext captures the request methods needed to resolve client IP.
type RequestIPContext interface {
	Header(name string) string
	IP() string
}

// RequestIPOptions controls request IP extraction behavior.
type RequestIPOptions struct {
	// TrustForwardedHeaders enables X-Forwarded-For, Forwarded, and X-Real-IP resolution.
	// Keep disabled unless your runtime sits behind a trusted proxy that sanitizes these headers.
	TrustForwardedHeaders bool
}

// ResolveRequestIP resolves the best-effort client IP for a request context.
// By default it returns the direct peer IP and ignores forwarded headers.
func ResolveRequestIP(c RequestIPContext, opts RequestIPOptions) string {
	if c == nil {
		return "unknown"
	}
	direct := normalizeIPToken(c.IP())
	if !opts.TrustForwardedHeaders {
		if direct != "" {
			return direct
		}
		return "unknown"
	}

	if forwarded := parseXForwardedFor(c.Header("X-Forwarded-For")); forwarded != "" {
		return forwarded
	}
	if forwarded := parseForwardedHeader(c.Header("Forwarded")); forwarded != "" {
		return forwarded
	}
	if forwarded := normalizeIPToken(c.Header("X-Real-IP")); forwarded != "" {
		return forwarded
	}
	if direct != "" {
		return direct
	}
	return "unknown"
}

func parseXForwardedFor(value string) string {
	for _, part := range strings.Split(value, ",") {
		if parsed := normalizeIPToken(part); parsed != "" {
			return parsed
		}
	}
	return ""
}

func parseForwardedHeader(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	// RFC 7239: Forwarded: for=198.51.100.17;proto=https;by=203.0.113.43
	entries := strings.Split(value, ",")
	for _, entry := range entries {
		params := strings.Split(entry, ";")
		for _, param := range params {
			pair := strings.SplitN(strings.TrimSpace(param), "=", 2)
			if len(pair) != 2 {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(pair[0]), "for") {
				continue
			}
			if parsed := normalizeIPToken(pair[1]); parsed != "" {
				return parsed
			}
		}
	}
	return ""
}

func normalizeIPToken(value string) string {
	token := strings.TrimSpace(value)
	if token == "" {
		return ""
	}
	token = strings.Trim(token, `"'`)
	if token == "" {
		return ""
	}

	// [IPv6]:port
	if strings.HasPrefix(token, "[") {
		if idx := strings.Index(token, "]"); idx > 1 {
			candidate := token[1:idx]
			if ip := net.ParseIP(candidate); ip != nil {
				return ip.String()
			}
		}
	}

	// IPv4:port or hostname:port
	if host, _, err := net.SplitHostPort(token); err == nil {
		token = strings.TrimSpace(host)
	}

	// IPv4:port fallback when split-host-port fails due missing brackets rules.
	if strings.Count(token, ":") == 1 {
		if host, port, ok := strings.Cut(token, ":"); ok {
			if parsedPort := strings.TrimSpace(port); parsedPort != "" {
				if portValue, err := strconv.Atoi(parsedPort); err == nil && portValue >= 1 && portValue <= 65535 {
					token = strings.TrimSpace(host)
				}
			}
		}
	}

	if ip := net.ParseIP(strings.TrimSpace(token)); ip != nil {
		return ip.String()
	}
	return ""
}

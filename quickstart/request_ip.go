package quickstart

import (
	"net"
	"net/http"
	"strconv"
	"strings"
)

var (
	defaultLoopbackTrustedProxyCIDRs = []string{
		"127.0.0.1/32",
		"::1/128",
	}
	insecureAnyTrustedProxyCIDRs = []string{
		"0.0.0.0/0",
		"::/0",
	}
)

// DefaultLoopbackTrustedProxyCIDRs returns loopback-only trusted proxy ranges.
func DefaultLoopbackTrustedProxyCIDRs() []string {
	return append([]string{}, defaultLoopbackTrustedProxyCIDRs...)
}

// InsecureAnyTrustedProxyCIDRs returns a trust-all proxy CIDR list.
// Use only for backward compatibility and local testing.
func InsecureAnyTrustedProxyCIDRs() []string {
	return append([]string{}, insecureAnyTrustedProxyCIDRs...)
}

// RequestTrustPolicy controls whether forwarded headers are trusted and from where.
type RequestTrustPolicy struct {
	// TrustForwardedHeaders enables X-Forwarded-* and Forwarded header handling.
	TrustForwardedHeaders bool `json:"trust_forwarded_headers"`
	// TrustedProxyCIDRs lists reverse-proxy source CIDRs allowed to influence
	// forwarded header resolution. Empty disables forwarded-header trust.
	TrustedProxyCIDRs []string `json:"trusted_proxy_cid_rs"`
}

// RequestIPContext captures the request methods needed to resolve client IP.
type RequestIPContext interface {
	Header(name string) string
	IP() string
}

// RequestMetaContext captures request methods required for trust resolution.
type RequestMetaContext interface {
	RequestIPContext
}

// RequestMeta captures normalized request transport details.
type RequestMeta struct {
	PeerIP           string `json:"peer_ip"`
	ClientIP         string `json:"client_ip"`
	Host             string `json:"host"`
	Scheme           string `json:"scheme"`
	Secure           bool   `json:"secure"`
	ForwardedTrusted bool   `json:"forwarded_trusted"`
}

// RequestIPOptions controls request IP extraction behavior.
type RequestIPOptions struct {
	// TrustForwardedHeaders enables X-Forwarded-For, Forwarded, and X-Real-IP resolution.
	// Keep disabled unless your runtime sits behind a trusted proxy that sanitizes these headers.
	TrustForwardedHeaders bool `json:"trust_forwarded_headers"`
	// TrustedProxyCIDRs constrains which peer IP ranges can influence forwarded headers.
	// Empty disables forwarded-header trust even when TrustForwardedHeaders is true.
	TrustedProxyCIDRs []string `json:"trusted_proxy_cid_rs"`
}

// ResolveRequestIP resolves the best-effort client IP for a request context.
// By default it returns the direct peer IP and ignores forwarded headers unless
// both forwarded trust and trusted proxy CIDRs are configured.
func ResolveRequestIP(c RequestIPContext, opts RequestIPOptions) string {
	return ResolveRequestIPWithPolicy(c, RequestTrustPolicy{
		TrustForwardedHeaders: opts.TrustForwardedHeaders,
		TrustedProxyCIDRs:     append([]string{}, opts.TrustedProxyCIDRs...),
	})
}

// ResolveRequestIPWithPolicy resolves client IP using a request trust policy.
func ResolveRequestIPWithPolicy(c RequestIPContext, policy RequestTrustPolicy) string {
	meta := ResolveRequestMeta(c, policy)
	if meta.ClientIP != "" {
		return meta.ClientIP
	}
	return "unknown"
}

// ResolveRequestMeta resolves request transport metadata with trusted proxy checks.
func ResolveRequestMeta(c RequestMetaContext, policy RequestTrustPolicy) RequestMeta {
	if c == nil {
		return RequestMeta{
			Scheme: "http",
		}
	}
	policy = normalizeRequestTrustPolicy(policy)
	meta := RequestMeta{
		PeerIP:   resolvePeerIP(c),
		ClientIP: normalizeIPToken(c.IP()),
		Scheme:   "http",
	}
	if meta.ClientIP == "" {
		meta.ClientIP = meta.PeerIP
	}

	if httpCtx, ok := c.(interface{ Request() *http.Request }); ok && httpCtx != nil {
		request := httpCtx.Request()
		if request != nil {
			if meta.Host == "" {
				meta.Host = strings.TrimSpace(request.Host)
			}
			if request.URL != nil {
				if scheme := strings.ToLower(strings.TrimSpace(request.URL.Scheme)); scheme != "" {
					meta.Scheme = scheme
					meta.Secure = scheme == "https"
				}
			}
			if request.TLS != nil {
				meta.Secure = true
				meta.Scheme = "https"
			}
		}
	}
	if host := strings.TrimSpace(c.Header("Host")); host != "" {
		meta.Host = host
	}

	meta.ForwardedTrusted = shouldTrustForwardedHeaders(meta.PeerIP, policy)
	if meta.ForwardedTrusted {
		if forwardedClient := parseXForwardedFor(c.Header("X-Forwarded-For")); forwardedClient != "" {
			meta.ClientIP = forwardedClient
		} else if forwardedClient := parseForwardedHeader(c.Header("Forwarded")); forwardedClient != "" {
			meta.ClientIP = forwardedClient
		} else if realIP := normalizeIPToken(c.Header("X-Real-IP")); realIP != "" {
			meta.ClientIP = realIP
		}

		if forwardedHost := firstCSVValue(c.Header("X-Forwarded-Host")); forwardedHost != "" {
			meta.Host = forwardedHost
		} else if forwardedHost := parseForwardedHeaderParam(c.Header("Forwarded"), "host"); forwardedHost != "" {
			meta.Host = forwardedHost
		}

		if forwardedProto := strings.ToLower(firstCSVValue(c.Header("X-Forwarded-Proto"))); forwardedProto != "" {
			meta.Scheme = forwardedProto
			meta.Secure = forwardedProto == "https"
		} else if forwardedProto := strings.ToLower(firstCSVValue(c.Header("X-Forwarded-Scheme"))); forwardedProto != "" {
			meta.Scheme = forwardedProto
			meta.Secure = forwardedProto == "https"
		} else if forwardedProto := strings.ToLower(parseForwardedHeaderParam(c.Header("Forwarded"), "proto")); forwardedProto != "" {
			meta.Scheme = forwardedProto
			meta.Secure = forwardedProto == "https"
		}

		if strings.EqualFold(strings.TrimSpace(c.Header("X-Forwarded-Ssl")), "on") {
			meta.Secure = true
			meta.Scheme = "https"
		}
	}

	meta.Host = strings.TrimSpace(meta.Host)
	meta.Scheme = strings.ToLower(strings.TrimSpace(meta.Scheme))
	if meta.Secure {
		meta.Scheme = "https"
	}
	if meta.Scheme == "" {
		if meta.Secure {
			meta.Scheme = "https"
		} else {
			meta.Scheme = "http"
		}
	}
	return meta
}

// ResolveRequestOrigin builds a request origin string (<scheme>://<host>) when possible.
func ResolveRequestOrigin(c RequestMetaContext, policy RequestTrustPolicy) string {
	meta := ResolveRequestMeta(c, policy)
	if strings.TrimSpace(meta.Host) == "" {
		return ""
	}
	return strings.TrimSpace(meta.Scheme) + "://" + strings.TrimSpace(meta.Host)
}

// IsSecureRequest reports whether a request should be treated as TLS-protected.
func IsSecureRequest(c RequestMetaContext, policy RequestTrustPolicy) bool {
	return ResolveRequestMeta(c, policy).Secure
}

// IsLoopbackPeer reports whether the direct peer address is a loopback IP.
func IsLoopbackPeer(c RequestMetaContext) bool {
	peerIP := strings.TrimSpace(ResolveRequestMeta(c, RequestTrustPolicy{}).PeerIP)
	if peerIP == "" {
		return false
	}
	parsed := net.ParseIP(peerIP)
	return parsed != nil && parsed.IsLoopback()
}

// IsLocalRequest reports whether request host resolves to localhost/loopback.
func IsLocalRequest(c RequestMetaContext, policy RequestTrustPolicy) bool {
	host := strings.TrimSpace(ResolveRequestMeta(c, policy).Host)
	if host == "" {
		return false
	}
	if strings.Contains(host, ":") {
		if parsedHost, _, err := net.SplitHostPort(host); err == nil {
			host = parsedHost
		} else if strings.Count(host, ":") == 1 {
			if h, p, ok := strings.Cut(host, ":"); ok {
				if port, err := strconv.Atoi(strings.TrimSpace(p)); err == nil && port >= 1 && port <= 65535 {
					host = strings.TrimSpace(h)
				}
			}
		}
	}
	host = strings.ToLower(strings.TrimSpace(host))
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func resolvePeerIP(c RequestMetaContext) string {
	if c == nil {
		return ""
	}
	if httpCtx, ok := c.(interface{ Request() *http.Request }); ok && httpCtx != nil {
		request := httpCtx.Request()
		if request != nil {
			if peerIP := normalizeIPToken(request.RemoteAddr); peerIP != "" {
				return peerIP
			}
		}
	}
	return normalizeIPToken(c.IP())
}

func shouldTrustForwardedHeaders(peerIP string, policy RequestTrustPolicy) bool {
	if !policy.TrustForwardedHeaders {
		return false
	}
	peerIP = strings.TrimSpace(peerIP)
	if peerIP == "" {
		return false
	}
	if len(policy.TrustedProxyCIDRs) == 0 {
		return false
	}
	parsedPeer := net.ParseIP(peerIP)
	if parsedPeer == nil {
		return false
	}
	for _, raw := range policy.TrustedProxyCIDRs {
		cidr := strings.TrimSpace(raw)
		if cidr == "" {
			continue
		}
		_, block, err := net.ParseCIDR(cidr)
		if err != nil || block == nil {
			continue
		}
		if block.Contains(parsedPeer) {
			return true
		}
	}
	return false
}

func normalizeRequestTrustPolicy(policy RequestTrustPolicy) RequestTrustPolicy {
	policy.TrustedProxyCIDRs = normalizeStringList(policy.TrustedProxyCIDRs)
	return policy
}

func normalizeStringList(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, raw := range values {
		value := strings.TrimSpace(raw)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
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

func parseForwardedHeaderParam(value, key string) string {
	value = strings.TrimSpace(value)
	key = strings.TrimSpace(key)
	if value == "" || key == "" {
		return ""
	}
	entries := strings.Split(value, ",")
	for _, entry := range entries {
		params := strings.Split(entry, ";")
		for _, param := range params {
			pair := strings.SplitN(strings.TrimSpace(param), "=", 2)
			if len(pair) != 2 {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(pair[0]), key) {
				continue
			}
			resolved := strings.TrimSpace(pair[1])
			resolved = strings.Trim(resolved, `"'`)
			return strings.TrimSpace(resolved)
		}
	}
	return ""
}

func firstCSVValue(raw string) string {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
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

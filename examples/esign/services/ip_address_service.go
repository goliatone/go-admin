package services

import (
	"net"
	"net/netip"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const auditIPAddressUnknownLabel = "-"

// AuditIPAddressService centralizes IP extraction/normalization logic used by
// handlers, audit persistence, and audit trail rendering.
type AuditIPAddressService struct{}

func NewAuditIPAddressService() AuditIPAddressService {
	return AuditIPAddressService{}
}

var defaultAuditIPAddressService = NewAuditIPAddressService()

func ResolveAuditIPAddress(raw string) string {
	return defaultAuditIPAddressService.Normalize(raw)
}

func ResolveAuditEventIPAddress(event stores.AuditEventRecord, metadata map[string]any) string {
	return defaultAuditIPAddressService.FromAuditEvent(event, metadata)
}

func DisplayAuditIPAddress(raw string) string {
	return defaultAuditIPAddressService.Display(raw)
}

func (s AuditIPAddressService) Normalize(raw string) string {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return ""
	}

	// Forwarded-style value lists use first non-empty item.
	for _, item := range strings.Split(candidate, ",") {
		item = strings.Trim(strings.TrimSpace(item), `"'`)
		if item == "" {
			continue
		}
		candidate = item
		break
	}
	if candidate == "" {
		return ""
	}

	if host, _, err := net.SplitHostPort(candidate); err == nil {
		candidate = strings.TrimSpace(host)
	}
	if len(candidate) > 1 && strings.HasPrefix(candidate, "[") && strings.HasSuffix(candidate, "]") {
		candidate = strings.TrimSpace(candidate[1 : len(candidate)-1])
	}
	if parsed, err := netip.ParseAddr(candidate); err == nil {
		return parsed.String()
	}
	return candidate
}

func (s AuditIPAddressService) FromMetadata(metadata map[string]any) string {
	return s.Normalize(firstMetadataString(metadata,
		"ip_address",
		"ip",
		"request_ip",
		"remote_ip",
		"client_ip",
		"x_forwarded_for",
		"forwarded_for",
		"x_real_ip",
	))
}

func (s AuditIPAddressService) FromAuditEvent(event stores.AuditEventRecord, metadata map[string]any) string {
	if resolved := s.Normalize(strings.TrimSpace(event.IPAddress)); resolved != "" {
		return resolved
	}
	return s.FromMetadata(metadata)
}

func (s AuditIPAddressService) Display(raw string) string {
	if resolved := s.Normalize(raw); resolved != "" {
		return resolved
	}
	return auditIPAddressUnknownLabel
}

func firstMetadataString(metadata map[string]any, keys ...string) string {
	if len(metadata) == 0 {
		return ""
	}
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if value := metadataValueAsString(metadata[key]); value != "" {
			return value
		}
	}
	for _, branch := range []string{"request", "network", "client"} {
		raw, ok := metadata[strings.TrimSpace(branch)]
		if !ok {
			continue
		}
		nested, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if value := firstMetadataString(nested, keys...); value != "" {
			return value
		}
	}
	return ""
}

func metadataValueAsString(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		clean := strings.TrimSpace(typed)
		if strings.EqualFold(clean, "<nil>") {
			return ""
		}
		return clean
	case []byte:
		clean := strings.TrimSpace(string(typed))
		if strings.EqualFold(clean, "<nil>") {
			return ""
		}
		return clean
	default:
		// Keep this strict: only string-like metadata is accepted for now.
		return ""
	}
}

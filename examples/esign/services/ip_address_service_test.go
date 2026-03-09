package services

import (
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestAuditIPAddressServiceNormalize(t *testing.T) {
	svc := NewAuditIPAddressService()
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "empty", in: "", want: ""},
		{name: "trim", in: " 203.0.113.9 ", want: "203.0.113.9"},
		{name: "forwarded list", in: "198.51.100.10, 10.0.0.1", want: "198.51.100.10"},
		{name: "ipv4 with port", in: "203.0.113.9:443", want: "203.0.113.9"},
		{name: "ipv6 bracket with port", in: "[2001:db8::1]:8443", want: "2001:db8::1"},
	}
	for _, tc := range tests {
		if got := svc.Normalize(tc.in); got != tc.want {
			t.Fatalf("%s: expected %q, got %q", tc.name, tc.want, got)
		}
	}
}

func TestAuditIPAddressServiceFromMetadata(t *testing.T) {
	svc := NewAuditIPAddressService()
	metadata := map[string]any{
		"request": map[string]any{
			"x_forwarded_for": "198.51.100.42, 10.0.0.2",
		},
	}
	if got := svc.FromMetadata(metadata); got != "198.51.100.42" {
		t.Fatalf("expected metadata-derived ip, got %q", got)
	}
}

func TestAuditIPAddressServiceFromAuditEventPrefersColumnValue(t *testing.T) {
	svc := NewAuditIPAddressService()
	event := stores.AuditEventRecord{IPAddress: "203.0.113.88"}
	metadata := map[string]any{"ip_address": "198.51.100.7"}
	if got := svc.FromAuditEvent(event, metadata); got != "203.0.113.88" {
		t.Fatalf("expected event column ip to win, got %q", got)
	}
}

func TestAuditIPAddressServiceDisplay(t *testing.T) {
	svc := NewAuditIPAddressService()
	if got := svc.Display(""); got != "-" {
		t.Fatalf("expected unknown label, got %q", got)
	}
	if got := svc.Display("203.0.113.7"); got != "203.0.113.7" {
		t.Fatalf("expected display ip, got %q", got)
	}
}

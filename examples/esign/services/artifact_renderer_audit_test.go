package services

import "testing"

func TestShouldRenderAuditTrailIP(t *testing.T) {
	cases := []struct {
		name  string
		entry AuditTrailEntry
		want  bool
	}{
		{name: "created omits ip", entry: AuditTrailEntry{EventType: AuditTrailEventCreated, ShowIPAddress: false}, want: false},
		{name: "sent omits ip", entry: AuditTrailEntry{EventType: AuditTrailEventSent, ShowIPAddress: false}, want: false},
		{name: "viewed with actor ip includes ip", entry: AuditTrailEntry{EventType: AuditTrailEventViewed, ShowIPAddress: true, IPAddress: "203.0.113.10"}, want: true},
		{name: "viewed without ip omits ip", entry: AuditTrailEntry{EventType: AuditTrailEventViewed, ShowIPAddress: true}, want: false},
		{name: "completed omits ip", entry: AuditTrailEntry{EventType: AuditTrailEventCompleted, ShowIPAddress: false, IPAddress: "203.0.113.20"}, want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldRenderAuditTrailIP(tc.entry); got != tc.want {
				t.Fatalf("shouldRenderAuditTrailIP(%s)=%t want=%t", tc.entry.EventType, got, tc.want)
			}
		})
	}
}

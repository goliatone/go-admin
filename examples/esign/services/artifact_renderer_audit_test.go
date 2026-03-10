package services

import "testing"

func TestShouldRenderAuditTrailIP(t *testing.T) {
	cases := []struct {
		name  string
		entry AuditTrailEntry
		want  bool
	}{
		{name: "created omits ip", entry: AuditTrailEntry{EventType: AuditTrailEventCreated}, want: false},
		{name: "sent omits ip", entry: AuditTrailEntry{EventType: AuditTrailEventSent}, want: false},
		{name: "viewed includes ip", entry: AuditTrailEntry{EventType: AuditTrailEventViewed}, want: true},
		{name: "completed includes ip", entry: AuditTrailEntry{EventType: AuditTrailEventCompleted}, want: true},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldRenderAuditTrailIP(tc.entry); got != tc.want {
				t.Fatalf("shouldRenderAuditTrailIP(%s)=%t want=%t", tc.entry.EventType, got, tc.want)
			}
		})
	}
}

package modules

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"sync"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

// AuditActivityProjector mirrors canonical audit events into the shared activity feed.
type AuditActivityProjector struct {
	sink  coreadmin.ActivitySink
	audit stores.AuditEventStore

	mu   sync.Mutex
	seen map[string]struct{}
}

func NewAuditActivityProjector(sink coreadmin.ActivitySink, audit stores.AuditEventStore) *AuditActivityProjector {
	return &AuditActivityProjector{
		sink:  sink,
		audit: audit,
		seen:  map[string]struct{}{},
	}
}

func (p *AuditActivityProjector) ProjectAgreement(ctx context.Context, scope stores.Scope, agreementID string) error {
	if p == nil || p.sink == nil || p.audit == nil {
		return nil
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil
	}
	events, err := p.audit.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{SortDesc: false})
	if err != nil {
		return err
	}
	for _, event := range events {
		if !p.mark(eventProjectionKey(agreementID, event)) {
			continue
		}
		metadata := map[string]any{
			"agreement_id": agreementID,
			"tenant_id":    scope.TenantID,
			"org_id":       scope.OrgID,
			"event_type":   strings.TrimSpace(event.EventType),
			"audit_event":  strings.TrimSpace(event.ID),
		}
		if ip := strings.TrimSpace(event.IPAddress); ip != "" {
			metadata["ip_address"] = ip
		}
		if ua := strings.TrimSpace(event.UserAgent); ua != "" {
			metadata["user_agent"] = ua
		}
		mergeJSONMetadata(metadata, event.MetadataJSON)

		actor := strings.TrimSpace(event.ActorID)
		if actor == "" {
			actor = primitives.FirstNonEmpty(strings.TrimSpace(event.ActorType), "system")
		}
		entry := coreadmin.ActivityEntry{
			Actor:     actor,
			Action:    "esign." + normalizeEventAction(event.EventType),
			Object:    "agreement:" + agreementID,
			Metadata:  metadata,
			CreatedAt: normalizeEventTimestamp(event.CreatedAt),
		}
		if err := p.sink.Record(ctx, entry); err != nil {
			return err
		}
	}
	return nil
}

func (p *AuditActivityProjector) mark(key string) bool {
	if p == nil {
		return false
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return false
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	if _, ok := p.seen[key]; ok {
		return false
	}
	p.seen[key] = struct{}{}
	return true
}

func eventProjectionKey(agreementID string, event stores.AuditEventRecord) string {
	if id := strings.TrimSpace(event.ID); id != "" {
		return id
	}
	return fmt.Sprintf("%s|%s|%s", strings.TrimSpace(agreementID), strings.TrimSpace(event.EventType), normalizeEventTimestamp(event.CreatedAt).Format(time.RFC3339Nano))
}

func normalizeEventAction(eventType string) string {
	action := strings.ToLower(strings.TrimSpace(eventType))
	action = strings.ReplaceAll(action, " ", "_")
	action = strings.ReplaceAll(action, "-", "_")
	if action == "" {
		return "event"
	}
	return action
}

func normalizeEventTimestamp(ts time.Time) time.Time {
	if ts.IsZero() {
		return time.Now().UTC()
	}
	return ts.UTC()
}

func mergeJSONMetadata(dst map[string]any, raw string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return
	}
	parsed := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return
	}
	for key, value := range parsed {
		if _, exists := dst[key]; exists {
			continue
		}
		dst[key] = value
	}
}

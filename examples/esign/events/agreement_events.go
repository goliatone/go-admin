package events

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/commands"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-router/eventstream"
)

const AgreementChangedEventName = "esign.agreement.changed"

type AgreementEventPublisher struct {
	stream eventstream.Stream
}

func NewAgreementEventPublisher(stream eventstream.Stream) *AgreementEventPublisher {
	return &AgreementEventPublisher{stream: stream}
}

func (p *AgreementEventPublisher) PublishAgreementChanged(_ context.Context, scope stores.Scope, input commands.AgreementChangedEvent) error {
	if p == nil || p.stream == nil {
		return nil
	}
	agreementID := strings.TrimSpace(input.AgreementID)
	if agreementID == "" {
		return nil
	}
	envelope := map[string]any{
		"type":          AgreementChangedEventName,
		"resource_type": "esign_agreement",
		"resource_id":   agreementID,
		"sections":      append([]string(nil), input.Sections...),
		"occurred_at":   time.Now().UTC().Format(time.RFC3339Nano),
	}
	if tenantID := strings.TrimSpace(scope.TenantID); tenantID != "" {
		envelope["tenant_id"] = tenantID
	}
	if orgID := strings.TrimSpace(scope.OrgID); orgID != "" {
		envelope["org_id"] = orgID
	}
	if correlationID := strings.TrimSpace(input.CorrelationID); correlationID != "" {
		envelope["correlation_id"] = correlationID
	}
	if status := strings.TrimSpace(input.Status); status != "" {
		envelope["status"] = status
	}
	if message := strings.TrimSpace(input.Message); message != "" {
		envelope["message"] = message
	}
	if len(input.Metadata) > 0 {
		envelope["metadata"] = input.Metadata
	}
	payload, err := json.Marshal(envelope)
	if err != nil {
		return err
	}
	streamScope := eventstream.Scope{}
	if tenantID := strings.TrimSpace(scope.TenantID); tenantID != "" {
		streamScope["tenant_id"] = tenantID
	}
	if orgID := strings.TrimSpace(scope.OrgID); orgID != "" {
		streamScope["org_id"] = orgID
	}
	p.stream.Publish(streamScope, eventstream.Event{
		Name:      AgreementChangedEventName,
		Payload:   payload,
		Timestamp: time.Now().UTC(),
	})
	return nil
}

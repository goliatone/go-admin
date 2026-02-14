package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

const (
	DeliveryStatePending  = "pending"
	DeliveryStateRetrying = "retrying"
	DeliveryStateFailed   = "failed"
	DeliveryStateReady    = "ready"
	DeliveryStateSent     = "sent"

	jobNamePDFGenerateExecuted    = "jobs.esign.pdf_generate_executed"
	jobNamePDFGenerateCertificate = "jobs.esign.pdf_generate_certificate"
)

// RenderedArtifact captures deterministic rendered artifact metadata.
type RenderedArtifact struct {
	ObjectKey string
	SHA256    string
	Payload   []byte
}

// ExecutedRenderInput provides source data required to render an executed artifact.
type ExecutedRenderInput struct {
	Scope         stores.Scope
	Agreement     stores.AgreementRecord
	Recipients    []stores.RecipientRecord
	Fields        []stores.FieldRecord
	FieldValues   []stores.FieldValueRecord
	CorrelationID string
}

// CertificateRenderInput provides source data required to render a certificate artifact.
type CertificateRenderInput struct {
	Scope          stores.Scope
	Agreement      stores.AgreementRecord
	Recipients     []stores.RecipientRecord
	Events         []stores.AuditEventRecord
	ExecutedSHA256 string
	CorrelationID  string
}

// ArtifactRenderer integrates executed/certificate rendering behind a stable interface.
type ArtifactRenderer interface {
	RenderExecuted(ctx context.Context, input ExecutedRenderInput) (RenderedArtifact, error)
	RenderCertificate(ctx context.Context, input CertificateRenderInput) (RenderedArtifact, error)
}

// DeterministicArtifactRenderer is a stable renderer used for v1 testable behavior.
type DeterministicArtifactRenderer struct{}

func NewDeterministicArtifactRenderer() DeterministicArtifactRenderer {
	return DeterministicArtifactRenderer{}
}

func (r DeterministicArtifactRenderer) RenderExecuted(_ context.Context, input ExecutedRenderInput) (RenderedArtifact, error) {
	agreementID := strings.TrimSpace(input.Agreement.ID)
	if agreementID == "" {
		return RenderedArtifact{}, fmt.Errorf("render executed: agreement id required")
	}
	lines := make([]string, 0, len(input.Fields)+len(input.FieldValues)+8)
	lines = append(lines,
		"artifact=executed",
		"agreement_id="+agreementID,
		"status="+strings.TrimSpace(input.Agreement.Status),
		"correlation_id="+strings.TrimSpace(input.CorrelationID),
	)
	recipients := append([]stores.RecipientRecord(nil), input.Recipients...)
	sort.Slice(recipients, func(i, j int) bool {
		if recipients[i].SigningOrder == recipients[j].SigningOrder {
			return recipients[i].ID < recipients[j].ID
		}
		return recipients[i].SigningOrder < recipients[j].SigningOrder
	})
	for _, recipient := range recipients {
		lines = append(lines, strings.Join([]string{
			"recipient",
			recipient.ID,
			recipient.Role,
			recipient.Email,
			fmt.Sprintf("%d", recipient.SigningOrder),
		}, "|"))
	}
	fields := append([]stores.FieldRecord(nil), input.Fields...)
	sort.Slice(fields, func(i, j int) bool {
		if fields[i].PageNumber == fields[j].PageNumber {
			return fields[i].ID < fields[j].ID
		}
		return fields[i].PageNumber < fields[j].PageNumber
	})
	for _, field := range fields {
		lines = append(lines, strings.Join([]string{
			"field",
			field.ID,
			field.RecipientID,
			field.Type,
			fmt.Sprintf("%d", field.PageNumber),
			fmt.Sprintf("%t", field.Required),
		}, "|"))
	}
	values := append([]stores.FieldValueRecord(nil), input.FieldValues...)
	sort.Slice(values, func(i, j int) bool {
		if values[i].RecipientID == values[j].RecipientID {
			return values[i].FieldID < values[j].FieldID
		}
		return values[i].RecipientID < values[j].RecipientID
	})
	for _, value := range values {
		valueBool := ""
		if value.ValueBool != nil {
			valueBool = fmt.Sprintf("%t", *value.ValueBool)
		}
		lines = append(lines, strings.Join([]string{
			"value",
			value.RecipientID,
			value.FieldID,
			strings.TrimSpace(value.ValueText),
			valueBool,
			value.SignatureArtifactID,
		}, "|"))
	}
	rendered := strings.Join(lines, "\n")
	sum := sha256.Sum256([]byte(rendered))
	return RenderedArtifact{
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/agreements/%s/executed.pdf", input.Scope.TenantID, input.Scope.OrgID, agreementID),
		SHA256:    hex.EncodeToString(sum[:]),
		Payload:   GenerateDeterministicPDF(1),
	}, nil
}

func (r DeterministicArtifactRenderer) RenderCertificate(_ context.Context, input CertificateRenderInput) (RenderedArtifact, error) {
	agreementID := strings.TrimSpace(input.Agreement.ID)
	if agreementID == "" {
		return RenderedArtifact{}, fmt.Errorf("render certificate: agreement id required")
	}
	lines := make([]string, 0, len(input.Events)+len(input.Recipients)+8)
	lines = append(lines,
		"artifact=certificate",
		"agreement_id="+agreementID,
		"status="+strings.TrimSpace(input.Agreement.Status),
		"executed_sha256="+strings.TrimSpace(input.ExecutedSHA256),
		"correlation_id="+strings.TrimSpace(input.CorrelationID),
	)
	recipients := append([]stores.RecipientRecord(nil), input.Recipients...)
	sort.Slice(recipients, func(i, j int) bool {
		if recipients[i].SigningOrder == recipients[j].SigningOrder {
			return recipients[i].ID < recipients[j].ID
		}
		return recipients[i].SigningOrder < recipients[j].SigningOrder
	})
	for _, recipient := range recipients {
		lines = append(lines, strings.Join([]string{
			"recipient",
			recipient.ID,
			recipient.Role,
			recipient.Email,
			timePtrRFC3339(recipient.CompletedAt),
			timePtrRFC3339(recipient.DeclinedAt),
		}, "|"))
	}
	events := append([]stores.AuditEventRecord(nil), input.Events...)
	sort.Slice(events, func(i, j int) bool {
		if events[i].CreatedAt.Equal(events[j].CreatedAt) {
			return events[i].ID < events[j].ID
		}
		return events[i].CreatedAt.Before(events[j].CreatedAt)
	})
	for _, event := range events {
		lines = append(lines, strings.Join([]string{
			"event",
			event.EventType,
			event.ActorType,
			event.ActorID,
			event.CreatedAt.UTC().Format(time.RFC3339Nano),
			strings.TrimSpace(event.MetadataJSON),
		}, "|"))
	}
	rendered := strings.Join(lines, "\n")
	sum := sha256.Sum256([]byte(rendered))
	return RenderedArtifact{
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/agreements/%s/certificate.pdf", input.Scope.TenantID, input.Scope.OrgID, agreementID),
		SHA256:    hex.EncodeToString(sum[:]),
		Payload:   GenerateDeterministicPDF(2),
	}, nil
}

type artifactObjectStore interface {
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// ArtifactPipelineService orchestrates render/persist behavior for executed and certificate artifacts.
type ArtifactPipelineService struct {
	agreements  stores.AgreementStore
	signing     stores.SigningStore
	audits      stores.AuditEventStore
	artifacts   stores.AgreementArtifactStore
	jobRuns     stores.JobRunStore
	emailLogs   stores.EmailLogStore
	tx          stores.TransactionManager
	objectStore artifactObjectStore
	renderer    ArtifactRenderer
}

// ArtifactPipelineOption customizes artifact pipeline dependencies.
type ArtifactPipelineOption func(*ArtifactPipelineService)

// WithArtifactObjectStore configures immutable artifact blob persistence.
func WithArtifactObjectStore(store artifactObjectStore) ArtifactPipelineOption {
	return func(s *ArtifactPipelineService) {
		if s == nil {
			return
		}
		s.objectStore = store
	}
}

func NewArtifactPipelineService(
	store stores.Store,
	renderer ArtifactRenderer,
	opts ...ArtifactPipelineOption,
) ArtifactPipelineService {
	if renderer == nil {
		renderer = NewDeterministicArtifactRenderer()
	}
	svc := ArtifactPipelineService{
		agreements: store,
		signing:    store,
		audits:     store,
		artifacts:  store,
		jobRuns:    store,
		emailLogs:  store,
		tx:         store,
		renderer:   renderer,
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func (s ArtifactPipelineService) forTx(tx stores.TxStore) ArtifactPipelineService {
	txSvc := s
	txSvc.agreements = tx
	txSvc.signing = tx
	txSvc.audits = tx
	txSvc.artifacts = tx
	txSvc.jobRuns = tx
	txSvc.emailLogs = tx
	return txSvc
}

func (s ArtifactPipelineService) withWriteTx(ctx context.Context, fn func(ArtifactPipelineService) error) error {
	if fn == nil {
		return nil
	}
	if s.tx == nil {
		return fn(s)
	}
	return s.tx.WithTx(ctx, func(tx stores.TxStore) error {
		return fn(s.forTx(tx))
	})
}

// RenderPages validates agreement scope and acts as a stable render-pages integration seam.
func (s ArtifactPipelineService) RenderPages(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error {
	if s.agreements == nil {
		return domainValidationError("agreements", "store", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return err
	}
	return s.appendPipelineAudit(ctx, scope, agreement.ID, "artifact.pages_rendered", correlationID, map[string]any{
		"agreement_status": agreement.Status,
	})
}

func (s ArtifactPipelineService) GenerateExecutedArtifact(ctx context.Context, scope stores.Scope, agreementID, correlationID string) (stores.AgreementArtifactRecord, error) {
	var record stores.AgreementArtifactRecord
	if err := s.withWriteTx(ctx, func(txSvc ArtifactPipelineService) error {
		var err error
		record, err = txSvc.generateExecutedArtifact(ctx, scope, agreementID, correlationID)
		return err
	}); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	return record, nil
}

func (s ArtifactPipelineService) generateExecutedArtifact(ctx context.Context, scope stores.Scope, agreementID, correlationID string) (stores.AgreementArtifactRecord, error) {
	if s.agreements == nil || s.signing == nil || s.artifacts == nil {
		return stores.AgreementArtifactRecord{}, domainValidationError("artifacts", "dependencies", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	fields, err := s.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	allValues := make([]stores.FieldValueRecord, 0)
	for _, recipient := range recipients {
		values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreementID, recipient.ID)
		if err != nil {
			return stores.AgreementArtifactRecord{}, err
		}
		allValues = append(allValues, values...)
	}
	rendered, err := s.renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:         scope,
		Agreement:     agreement,
		Recipients:    recipients,
		Fields:        fields,
		FieldValues:   allValues,
		CorrelationID: correlationID,
	})
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if err := s.persistArtifactBlob(ctx, rendered.ObjectKey, rendered.Payload); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	record, err := s.artifacts.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
		AgreementID:       agreementID,
		ExecutedObjectKey: rendered.ObjectKey,
		ExecutedSHA256:    rendered.SHA256,
		CorrelationID:     strings.TrimSpace(correlationID),
	})
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if err := s.appendPipelineAudit(ctx, scope, agreement.ID, "artifact.executed_generated", correlationID, map[string]any{
		"object_key": rendered.ObjectKey,
		"sha256":     rendered.SHA256,
	}); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	return record, nil
}

func (s ArtifactPipelineService) GenerateCertificateArtifact(ctx context.Context, scope stores.Scope, agreementID, correlationID string) (stores.AgreementArtifactRecord, error) {
	var record stores.AgreementArtifactRecord
	if err := s.withWriteTx(ctx, func(txSvc ArtifactPipelineService) error {
		var err error
		record, err = txSvc.generateCertificateArtifact(ctx, scope, agreementID, correlationID)
		return err
	}); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	return record, nil
}

func (s ArtifactPipelineService) generateCertificateArtifact(ctx context.Context, scope stores.Scope, agreementID, correlationID string) (stores.AgreementArtifactRecord, error) {
	if s.agreements == nil || s.artifacts == nil {
		return stores.AgreementArtifactRecord{}, domainValidationError("artifacts", "dependencies", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	events := make([]stores.AuditEventRecord, 0)
	if s.audits != nil {
		events, err = s.audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{SortDesc: false})
		if err != nil {
			return stores.AgreementArtifactRecord{}, err
		}
	}
	existing, err := s.artifacts.GetAgreementArtifacts(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	rendered, err := s.renderer.RenderCertificate(ctx, CertificateRenderInput{
		Scope:          scope,
		Agreement:      agreement,
		Recipients:     recipients,
		Events:         events,
		ExecutedSHA256: existing.ExecutedSHA256,
		CorrelationID:  correlationID,
	})
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if err := s.persistArtifactBlob(ctx, rendered.ObjectKey, rendered.Payload); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	record, err := s.artifacts.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
		AgreementID:          agreementID,
		CertificateObjectKey: rendered.ObjectKey,
		CertificateSHA256:    rendered.SHA256,
		CorrelationID:        strings.TrimSpace(correlationID),
	})
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	timelineHash := hashTimeline(events)
	if err := s.appendPipelineAudit(ctx, scope, agreement.ID, "artifact.certificate_generated", correlationID, map[string]any{
		"object_key":      rendered.ObjectKey,
		"sha256":          rendered.SHA256,
		"timeline_hash":   timelineHash,
		"executed_sha256": existing.ExecutedSHA256,
	}); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	return record, nil
}

type AgreementDeliveryDetail struct {
	AgreementID          string   `json:"agreement_id"`
	ExecutedStatus       string   `json:"executed_status"`
	CertificateStatus    string   `json:"certificate_status"`
	DistributionStatus   string   `json:"distribution_status"`
	ExecutedObjectKey    string   `json:"executed_object_key,omitempty"`
	CertificateObjectKey string   `json:"certificate_object_key,omitempty"`
	LastError            string   `json:"last_error,omitempty"`
	CorrelationIDs       []string `json:"correlation_ids,omitempty"`
}

func (s ArtifactPipelineService) AgreementDeliveryDetail(ctx context.Context, scope stores.Scope, agreementID string) (AgreementDeliveryDetail, error) {
	detail := AgreementDeliveryDetail{
		AgreementID:        strings.TrimSpace(agreementID),
		ExecutedStatus:     DeliveryStatePending,
		CertificateStatus:  DeliveryStatePending,
		DistributionStatus: DeliveryStatePending,
	}
	if s.artifacts != nil {
		if artifactRecord, err := s.artifacts.GetAgreementArtifacts(ctx, scope, agreementID); err == nil {
			detail.ExecutedObjectKey = artifactRecord.ExecutedObjectKey
			detail.CertificateObjectKey = artifactRecord.CertificateObjectKey
			if artifactRecord.ExecutedObjectKey != "" {
				detail.ExecutedStatus = DeliveryStateReady
			}
			if artifactRecord.CertificateObjectKey != "" {
				detail.CertificateStatus = DeliveryStateReady
			}
			detail.CorrelationIDs = append(detail.CorrelationIDs, strings.TrimSpace(artifactRecord.CorrelationID))
		}
	}
	if s.jobRuns != nil {
		jobRuns, err := s.jobRuns.ListJobRuns(ctx, scope, agreementID)
		if err != nil {
			return detail, err
		}
		detail.ExecutedStatus = stageStatusFromRuns(jobRuns, jobNamePDFGenerateExecuted, detail.ExecutedStatus)
		detail.CertificateStatus = stageStatusFromRuns(jobRuns, jobNamePDFGenerateCertificate, detail.CertificateStatus)
		for _, run := range jobRuns {
			if run.LastError != "" {
				detail.LastError = run.LastError
			}
			detail.CorrelationIDs = append(detail.CorrelationIDs, strings.TrimSpace(run.CorrelationID))
		}
	}
	if s.emailLogs != nil {
		logs, err := s.emailLogs.ListEmailLogs(ctx, scope, agreementID)
		if err != nil {
			return detail, err
		}
		detail.DistributionStatus = distributionStatusFromEmailLogs(logs)
		for _, log := range logs {
			if strings.TrimSpace(log.FailureReason) != "" {
				detail.LastError = strings.TrimSpace(log.FailureReason)
			}
			detail.CorrelationIDs = append(detail.CorrelationIDs, strings.TrimSpace(log.CorrelationID))
		}
	}
	detail.CorrelationIDs = dedupeStrings(detail.CorrelationIDs)
	return detail, nil
}

func (s ArtifactPipelineService) persistArtifactBlob(ctx context.Context, objectKey string, payload []byte) error {
	if s.objectStore == nil {
		return domainValidationError("artifacts", "object_store", "not configured")
	}
	key := strings.TrimSpace(objectKey)
	if key == "" {
		return domainValidationError("artifacts", "object_key", "required")
	}
	pdf := append([]byte{}, payload...)
	if len(pdf) == 0 {
		return domainValidationError("artifacts", "payload", "rendered artifact payload is empty")
	}
	if _, err := s.objectStore.UploadFile(
		ctx,
		key,
		pdf,
		uploader.WithContentType("application/pdf"),
		uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
	); err != nil {
		return domainValidationError("artifacts", "object_store", "persist artifact blob failed")
	}
	stored, err := s.objectStore.GetFile(ctx, key)
	if err != nil || len(stored) == 0 {
		return domainValidationError("artifacts", "object_store", "persisted artifact blob is unavailable")
	}
	if !bytes.HasPrefix(stored, []byte("%PDF-")) {
		return domainValidationError("artifacts", "object_store", "persisted artifact blob is not a valid pdf payload")
	}
	return nil
}

func stageStatusFromRuns(runs []stores.JobRunRecord, jobName, fallback string) string {
	latest := stores.JobRunRecord{}
	found := false
	for _, run := range runs {
		if strings.TrimSpace(run.JobName) != strings.TrimSpace(jobName) {
			continue
		}
		if !found || run.UpdatedAt.After(latest.UpdatedAt) {
			latest = run
			found = true
		}
	}
	if !found {
		return fallback
	}
	switch latest.Status {
	case stores.JobRunStatusSucceeded:
		return DeliveryStateReady
	case stores.JobRunStatusRetrying:
		return DeliveryStateRetrying
	case stores.JobRunStatusFailed:
		return DeliveryStateFailed
	default:
		return DeliveryStatePending
	}
}

func distributionStatusFromEmailLogs(logs []stores.EmailLogRecord) string {
	if len(logs) == 0 {
		return DeliveryStatePending
	}
	latestByTarget := map[string]stores.EmailLogRecord{}
	for _, log := range logs {
		key := strings.Join([]string{
			strings.TrimSpace(log.TemplateCode),
			strings.TrimSpace(log.RecipientID),
		}, "|")
		current, ok := latestByTarget[key]
		if !ok || log.UpdatedAt.After(current.UpdatedAt) {
			latestByTarget[key] = log
		}
	}
	hasSent := false
	for _, log := range latestByTarget {
		switch strings.TrimSpace(log.Status) {
		case DeliveryStateRetrying:
			return DeliveryStateRetrying
		case DeliveryStateFailed:
			return DeliveryStateFailed
		case DeliveryStateSent:
			hasSent = true
		}
	}
	if hasSent {
		return DeliveryStateSent
	}
	return DeliveryStatePending
}

func hashTimeline(events []stores.AuditEventRecord) string {
	if len(events) == 0 {
		return ""
	}
	lines := make([]string, 0, len(events))
	for _, event := range events {
		lines = append(lines, strings.Join([]string{
			strings.TrimSpace(event.EventType),
			event.CreatedAt.UTC().Format(time.RFC3339Nano),
			strings.TrimSpace(event.ActorID),
			strings.TrimSpace(event.MetadataJSON),
		}, "|"))
	}
	sort.Strings(lines)
	sum := sha256.Sum256([]byte(strings.Join(lines, "\n")))
	return hex.EncodeToString(sum[:])
}

func dedupeStrings(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func (s ArtifactPipelineService) appendPipelineAudit(ctx context.Context, scope stores.Scope, agreementID, eventType, correlationID string, metadata map[string]any) error {
	if s.audits == nil {
		return nil
	}
	meta := map[string]any{}
	for key, value := range metadata {
		meta[key] = value
	}
	meta["correlation_id"] = strings.TrimSpace(correlationID)
	encoded, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	_, err = s.audits.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  strings.TrimSpace(agreementID),
		EventType:    strings.TrimSpace(eventType),
		ActorType:    "system_job",
		MetadataJSON: string(encoded),
		CreatedAt:    time.Now().UTC(),
	})
	return err
}

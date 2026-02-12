package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

const (
	SignerSessionStateActive    = "active"
	SignerSessionStateWaiting   = "waiting"
	SignerSessionStateCompleted = "completed"
	SignerSessionStateTerminal  = "terminal"
	SignerSessionStateObserver  = "observer"
	SignerSessionStateInvalid   = "invalid"

	signerCoordinateContractVersion = "pdf_page_space_v1"
	signerCoordinateSpace           = "pdf_points"
	signerCoordinateUnit            = "pt"
	signerCoordinateOrigin          = "top_left"
	signerCoordinateYAxisDirection  = "down"
	defaultPDFPageWidth             = 612.0
	defaultPDFPageHeight            = 792.0
	defaultFieldWidth               = 180.0
	defaultFieldHeight              = 28.0

	defaultSignatureUploadTTLSeconds = 300
	defaultSignatureUploadMaxBytes   = 5 * 1024 * 1024
	defaultSignatureUploadURLPath    = "/api/v1/esign/signing/signature-upload/object"
)

// SigningService exposes signer-session and signing flow behavior.
type SigningService struct {
	agreements            stores.AgreementStore
	signing               stores.SigningStore
	documents             stores.DocumentStore
	objectStore           signingObjectStore
	artifacts             stores.SignatureArtifactStore
	audits                stores.AuditEventStore
	completionFlow        SigningCompletionWorkflow
	now                   func() time.Time
	signatureUploadTTL    time.Duration
	signatureUploadSecret []byte
	signatureUploadURL    string
	state                 *signingServiceState
}

type signingServiceState struct {
	mu                     sync.RWMutex
	consentAccepted        map[string]time.Time
	submitByKey            map[string]SignerSubmitResult
	signatureUploads       map[string]signatureUploadGrant
	confirmedUploadByToken map[string]signatureUploadReceipt
}

type signingObjectStore interface {
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// SigningCompletionWorkflow handles post-submit completion workflows (artifacts/certificate/distribution).
type SigningCompletionWorkflow interface {
	RunCompletionWorkflow(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error
}

// SigningServiceOption customizes SigningService.
type SigningServiceOption func(*SigningService)

// WithSigningClock overrides the service clock.
func WithSigningClock(now func() time.Time) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithSignatureArtifactStore overrides signature artifact persistence behavior.
func WithSignatureArtifactStore(store stores.SignatureArtifactStore) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.artifacts = store
	}
}

// WithSigningDocumentStore configures document metadata lookups for signer bootstrap payloads.
func WithSigningDocumentStore(store stores.DocumentStore) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.documents = store
	}
}

// WithSigningObjectStore configures object storage persistence for signer uploads/assets.
func WithSigningObjectStore(store signingObjectStore) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.objectStore = store
	}
}

// WithSigningAuditStore configures signer audit event persistence.
func WithSigningAuditStore(store stores.AuditEventStore) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.audits = store
	}
}

// WithSigningCompletionWorkflow configures post-completion artifact/distribution workflow execution.
func WithSigningCompletionWorkflow(workflow SigningCompletionWorkflow) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.completionFlow = workflow
	}
}

// WithSignatureUploadConfig overrides signature upload bootstrap signing policy.
func WithSignatureUploadConfig(ttl time.Duration, secret string) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		if ttl > 0 {
			s.signatureUploadTTL = ttl
		}
		trimmedSecret := strings.TrimSpace(secret)
		if trimmedSecret != "" {
			s.signatureUploadSecret = []byte(trimmedSecret)
		}
	}
}

// WithSignatureUploadURL configures the upload endpoint returned by bootstrap contracts.
func WithSignatureUploadURL(urlPath string) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		trimmedPath := strings.TrimSpace(urlPath)
		if trimmedPath != "" {
			s.signatureUploadURL = trimmedPath
		}
	}
}

func NewSigningService(agreements stores.AgreementStore, signing stores.SigningStore, opts ...SigningServiceOption) SigningService {
	svc := SigningService{
		agreements:            agreements,
		signing:               signing,
		now:                   func() time.Time { return time.Now().UTC() },
		signatureUploadTTL:    time.Duration(defaultSignatureUploadTTLSeconds) * time.Second,
		signatureUploadSecret: []byte("esign-signature-upload-secret"),
		signatureUploadURL:    defaultSignatureUploadURLPath,
		state: &signingServiceState{
			consentAccepted:        map[string]time.Time{},
			submitByKey:            map[string]SignerSubmitResult{},
			signatureUploads:       map[string]signatureUploadGrant{},
			confirmedUploadByToken: map[string]signatureUploadReceipt{},
		},
	}
	if artifacts, ok := signing.(stores.SignatureArtifactStore); ok {
		svc.artifacts = artifacts
	}
	if audits, ok := agreements.(stores.AuditEventStore); ok {
		svc.audits = audits
	}
	if documents, ok := agreements.(stores.DocumentStore); ok {
		svc.documents = documents
	}
	if svc.documents == nil {
		if documents, ok := signing.(stores.DocumentStore); ok {
			svc.documents = documents
		}
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

// SignerSessionField captures signer-visible field context and current value snapshot.
type SignerSessionField struct {
	ID           string  `json:"id"`
	RecipientID  string  `json:"recipient_id"`
	Type         string  `json:"type"`
	Page         int     `json:"page"`
	PosX         float64 `json:"pos_x"`
	PosY         float64 `json:"pos_y"`
	Width        float64 `json:"width"`
	Height       float64 `json:"height"`
	PageWidth    float64 `json:"page_width,omitempty"`
	PageHeight   float64 `json:"page_height,omitempty"`
	PageRotation int     `json:"page_rotation"`
	Required     bool    `json:"required"`
	Label        string  `json:"label,omitempty"`
	TabIndex     int     `json:"tab_index,omitempty"`
	ValueText    string  `json:"value_text,omitempty"`
	ValueBool    *bool   `json:"value_bool,omitempty"`
}

// SignerSessionViewerPage describes canonical page-space metadata for overlay normalization.
type SignerSessionViewerPage struct {
	Page     int     `json:"page"`
	Width    float64 `json:"width"`
	Height   float64 `json:"height"`
	Rotation int     `json:"rotation"`
}

// SignerSessionViewerContext carries viewer bootstrap metadata used by unified signer UI.
type SignerSessionViewerContext struct {
	CoordinateSpace string                    `json:"coordinate_space"`
	ContractVersion string                    `json:"contract_version,omitempty"`
	Unit            string                    `json:"unit,omitempty"`
	Origin          string                    `json:"origin,omitempty"`
	YAxisDirection  string                    `json:"y_axis_direction,omitempty"`
	Pages           []SignerSessionViewerPage `json:"pages,omitempty"`
}

// SignerSessionContext returns agreement and signer-scoped context for the signer API.
type SignerSessionContext struct {
	AgreementID         string                     `json:"agreement_id"`
	AgreementStatus     string                     `json:"agreement_status"`
	DocumentName        string                     `json:"document_name"`
	PageCount           int                        `json:"page_count"`
	Viewer              SignerSessionViewerContext `json:"viewer"`
	RecipientID         string                     `json:"recipient_id"`
	RecipientRole       string                     `json:"recipient_role"`
	RecipientEmail      string                     `json:"recipient_email"`
	RecipientName       string                     `json:"recipient_name"`
	RecipientOrder      int                        `json:"recipient_order"`
	State               string                     `json:"state"`
	ActiveRecipientID   string                     `json:"active_recipient_id,omitempty"`
	WaitingForRecipient string                     `json:"waiting_for_recipient_id,omitempty"`
	Fields              []SignerSessionField       `json:"fields"`
}

// SignerConsentInput captures signer consent payload.
type SignerConsentInput struct {
	Accepted  bool   `json:"accepted"`
	IPAddress string `json:"-"`
	UserAgent string `json:"-"`
}

// SignerConsentResult returns consent capture details.
type SignerConsentResult struct {
	AcceptedAt time.Time `json:"accepted_at"`
}

// SignerFieldValueInput captures signer field value upserts.
type SignerFieldValueInput struct {
	FieldID         string `json:"field_id"`
	ValueText       string `json:"value_text,omitempty"`
	ValueBool       *bool  `json:"value_bool,omitempty"`
	ExpectedVersion int64  `json:"expected_version,omitempty"`
	IPAddress       string `json:"-"`
	UserAgent       string `json:"-"`
}

// SignerSignatureUploadInput captures signed upload bootstrap request payload.
type SignerSignatureUploadInput struct {
	FieldID     string `json:"field_id"`
	SHA256      string `json:"sha256"`
	ContentType string `json:"content_type,omitempty"`
	SizeBytes   int64  `json:"size_bytes,omitempty"`
	IPAddress   string `json:"-"`
	UserAgent   string `json:"-"`
}

// SignerSignatureUploadContract returns signer-scoped temporary upload contract metadata.
type SignerSignatureUploadContract struct {
	UploadToken string         `json:"upload_token"`
	UploadURL   string         `json:"upload_url"`
	Method      string         `json:"method"`
	Headers     map[string]any `json:"headers,omitempty"`
	ObjectKey   string         `json:"object_key"`
	SHA256      string         `json:"sha256"`
	ContentType string         `json:"content_type"`
	SizeBytes   int64          `json:"size_bytes,omitempty"`
	ExpiresAt   time.Time      `json:"expires_at"`
}

// SignerSignatureUploadCommitInput captures upload confirmation metadata for drawn signatures.
type SignerSignatureUploadCommitInput struct {
	UploadToken string `json:"upload_token"`
	ObjectKey   string `json:"object_key"`
	SHA256      string `json:"sha256"`
	ContentType string `json:"content_type"`
	SizeBytes   int64  `json:"size_bytes"`
	Payload     []byte `json:"-"`
	IPAddress   string `json:"-"`
	UserAgent   string `json:"-"`
}

// SignerSignatureUploadCommitResult returns persisted upload receipt metadata used by attach verification.
type SignerSignatureUploadCommitResult struct {
	ObjectKey   string    `json:"object_key"`
	SHA256      string    `json:"sha256"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	CommittedAt time.Time `json:"committed_at"`
}

// SignerSignatureInput captures create+attach signature artifact payload.
type SignerSignatureInput struct {
	FieldID         string `json:"field_id"`
	Type            string `json:"type"`
	ObjectKey       string `json:"object_key"`
	SHA256          string `json:"sha256"`
	UploadToken     string `json:"upload_token,omitempty"`
	ValueText       string `json:"value_text,omitempty"`
	ExpectedVersion int64  `json:"expected_version,omitempty"`
	IPAddress       string `json:"-"`
	UserAgent       string `json:"-"`
}

type signatureUploadGrant struct {
	Token       string
	TenantID    string
	OrgID       string
	AgreementID string
	RecipientID string
	FieldID     string
	ObjectKey   string
	SHA256      string
	ContentType string
	SizeBytes   int64
	ExpiresAt   time.Time
	ConsumedAt  *time.Time
	ReservedAt  *time.Time
}

type signatureUploadReceipt struct {
	UploadToken string
	ObjectKey   string
	SHA256      string
	ContentType string
	SizeBytes   int64
	CommittedAt time.Time
}

type signatureUploadValidationInput struct {
	UploadToken string
	AgreementID string
	RecipientID string
	FieldID     string
	ObjectKey   string
	SHA256      string
}

// SignerSignatureResult returns created artifact and attached field-value record.
type SignerSignatureResult struct {
	Artifact   stores.SignatureArtifactRecord `json:"artifact"`
	FieldValue stores.FieldValueRecord        `json:"field_value"`
}

// SignerSubmitInput captures submit/finalize request metadata.
type SignerSubmitInput struct {
	IdempotencyKey string `json:"idempotency_key"`
	IPAddress      string `json:"-"`
	UserAgent      string `json:"-"`
}

// SignerSubmitResult captures submit transition result data.
type SignerSubmitResult struct {
	Agreement       stores.AgreementRecord `json:"agreement"`
	Recipient       stores.RecipientRecord `json:"recipient"`
	NextRecipientID string                 `json:"next_recipient_id,omitempty"`
	Completed       bool                   `json:"completed"`
	Replay          bool                   `json:"replay,omitempty"`
}

// SignerDeclineInput captures decline request metadata.
type SignerDeclineInput struct {
	Reason    string `json:"reason"`
	IPAddress string `json:"-"`
	UserAgent string `json:"-"`
}

// SignerDeclineResult captures decline transition results.
type SignerDeclineResult struct {
	Agreement stores.AgreementRecord `json:"agreement"`
	Recipient stores.RecipientRecord `json:"recipient"`
}

// GetSession returns signer-scoped agreement/field context with sequential waiting-state semantics.
func (s SigningService) GetSession(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (SignerSessionContext, error) {
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSessionContext{}, err
	}
	updatedRecipient, err := s.agreements.TouchRecipientView(ctx, scope, agreement.ID, recipient.ID, s.now())
	if err != nil {
		return SignerSessionContext{}, err
	}
	recipient = updatedRecipient

	valuesByField := map[string]stores.FieldValueRecord{}
	if s.signing != nil {
		values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreement.ID, recipient.ID)
		if err != nil {
			return SignerSessionContext{}, err
		}
		for _, value := range values {
			if strings.TrimSpace(value.FieldID) == "" {
				continue
			}
			valuesByField[value.FieldID] = value
		}
	}

	state := resolveSessionState(agreement.Status, recipient, activeSigner, strings.TrimSpace(activeSigner.ID) != "")
	waitingFor := ""
	if state == SignerSessionStateWaiting {
		waitingFor = activeSigner.ID
	}
	documentName, pageCount, viewer := s.resolveSessionBootstrap(ctx, scope, agreement, fields)
	pagesByNumber := map[int]SignerSessionViewerPage{}
	for _, page := range viewer.Pages {
		pagesByNumber[page.Page] = page
	}

	sessionFields := make([]SignerSessionField, 0)
	tabIndex := 1
	for _, field := range fields {
		fieldRecipientID := strings.TrimSpace(field.RecipientID)
		if fieldRecipientID != "" && fieldRecipientID != recipient.ID {
			continue
		}
		value := valuesByField[field.ID]
		page, posX, posY, width, height, pageMeta := normalizeFieldGeometry(field, pageCount, pagesByNumber)
		sessionFields = append(sessionFields, SignerSessionField{
			ID:           field.ID,
			RecipientID:  field.RecipientID,
			Type:         field.Type,
			Page:         page,
			PosX:         posX,
			PosY:         posY,
			Width:        width,
			Height:       height,
			PageWidth:    pageMeta.Width,
			PageHeight:   pageMeta.Height,
			PageRotation: pageMeta.Rotation,
			Required:     field.Required,
			Label:        strings.TrimSpace(field.Type),
			TabIndex:     tabIndex,
			ValueText:    strings.TrimSpace(value.ValueText),
			ValueBool:    value.ValueBool,
		})
		tabIndex++
	}

	return SignerSessionContext{
		AgreementID:         agreement.ID,
		AgreementStatus:     agreement.Status,
		DocumentName:        documentName,
		PageCount:           pageCount,
		Viewer:              viewer,
		RecipientID:         recipient.ID,
		RecipientRole:       recipient.Role,
		RecipientEmail:      recipient.Email,
		RecipientName:       recipient.Name,
		RecipientOrder:      recipient.SigningOrder,
		State:               state,
		ActiveRecipientID:   activeSigner.ID,
		WaitingForRecipient: waitingFor,
		Fields:              sessionFields,
	}, nil
}

func (s SigningService) resolveSessionBootstrap(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord, fields []stores.FieldRecord) (string, int, SignerSessionViewerContext) {
	documentName := "Document.pdf"
	pageCount := 1
	if strings.TrimSpace(agreement.DocumentID) != "" && s.documents != nil {
		if document, err := s.documents.Get(ctx, scope, agreement.DocumentID); err == nil {
			if strings.TrimSpace(document.Title) != "" {
				documentName = strings.TrimSpace(document.Title)
			}
			if document.PageCount > 0 {
				pageCount = document.PageCount
			}
		}
	}
	maxFieldPage := 0
	for _, field := range fields {
		if field.PageNumber > maxFieldPage {
			maxFieldPage = field.PageNumber
		}
	}
	if maxFieldPage > pageCount {
		pageCount = maxFieldPage
	}
	if pageCount <= 0 {
		pageCount = 1
	}
	pages := make([]SignerSessionViewerPage, 0, pageCount)
	for page := 1; page <= pageCount; page++ {
		pages = append(pages, SignerSessionViewerPage{
			Page:     page,
			Width:    defaultPDFPageWidth,
			Height:   defaultPDFPageHeight,
			Rotation: 0,
		})
	}
	return documentName, pageCount, SignerSessionViewerContext{
		CoordinateSpace: signerCoordinateSpace,
		ContractVersion: signerCoordinateContractVersion,
		Unit:            signerCoordinateUnit,
		Origin:          signerCoordinateOrigin,
		YAxisDirection:  signerCoordinateYAxisDirection,
		Pages:           pages,
	}
}

// CaptureConsent stores consent acceptance for the active signer in a sequential flow.
func (s SigningService) CaptureConsent(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerConsentInput) (SignerConsentResult, error) {
	if !input.Accepted {
		return SignerConsentResult{}, domainValidationError("consent", "accepted", "must be true")
	}
	agreement, recipient, activeSigner, _, _, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerConsentResult{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return SignerConsentResult{}, domainValidationError("agreements", "status", "consent requires sent or in_progress status")
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerConsentResult{}, err
	}

	now := s.now()
	s.setConsentAccepted(signingFlowKey(scope, agreement.ID, recipient.ID), now)
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.consent_captured", input.IPAddress, input.UserAgent, map[string]any{
		"consent_at": now.UTC().Format(time.RFC3339),
	}); err != nil {
		return SignerConsentResult{}, err
	}
	return SignerConsentResult{AcceptedAt: now}, nil
}

// UpsertFieldValue validates signer ownership and required-field semantics for field value writes.
func (s SigningService) UpsertFieldValue(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerFieldValueInput) (stores.FieldValueRecord, error) {
	if s.signing == nil {
		return stores.FieldValueRecord{}, domainValidationError("field_values", "store", "not configured")
	}
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return stores.FieldValueRecord{}, err
	}
	fieldID := strings.TrimSpace(input.FieldID)
	if fieldID == "" {
		return stores.FieldValueRecord{}, domainValidationError("field_values", "field_id", "required")
	}
	field, ok := findFieldByID(fields, fieldID)
	if !ok {
		return stores.FieldValueRecord{}, domainValidationError("fields", "id", "not found")
	}
	if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipient.ID) {
		return stores.FieldValueRecord{}, domainValidationError("fields", "recipient_id", "field does not belong to signer")
	}

	resolvedText := strings.TrimSpace(input.ValueText)
	if field.Type == stores.FieldTypeDateSigned {
		resolvedText = s.now().UTC().Format(time.RFC3339)
	}
	if err := validateFieldValueInput(field, resolvedText, input.ValueBool); err != nil {
		return stores.FieldValueRecord{}, err
	}

	record := stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		FieldID:     field.ID,
		ValueText:   resolvedText,
		ValueBool:   input.ValueBool,
	}
	existing, hasExisting, err := s.findFieldValueByField(ctx, scope, agreement.ID, recipient.ID, field.ID)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if hasExisting {
		record.ID = existing.ID
		if input.ExpectedVersion == 0 {
			input.ExpectedVersion = existing.Version
		}
	}
	upserted, err := s.signing.UpsertFieldValue(ctx, scope, record, input.ExpectedVersion)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.field_value_upserted", input.IPAddress, input.UserAgent, map[string]any{
		"field_id": field.ID,
	}); err != nil {
		return stores.FieldValueRecord{}, err
	}
	return upserted, nil
}

// IssueSignatureUpload creates a short-lived signer-scoped upload contract for drawn signatures.
func (s SigningService) IssueSignatureUpload(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerSignatureUploadInput) (SignerSignatureUploadContract, error) {
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSignatureUploadContract{}, err
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerSignatureUploadContract{}, err
	}
	fieldID := strings.TrimSpace(input.FieldID)
	if fieldID == "" {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "field_id", "required")
	}
	field, ok := findFieldByID(fields, fieldID)
	if !ok {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "field_id", "not found")
	}
	if !isSignatureAttachFieldType(field.Type) {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "field_type", "bootstrap requires signature or initials field")
	}
	if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipient.ID) {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "recipient_id", "field does not belong to signer")
	}
	digest := normalizeSHA256Hex(input.SHA256)
	if len(digest) != 64 {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "sha256", "must be 64 lowercase hex chars")
	}
	contentType := strings.ToLower(strings.TrimSpace(input.ContentType))
	if contentType == "" {
		contentType = "image/png"
	}
	if contentType != "image/png" {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "content_type", "must be image/png")
	}
	if input.SizeBytes < 0 || input.SizeBytes > defaultSignatureUploadMaxBytes {
		return SignerSignatureUploadContract{}, domainValidationError("signature_upload", "size_bytes", "invalid content size")
	}

	now := s.now()
	expiresAt := now.Add(s.signatureUploadTTL)
	objectKey := signerSignatureObjectKey(scope, agreement.ID, recipient.ID, field.ID, now)
	claims := signatureUploadGrant{
		TenantID:    strings.TrimSpace(scope.TenantID),
		OrgID:       strings.TrimSpace(scope.OrgID),
		AgreementID: strings.TrimSpace(agreement.ID),
		RecipientID: strings.TrimSpace(recipient.ID),
		FieldID:     strings.TrimSpace(field.ID),
		ObjectKey:   objectKey,
		SHA256:      digest,
		ContentType: contentType,
		SizeBytes:   input.SizeBytes,
		ExpiresAt:   expiresAt.UTC(),
	}
	tokenValue, err := s.signSignatureUploadGrant(claims)
	if err != nil {
		return SignerSignatureUploadContract{}, err
	}
	claims.Token = tokenValue
	s.putSignatureUploadGrant(tokenValue, claims)

	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.signature_upload_bootstrapped", input.IPAddress, input.UserAgent, map[string]any{
		"field_id":     field.ID,
		"object_key":   objectKey,
		"content_type": contentType,
		"expires_at":   expiresAt.UTC().Format(time.RFC3339),
	}); err != nil {
		return SignerSignatureUploadContract{}, err
	}

	return SignerSignatureUploadContract{
		UploadToken: tokenValue,
		UploadURL:   strings.TrimSpace(s.signatureUploadURL),
		Method:      "PUT",
		Headers: map[string]any{
			"Content-Type":         contentType,
			"X-ESign-Upload-Key":   objectKey,
			"X-ESign-Upload-Token": tokenValue,
		},
		ObjectKey:   objectKey,
		SHA256:      digest,
		ContentType: contentType,
		SizeBytes:   input.SizeBytes,
		ExpiresAt:   expiresAt.UTC(),
	}, nil
}

// ConfirmSignatureUpload records upload receipt metadata and enforces grant-bound digest/object constraints.
func (s SigningService) ConfirmSignatureUpload(ctx context.Context, scope stores.Scope, input SignerSignatureUploadCommitInput) (SignerSignatureUploadCommitResult, error) {
	payload := append([]byte{}, input.Payload...)
	if len(payload) > 0 {
		sum := sha256.Sum256(payload)
		computedSHA := hex.EncodeToString(sum[:])
		if normalized := normalizeSHA256Hex(strings.TrimSpace(input.SHA256)); normalized != "" && normalized != computedSHA {
			return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "sha256", "uploaded content digest mismatch")
		}
		input.SHA256 = computedSHA
		input.SizeBytes = int64(len(payload))
		if strings.TrimSpace(input.ContentType) == "" {
			input.ContentType = "image/png"
		}
	}

	grant, err := s.validateSignatureUploadGrant(ctx, scope, signatureUploadValidationInput{
		UploadToken: input.UploadToken,
		ObjectKey:   input.ObjectKey,
		SHA256:      input.SHA256,
	})
	if err != nil {
		return SignerSignatureUploadCommitResult{}, err
	}
	if strings.TrimSpace(input.ContentType) != "" && !strings.EqualFold(strings.TrimSpace(input.ContentType), strings.TrimSpace(grant.ContentType)) {
		return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "content_type", "uploaded content type does not match contract")
	}
	if input.SizeBytes < 0 {
		return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "size_bytes", "invalid content size")
	}
	if grant.SizeBytes > 0 && input.SizeBytes > 0 && input.SizeBytes != grant.SizeBytes {
		return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "size_bytes", "uploaded content size does not match contract")
	}
	if input.SizeBytes > defaultSignatureUploadMaxBytes {
		return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "size_bytes", "invalid content size")
	}
	if len(payload) > 0 && s.objectStore != nil {
		if _, err := s.objectStore.UploadFile(ctx, strings.TrimSpace(grant.ObjectKey), payload,
			uploader.WithContentType(strings.TrimSpace(grant.ContentType)),
			uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
		); err != nil {
			return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "object_store", "persist signed upload failed")
		}
		stored, err := s.objectStore.GetFile(ctx, strings.TrimSpace(grant.ObjectKey))
		if err != nil || len(stored) == 0 {
			return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "object_store", "persisted upload is unavailable")
		}
		sum := sha256.Sum256(stored)
		if hex.EncodeToString(sum[:]) != strings.TrimSpace(grant.SHA256) {
			return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "object_store", "persisted upload digest mismatch")
		}
		if grant.SizeBytes > 0 && int64(len(stored)) != grant.SizeBytes {
			return SignerSignatureUploadCommitResult{}, domainValidationError("signature_upload", "object_store", "persisted upload size mismatch")
		}
	}

	committedAt := s.now()
	receipt := signatureUploadReceipt{
		UploadToken: strings.TrimSpace(input.UploadToken),
		ObjectKey:   strings.TrimSpace(grant.ObjectKey),
		SHA256:      strings.TrimSpace(grant.SHA256),
		ContentType: strings.TrimSpace(grant.ContentType),
		SizeBytes:   input.SizeBytes,
		CommittedAt: committedAt.UTC(),
	}
	s.putSignatureUploadReceipt(receipt.UploadToken, receipt)
	if err := s.appendSignerAudit(ctx, scope, grant.AgreementID, grant.RecipientID, "signer.signature_upload_confirmed", input.IPAddress, input.UserAgent, map[string]any{
		"field_id":         grant.FieldID,
		"object_key":       grant.ObjectKey,
		"content_type":     grant.ContentType,
		"size_bytes":       receipt.SizeBytes,
		"upload_expires":   grant.ExpiresAt.UTC().Format(time.RFC3339),
		"upload_committed": receipt.CommittedAt.UTC().Format(time.RFC3339),
	}); err != nil {
		return SignerSignatureUploadCommitResult{}, err
	}
	return SignerSignatureUploadCommitResult{
		ObjectKey:   receipt.ObjectKey,
		SHA256:      receipt.SHA256,
		ContentType: receipt.ContentType,
		SizeBytes:   receipt.SizeBytes,
		CommittedAt: receipt.CommittedAt,
	}, nil
}

// AttachSignatureArtifact creates a typed/drawn signature artifact and attaches it to a signature field value.
func (s SigningService) AttachSignatureArtifact(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerSignatureInput) (SignerSignatureResult, error) {
	if s.signing == nil {
		return SignerSignatureResult{}, domainValidationError("field_values", "store", "not configured")
	}
	if s.artifacts == nil {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "store", "not configured")
	}
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSignatureResult{}, err
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerSignatureResult{}, err
	}
	fieldID := strings.TrimSpace(input.FieldID)
	if fieldID == "" {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "field_id", "required")
	}
	field, ok := findFieldByID(fields, fieldID)
	if !ok {
		return SignerSignatureResult{}, domainValidationError("fields", "id", "not found")
	}
	if !isSignatureAttachFieldType(field.Type) {
		return SignerSignatureResult{}, domainValidationError("fields", "field_type", "signature attach requires signature or initials field")
	}
	if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipient.ID) {
		return SignerSignatureResult{}, domainValidationError("fields", "recipient_id", "field does not belong to signer")
	}

	signatureType := strings.TrimSpace(strings.ToLower(input.Type))
	if signatureType != "typed" && signatureType != "drawn" {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "type", "must be typed or drawn")
	}
	objectKey := strings.TrimSpace(input.ObjectKey)
	if objectKey == "" {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "object_key", "required")
	}
	sha256Hex := normalizeSHA256Hex(input.SHA256)
	if len(sha256Hex) != 64 {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "sha256", "must be 64 lowercase hex chars")
	}

	existing, hasExisting, err := s.findFieldValueByField(ctx, scope, agreement.ID, recipient.ID, field.ID)
	if err != nil {
		return SignerSignatureResult{}, err
	}
	if hasExisting && strings.TrimSpace(existing.SignatureArtifactID) != "" {
		if artifact, aerr := s.artifacts.GetSignatureArtifact(ctx, scope, existing.SignatureArtifactID); aerr == nil {
			if strings.TrimSpace(artifact.ObjectKey) == objectKey && strings.TrimSpace(artifact.SHA256) == sha256Hex && strings.TrimSpace(artifact.Type) == signatureType {
				return SignerSignatureResult{
					Artifact:   artifact,
					FieldValue: existing,
				}, nil
			}
		}
	}
	uploadToken := strings.TrimSpace(input.UploadToken)
	uploadTokenHash := ""
	releaseReservation := func() {}
	if signatureType == "drawn" {
		grant, err := s.validateSignatureUploadGrant(ctx, scope, signatureUploadValidationInput{
			UploadToken: uploadToken,
			AgreementID: agreement.ID,
			RecipientID: recipient.ID,
			FieldID:     field.ID,
			ObjectKey:   objectKey,
			SHA256:      sha256Hex,
		})
		if err != nil {
			return SignerSignatureResult{}, err
		}
		receipt, ok, err := s.resolveSignatureUploadReceipt(ctx, scope, uploadToken, grant)
		if err != nil {
			return SignerSignatureResult{}, err
		}
		if !ok {
			return SignerSignatureResult{}, domainValidationError("signature_upload", "upload_token", "signature upload object not confirmed")
		}
		if receipt.ObjectKey != grant.ObjectKey || receipt.SHA256 != grant.SHA256 {
			return SignerSignatureResult{}, domainValidationError("signature_upload", "upload_token", "signature upload receipt metadata mismatch")
		}
		if receipt.SizeBytes < 0 || receipt.SizeBytes > defaultSignatureUploadMaxBytes {
			return SignerSignatureResult{}, domainValidationError("signature_upload", "size_bytes", "invalid content size")
		}
		release, err := s.reserveSignatureUploadGrant(uploadToken, s.now())
		if err != nil {
			return SignerSignatureResult{}, err
		}
		releaseReservation = release
		uploadTokenHash = hashUploadToken(uploadToken)
	}
	defer releaseReservation()

	artifact, err := s.artifacts.CreateSignatureArtifact(ctx, scope, stores.SignatureArtifactRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Type:        signatureType,
		ObjectKey:   objectKey,
		SHA256:      sha256Hex,
		CreatedAt:   s.now(),
	})
	if err != nil {
		return SignerSignatureResult{}, err
	}

	record := stores.FieldValueRecord{
		AgreementID:         agreement.ID,
		RecipientID:         recipient.ID,
		FieldID:             field.ID,
		ValueText:           strings.TrimSpace(input.ValueText),
		SignatureArtifactID: artifact.ID,
	}
	if hasExisting {
		record.ID = existing.ID
		if input.ExpectedVersion == 0 {
			input.ExpectedVersion = existing.Version
		}
	}
	value, err := s.signing.UpsertFieldValue(ctx, scope, record, input.ExpectedVersion)
	if err != nil {
		return SignerSignatureResult{}, err
	}
	metadata := map[string]any{
		"field_id":    field.ID,
		"artifact_id": artifact.ID,
		"type":        signatureType,
	}
	if uploadTokenHash != "" {
		metadata["upload_token_hash"] = uploadTokenHash
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.signature_attached", input.IPAddress, input.UserAgent, metadata); err != nil {
		return SignerSignatureResult{}, err
	}
	if signatureType == "drawn" {
		s.markSignatureUploadGrantConsumed(uploadToken, s.now())
		releaseReservation = func() {}
	}
	return SignerSignatureResult{
		Artifact:   artifact,
		FieldValue: value,
	}, nil
}

func isSignatureAttachFieldType(fieldType string) bool {
	switch strings.TrimSpace(fieldType) {
	case stores.FieldTypeSignature, stores.FieldTypeInitials:
		return true
	default:
		return false
	}
}

func (s SigningService) resolveSignatureUploadReceipt(ctx context.Context, scope stores.Scope, uploadToken string, grant signatureUploadGrant) (signatureUploadReceipt, bool, error) {
	uploadToken = strings.TrimSpace(uploadToken)
	if uploadToken == "" {
		return signatureUploadReceipt{}, false, nil
	}
	if receipt, ok := s.getSignatureUploadReceipt(uploadToken); ok {
		return receipt, true, nil
	}

	if receipt, ok, err := s.resolveSignatureUploadReceiptFromObjectStore(ctx, uploadToken, grant); err != nil {
		return signatureUploadReceipt{}, false, err
	} else if ok {
		s.putSignatureUploadReceipt(uploadToken, receipt)
		return receipt, true, nil
	}

	if receipt, ok, err := s.resolveSignatureUploadReceiptFromAudit(ctx, scope, uploadToken, grant); err != nil {
		return signatureUploadReceipt{}, false, err
	} else if ok {
		s.putSignatureUploadReceipt(uploadToken, receipt)
		return receipt, true, nil
	}

	return signatureUploadReceipt{}, false, nil
}

func (s SigningService) resolveSignatureUploadReceiptFromObjectStore(ctx context.Context, uploadToken string, grant signatureUploadGrant) (signatureUploadReceipt, bool, error) {
	if s.objectStore == nil {
		return signatureUploadReceipt{}, false, nil
	}
	stored, err := s.objectStore.GetFile(ctx, strings.TrimSpace(grant.ObjectKey))
	if err != nil || len(stored) == 0 {
		return signatureUploadReceipt{}, false, nil
	}
	sum := sha256.Sum256(stored)
	if hex.EncodeToString(sum[:]) != strings.TrimSpace(grant.SHA256) {
		return signatureUploadReceipt{}, false, domainValidationError("signature_upload", "object_store", "persisted upload digest mismatch")
	}
	sizeBytes := int64(len(stored))
	if sizeBytes > defaultSignatureUploadMaxBytes {
		return signatureUploadReceipt{}, false, domainValidationError("signature_upload", "size_bytes", "invalid content size")
	}
	if grant.SizeBytes > 0 && sizeBytes != grant.SizeBytes {
		return signatureUploadReceipt{}, false, domainValidationError("signature_upload", "size_bytes", "uploaded content size does not match contract")
	}
	return signatureUploadReceipt{
		UploadToken: strings.TrimSpace(uploadToken),
		ObjectKey:   strings.TrimSpace(grant.ObjectKey),
		SHA256:      strings.TrimSpace(grant.SHA256),
		ContentType: strings.TrimSpace(grant.ContentType),
		SizeBytes:   sizeBytes,
		CommittedAt: s.now().UTC(),
	}, true, nil
}

func (s SigningService) resolveSignatureUploadReceiptFromAudit(ctx context.Context, scope stores.Scope, uploadToken string, grant signatureUploadGrant) (signatureUploadReceipt, bool, error) {
	if s.audits == nil || strings.TrimSpace(grant.AgreementID) == "" {
		return signatureUploadReceipt{}, false, nil
	}
	events, err := s.audits.ListForAgreement(ctx, scope, grant.AgreementID, stores.AuditEventQuery{SortDesc: true})
	if err != nil {
		return signatureUploadReceipt{}, false, nil
	}
	for _, event := range events {
		if strings.TrimSpace(event.EventType) != "signer.signature_upload_confirmed" {
			continue
		}
		if strings.TrimSpace(event.ActorID) != "" && strings.TrimSpace(event.ActorID) != strings.TrimSpace(grant.RecipientID) {
			continue
		}
		metadata := strings.TrimSpace(event.MetadataJSON)
		if metadata == "" {
			continue
		}
		decoded := map[string]any{}
		if err := json.Unmarshal([]byte(metadata), &decoded); err != nil {
			continue
		}
		if strings.TrimSpace(fmt.Sprint(decoded["field_id"])) != strings.TrimSpace(grant.FieldID) {
			continue
		}
		if strings.TrimSpace(fmt.Sprint(decoded["object_key"])) != strings.TrimSpace(grant.ObjectKey) {
			continue
		}
		sizeBytes := grant.SizeBytes
		if rawSize, ok := decoded["size_bytes"]; ok {
			parsedSize := toInt64Any(rawSize)
			if parsedSize < 0 || parsedSize > defaultSignatureUploadMaxBytes {
				return signatureUploadReceipt{}, false, domainValidationError("signature_upload", "size_bytes", "invalid content size")
			}
			if grant.SizeBytes > 0 && parsedSize > 0 && parsedSize != grant.SizeBytes {
				return signatureUploadReceipt{}, false, domainValidationError("signature_upload", "size_bytes", "uploaded content size does not match contract")
			}
			if parsedSize > 0 {
				sizeBytes = parsedSize
			}
		}
		contentType := strings.TrimSpace(fmt.Sprint(decoded["content_type"]))
		if contentType == "" {
			contentType = strings.TrimSpace(grant.ContentType)
		}
		if strings.TrimSpace(grant.ContentType) != "" && contentType != "" && !strings.EqualFold(contentType, strings.TrimSpace(grant.ContentType)) {
			return signatureUploadReceipt{}, false, domainValidationError("signature_upload", "content_type", "uploaded content type does not match contract")
		}
		committedAt := event.CreatedAt.UTC()
		if rawCommitted := strings.TrimSpace(fmt.Sprint(decoded["upload_committed"])); rawCommitted != "" {
			if parsed, err := time.Parse(time.RFC3339, rawCommitted); err == nil {
				committedAt = parsed.UTC()
			}
		}
		return signatureUploadReceipt{
			UploadToken: strings.TrimSpace(uploadToken),
			ObjectKey:   strings.TrimSpace(grant.ObjectKey),
			SHA256:      strings.TrimSpace(grant.SHA256),
			ContentType: strings.TrimSpace(contentType),
			SizeBytes:   sizeBytes,
			CommittedAt: committedAt,
		}, true, nil
	}
	return signatureUploadReceipt{}, false, nil
}

func toInt64Any(value any) int64 {
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int8:
		return int64(typed)
	case int16:
		return int64(typed)
	case int32:
		return int64(typed)
	case int64:
		return typed
	case uint:
		return int64(typed)
	case uint8:
		return int64(typed)
	case uint16:
		return int64(typed)
	case uint32:
		return int64(typed)
	case uint64:
		return int64(typed)
	case float32:
		return int64(typed)
	case float64:
		return int64(typed)
	default:
		return 0
	}
}

// Submit finalizes signer participation with idempotency and CAS-protected transitions.
func (s SigningService) Submit(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerSubmitInput) (SignerSubmitResult, error) {
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		return SignerSubmitResult{}, domainValidationError("submit", "idempotency_key", "required")
	}
	agreementID := strings.TrimSpace(token.AgreementID)
	recipientID := strings.TrimSpace(token.RecipientID)
	if agreementID == "" || recipientID == "" {
		return SignerSubmitResult{}, domainValidationError("signing_tokens", "agreement_id|recipient_id", "required")
	}
	submitKey := s.submitIdempotencyKey(scope, agreementID, recipientID, idempotencyKey)
	if cached, ok := s.getSubmitByKey(submitKey); ok {
		cached.Replay = true
		return cached, nil
	}

	agreement, recipient, activeSigner, recipients, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSubmitResult{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return SignerSubmitResult{}, domainValidationError("agreements", "status", "submit requires sent or in_progress status")
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerSubmitResult{}, err
	}

	if _, ok := s.getConsentAccepted(signingFlowKey(scope, agreement.ID, recipient.ID)); !ok {
		return SignerSubmitResult{}, domainValidationError("consent", "accepted", "consent must be captured before submit")
	}
	if err := s.ensureRequiredFieldsCompleted(ctx, scope, agreement.ID, recipient.ID, fields); err != nil {
		return SignerSubmitResult{}, err
	}

	completedRecipient, err := s.agreements.CompleteRecipient(ctx, scope, agreement.ID, recipient.ID, s.now(), recipient.Version)
	if err != nil {
		return SignerSubmitResult{}, err
	}

	nextSignerID := nextSequentialSignerID(updateRecipientSnapshot(recipients, completedRecipient), completedRecipient.ID)
	resultAgreement := agreement
	expectedVersion := agreement.Version
	if nextSignerID == "" {
		if agreement.Status != stores.AgreementStatusCompleted {
			resultAgreement, err = s.agreements.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
				ToStatus:        stores.AgreementStatusCompleted,
				ExpectedVersion: expectedVersion,
			})
			if err != nil {
				return SignerSubmitResult{}, err
			}
		}
	} else if agreement.Status == stores.AgreementStatusSent {
		resultAgreement, err = s.agreements.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusInProgress,
			ExpectedVersion: expectedVersion,
		})
		if err != nil {
			return SignerSubmitResult{}, err
		}
	}

	result := SignerSubmitResult{
		Agreement:       resultAgreement,
		Recipient:       completedRecipient,
		NextRecipientID: nextSignerID,
		Completed:       nextSignerID == "",
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.submitted", input.IPAddress, input.UserAgent, map[string]any{
		"agreement_status":    resultAgreement.Status,
		"next_recipient_id":   nextSignerID,
		"idempotency_key":     idempotencyKey,
		"agreement_completed": nextSignerID == "",
		"signer_identity_snapshot": map[string]any{
			"recipient_id":   completedRecipient.ID,
			"email":          completedRecipient.Email,
			"name":           completedRecipient.Name,
			"role":           completedRecipient.Role,
			"signing_order":  completedRecipient.SigningOrder,
			"first_view_at":  timePtrRFC3339(completedRecipient.FirstViewAt),
			"last_view_at":   timePtrRFC3339(completedRecipient.LastViewAt),
			"completed_at":   timePtrRFC3339(completedRecipient.CompletedAt),
			"declined_at":    timePtrRFC3339(completedRecipient.DeclinedAt),
			"decline_reason": completedRecipient.DeclineReason,
		},
	}); err != nil {
		return SignerSubmitResult{}, err
	}
	if result.Completed && s.completionFlow != nil {
		if err := s.completionFlow.RunCompletionWorkflow(ctx, scope, agreement.ID, idempotencyKey); err != nil {
			return SignerSubmitResult{}, err
		}
	}
	s.setSubmitByKey(submitKey, result)
	return result, nil
}

// Decline records signer decline reason and transitions agreement to terminal declined state.
func (s SigningService) Decline(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerDeclineInput) (SignerDeclineResult, error) {
	agreement, recipient, activeSigner, _, _, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerDeclineResult{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return SignerDeclineResult{}, domainValidationError("agreements", "status", "decline requires sent or in_progress status")
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerDeclineResult{}, err
	}
	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return SignerDeclineResult{}, domainValidationError("recipients", "decline_reason", "required")
	}

	declinedRecipient, err := s.agreements.DeclineRecipient(ctx, scope, agreement.ID, recipient.ID, reason, s.now(), recipient.Version)
	if err != nil {
		return SignerDeclineResult{}, err
	}
	declinedAgreement, err := s.agreements.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusDeclined,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		return SignerDeclineResult{}, err
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.declined", input.IPAddress, input.UserAgent, map[string]any{
		"decline_reason": reason,
	}); err != nil {
		return SignerDeclineResult{}, err
	}
	return SignerDeclineResult{
		Agreement: declinedAgreement,
		Recipient: declinedRecipient,
	}, nil
}

func resolveSessionState(agreementStatus string, recipient stores.RecipientRecord, activeSigner stores.RecipientRecord, hasActiveSigner bool) string {
	if recipient.CompletedAt != nil {
		return SignerSessionStateCompleted
	}
	if recipient.Role == stores.RecipientRoleCC {
		return SignerSessionStateObserver
	}
	switch strings.TrimSpace(agreementStatus) {
	case stores.AgreementStatusCompleted, stores.AgreementStatusVoided, stores.AgreementStatusDeclined, stores.AgreementStatusExpired:
		return SignerSessionStateTerminal
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
		if !hasActiveSigner {
			return SignerSessionStateInvalid
		}
		if strings.TrimSpace(activeSigner.ID) != strings.TrimSpace(recipient.ID) {
			return SignerSessionStateWaiting
		}
		return SignerSessionStateActive
	default:
		return SignerSessionStateInvalid
	}
}

func validateFieldValueInput(field stores.FieldRecord, valueText string, valueBool *bool) error {
	valueText = strings.TrimSpace(valueText)
	switch field.Type {
	case stores.FieldTypeSignature:
		return domainValidationError("field_values", "field_type", "signature value requires signature artifact attach flow")
	case stores.FieldTypeCheckbox:
		if field.Required && valueBool == nil {
			return domainValidationError("field_values", "value_bool", "required")
		}
		return nil
	default:
		if field.Required && valueText == "" {
			return domainValidationError("field_values", "value_text", "required")
		}
		return nil
	}
}

func findRecipientByID(recipients []stores.RecipientRecord, recipientID string) (stores.RecipientRecord, bool) {
	recipientID = strings.TrimSpace(recipientID)
	for _, rec := range recipients {
		if strings.TrimSpace(rec.ID) == recipientID {
			return rec, true
		}
	}
	return stores.RecipientRecord{}, false
}

func findFieldByID(fields []stores.FieldRecord, fieldID string) (stores.FieldRecord, bool) {
	fieldID = strings.TrimSpace(fieldID)
	for _, field := range fields {
		if strings.TrimSpace(field.ID) == fieldID {
			return field, true
		}
	}
	return stores.FieldRecord{}, false
}

func currentSequentialSigner(recipients []stores.RecipientRecord) (stores.RecipientRecord, bool) {
	signers := make([]stores.RecipientRecord, 0)
	for _, rec := range recipients {
		if rec.Role != stores.RecipientRoleSigner {
			continue
		}
		signers = append(signers, rec)
	}
	if len(signers) == 0 {
		return stores.RecipientRecord{}, false
	}
	sort.Slice(signers, func(i, j int) bool {
		return signers[i].SigningOrder < signers[j].SigningOrder
	})
	for _, signer := range signers {
		if signer.CompletedAt == nil && signer.DeclinedAt == nil {
			return signer, true
		}
	}
	return stores.RecipientRecord{}, false
}

func ensureActiveSequentialSigner(recipient, activeSigner stores.RecipientRecord) error {
	if strings.TrimSpace(recipient.ID) == "" {
		return domainValidationError("recipients", "id", "required")
	}
	if recipient.Role != stores.RecipientRoleSigner {
		return domainValidationError("recipients", "role", "must be signer")
	}
	if strings.TrimSpace(activeSigner.ID) == "" {
		return domainValidationError("recipients", "signing_order", "no active sequential signer")
	}
	if strings.TrimSpace(recipient.ID) != strings.TrimSpace(activeSigner.ID) {
		return domainValidationError("recipients", "signing_order", "signer is waiting for a previous signer")
	}
	return nil
}

func (s SigningService) signerContext(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (stores.AgreementRecord, stores.RecipientRecord, stores.RecipientRecord, []stores.RecipientRecord, []stores.FieldRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, domainValidationError("signing", "agreement_store", "not configured")
	}
	agreementID := strings.TrimSpace(token.AgreementID)
	recipientID := strings.TrimSpace(token.RecipientID)
	if agreementID == "" || recipientID == "" {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, domainValidationError("signing_tokens", "agreement_id|recipient_id", "required")
	}

	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, err
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, err
	}
	fields, err := s.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, err
	}
	recipient, ok := findRecipientByID(recipients, recipientID)
	if !ok {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, domainValidationError("recipients", "id", "not found for token")
	}
	activeSigner, _ := currentSequentialSigner(recipients)
	return agreement, recipient, activeSigner, recipients, fields, nil
}

func (s SigningService) findFieldValueByField(ctx context.Context, scope stores.Scope, agreementID, recipientID, fieldID string) (stores.FieldValueRecord, bool, error) {
	values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return stores.FieldValueRecord{}, false, err
	}
	for _, value := range values {
		if strings.TrimSpace(value.FieldID) == strings.TrimSpace(fieldID) {
			return value, true, nil
		}
	}
	return stores.FieldValueRecord{}, false, nil
}

func signingFlowKey(scope stores.Scope, agreementID, recipientID string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(agreementID),
		strings.TrimSpace(recipientID),
	}, "|")
}

func (s SigningService) submitIdempotencyKey(scope stores.Scope, agreementID, recipientID, idempotencyKey string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(agreementID),
		strings.TrimSpace(recipientID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

func (s SigningService) ensureRequiredFieldsCompleted(ctx context.Context, scope stores.Scope, agreementID, recipientID string, fields []stores.FieldRecord) error {
	values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return err
	}
	valuesByField := map[string]stores.FieldValueRecord{}
	for _, value := range values {
		valuesByField[strings.TrimSpace(value.FieldID)] = value
	}

	for _, field := range fields {
		if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipientID) {
			continue
		}
		if !field.Required {
			continue
		}
		value, ok := valuesByField[strings.TrimSpace(field.ID)]
		if field.Type == stores.FieldTypeDateSigned && !ok {
			stamped := s.now().UTC().Format(time.RFC3339)
			upserted, err := s.signing.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
				AgreementID: agreementID,
				RecipientID: recipientID,
				FieldID:     field.ID,
				ValueText:   stamped,
			}, 0)
			if err != nil {
				return err
			}
			valuesByField[field.ID] = upserted
			continue
		}
		if !ok || !requiredFieldValueSatisfied(field, value) {
			return domainValidationError("field_values", "required", "all required fields must be completed before submit")
		}
	}
	return nil
}

func requiredFieldValueSatisfied(field stores.FieldRecord, value stores.FieldValueRecord) bool {
	switch field.Type {
	case stores.FieldTypeSignature:
		return strings.TrimSpace(value.SignatureArtifactID) != ""
	case stores.FieldTypeCheckbox:
		return value.ValueBool != nil
	default:
		return strings.TrimSpace(value.ValueText) != ""
	}
}

func updateRecipientSnapshot(recipients []stores.RecipientRecord, updated stores.RecipientRecord) []stores.RecipientRecord {
	next := make([]stores.RecipientRecord, len(recipients))
	copy(next, recipients)
	for i := range next {
		if strings.TrimSpace(next[i].ID) == strings.TrimSpace(updated.ID) {
			next[i] = updated
			break
		}
	}
	return next
}

func nextSequentialSignerID(recipients []stores.RecipientRecord, completedRecipientID string) string {
	signers := make([]stores.RecipientRecord, 0)
	for _, rec := range recipients {
		if rec.Role != stores.RecipientRoleSigner {
			continue
		}
		signers = append(signers, rec)
	}
	sort.Slice(signers, func(i, j int) bool {
		return signers[i].SigningOrder < signers[j].SigningOrder
	})
	for _, signer := range signers {
		if strings.TrimSpace(signer.ID) == strings.TrimSpace(completedRecipientID) {
			continue
		}
		if signer.CompletedAt == nil && signer.DeclinedAt == nil {
			return signer.ID
		}
	}
	return ""
}

func normalizeFieldGeometry(field stores.FieldRecord, pageCount int, pagesByNumber map[int]SignerSessionViewerPage) (int, float64, float64, float64, float64, SignerSessionViewerPage) {
	page := field.PageNumber
	if page <= 0 {
		page = 1
	}
	if pageCount > 0 && page > pageCount {
		page = pageCount
	}
	pageMeta, ok := pagesByNumber[page]
	if !ok {
		pageMeta = SignerSessionViewerPage{
			Page:     page,
			Width:    defaultPDFPageWidth,
			Height:   defaultPDFPageHeight,
			Rotation: 0,
		}
	}

	width := field.Width
	height := field.Height
	if width <= 0 {
		width = defaultFieldWidth
	}
	if height <= 0 {
		height = defaultFieldHeight
	}
	if pageMeta.Width > 0 && width > pageMeta.Width {
		width = pageMeta.Width
	}
	if pageMeta.Height > 0 && height > pageMeta.Height {
		height = pageMeta.Height
	}

	posX := field.PosX
	posY := field.PosY
	if posX < 0 {
		posX = 0
	}
	if posY < 0 {
		posY = 0
	}
	if pageMeta.Width > 0 && posX+width > pageMeta.Width {
		posX = maxFloat(0, pageMeta.Width-width)
	}
	if pageMeta.Height > 0 && posY+height > pageMeta.Height {
		posY = maxFloat(0, pageMeta.Height-height)
	}

	return page, posX, posY, width, height, pageMeta
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func timePtrRFC3339(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func (s SigningService) appendSignerAudit(ctx context.Context, scope stores.Scope, agreementID, recipientID, eventType, ipAddress, userAgent string, metadata map[string]any) error {
	if s.audits == nil {
		return nil
	}
	meta := metadata
	if meta == nil {
		meta = map[string]any{}
	}
	encoded, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	_, err = s.audits.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  strings.TrimSpace(agreementID),
		EventType:    strings.TrimSpace(eventType),
		ActorType:    "signer_token",
		ActorID:      strings.TrimSpace(recipientID),
		IPAddress:    strings.TrimSpace(ipAddress),
		UserAgent:    strings.TrimSpace(userAgent),
		MetadataJSON: string(encoded),
		CreatedAt:    s.now(),
	})
	return err
}

func signerSignatureObjectKey(scope stores.Scope, agreementID, recipientID, fieldID string, now time.Time) string {
	nonce := strings.TrimSpace(fmt.Sprintf("%d", now.UTC().UnixNano()))
	return strings.Join([]string{
		"tenant", strings.TrimSpace(scope.TenantID),
		"org", strings.TrimSpace(scope.OrgID),
		"agreements", strings.TrimSpace(agreementID),
		"sig", strings.TrimSpace(recipientID),
		strings.TrimSpace(fieldID) + "-" + nonce + ".png",
	}, "/")
}

func normalizeSHA256Hex(raw string) string {
	trimmed := strings.ToLower(strings.TrimSpace(raw))
	if len(trimmed) != 64 {
		return ""
	}
	if _, err := hex.DecodeString(trimmed); err != nil {
		return ""
	}
	return trimmed
}

func (s SigningService) signSignatureUploadGrant(grant signatureUploadGrant) (string, error) {
	payload, err := json.Marshal(map[string]any{
		"tenant_id":    strings.TrimSpace(grant.TenantID),
		"org_id":       strings.TrimSpace(grant.OrgID),
		"agreement_id": strings.TrimSpace(grant.AgreementID),
		"recipient_id": strings.TrimSpace(grant.RecipientID),
		"field_id":     strings.TrimSpace(grant.FieldID),
		"object_key":   strings.TrimSpace(grant.ObjectKey),
		"sha256":       strings.TrimSpace(grant.SHA256),
		"content_type": strings.TrimSpace(grant.ContentType),
		"size_bytes":   grant.SizeBytes,
		"expires_at":   grant.ExpiresAt.UTC().Format(time.RFC3339Nano),
	})
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, s.signatureUploadSecret)
	if _, err := mac.Write(payload); err != nil {
		return "", err
	}
	signature := mac.Sum(nil)
	return base64.RawURLEncoding.EncodeToString(payload) + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func (s SigningService) parseSignatureUploadGrant(uploadToken string) (signatureUploadGrant, error) {
	parts := strings.Split(strings.TrimSpace(uploadToken), ".")
	if len(parts) != 2 {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "invalid signed upload token")
	}
	encodedPayload := strings.TrimSpace(parts[0])
	encodedSignature := strings.TrimSpace(parts[1])
	payload, err := base64.RawURLEncoding.DecodeString(encodedPayload)
	if err != nil {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "invalid signed upload token payload")
	}
	signature, err := base64.RawURLEncoding.DecodeString(encodedSignature)
	if err != nil {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "invalid signed upload token signature")
	}

	mac := hmac.New(sha256.New, s.signatureUploadSecret)
	if _, err := mac.Write(payload); err != nil {
		return signatureUploadGrant{}, err
	}
	expectedSignature := mac.Sum(nil)
	if !hmac.Equal(signature, expectedSignature) {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "signed upload token verification failed")
	}

	var claims struct {
		TenantID    string `json:"tenant_id"`
		OrgID       string `json:"org_id"`
		AgreementID string `json:"agreement_id"`
		RecipientID string `json:"recipient_id"`
		FieldID     string `json:"field_id"`
		ObjectKey   string `json:"object_key"`
		SHA256      string `json:"sha256"`
		ContentType string `json:"content_type"`
		SizeBytes   int64  `json:"size_bytes"`
		ExpiresAt   string `json:"expires_at"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "invalid signed upload token claims")
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(claims.ExpiresAt))
	if err != nil {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "invalid signed upload token expiry")
	}
	return signatureUploadGrant{
		Token:       strings.TrimSpace(uploadToken),
		TenantID:    strings.TrimSpace(claims.TenantID),
		OrgID:       strings.TrimSpace(claims.OrgID),
		AgreementID: strings.TrimSpace(claims.AgreementID),
		RecipientID: strings.TrimSpace(claims.RecipientID),
		FieldID:     strings.TrimSpace(claims.FieldID),
		ObjectKey:   strings.TrimSpace(claims.ObjectKey),
		SHA256:      normalizeSHA256Hex(claims.SHA256),
		ContentType: strings.TrimSpace(claims.ContentType),
		SizeBytes:   claims.SizeBytes,
		ExpiresAt:   expiresAt.UTC(),
	}, nil
}

func (s SigningService) validateSignatureUploadGrant(ctx context.Context, scope stores.Scope, input signatureUploadValidationInput) (signatureUploadGrant, error) {
	uploadToken := strings.TrimSpace(input.UploadToken)
	if uploadToken == "" {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "required for drawn signature attach")
	}
	grant, err := s.parseSignatureUploadGrant(uploadToken)
	if err != nil {
		return signatureUploadGrant{}, err
	}
	now := s.now()
	if !grant.ExpiresAt.After(now) {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "signed upload token expired")
	}
	if grant.TenantID != strings.TrimSpace(scope.TenantID) || grant.OrgID != strings.TrimSpace(scope.OrgID) {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "scope", "signed upload token scope mismatch")
	}
	if expectedAgreement := strings.TrimSpace(input.AgreementID); expectedAgreement != "" && grant.AgreementID != expectedAgreement {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "agreement_or_recipient", "signed upload token signer context mismatch")
	}
	if expectedRecipient := strings.TrimSpace(input.RecipientID); expectedRecipient != "" && grant.RecipientID != expectedRecipient {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "agreement_or_recipient", "signed upload token signer context mismatch")
	}
	if expectedField := strings.TrimSpace(input.FieldID); expectedField != "" && grant.FieldID != expectedField {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "field_id", "signed upload token field mismatch")
	}
	if expectedObjectKey := strings.TrimSpace(input.ObjectKey); expectedObjectKey != "" && grant.ObjectKey != expectedObjectKey {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "object_key", "signed upload token object key mismatch")
	}
	if expectedDigest := normalizeSHA256Hex(input.SHA256); expectedDigest != "" && grant.SHA256 != expectedDigest {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "sha256", "signed upload token digest mismatch")
	}
	if tracked, ok := s.getSignatureUploadGrant(uploadToken); ok {
		if tracked.ConsumedAt != nil {
			return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "signed upload token already consumed")
		}
		if tracked.ReservedAt != nil {
			return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "signed upload token is being processed")
		}
	}
	if s.wasUploadTokenConsumedInAudit(ctx, scope, grant.AgreementID, uploadToken) {
		return signatureUploadGrant{}, domainValidationError("signature_upload", "upload_token", "signed upload token already consumed")
	}
	return grant, nil
}

func (s SigningService) markSignatureUploadGrantConsumed(uploadToken string, consumedAt time.Time) {
	uploadToken = strings.TrimSpace(uploadToken)
	if uploadToken == "" {
		return
	}
	grant, ok := s.getSignatureUploadGrant(uploadToken)
	if !ok {
		return
	}
	if grant.ConsumedAt != nil {
		return
	}
	consumed := consumedAt.UTC()
	grant.ConsumedAt = &consumed
	grant.ReservedAt = nil
	s.putSignatureUploadGrant(uploadToken, grant)
	s.deleteSignatureUploadReceipt(uploadToken)
}

func (s SigningService) reserveSignatureUploadGrant(uploadToken string, reservedAt time.Time) (func(), error) {
	uploadToken = strings.TrimSpace(uploadToken)
	if uploadToken == "" {
		return func() {}, domainValidationError("signature_upload", "upload_token", "required for drawn signature attach")
	}
	state := s.serviceState()
	state.mu.Lock()
	defer state.mu.Unlock()
	grant, ok := state.signatureUploads[uploadToken]
	if !ok {
		return func() {}, nil
	}
	if grant.ConsumedAt != nil {
		return func() {}, domainValidationError("signature_upload", "upload_token", "signed upload token already consumed")
	}
	if grant.ReservedAt != nil {
		return func() {}, domainValidationError("signature_upload", "upload_token", "signed upload token is being processed")
	}
	reserved := reservedAt.UTC()
	grant.ReservedAt = &reserved
	state.signatureUploads[uploadToken] = grant
	release := func() {
		state.mu.Lock()
		defer state.mu.Unlock()
		current, exists := state.signatureUploads[uploadToken]
		if !exists || current.ConsumedAt != nil {
			return
		}
		current.ReservedAt = nil
		state.signatureUploads[uploadToken] = current
	}
	return release, nil
}

func (s SigningService) wasUploadTokenConsumedInAudit(ctx context.Context, scope stores.Scope, agreementID, uploadToken string) bool {
	if s.audits == nil {
		return false
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return false
	}
	uploadTokenHash := hashUploadToken(uploadToken)
	if uploadTokenHash == "" {
		return false
	}
	events, err := s.audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{})
	if err != nil {
		return false
	}
	for _, event := range events {
		if strings.TrimSpace(event.EventType) != "signer.signature_attached" {
			continue
		}
		metadata := strings.TrimSpace(event.MetadataJSON)
		if metadata == "" {
			continue
		}
		decoded := map[string]any{}
		if err := json.Unmarshal([]byte(metadata), &decoded); err != nil {
			continue
		}
		if strings.TrimSpace(fmt.Sprint(decoded["upload_token_hash"])) == uploadTokenHash {
			return true
		}
	}
	return false
}

func hashUploadToken(uploadToken string) string {
	uploadToken = strings.TrimSpace(uploadToken)
	if uploadToken == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(uploadToken))
	return hex.EncodeToString(sum[:])
}

func (s SigningService) serviceState() *signingServiceState {
	if s.state != nil {
		return s.state
	}
	return &signingServiceState{
		consentAccepted:        map[string]time.Time{},
		submitByKey:            map[string]SignerSubmitResult{},
		signatureUploads:       map[string]signatureUploadGrant{},
		confirmedUploadByToken: map[string]signatureUploadReceipt{},
	}
}

func (s SigningService) setConsentAccepted(key string, acceptedAt time.Time) {
	state := s.serviceState()
	state.mu.Lock()
	defer state.mu.Unlock()
	state.consentAccepted[strings.TrimSpace(key)] = acceptedAt.UTC()
}

func (s SigningService) getConsentAccepted(key string) (time.Time, bool) {
	state := s.serviceState()
	state.mu.RLock()
	defer state.mu.RUnlock()
	value, ok := state.consentAccepted[strings.TrimSpace(key)]
	return value, ok
}

func (s SigningService) setSubmitByKey(key string, result SignerSubmitResult) {
	state := s.serviceState()
	state.mu.Lock()
	defer state.mu.Unlock()
	state.submitByKey[strings.TrimSpace(key)] = result
}

func (s SigningService) getSubmitByKey(key string) (SignerSubmitResult, bool) {
	state := s.serviceState()
	state.mu.RLock()
	defer state.mu.RUnlock()
	result, ok := state.submitByKey[strings.TrimSpace(key)]
	return result, ok
}

func (s SigningService) putSignatureUploadGrant(uploadToken string, grant signatureUploadGrant) {
	state := s.serviceState()
	state.mu.Lock()
	defer state.mu.Unlock()
	state.signatureUploads[strings.TrimSpace(uploadToken)] = grant
}

func (s SigningService) getSignatureUploadGrant(uploadToken string) (signatureUploadGrant, bool) {
	state := s.serviceState()
	state.mu.RLock()
	defer state.mu.RUnlock()
	grant, ok := state.signatureUploads[strings.TrimSpace(uploadToken)]
	return grant, ok
}

func (s SigningService) putSignatureUploadReceipt(uploadToken string, receipt signatureUploadReceipt) {
	state := s.serviceState()
	state.mu.Lock()
	defer state.mu.Unlock()
	state.confirmedUploadByToken[strings.TrimSpace(uploadToken)] = receipt
}

func (s SigningService) getSignatureUploadReceipt(uploadToken string) (signatureUploadReceipt, bool) {
	state := s.serviceState()
	state.mu.RLock()
	defer state.mu.RUnlock()
	receipt, ok := state.confirmedUploadByToken[strings.TrimSpace(uploadToken)]
	return receipt, ok
}

func (s SigningService) deleteSignatureUploadReceipt(uploadToken string) {
	state := s.serviceState()
	state.mu.Lock()
	defer state.mu.Unlock()
	delete(state.confirmedUploadByToken, strings.TrimSpace(uploadToken))
}

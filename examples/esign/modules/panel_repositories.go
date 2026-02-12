package modules

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

const (
	esignDocumentsPanelID  = "esign_documents"
	esignAgreementsPanelID = "esign_agreements"
)

var (
	recipientBracketKeyPattern = regexp.MustCompile(`^recipients\[(\d+)\]$`)
	fieldBracketKeyPattern     = regexp.MustCompile(`^fields\[(\d+)\]$`)
)

type documentPanelRepository struct {
	store        stores.DocumentStore
	uploader     services.DocumentService
	uploads      *uploader.Manager
	defaultScope stores.Scope
	settings     RuntimeSettings
}

func newDocumentPanelRepository(store stores.DocumentStore, uploader services.DocumentService, uploads *uploader.Manager, defaultScope stores.Scope, settings RuntimeSettings) *documentPanelRepository {
	return &documentPanelRepository{store: store, uploader: uploader, uploads: uploads, defaultScope: defaultScope, settings: settings}
}

func (r *documentPanelRepository) List(ctx context.Context, opts coreadmin.ListOptions) ([]map[string]any, int, error) {
	startedAt := time.Now()
	success := false
	defer func() {
		observability.ObserveAdminRead(ctx, time.Since(startedAt), success, "documents.list")
	}()
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, 0, err
	}
	if r.store == nil {
		return nil, 0, fmt.Errorf("document store not configured")
	}
	query := stores.DocumentQuery{TitleContains: lookupFilter(opts.Filters, "title", "title_contains")}
	all, err := r.store.List(ctx, scope, query)
	if err != nil {
		return nil, 0, err
	}
	records := paginateRecords(all, opts.Page, opts.PerPage)
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, documentRecordToMap(record))
	}
	success = true
	return out, len(all), nil
}

func (r *documentPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	startedAt := time.Now()
	success := false
	defer func() {
		observability.ObserveAdminRead(ctx, time.Since(startedAt), success, "documents.get")
	}()
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	if r.store == nil {
		return nil, fmt.Errorf("document store not configured")
	}
	record, err := r.store.Get(ctx, scope, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	success = true
	return documentRecordToMap(record), nil
}

func (r *documentPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	if r.store == nil {
		return nil, fmt.Errorf("document store not configured")
	}
	requestedObjectKey := strings.TrimSpace(toString(record["source_object_key"]))
	objectKey := requestedObjectKey
	if objectKey == "" {
		objectKey = fmt.Sprintf("tenant/%s/org/%s/docs/%d/source.pdf", scope.TenantID, scope.OrgID, time.Now().UTC().UnixNano())
	}
	pdfBytes, err := decodePDFPayload(record)
	if err != nil {
		if errors.Is(err, errPDFPayloadRequired) && requestedObjectKey != "" {
			pdfBytes, err = loadPDFPayloadFromObjectKey(ctx, r.uploads, requestedObjectKey)
		}
		if err != nil {
			return nil, err
		}
	}
	if maxSize := r.settings.MaxSourcePDFBytes; maxSize > 0 && int64(len(pdfBytes)) > maxSize {
		return nil, fmt.Errorf("pdf payload exceeds configured max size")
	}
	created, err := r.uploader.Upload(ctx, scope, services.DocumentUploadInput{
		Title:      strings.TrimSpace(toString(record["title"])),
		ObjectKey:  objectKey,
		PDF:        pdfBytes,
		CreatedBy:  userIDFromContext(ctx),
		UploadedAt: time.Now().UTC(),
	})
	if err != nil {
		return nil, err
	}
	return documentRecordToMap(created), nil
}

func (r *documentPanelRepository) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, fmt.Errorf("documents are immutable after upload")
}

func (r *documentPanelRepository) Delete(context.Context, string) error {
	return fmt.Errorf("documents are immutable after upload")
}

var errPDFPayloadRequired = errors.New("pdf payload is required")

func decodePDFPayload(record map[string]any) ([]byte, error) {
	var decodeErr error
	for _, key := range []string{"pdf_base64", "pdf"} {
		raw := strings.TrimSpace(toString(record[key]))
		if raw == "" {
			continue
		}
		for _, decoder := range []func(string) ([]byte, error){base64.StdEncoding.DecodeString, base64.RawStdEncoding.DecodeString} {
			decoded, err := decoder(raw)
			if err != nil {
				decodeErr = err
				continue
			}
			if len(decoded) == 0 {
				decodeErr = fmt.Errorf("empty pdf payload")
				continue
			}
			return decoded, nil
		}
	}
	if decodeErr != nil {
		return nil, fmt.Errorf("invalid base64 pdf payload: %w", decodeErr)
	}
	return nil, errPDFPayloadRequired
}

func loadPDFPayloadFromObjectKey(ctx context.Context, uploads *uploader.Manager, objectKey string) ([]byte, error) {
	if uploads == nil {
		return nil, fmt.Errorf("pdf payload is required")
	}
	objectKey = strings.TrimSpace(objectKey)
	if objectKey == "" {
		return nil, fmt.Errorf("source_object_key is required")
	}
	decoded, err := uploads.GetFile(ctx, objectKey)
	if err != nil {
		return nil, fmt.Errorf("load source object %q: %w", objectKey, err)
	}
	if len(decoded) == 0 {
		return nil, fmt.Errorf("source object %q is empty", objectKey)
	}
	return decoded, nil
}

func documentRecordToMap(record stores.DocumentRecord) map[string]any {
	return map[string]any{
		"id":                         record.ID,
		"tenant_id":                  record.TenantID,
		"org_id":                     record.OrgID,
		"title":                      record.Title,
		"source_object_key":          record.SourceObjectKey,
		"source_sha256":              record.SourceSHA256,
		"source_type":                record.SourceType,
		"source_google_file_id":      record.SourceGoogleFileID,
		"source_google_doc_url":      record.SourceGoogleDocURL,
		"source_modified_time":       formatTimePtr(record.SourceModifiedTime),
		"source_exported_at":         formatTimePtr(record.SourceExportedAt),
		"source_exported_by_user_id": record.SourceExportedByUserID,
		"size_bytes":                 record.SizeBytes,
		"page_count":                 record.PageCount,
		"created_at":                 record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":                 record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

type agreementPanelRepository struct {
	agreements   stores.AgreementStore
	service      services.AgreementService
	artifacts    services.ArtifactPipelineService
	projector    *AuditActivityProjector
	defaultScope stores.Scope
	settings     RuntimeSettings
}

func newAgreementPanelRepository(
	agreements stores.AgreementStore,
	service services.AgreementService,
	artifacts services.ArtifactPipelineService,
	projector *AuditActivityProjector,
	defaultScope stores.Scope,
	settings RuntimeSettings,
) *agreementPanelRepository {
	return &agreementPanelRepository{
		agreements:   agreements,
		service:      service,
		artifacts:    artifacts,
		projector:    projector,
		defaultScope: defaultScope,
		settings:     settings,
	}
}

func (r *agreementPanelRepository) List(ctx context.Context, opts coreadmin.ListOptions) ([]map[string]any, int, error) {
	startedAt := time.Now()
	success := false
	defer func() {
		observability.ObserveAdminRead(ctx, time.Since(startedAt), success, "agreements.list")
	}()
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, 0, err
	}
	if r.agreements == nil {
		return nil, 0, fmt.Errorf("agreement store not configured")
	}
	query := stores.AgreementQuery{Status: strings.TrimSpace(lookupFilter(opts.Filters, "status"))}
	agreements, err := r.agreements.ListAgreements(ctx, scope, query)
	if err != nil {
		return nil, 0, err
	}
	recipientEmail := strings.ToLower(strings.TrimSpace(lookupFilter(opts.Filters, "recipient_email")))
	titleQuery := strings.ToLower(strings.TrimSpace(lookupFilter(opts.Filters, "title", "title_contains")))
	filtered := make([]stores.AgreementRecord, 0, len(agreements))
	for _, agreement := range agreements {
		if titleQuery != "" && !strings.Contains(strings.ToLower(strings.TrimSpace(agreement.Title)), titleQuery) {
			continue
		}
		if recipientEmail != "" {
			recipients, err := r.agreements.ListRecipients(ctx, scope, agreement.ID)
			if err != nil {
				return nil, 0, err
			}
			matched := false
			for _, recipient := range recipients {
				if strings.Contains(strings.ToLower(strings.TrimSpace(recipient.Email)), recipientEmail) {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		filtered = append(filtered, agreement)
	}
	sort.Slice(filtered, func(i, j int) bool {
		if opts.SortDesc {
			return filtered[i].UpdatedAt.After(filtered[j].UpdatedAt)
		}
		return filtered[i].UpdatedAt.Before(filtered[j].UpdatedAt)
	})
	rows := paginateRecords(filtered, opts.Page, opts.PerPage)
	out := make([]map[string]any, 0, len(rows))
	for _, agreement := range rows {
		recipients, err := r.agreements.ListRecipients(ctx, scope, agreement.ID)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, agreementRecordToMap(agreement, recipients, nil, nil, services.AgreementDeliveryDetail{}))
	}
	success = true
	return out, len(filtered), nil
}

func (r *agreementPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	startedAt := time.Now()
	success := false
	defer func() {
		observability.ObserveAdminRead(ctx, time.Since(startedAt), success, "agreements.get")
	}()
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	if r.agreements == nil {
		return nil, fmt.Errorf("agreement store not configured")
	}
	agreementID := strings.TrimSpace(id)
	agreement, err := r.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	recipients, err := r.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	fields, err := r.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	events := []stores.AuditEventRecord{}
	if audits, ok := r.agreements.(stores.AuditEventStore); ok {
		events, err = audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{SortDesc: false})
		if err != nil {
			return nil, err
		}
	}
	delivery, err := r.artifacts.AgreementDeliveryDetail(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	if r.projector != nil {
		if err := r.projector.ProjectAgreement(ctx, scope, agreementID); err != nil {
			return nil, err
		}
	}
	success = true
	return agreementRecordToMap(agreement, recipients, fields, events, delivery), nil
}

func (r *agreementPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	created, err := r.service.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      strings.TrimSpace(toString(record["document_id"])),
		Title:           strings.TrimSpace(toString(record["title"])),
		Message:         strings.TrimSpace(toString(record["message"])),
		CreatedByUserID: strings.TrimSpace(firstNonEmpty(strings.TrimSpace(toString(record["created_by_user_id"])), userIDFromContext(ctx))),
	})
	if err != nil {
		return nil, err
	}
	recipients, fields, err := r.syncDraftFormPayload(ctx, scope, created.ID, record)
	if err != nil {
		return nil, err
	}
	return agreementRecordToMap(created, recipients, fields, nil, services.AgreementDeliveryDetail{}), nil
}

func (r *agreementPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	expectedVersion := toInt64(record["expected_version"])
	if expectedVersion <= 0 {
		expectedVersion = toInt64(record["version"])
	}
	patch := stores.AgreementDraftPatch{}
	if _, ok := record["title"]; ok {
		title := strings.TrimSpace(toString(record["title"]))
		patch.Title = &title
	}
	if _, ok := record["message"]; ok {
		message := strings.TrimSpace(toString(record["message"]))
		patch.Message = &message
	}
	if _, ok := record["document_id"]; ok {
		documentID := strings.TrimSpace(toString(record["document_id"]))
		patch.DocumentID = &documentID
	}
	updated, err := r.service.UpdateDraft(ctx, scope, strings.TrimSpace(id), patch, expectedVersion)
	if err != nil {
		return nil, err
	}
	recipients, fields, err := r.syncDraftFormPayload(ctx, scope, updated.ID, record)
	if err != nil {
		return nil, err
	}
	return agreementRecordToMap(updated, recipients, fields, nil, services.AgreementDeliveryDetail{}), nil
}

func (r *agreementPanelRepository) Delete(context.Context, string) error {
	return fmt.Errorf("agreements cannot be deleted; use void action")
}

func agreementRecordToMap(
	agreement stores.AgreementRecord,
	recipients []stores.RecipientRecord,
	fields []stores.FieldRecord,
	events []stores.AuditEventRecord,
	delivery services.AgreementDeliveryDetail,
) map[string]any {
	payload := map[string]any{
		"id":                         agreement.ID,
		"tenant_id":                  agreement.TenantID,
		"org_id":                     agreement.OrgID,
		"document_id":                agreement.DocumentID,
		"source_type":                agreement.SourceType,
		"source_google_file_id":      agreement.SourceGoogleFileID,
		"source_google_doc_url":      agreement.SourceGoogleDocURL,
		"source_modified_time":       formatTimePtr(agreement.SourceModifiedTime),
		"source_exported_at":         formatTimePtr(agreement.SourceExportedAt),
		"source_exported_by_user_id": agreement.SourceExportedByUserID,
		"status":                     agreement.Status,
		"title":                      agreement.Title,
		"message":                    agreement.Message,
		"version":                    agreement.Version,
		"created_by_user_id":         agreement.CreatedByUserID,
		"updated_by_user_id":         agreement.UpdatedByUserID,
		"created_at":                 formatTimePtr(&agreement.CreatedAt),
		"updated_at":                 formatTimePtr(&agreement.UpdatedAt),
		"sent_at":                    formatTimePtr(agreement.SentAt),
		"completed_at":               formatTimePtr(agreement.CompletedAt),
		"voided_at":                  formatTimePtr(agreement.VoidedAt),
		"declined_at":                formatTimePtr(agreement.DeclinedAt),
		"expired_at":                 formatTimePtr(agreement.ExpiredAt),
		"recipient_count":            len(recipients),
		"signer_count":               signerCount(recipients),
	}
	if len(recipients) > 0 {
		payload["recipients"] = recipientsToMaps(agreement, recipients)
	}
	if len(fields) > 0 {
		payload["fields"] = fieldsToMaps(fields, recipientIndexesByID(recipients))
	}
	if len(events) > 0 {
		payload["timeline"] = eventsToMaps(events)
	}
	if delivery.AgreementID != "" {
		payload["delivery"] = map[string]any{
			"agreement_id":           delivery.AgreementID,
			"executed_status":        delivery.ExecutedStatus,
			"certificate_status":     delivery.CertificateStatus,
			"distribution_status":    delivery.DistributionStatus,
			"executed_object_key":    delivery.ExecutedObjectKey,
			"certificate_object_key": delivery.CertificateObjectKey,
			"last_error":             delivery.LastError,
			"correlation_ids":        append([]string{}, delivery.CorrelationIDs...),
		}
	}
	return payload
}

func recipientsToMaps(agreement stores.AgreementRecord, records []stores.RecipientRecord) []map[string]any {
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		status, signedAt, deliveredAt := recipientPresentationStatus(agreement, record)
		out = append(out, map[string]any{
			"id":             record.ID,
			"agreement_id":   record.AgreementID,
			"email":          record.Email,
			"name":           record.Name,
			"role":           record.Role,
			"status":         status,
			"signing_order":  record.SigningOrder,
			"sent_at":        formatTimePtr(agreement.SentAt),
			"first_view_at":  formatTimePtr(record.FirstViewAt),
			"last_view_at":   formatTimePtr(record.LastViewAt),
			"declined_at":    formatTimePtr(record.DeclinedAt),
			"decline_reason": record.DeclineReason,
			"completed_at":   formatTimePtr(record.CompletedAt),
			"signed_at":      signedAt,
			"delivered_at":   deliveredAt,
			"version":        record.Version,
		})
	}
	return out
}

func recipientPresentationStatus(agreement stores.AgreementRecord, record stores.RecipientRecord) (status string, signedAt string, deliveredAt string) {
	if record.DeclinedAt != nil {
		return "declined", "", ""
	}

	role := strings.ToLower(strings.TrimSpace(record.Role))
	switch role {
	case stores.RecipientRoleCC:
		if strings.EqualFold(strings.TrimSpace(agreement.Status), stores.AgreementStatusCompleted) {
			return "delivered", "", formatTimePtr(agreement.CompletedAt)
		}
		if agreement.SentAt != nil {
			return "sent", "", ""
		}
		return "pending", "", ""
	default:
		if record.CompletedAt != nil {
			return "signed", formatTimePtr(record.CompletedAt), ""
		}
		if record.FirstViewAt != nil {
			return "viewed", "", ""
		}
		if agreement.SentAt != nil {
			return "sent", "", ""
		}
		return "pending", "", ""
	}
}

func fieldsToMaps(records []stores.FieldRecord, recipientIndexByID map[string]int) []map[string]any {
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		entry := map[string]any{
			"id":           record.ID,
			"agreement_id": record.AgreementID,
			"recipient_id": record.RecipientID,
			"type":         record.Type,
			"page":         record.PageNumber,
			"page_number":  record.PageNumber,
			"pos_x":        record.PosX,
			"pos_y":        record.PosY,
			"width":        record.Width,
			"height":       record.Height,
			"required":     record.Required,
		}
		if index, ok := recipientIndexByID[strings.TrimSpace(record.RecipientID)]; ok {
			entry["recipient_index"] = index
		}
		out = append(out, entry)
	}
	return out
}

func recipientIndexesByID(recipients []stores.RecipientRecord) map[string]int {
	out := make(map[string]int, len(recipients))
	for index, recipient := range recipients {
		id := strings.TrimSpace(recipient.ID)
		if id == "" {
			continue
		}
		out[id] = index
	}
	return out
}

func eventsToMaps(records []stores.AuditEventRecord) []map[string]any {
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		entry := map[string]any{
			"id":           record.ID,
			"event_type":   record.EventType,
			"actor_type":   record.ActorType,
			"actor_id":     record.ActorID,
			"ip_address":   record.IPAddress,
			"user_agent":   record.UserAgent,
			"created_at":   formatTimePtr(&record.CreatedAt),
			"metadata_raw": record.MetadataJSON,
		}
		if strings.TrimSpace(record.MetadataJSON) != "" {
			meta := map[string]any{}
			if err := json.Unmarshal([]byte(record.MetadataJSON), &meta); err == nil {
				entry["metadata"] = meta
			}
		}
		out = append(out, entry)
	}
	return out
}

func signerCount(recipients []stores.RecipientRecord) int {
	count := 0
	for _, recipient := range recipients {
		if strings.EqualFold(strings.TrimSpace(recipient.Role), stores.RecipientRoleSigner) {
			count++
		}
	}
	return count
}

func formatTimePtr(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

type agreementRecipientFormInput struct {
	Name  string
	Email string
	Role  string
}

type agreementFieldFormInput struct {
	Type           string
	RecipientIndex int
	RecipientID    string
	PageNumber     int
	Required       bool
}

func (r *agreementPanelRepository) syncDraftFormPayload(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	record map[string]any,
) ([]stores.RecipientRecord, []stores.FieldRecord, error) {
	recipients, err := r.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return nil, nil, err
	}
	fields, err := r.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return nil, nil, err
	}

	recipientInputs, hasRecipientPayload := parseAgreementRecipientFormInputs(record)
	if !hasRecipientPayload && toBool(record["recipients_present"]) {
		hasRecipientPayload = true
	}
	if hasRecipientPayload {
		recipients, err = r.syncDraftRecipients(ctx, scope, agreementID, recipients, recipientInputs)
		if err != nil {
			return nil, nil, err
		}
	}

	fieldInputs, hasFieldPayload := parseAgreementFieldFormInputs(record)
	if !hasFieldPayload && toBool(record["fields_present"]) {
		hasFieldPayload = true
	}
	if hasFieldPayload {
		fields, err = r.syncDraftFields(ctx, scope, agreementID, fields, recipients, fieldInputs)
		if err != nil {
			return nil, nil, err
		}
	}

	return recipients, fields, nil
}

func (r *agreementPanelRepository) syncDraftRecipients(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	existing []stores.RecipientRecord,
	inputs []agreementRecipientFormInput,
) ([]stores.RecipientRecord, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("at least one recipient is required")
	}
	for index, input := range inputs {
		email := strings.TrimSpace(input.Email)
		name := strings.TrimSpace(input.Name)
		role := strings.ToLower(strings.TrimSpace(input.Role))
		if role == "" {
			role = stores.RecipientRoleSigner
		}
		signingOrder := index + 1
		patch := stores.RecipientDraftPatch{
			Email:        &email,
			Name:         &name,
			Role:         &role,
			SigningOrder: &signingOrder,
		}
		expectedVersion := int64(0)
		if index < len(existing) {
			patch.ID = existing[index].ID
			expectedVersion = existing[index].Version
		}
		if _, err := r.service.UpsertRecipientDraft(ctx, scope, agreementID, patch, expectedVersion); err != nil {
			return nil, err
		}
	}
	for index := len(inputs); index < len(existing); index++ {
		if err := r.service.RemoveRecipientDraft(ctx, scope, agreementID, existing[index].ID); err != nil {
			return nil, err
		}
	}
	return r.agreements.ListRecipients(ctx, scope, agreementID)
}

func (r *agreementPanelRepository) syncDraftFields(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	existingFields []stores.FieldRecord,
	recipients []stores.RecipientRecord,
	inputs []agreementFieldFormInput,
) ([]stores.FieldRecord, error) {
	if len(recipients) == 0 {
		return nil, fmt.Errorf("at least one recipient is required before adding fields")
	}
	recipientIDsByIndex := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		recipientIDsByIndex = append(recipientIDsByIndex, recipient.ID)
	}

	for index, input := range inputs {
		fieldType := strings.TrimSpace(input.Type)
		if fieldType == "" {
			fieldType = stores.FieldTypeSignature
		}
		recipientID := strings.TrimSpace(input.RecipientID)
		if recipientID == "" {
			if input.RecipientIndex < 0 || input.RecipientIndex >= len(recipientIDsByIndex) {
				return nil, fmt.Errorf("field recipient assignment %d is invalid", input.RecipientIndex)
			}
			recipientID = recipientIDsByIndex[input.RecipientIndex]
		} else {
			known := false
			for _, id := range recipientIDsByIndex {
				if id == recipientID {
					known = true
					break
				}
			}
			if !known {
				return nil, fmt.Errorf("field recipient_id %q is invalid", recipientID)
			}
		}
		pageNumber := input.PageNumber
		if pageNumber <= 0 {
			pageNumber = 1
		}
		required := input.Required
		patch := stores.FieldDraftPatch{
			RecipientID: &recipientID,
			Type:        &fieldType,
			PageNumber:  &pageNumber,
			Required:    &required,
		}
		if index < len(existingFields) {
			patch.ID = existingFields[index].ID
		}
		if _, err := r.service.UpsertFieldDraft(ctx, scope, agreementID, patch); err != nil {
			return nil, err
		}
	}
	for index := len(inputs); index < len(existingFields); index++ {
		if err := r.service.DeleteFieldDraft(ctx, scope, agreementID, existingFields[index].ID); err != nil {
			return nil, err
		}
	}
	return r.agreements.ListFields(ctx, scope, agreementID)
}

func parseAgreementRecipientFormInputs(record map[string]any) ([]agreementRecipientFormInput, bool) {
	entries := map[int]map[string]any{}
	hasPayload := false
	if record == nil {
		return nil, false
	}

	if raw, ok := record["recipients"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	for key, value := range record {
		matches := recipientBracketKeyPattern.FindStringSubmatch(strings.TrimSpace(key))
		if len(matches) != 2 {
			continue
		}
		hasPayload = true
		index := int(toInt64(matches[1]))
		entry, ok := value.(map[string]any)
		if !ok {
			entry = map[string]any{}
		}
		entries[index] = entry
	}

	indexes := sortedEntryIndexes(entries)
	out := make([]agreementRecipientFormInput, 0, len(indexes))
	for _, index := range indexes {
		entry := entries[index]
		name := strings.TrimSpace(toString(entry["name"]))
		email := strings.TrimSpace(toString(entry["email"]))
		role := strings.ToLower(strings.TrimSpace(toString(entry["role"])))
		if name == "" && email == "" && role == "" {
			continue
		}
		out = append(out, agreementRecipientFormInput{
			Name:  name,
			Email: email,
			Role:  role,
		})
	}
	return out, hasPayload
}

func parseAgreementFieldFormInputs(record map[string]any) ([]agreementFieldFormInput, bool) {
	entries := map[int]map[string]any{}
	hasPayload := false
	if record == nil {
		return nil, false
	}

	if raw, ok := record["fields"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	for key, value := range record {
		matches := fieldBracketKeyPattern.FindStringSubmatch(strings.TrimSpace(key))
		if len(matches) != 2 {
			continue
		}
		hasPayload = true
		index := int(toInt64(matches[1]))
		entry, ok := value.(map[string]any)
		if !ok {
			entry = map[string]any{}
		}
		entries[index] = entry
	}

	indexes := sortedEntryIndexes(entries)
	out := make([]agreementFieldFormInput, 0, len(indexes))
	for _, index := range indexes {
		entry := entries[index]
		fieldType := strings.TrimSpace(toString(entry["type"]))
		recipientIndexRaw := strings.TrimSpace(toString(entry["recipient_index"]))
		recipientIndex := int(toInt64(recipientIndexRaw))
		recipientID := strings.TrimSpace(toString(entry["recipient_id"]))
		pageRaw := strings.TrimSpace(toString(entry["page"]))
		if pageRaw == "" {
			pageRaw = strings.TrimSpace(toString(entry["page_number"]))
		}
		pageNumber := int(toInt64(pageRaw))
		required := toBool(entry["required"])
		if fieldType == "" && recipientIndexRaw == "" && recipientID == "" {
			continue
		}
		out = append(out, agreementFieldFormInput{
			Type:           fieldType,
			RecipientIndex: recipientIndex,
			RecipientID:    recipientID,
			PageNumber:     pageNumber,
			Required:       required,
		})
	}
	return out, hasPayload
}

func collectIndexedFormEntries(dst map[int]map[string]any, raw any) {
	switch typed := raw.(type) {
	case []any:
		for index, item := range typed {
			entry, ok := item.(map[string]any)
			if !ok {
				continue
			}
			dst[index] = entry
		}
	case map[string]any:
		for key, item := range typed {
			entry, ok := item.(map[string]any)
			if !ok {
				continue
			}
			index := int(toInt64(key))
			dst[index] = entry
		}
	}
}

func sortedEntryIndexes(entries map[int]map[string]any) []int {
	indexes := make([]int, 0, len(entries))
	for index := range entries {
		indexes = append(indexes, index)
	}
	sort.Ints(indexes)
	return indexes
}

func toBool(value any) bool {
	switch raw := value.(type) {
	case bool:
		return raw
	case string:
		switch strings.ToLower(strings.TrimSpace(raw)) {
		case "", "0", "false", "off", "no":
			return false
		default:
			return true
		}
	default:
		return toInt64(value) > 0
	}
}

func lookupFilter(filters map[string]any, keys ...string) string {
	for _, key := range keys {
		if key == "" {
			continue
		}
		if value, ok := filters[key]; ok {
			if resolved := strings.TrimSpace(toString(value)); resolved != "" {
				return resolved
			}
		}
	}
	return ""
}

func paginateRecords[T any](records []T, page, perPage int) []T {
	if len(records) == 0 {
		return nil
	}
	if perPage <= 0 {
		perPage = 20
	}
	if page <= 0 {
		page = 1
	}
	start := (page - 1) * perPage
	if start >= len(records) {
		return nil
	}
	end := start + perPage
	if end > len(records) {
		end = len(records)
	}
	out := make([]T, 0, end-start)
	out = append(out, records[start:end]...)
	return out
}

func toString(value any) string {
	if value == nil {
		return ""
	}
	switch raw := value.(type) {
	case string:
		return strings.TrimSpace(raw)
	case []byte:
		return strings.TrimSpace(string(raw))
	default:
		return strings.TrimSpace(fmt.Sprint(raw))
	}
}

func toInt64(value any) int64 {
	switch raw := value.(type) {
	case int:
		return int64(raw)
	case int8:
		return int64(raw)
	case int16:
		return int64(raw)
	case int32:
		return int64(raw)
	case int64:
		return raw
	case uint:
		return int64(raw)
	case uint8:
		return int64(raw)
	case uint16:
		return int64(raw)
	case uint32:
		return int64(raw)
	case uint64:
		return int64(raw)
	case float32:
		return int64(raw)
	case float64:
		return int64(raw)
	case string:
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return 0
		}
		var parsed int64
		_, _ = fmt.Sscan(trimmed, &parsed)
		return parsed
	default:
		return 0
	}
}

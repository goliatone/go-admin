package modules

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
)

const (
	esignDocumentsPanelID     = "esign_documents"
	esignAgreementsPanelID    = "esign_agreements"
	agreementVersionsCurrent  = "current"
	agreementVersionsAll      = "all"
	agreementVersionsPrevious = "previous"
)

var (
	participantBracketKeyPattern = regexp.MustCompile(`^(participants|recipients)\[(\d+)\]$`)
	fieldBracketKeyPattern       = regexp.MustCompile(`^(fields|field_instances)\[(\d+)\]$`)
	fieldPlacementKeyPattern     = regexp.MustCompile(`^field_placements\[(\d+)\]$`)
	fieldRuleKeyPattern          = regexp.MustCompile(`^field_rules\[(\d+)\]$`)
)

type documentPanelRepository struct {
	store        stores.DocumentStore
	agreements   stores.AgreementStore
	uploader     services.DocumentService
	readModels   services.SourceReadModelService
	uploads      *uploader.Manager
	defaultScope stores.Scope
	settings     RuntimeSettings
	authorizer   coreadmin.Authorizer
}

func newDocumentPanelRepository(store stores.DocumentStore, agreements stores.AgreementStore, uploader services.DocumentService, uploads *uploader.Manager, defaultScope stores.Scope, settings RuntimeSettings) *documentPanelRepository {
	repo := &documentPanelRepository{store: store, agreements: agreements, uploader: uploader, uploads: uploads, defaultScope: defaultScope, settings: settings}
	if lineage, ok := any(store).(stores.LineageStore); ok {
		var agreementStore stores.AgreementStore
		if agreements != nil {
			agreementStore = agreements
		}
		readModels := services.NewDefaultSourceReadModelService(
			store,
			agreementStore,
			lineage,
		)
		repo.readModels = readModels
	}
	return repo
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
	query := stores.DocumentQuery{
		TitleContains:   strings.TrimSpace(primitives.FirstNonEmpty(opts.Search, lookupFilter(opts.Filters, "q", "_search", "title", "title_contains", "filters[title_contains]"))),
		CreatedByUserID: lookupFilter(opts.Filters, "created_by_user_id", "created_by"),
		SortBy:          opts.SortBy,
		SortDesc:        opts.SortDesc,
	}
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
	result := documentRecordToMap(record)
	if r.readModels != nil {
		lineage, err := r.readModels.GetDocumentLineageDetail(ctx, scope, record.ID)
		if err != nil {
			return nil, err
		}
		lineage = sanitizeDocumentLineageDetailForPermissions(ctx, r.authorizer, permissions.AdminESignView, lineage)
		result["lineage"] = lineage
		result["lineage_presentation"] = buildDocumentLineagePresentation(lineage)
	}
	success = true
	return result, nil
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
	created, err := r.uploader.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              strings.TrimSpace(toString(record["title"])),
		SourceOriginalName: strings.TrimSpace(toString(record["source_original_name"])),
		ObjectKey:          objectKey,
		PDF:                pdfBytes,
		CreatedBy:          userIDFromContext(ctx),
		UploadedAt:         time.Now().UTC(),
	})
	if err != nil {
		return nil, err
	}
	return documentRecordToMap(created), nil
}

func (r *documentPanelRepository) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, coreadmin.NewDomainError(
		coreadmin.TextCodePreconditionFailed,
		"documents are immutable after upload",
		map[string]any{
			"entity": "documents",
			"field":  "document",
		},
	)
}

func (r *documentPanelRepository) Delete(ctx context.Context, id string) error {
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return err
	}
	if r.store == nil {
		return fmt.Errorf("document store not configured")
	}
	id = strings.TrimSpace(id)
	if err := r.store.Delete(ctx, scope, id); err != nil {
		return r.resolveDocumentDeleteError(ctx, scope, id, err)
	}
	return nil
}

func (r *documentPanelRepository) resolveDocumentDeleteError(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
	err error,
) error {
	typedErr := documentDeleteTypedError(err)
	if !isDocumentDeleteConflict(typedErr) {
		return err
	}
	summary, ok, summaryErr := r.documentAgreementReferenceSummary(ctx, scope, documentID)
	if summaryErr != nil {
		return summaryErr
	}
	if ok {
		return documentDeleteConflictError("", documentID, summary)
	}
	return documentDeleteConflictError("", documentID, fallbackDocumentAgreementReferenceSummary(typedErr))
}

func documentDeleteTypedError(err error) *goerrors.Error {
	var typedErr *goerrors.Error
	if goerrors.As(err, &typedErr) && typedErr != nil {
		return typedErr
	}
	return nil
}

func isDocumentDeleteConflict(err *goerrors.Error) bool {
	if err == nil {
		return false
	}
	textCode := strings.TrimSpace(err.TextCode)
	entity := strings.ToLower(strings.TrimSpace(toString(err.Metadata["entity"])))
	field := strings.TrimSpace(toString(err.Metadata["field"]))
	return textCode == coreadmin.TextCodeResourceInUse && entity == "documents" && field == "id"
}

func fallbackDocumentAgreementReferenceSummary(err *goerrors.Error) documentAgreementReferenceSummary {
	count := int(toInt64(err.Metadata["agreement_count"]))
	if count <= 0 {
		count = 1
	}
	return documentAgreementReferenceSummary{Count: count}
}

func (r *documentPanelRepository) documentAgreementReferenceSummary(ctx context.Context, scope stores.Scope, documentID string) (documentAgreementReferenceSummary, bool, error) {
	summaries, err := listDocumentAgreementReferenceSummaries(ctx, r.agreements, scope)
	if err != nil {
		return documentAgreementReferenceSummary{}, false, err
	}
	if len(summaries) == 0 {
		return documentAgreementReferenceSummary{}, false, nil
	}
	summary, ok := summaries[strings.TrimSpace(documentID)]
	return summary, ok, nil
}

// ServePanelSubresource serves the source PDF for a document.
// Supported subresources:
//   - "source": the original PDF document
func (r *documentPanelRepository) ServePanelSubresource(ctx coreadmin.AdminContext, c router.Context, documentID, subresource, _ string) error {
	if strings.ToLower(strings.TrimSpace(subresource)) != "source" {
		return coreadmin.ErrNotFound
	}
	scope, err := resolveScopeFromContext(ctx.Context, r.defaultScope)
	if err != nil {
		return err
	}
	if r.store == nil {
		return coreadmin.ErrNotFound
	}
	record, err := r.store.Get(ctx.Context, scope, strings.TrimSpace(documentID))
	if err != nil {
		return err
	}
	objectKey := strings.TrimSpace(record.SourceObjectKey)
	if objectKey == "" {
		return coreadmin.ErrNotFound
	}
	if r.uploads == nil {
		return coreadmin.ErrNotFound
	}
	disposition := "inline"
	if strings.EqualFold(strings.TrimSpace(c.Query("disposition")), "attachment") {
		disposition = "attachment"
	}
	filename := strings.TrimSpace(record.SourceOriginalName)
	if filename == "" {
		filename = strings.TrimSpace(record.Title)
	}
	if filename == "" {
		filename = "document"
	}
	if !strings.HasSuffix(strings.ToLower(filename), ".pdf") {
		filename = filename + ".pdf"
	}
	if err := quickstart.ServeBinaryObject(c, quickstart.BinaryObjectResponseConfig{
		Store:       r.uploads,
		ObjectKey:   objectKey,
		ContentType: "application/pdf",
		Filename:    filename,
		Disposition: disposition,
	}); err != nil {
		if errors.Is(err, quickstart.ErrBinaryObjectUnavailable) {
			return coreadmin.ErrNotFound
		}
		return err
	}
	return nil
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
		"created_by_user_id":         record.CreatedByUserID,
		"title":                      record.Title,
		"source_original_name":       record.SourceOriginalName,
		"file_name":                  strings.TrimSpace(primitives.FirstNonEmpty(record.SourceOriginalName, record.Title)),
		"source_object_key":          record.SourceObjectKey,
		"normalized_object_key":      record.NormalizedObjectKey,
		"source_sha256":              record.SourceSHA256,
		"source_type":                record.SourceType,
		"source_google_file_id":      record.SourceGoogleFileID,
		"source_google_doc_url":      record.SourceGoogleDocURL,
		"source_modified_time":       formatTimePtr(record.SourceModifiedTime),
		"source_exported_at":         formatTimePtr(record.SourceExportedAt),
		"source_exported_by_user_id": record.SourceExportedByUserID,
		"source_mime_type":           record.SourceMimeType,
		"source_ingestion_mode":      record.SourceIngestionMode,
		"source_document_id":         record.SourceDocumentID,
		"source_revision_id":         record.SourceRevisionID,
		"source_artifact_id":         record.SourceArtifactID,
		"pdf_compatibility_tier":     record.PDFCompatibilityTier,
		"pdf_compatibility_reason":   record.PDFCompatibilityReason,
		"pdf_normalization_status":   record.PDFNormalizationStatus,
		"pdf_analyzed_at":            formatTimePtr(record.PDFAnalyzedAt),
		"pdf_policy_version":         record.PDFPolicyVersion,
		"size_bytes":                 record.SizeBytes,
		"page_count":                 record.PageCount,
		"created_at":                 record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":                 record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

type agreementPanelRepository struct {
	agreements   stores.AgreementStore
	reminders    stores.AgreementReminderStore
	documents    stores.DocumentStore
	service      services.AgreementService
	artifacts    services.ArtifactPipelineService
	readModels   services.SourceReadModelService
	projector    *AuditActivityProjector
	objectStore  quickstart.BinaryObjectStore
	defaultScope stores.Scope
	settings     RuntimeSettings
	authorizer   coreadmin.Authorizer
	users        *coreadmin.UserManagementService
	profiles     *coreadmin.ProfileService
}

func newAgreementPanelRepository(
	agreements stores.AgreementStore,
	documents stores.DocumentStore,
	service services.AgreementService,
	artifacts services.ArtifactPipelineService,
	projector *AuditActivityProjector,
	objectStore quickstart.BinaryObjectStore,
	defaultScope stores.Scope,
	settings RuntimeSettings,
) *agreementPanelRepository {
	var reminders stores.AgreementReminderStore
	if cast, ok := agreements.(stores.AgreementReminderStore); ok {
		reminders = cast
	}
	repo := &agreementPanelRepository{
		agreements:   agreements,
		reminders:    reminders,
		documents:    documents,
		service:      service,
		artifacts:    artifacts,
		projector:    projector,
		objectStore:  objectStore,
		defaultScope: defaultScope,
		settings:     settings,
	}
	if lineage, ok := any(agreements).(stores.LineageStore); ok {
		readModels := services.NewDefaultSourceReadModelService(
			documents,
			agreements,
			lineage,
		)
		repo.readModels = readModels
	}
	return repo
}

type agreementListFilters struct {
	status             string
	actionRequiredOnly bool
	versionVisibility  string
	documentID         string
	recipientEmail     string
	titleQuery         string
}

func resolveAgreementListFilters(opts coreadmin.ListOptions) agreementListFilters {
	return agreementListFilters{
		status:             strings.TrimSpace(lookupFilter(opts.Filters, "status")),
		actionRequiredOnly: truthyFilterValue(lookupFilter(opts.Filters, "action_required")),
		versionVisibility:  normalizeAgreementVersionVisibility(lookupFilter(opts.Filters, "version_visibility")),
		documentID:         strings.TrimSpace(lookupFilter(opts.Filters, "document_id")),
		recipientEmail:     strings.ToLower(strings.TrimSpace(lookupFilter(opts.Filters, "recipient_email"))),
		titleQuery:         strings.ToLower(strings.TrimSpace(lookupFilter(opts.Filters, "title", "title_contains"))),
	}
}

func (r *agreementPanelRepository) agreementMatchesListFilters(
	ctx context.Context,
	scope stores.Scope,
	agreement stores.AgreementRecord,
	filters agreementListFilters,
	currentVersionIDs map[string]struct{},
) (bool, error) {
	agreementID := strings.TrimSpace(agreement.ID)
	if !agreementMatchesStatusFilter(agreement, filters.status) {
		return false, nil
	}
	if filters.actionRequiredOnly && !agreementRequiresAction(agreement) {
		return false, nil
	}
	if !includeAgreementForVersionVisibility(agreementID, currentVersionIDs, filters.versionVisibility) {
		return false, nil
	}
	if filters.documentID != "" && strings.TrimSpace(agreement.DocumentID) != filters.documentID {
		return false, nil
	}
	if filters.titleQuery != "" && !strings.Contains(strings.ToLower(strings.TrimSpace(agreement.Title)), filters.titleQuery) {
		return false, nil
	}
	if filters.recipientEmail == "" {
		return true, nil
	}
	recipients, err := r.agreements.ListRecipients(ctx, scope, agreement.ID)
	if err != nil {
		return false, err
	}
	for _, recipient := range recipients {
		if strings.Contains(strings.ToLower(strings.TrimSpace(recipient.Email)), filters.recipientEmail) {
			return true, nil
		}
	}
	return false, nil
}

func (r *agreementPanelRepository) filterAgreementsForList(
	ctx context.Context,
	scope stores.Scope,
	agreements []stores.AgreementRecord,
	filters agreementListFilters,
	currentVersionIDs map[string]struct{},
) ([]stores.AgreementRecord, error) {
	filtered := make([]stores.AgreementRecord, 0, len(agreements))
	for _, agreement := range agreements {
		include, err := r.agreementMatchesListFilters(ctx, scope, agreement, filters, currentVersionIDs)
		if err != nil {
			return nil, err
		}
		if !include {
			continue
		}
		filtered = append(filtered, agreement)
	}
	return filtered, nil
}

func sortAgreementsForList(agreements []stores.AgreementRecord, sortDesc bool) {
	sort.Slice(agreements, func(i, j int) bool {
		if sortDesc {
			return agreements[i].UpdatedAt.After(agreements[j].UpdatedAt)
		}
		return agreements[i].UpdatedAt.Before(agreements[j].UpdatedAt)
	})
}

func (r *agreementPanelRepository) buildAgreementListRows(
	ctx context.Context,
	scope stores.Scope,
	rows []stores.AgreementRecord,
	lineage map[string]agreementLineagePayload,
) ([]map[string]any, error) {
	out := make([]map[string]any, 0, len(rows))
	for _, agreement := range rows {
		recipients, err := r.agreements.ListRecipients(ctx, scope, agreement.ID)
		if err != nil {
			return nil, err
		}
		reminderStates := r.reminderStateMap(ctx, scope, agreement.ID, recipients)
		payload := agreementRecordToMap(agreement, recipients, reminderStates, nil, nil, services.AgreementDeliveryDetail{})
		applyAgreementLineagePayload(payload, lineage[strings.TrimSpace(agreement.ID)], false)
		out = append(out, payload)
	}
	return out, nil
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
	agreements, err := r.agreements.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return nil, 0, err
	}
	lineage := buildAgreementLineageIndex(agreements)
	currentVersionIDs := buildCurrentAgreementVersionIDSet(agreements)
	filtered, err := r.filterAgreementsForList(ctx, scope, agreements, resolveAgreementListFilters(opts), currentVersionIDs)
	if err != nil {
		return nil, 0, err
	}
	sortAgreementsForList(filtered, opts.SortDesc)
	rows := paginateRecords(filtered, opts.Page, opts.PerPage)
	out, err := r.buildAgreementListRows(ctx, scope, rows, lineage)
	if err != nil {
		return nil, 0, err
	}
	success = true
	return out, len(filtered), nil
}

type agreementPanelGetContext struct {
	agreement        stores.AgreementRecord
	agreements       []stores.AgreementRecord
	recipients       []stores.RecipientRecord
	fieldDefinitions []stores.FieldDefinitionRecord
	fieldInstances   []stores.FieldInstanceRecord
	fields           []stores.FieldRecord
	events           []stores.AuditEventRecord
	delivery         services.AgreementDeliveryDetail
}

func (r *agreementPanelRepository) loadAgreementPanelGetContext(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
) (agreementPanelGetContext, error) {
	agreement, err := r.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	agreements, err := r.agreements.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	recipients, err := r.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	fieldDefinitions, err := r.agreements.ListFieldDefinitions(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	fieldInstances, err := r.agreements.ListFieldInstances(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	fields, err := r.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	events, err := r.listAgreementAuditEvents(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	delivery, err := r.artifacts.AgreementDeliveryDetail(ctx, scope, agreementID)
	if err != nil {
		return agreementPanelGetContext{}, err
	}
	return agreementPanelGetContext{
		agreement:        agreement,
		agreements:       agreements,
		recipients:       recipients,
		fieldDefinitions: fieldDefinitions,
		fieldInstances:   fieldInstances,
		fields:           fields,
		events:           events,
		delivery:         delivery,
	}, nil
}

func (r *agreementPanelRepository) listAgreementAuditEvents(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
) ([]stores.AuditEventRecord, error) {
	audits, ok := r.agreements.(stores.AuditEventStore)
	if !ok {
		return []stores.AuditEventRecord{}, nil
	}
	return audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{SortDesc: false})
}

func (r *agreementPanelRepository) maybeLoadAgreementDocumentTitle(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
) string {
	documentID = strings.TrimSpace(documentID)
	if documentID == "" || r.documents == nil {
		return ""
	}
	doc, err := r.documents.Get(ctx, scope, documentID)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(doc.Title)
}

func (r *agreementPanelRepository) attachAgreementLineageDetail(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	result map[string]any,
) error {
	if r.readModels == nil {
		return nil
	}
	lineage, err := r.readModels.GetAgreementLineageDetail(ctx, scope, agreementID)
	if err != nil {
		return err
	}
	lineage = sanitizeAgreementLineageDetailForPermissions(ctx, r.authorizer, permissions.AdminESignView, lineage)
	result["lineage"] = lineage
	result["lineage_presentation"] = buildAgreementLineagePresentation(lineage)
	return nil
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
	loadCtx, err := r.loadAgreementPanelGetContext(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	if r.projector != nil {
		if err := r.projector.ProjectAgreement(ctx, scope, agreementID); err != nil {
			return nil, err
		}
	}
	reminderStates := r.reminderStateMap(ctx, scope, agreementID, loadCtx.recipients)
	result := agreementRecordToMap(loadCtx.agreement, loadCtx.recipients, reminderStates, loadCtx.fields, loadCtx.events, loadCtx.delivery)
	currentUserID := strings.TrimSpace(userIDFromContext(ctx))
	result["current_user_id"] = currentUserID
	result["review_permissions"] = buildAgreementReviewPermissionPayload(ctx, r.authorizer)
	result["field_definitions"] = fieldDefinitionsToMaps(loadCtx.fieldDefinitions, loadCtx.fieldInstances)
	applyAgreementLineagePayload(result, buildAgreementLineageIndex(loadCtx.agreements)[agreementID], true)
	if err := r.attachAgreementLineageDetail(ctx, scope, agreementID, result); err != nil {
		return nil, err
	}
	if reviewSummary, err := r.service.GetReviewSummary(ctx, scope, agreementID); err == nil {
		reviewReminderStates, statesErr := r.service.ReviewReminderStates(ctx, scope, agreementID)
		if statesErr != nil {
			reviewReminderStates = map[string]services.ReviewReminderState{}
		}
		result["review"] = reviewSummaryToMap(reviewSummary, reviewReminderStates)
		result["review_override_active"] = reviewSummary.OverrideActive
		result["timeline_bootstrap"] = r.buildAgreementTimelineBootstrap(ctx, scope, agreementID, currentUserID, loadCtx.events, loadCtx.recipients, loadCtx.fieldDefinitions, loadCtx.fieldInstances, &reviewSummary)
	} else {
		result["timeline_bootstrap"] = r.buildAgreementTimelineBootstrap(ctx, scope, agreementID, currentUserID, loadCtx.events, loadCtx.recipients, loadCtx.fieldDefinitions, loadCtx.fieldInstances, nil)
	}
	if documentTitle := r.maybeLoadAgreementDocumentTitle(ctx, scope, loadCtx.agreement.DocumentID); documentTitle != "" {
		result["document_title"] = documentTitle
	}
	success = true
	return result, nil
}

func buildAgreementReviewPermissionPayload(ctx context.Context, authorizer coreadmin.Authorizer) map[string]any {
	return map[string]any{
		"can_admin_review":    agreementReviewPermissionAllowed(ctx, authorizer, permissions.AdminESignEdit, permissions.AdminESignSend),
		"can_manage_comments": agreementReviewPermissionAllowed(ctx, authorizer, permissions.AdminESignEdit, permissions.AdminESignView),
	}
}

func agreementReviewPermissionAllowed(ctx context.Context, authorizer coreadmin.Authorizer, required ...string) bool {
	if authorizer == nil {
		return true
	}
	return coreadmin.CanAll(authorizer, ctx, eSignAuthorizerResource, required...)
}

func (r *agreementPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	requestIP := services.ResolveAuditIPAddress(coreadmin.RequestIPFromContext(ctx))
	created, err := r.service.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      strings.TrimSpace(toString(record["document_id"])),
		Title:           strings.TrimSpace(toString(record["title"])),
		Message:         strings.TrimSpace(toString(record["message"])),
		CreatedByUserID: strings.TrimSpace(primitives.FirstNonEmpty(strings.TrimSpace(toString(record["created_by_user_id"])), userIDFromContext(ctx))),
		IPAddress:       requestIP,
	})
	if err != nil {
		return nil, err
	}
	recipients, fields, err := r.syncDraftFormPayload(ctx, scope, created.ID, record)
	if err != nil {
		return nil, err
	}
	if shouldSendForSignature(record) {
		sent, err := r.service.Send(ctx, scope, created.ID, services.SendInput{
			IdempotencyKey: resolveSendIdempotencyKey(record, created.ID),
			IPAddress:      requestIP,
		})
		if err != nil {
			return nil, err
		}
		recipients, err = r.agreements.ListRecipients(ctx, scope, sent.ID)
		if err != nil {
			return nil, err
		}
		fields, err = r.agreements.ListFields(ctx, scope, sent.ID)
		if err != nil {
			return nil, err
		}
		reminderStates := r.reminderStateMap(ctx, scope, sent.ID, recipients)
		return agreementRecordToMap(sent, recipients, reminderStates, fields, nil, services.AgreementDeliveryDetail{}), nil
	}
	reminderStates := r.reminderStateMap(ctx, scope, created.ID, recipients)
	return agreementRecordToMap(created, recipients, reminderStates, fields, nil, services.AgreementDeliveryDetail{}), nil
}

func (r *agreementPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	scope, err := resolveScopeFromContext(ctx, r.defaultScope)
	if err != nil {
		return nil, err
	}
	requestIP := services.ResolveAuditIPAddress(coreadmin.RequestIPFromContext(ctx))
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
	if shouldSendForSignature(record) {
		sent, err := r.service.Send(ctx, scope, updated.ID, services.SendInput{
			IdempotencyKey: resolveSendIdempotencyKey(record, updated.ID),
			IPAddress:      requestIP,
		})
		if err != nil {
			return nil, err
		}
		recipients, err = r.agreements.ListRecipients(ctx, scope, sent.ID)
		if err != nil {
			return nil, err
		}
		fields, err = r.agreements.ListFields(ctx, scope, sent.ID)
		if err != nil {
			return nil, err
		}
		reminderStates := r.reminderStateMap(ctx, scope, sent.ID, recipients)
		return agreementRecordToMap(sent, recipients, reminderStates, fields, nil, services.AgreementDeliveryDetail{}), nil
	}
	reminderStates := r.reminderStateMap(ctx, scope, updated.ID, recipients)
	return agreementRecordToMap(updated, recipients, reminderStates, fields, nil, services.AgreementDeliveryDetail{}), nil
}

func (r *agreementPanelRepository) Delete(context.Context, string) error {
	return coreadmin.NewDomainError(
		coreadmin.TextCodePreconditionFailed,
		"Agreements cannot be deleted. Use Void to cancel an active agreement.",
		map[string]any{
			"entity":             "agreements",
			"action":             "delete",
			"recommended_action": "void",
		},
	)
}

func (r *agreementPanelRepository) ServePanelSubresource(ctx coreadmin.AdminContext, c router.Context, agreementID, subresource, value string) error {
	if strings.TrimSpace(subresource) != "artifact" {
		return coreadmin.ErrNotFound
	}
	assetType := normalizeAgreementArtifactType(value)
	if assetType == "" {
		return coreadmin.ErrNotFound
	}
	scope, err := resolveScopeFromContext(ctx.Context, r.defaultScope)
	if err != nil {
		return err
	}
	detail, err := r.artifacts.AgreementDeliveryDetail(ctx.Context, scope, strings.TrimSpace(agreementID))
	if err != nil {
		return err
	}
	objectKey := agreementArtifactObjectKey(detail, assetType)
	if strings.TrimSpace(objectKey) == "" {
		return coreadmin.ErrNotFound
	}
	if r.objectStore == nil {
		return coreadmin.ErrNotFound
	}
	disposition := "inline"
	if strings.EqualFold(strings.TrimSpace(c.Query("disposition")), "attachment") {
		disposition = "attachment"
	}
	if audits, ok := r.agreements.(stores.AuditEventStore); ok && audits != nil {
		actorID := strings.TrimSpace(ctx.UserID)
		if actorID == "" {
			actorID = strings.TrimSpace(userIDFromContext(ctx.Context))
		}
		metadataJSON := "{}"
		if encoded, err := json.Marshal(map[string]any{
			"asset":       assetType,
			"disposition": disposition,
			"user_id":     actorID,
		}); err == nil {
			metadataJSON = string(encoded)
		}
		_, _ = audits.Append(ctx.Context, scope, stores.AuditEventRecord{
			AgreementID:  strings.TrimSpace(agreementID),
			EventType:    "admin.agreement.artifact_downloaded",
			ActorType:    "admin",
			ActorID:      actorID,
			IPAddress:    services.ResolveAuditIPAddress(quickstart.ResolveRequestIP(c, quickstart.RequestIPOptions{})),
			UserAgent:    strings.TrimSpace(c.Header("User-Agent")),
			MetadataJSON: metadataJSON,
			CreatedAt:    time.Now().UTC(),
		})
	}
	if err := quickstart.ServeBinaryObject(c, quickstart.BinaryObjectResponseConfig{
		Store:       r.objectStore,
		ObjectKey:   objectKey,
		ContentType: "application/pdf",
		Filename:    agreementArtifactFilename(strings.TrimSpace(agreementID), assetType),
		Disposition: disposition,
	}); err != nil {
		if errors.Is(err, quickstart.ErrBinaryObjectUnavailable) {
			return coreadmin.ErrNotFound
		}
		return err
	}
	return nil
}

func normalizeAgreementArtifactType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "executed":
		return "executed"
	case "certificate":
		return "certificate"
	default:
		return ""
	}
}

func agreementArtifactObjectKey(detail services.AgreementDeliveryDetail, assetType string) string {
	switch normalizeAgreementArtifactType(assetType) {
	case "executed":
		return strings.TrimSpace(detail.ExecutedObjectKey)
	case "certificate":
		return strings.TrimSpace(detail.CertificateObjectKey)
	default:
		return ""
	}
}

func agreementArtifactFilename(agreementID, assetType string) string {
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		agreementID = "agreement"
	}
	switch normalizeAgreementArtifactType(assetType) {
	case "executed":
		return agreementID + "-executed.pdf"
	case "certificate":
		return agreementID + "-certificate.pdf"
	default:
		return agreementID + ".pdf"
	}
}

func (r *agreementPanelRepository) reminderStateMap(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	recipients []stores.RecipientRecord,
) map[string]stores.AgreementReminderStateRecord {
	out := map[string]stores.AgreementReminderStateRecord{}
	if r == nil || r.reminders == nil {
		return out
	}
	for _, recipient := range recipients {
		if recipient.Role != stores.RecipientRoleSigner {
			continue
		}
		state, err := r.reminders.GetAgreementReminderState(ctx, scope, agreementID, recipient.ID)
		if err != nil {
			if isNotFoundDomainError(err) {
				continue
			}
			continue
		}
		out[strings.TrimSpace(recipient.ID)] = state
	}
	return out
}

func isNotFoundDomainError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return false
	}
	return coded.Category == goerrors.CategoryNotFound
}

type reminderSummary struct {
	Status        string     `json:"status"`
	NextDueAt     *time.Time `json:"next_due_at"`
	LastSentAt    *time.Time `json:"last_sent_at"`
	SentCount     int        `json:"sent_count"`
	LastErrorCode string     `json:"last_error_code"`
	Paused        bool       `json:"paused"`
}

func reminderErrorForClient(state stores.AgreementReminderStateRecord) string {
	if strings.TrimSpace(state.LastErrorCode) == "" {
		return ""
	}
	reason := strings.TrimSpace(strings.ToLower(state.LastErrorCode))
	if reason == "" {
		return "failed"
	}
	for _, ch := range reason {
		if (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9') && ch != '_' {
			return "failed"
		}
	}
	return reason
}

func summarizeReminderState(recipients []stores.RecipientRecord, states map[string]stores.AgreementReminderStateRecord) reminderSummary {
	summary := reminderSummary{
		Status:        "",
		NextDueAt:     nil,
		LastSentAt:    nil,
		SentCount:     0,
		LastErrorCode: "",
		Paused:        false,
	}
	if len(recipients) == 0 {
		return summary
	}
	signerCount, pausedCount, terminalCount, activeCount := collectReminderSummaryCounts(recipients, states, &summary)
	if signerCount == 0 {
		return summary
	}
	switch {
	case terminalCount == signerCount:
		summary.Status = stores.AgreementReminderStatusTerminal
	case pausedCount == signerCount:
		summary.Status = stores.AgreementReminderStatusPaused
		summary.Paused = true
	case (pausedCount > 0 || terminalCount > 0) && activeCount > 0:
		summary.Status = "mixed"
	default:
		summary.Status = stores.AgreementReminderStatusActive
	}
	return summary
}

func collectReminderSummaryCounts(
	recipients []stores.RecipientRecord,
	states map[string]stores.AgreementReminderStateRecord,
	summary *reminderSummary,
) (int, int, int, int) {
	signerCount := 0
	pausedCount := 0
	terminalCount := 0
	activeCount := 0
	for _, recipient := range recipients {
		if recipient.Role != stores.RecipientRoleSigner {
			continue
		}
		signerCount++
		state, ok := states[strings.TrimSpace(recipient.ID)]
		if !ok {
			activeCount++
			continue
		}
		accumulateReminderSummary(summary, state)
		switch strings.TrimSpace(state.Status) {
		case stores.AgreementReminderStatusPaused:
			pausedCount++
		case stores.AgreementReminderStatusTerminal:
			terminalCount++
		default:
			activeCount++
		}
	}
	return signerCount, pausedCount, terminalCount, activeCount
}

func accumulateReminderSummary(summary *reminderSummary, state stores.AgreementReminderStateRecord) {
	if summary == nil {
		return
	}
	summary.SentCount += state.SentCount
	if state.NextDueAt != nil && (summary.NextDueAt == nil || state.NextDueAt.Before(*summary.NextDueAt)) {
		next := state.NextDueAt.UTC()
		summary.NextDueAt = &next
	}
	if state.LastSentAt != nil && (summary.LastSentAt == nil || state.LastSentAt.After(*summary.LastSentAt)) {
		last := state.LastSentAt.UTC()
		summary.LastSentAt = &last
	}
	if summary.LastErrorCode == "" {
		summary.LastErrorCode = reminderErrorForClient(state)
	}
}

func agreementRecordToMap(
	agreement stores.AgreementRecord,
	recipients []stores.RecipientRecord,
	reminderStates map[string]stores.AgreementReminderStateRecord,
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
		"source_mime_type":           agreement.SourceMimeType,
		"source_ingestion_mode":      agreement.SourceIngestionMode,
		"source_revision_id":         agreement.SourceRevisionID,
		"status":                     agreement.Status,
		"review_status":              agreement.ReviewStatus,
		"review_gate":                agreement.ReviewGate,
		"comments_enabled":           agreement.CommentsEnabled,
		"workflow_kind":              normalizeAgreementWorkflowKind(agreement.WorkflowKind),
		"root_agreement_id":          firstNonEmptyTrimmed(strings.TrimSpace(agreement.RootAgreementID), strings.TrimSpace(agreement.ID)),
		"parent_agreement_id":        strings.TrimSpace(agreement.ParentAgreementID),
		"parent_executed_sha256":     strings.TrimSpace(agreement.ParentExecutedSHA256),
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
	reminderSummary := summarizeReminderState(recipients, reminderStates)
	payload["reminder_status"] = reminderSummary.Status
	payload["next_due_at"] = formatTimePtr(reminderSummary.NextDueAt)
	payload["last_sent_at"] = formatTimePtr(reminderSummary.LastSentAt)
	payload["reminder_count"] = reminderSummary.SentCount
	payload["last_error_code"] = reminderSummary.LastErrorCode
	payload["paused"] = reminderSummary.Paused
	// Add stage information for multi-signer flows (Task 24.FE.2)
	stageCount, activeStage := computeStageMetrics(recipients)
	if stageCount > 0 {
		payload["stage_count"] = stageCount
		payload["active_stage"] = activeStage
	}
	if len(recipients) > 0 {
		participants := recipientsToMaps(agreement, recipients, reminderStates, activeStage)
		payload["recipients"] = participants
		payload["participants"] = participants
	}
	if len(fields) > 0 {
		payload["fields"] = fieldsToMaps(fields)
		payload["field_instances"] = fieldsToMaps(fields)
	}
	if len(events) > 0 {
		payload["timeline"] = eventsToMaps(events)
	}
	if delivery.AgreementID != "" {
		payload["delivery"] = map[string]any{
			"agreement_id":             delivery.AgreementID,
			"executed_status":          delivery.ExecutedStatus,
			"certificate_status":       delivery.CertificateStatus,
			"distribution_status":      delivery.DistributionStatus,
			"executed_applicable":      delivery.ExecutedApplicable,
			"certificate_applicable":   delivery.CertificateApplicable,
			"notification_status":      delivery.NotificationStatus,
			"executed_object_key":      delivery.ExecutedObjectKey,
			"certificate_object_key":   delivery.CertificateObjectKey,
			"last_error":               delivery.LastError,
			"correlation_ids":          append([]string{}, delivery.CorrelationIDs...),
			"notification_recoverable": delivery.NotificationRecoverable,
			"notification_effects":     append([]services.AgreementNotificationEffectDetail{}, delivery.NotificationEffects...),
		}
	}
	return payload
}

type timelineActorRecord struct {
	ActorType   string
	ActorID     string
	DisplayName string
	Email       string
	Role        string
}

func fieldDefinitionsToMaps(definitions []stores.FieldDefinitionRecord, instances []stores.FieldInstanceRecord) []map[string]any {
	out := make([]map[string]any, 0, len(definitions))
	instanceLabels := make(map[string]string, len(instances))
	for _, instance := range instances {
		definitionID := strings.TrimSpace(instance.FieldDefinitionID)
		label := strings.TrimSpace(instance.Label)
		if definitionID == "" || label == "" {
			continue
		}
		if _, ok := instanceLabels[definitionID]; ok {
			continue
		}
		instanceLabels[definitionID] = label
	}
	for _, definition := range definitions {
		out = append(out, map[string]any{
			"id":              strings.TrimSpace(definition.ID),
			"agreement_id":    strings.TrimSpace(definition.AgreementID),
			"participant_id":  strings.TrimSpace(definition.ParticipantID),
			"type":            strings.TrimSpace(definition.Type),
			"required":        definition.Required,
			"validation_json": strings.TrimSpace(definition.ValidationJSON),
			"link_group_id":   strings.TrimSpace(definition.LinkGroupID),
			"label":           resolveFieldDefinitionLabel(definition, instanceLabels),
			"created_at":      formatTimePtr(&definition.CreatedAt),
			"updated_at":      formatTimePtr(&definition.UpdatedAt),
		})
	}
	return out
}

func resolveFieldDefinitionLabel(definition stores.FieldDefinitionRecord, instanceLabels map[string]string) string {
	if label := extractFieldDefinitionLabel(definition.ValidationJSON); label != "" {
		return label
	}
	if label := strings.TrimSpace(instanceLabels[strings.TrimSpace(definition.ID)]); label != "" {
		return label
	}
	return humanizeFieldDefinitionType(definition.Type)
}

func extractFieldDefinitionLabel(validationJSON string) string {
	validationJSON = strings.TrimSpace(validationJSON)
	if validationJSON == "" {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(validationJSON), &payload); err != nil {
		return ""
	}
	if label, ok := payload["label"].(string); ok && strings.TrimSpace(label) != "" {
		return strings.TrimSpace(label)
	}
	if displayName, ok := payload["display_name"].(string); ok && strings.TrimSpace(displayName) != "" {
		return strings.TrimSpace(displayName)
	}
	return ""
}

func humanizeFieldDefinitionType(fieldType string) string {
	switch strings.TrimSpace(fieldType) {
	case stores.FieldTypeSignature:
		return "Signature"
	case stores.FieldTypeInitials:
		return "Initials"
	case stores.FieldTypeName:
		return "Signer Name"
	case stores.FieldTypeDateSigned:
		return "Signature Date"
	case stores.FieldTypeText:
		return "Text"
	case stores.FieldTypeCheckbox:
		return "Checkbox"
	default:
		return snakeToTitle(strings.TrimSpace(fieldType))
	}
}

func (r *agreementPanelRepository) buildAgreementTimelineBootstrap(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	currentUserID string,
	events []stores.AuditEventRecord,
	recipients []stores.RecipientRecord,
	fieldDefinitions []stores.FieldDefinitionRecord,
	fieldInstances []stores.FieldInstanceRecord,
	reviewSummary *services.ReviewSummary,
) map[string]any {
	return map[string]any{
		"agreement_id":    strings.TrimSpace(agreementID),
		"current_user_id": strings.TrimSpace(currentUserID),
		"events":          eventsToMaps(events),
		"actors":          r.buildTimelineActorPayload(ctx, scope, currentUserID, events, recipients, reviewSummary),
		"participants":    recipientsToMaps(stores.AgreementRecord{}, recipients, nil, 0),
		"field_definitions": fieldDefinitionsToMaps(
			fieldDefinitions,
			fieldInstances,
		),
	}
}

func (r *agreementPanelRepository) buildTimelineActorPayload(
	ctx context.Context,
	scope stores.Scope,
	currentUserID string,
	events []stores.AuditEventRecord,
	recipients []stores.RecipientRecord,
	reviewSummary *services.ReviewSummary,
) map[string]any {
	_ = scope
	actors := map[string]timelineActorRecord{}
	for _, recipient := range recipients {
		registerTimelineActor(
			actors,
			[]string{"recipient", "signer"},
			recipient.ID,
			firstNonEmptyReviewActorValue(strings.TrimSpace(recipient.Name), strings.TrimSpace(recipient.Email)),
			recipient.Email,
			recipient.Role,
		)
	}
	if reviewSummary != nil {
		for key, actor := range reviewSummary.ActorMap {
			normalizedKey := strings.TrimSpace(key)
			if normalizedKey == "" {
				continue
			}
			aliases := timelineActorAliases(actor.ActorType)
			if len(aliases) == 0 {
				aliases = []string{actor.ActorType}
			}
			registerTimelineActor(actors, aliases, actor.ActorID, actor.Name, actor.Email, actor.Role)
		}
	}
	userActorIDs := map[string][]string{}
	for _, event := range events {
		actorID := strings.TrimSpace(event.ActorID)
		if actorID == "" {
			continue
		}
		actorType := strings.ToLower(strings.TrimSpace(event.ActorType))
		switch actorType {
		case "admin":
			userActorIDs[actorID] = appendUniqueString(userActorIDs[actorID], "admin")
		case "user", "sender":
			userActorIDs[actorID] = appendUniqueString(userActorIDs[actorID], "user", "sender")
		}
	}
	if strings.TrimSpace(currentUserID) != "" {
		userActorIDs[strings.TrimSpace(currentUserID)] = appendUniqueString(userActorIDs[strings.TrimSpace(currentUserID)], "user")
	}
	for actorID, actorTypes := range userActorIDs {
		displayName, email := r.resolveTimelineUserActor(ctx, actorID)
		registerTimelineActor(actors, actorTypes, actorID, displayName, email, "sender")
	}
	out := make(map[string]any, len(actors))
	for key, actor := range actors {
		out[key] = map[string]any{
			"actor_type":   strings.TrimSpace(actor.ActorType),
			"actor_id":     strings.TrimSpace(actor.ActorID),
			"display_name": strings.TrimSpace(actor.DisplayName),
			"email":        strings.TrimSpace(actor.Email),
			"role":         strings.TrimSpace(actor.Role),
		}
	}
	return out
}

func (r *agreementPanelRepository) resolveTimelineUserActor(ctx context.Context, actorID string) (string, string) {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return "", ""
	}
	name, email := r.resolveTimelineProfileActor(ctx, actorID)
	name, email = r.resolveTimelineAccountActor(ctx, actorID, name, email)
	return name, email
}

func (r *agreementPanelRepository) resolveTimelineProfileActor(ctx context.Context, actorID string) (string, string) {
	if r.profiles == nil {
		return "", ""
	}
	profile, err := r.profiles.Get(ctx, actorID)
	if err != nil {
		return "", ""
	}
	return firstNonEmptyReviewActorValue(profile.DisplayName, profile.Email), strings.TrimSpace(profile.Email)
}

func (r *agreementPanelRepository) resolveTimelineAccountActor(ctx context.Context, actorID, name, email string) (string, string) {
	if r.users == nil {
		return name, email
	}
	user, err := r.users.GetUser(ctx, actorID)
	if err != nil {
		return name, email
	}
	if name == "" {
		name = firstNonEmptyReviewActorValue(reviewActorUserDisplayName(user), user.Email, user.Username)
	}
	if email == "" {
		email = strings.TrimSpace(user.Email)
	}
	return name, email
}

func timelineActorAliases(actorType string) []string {
	switch strings.ToLower(strings.TrimSpace(actorType)) {
	case "recipient", "signer":
		return []string{"recipient", "signer"}
	case "user", "sender":
		return []string{"user", "sender"}
	case "admin":
		return []string{"admin"}
	case "reviewer":
		return []string{"reviewer"}
	default:
		normalized := strings.TrimSpace(actorType)
		if normalized == "" {
			return nil
		}
		return []string{normalized}
	}
}

func registerTimelineActor(actors map[string]timelineActorRecord, actorTypes []string, actorID, displayName, email, role string) {
	normalizedActorID := strings.TrimSpace(actorID)
	if normalizedActorID == "" {
		return
	}
	for _, actorType := range actorTypes {
		normalizedActorType := strings.ToLower(strings.TrimSpace(actorType))
		if normalizedActorType == "" {
			continue
		}
		key := normalizedActorType + ":" + normalizedActorID
		existing := actors[key]
		if existing.ActorType == "" {
			existing.ActorType = normalizedActorType
		}
		if existing.ActorID == "" {
			existing.ActorID = normalizedActorID
		}
		if existing.DisplayName == "" {
			existing.DisplayName = strings.TrimSpace(displayName)
		}
		if existing.Email == "" {
			existing.Email = strings.TrimSpace(email)
		}
		if existing.Role == "" {
			existing.Role = strings.TrimSpace(role)
		}
		if existing.DisplayName == "" {
			existing.DisplayName = firstNonEmptyReviewActorValue(existing.Email, snakeToTitle(existing.Role), snakeToTitle(existing.ActorType))
		}
		actors[key] = existing
	}
}

func appendUniqueString(values []string, additions ...string) []string {
	if len(additions) == 0 {
		return values
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values)+len(additions))
	for _, value := range values {
		normalized := strings.TrimSpace(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	for _, value := range additions {
		normalized := strings.TrimSpace(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	return out
}

func snakeToTitle(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	parts := strings.Fields(strings.ReplaceAll(strings.ReplaceAll(value, "_", " "), ".", " "))
	for index, part := range parts {
		if part == "" {
			continue
		}
		parts[index] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

func reviewSummaryToMap(summary services.ReviewSummary, reminderStates map[string]services.ReviewReminderState) map[string]any {
	payload := map[string]any{
		"agreement_id":             strings.TrimSpace(summary.AgreementID),
		"status":                   strings.TrimSpace(summary.Status),
		"gate":                     strings.TrimSpace(summary.Gate),
		"comments_enabled":         summary.CommentsEnabled,
		"override_active":          summary.OverrideActive,
		"override_reason":          strings.TrimSpace(summary.OverrideReason),
		"override_by_user_id":      strings.TrimSpace(summary.OverrideByUserID),
		"override_by_display_name": strings.TrimSpace(summary.OverrideByDisplayName),
		"override_at":              formatTimePtr(summary.OverrideAt),
		"approved_count":           summary.ApprovedCount,
		"total_approvers":          summary.TotalApprovers,
		"open_thread_count":        summary.OpenThreadCount,
		"resolved_thread_count":    summary.ResolvedThreadCount,
	}
	if summary.Review != nil {
		payload["review_id"] = strings.TrimSpace(summary.Review.ID)
		payload["requested_by_user_id"] = strings.TrimSpace(summary.Review.RequestedByUserID)
		payload["opened_at"] = formatTimePtr(summary.Review.OpenedAt)
		payload["closed_at"] = formatTimePtr(summary.Review.ClosedAt)
		payload["last_activity_at"] = formatTimePtr(summary.Review.LastActivityAt)
	}
	if len(summary.Participants) > 0 {
		participants := make([]map[string]any, 0, len(summary.Participants))
		for _, participant := range summary.Participants {
			reminderState := reminderStates[strings.TrimSpace(participant.ID)]
			participants = append(participants, map[string]any{
				"id":                                 strings.TrimSpace(participant.ID),
				"participant_type":                   strings.TrimSpace(participant.ParticipantType),
				"recipient_id":                       strings.TrimSpace(participant.RecipientID),
				"email":                              strings.TrimSpace(participant.Email),
				"display_name":                       strings.TrimSpace(participant.DisplayName),
				"role":                               strings.TrimSpace(participant.Role),
				"can_comment":                        participant.CanComment,
				"can_approve":                        participant.CanApprove,
				"decision_status":                    strings.TrimSpace(participant.DecisionStatus),
				"effective_decision_status":          reviewParticipantEffectiveDecisionStatusValue(participant),
				"decision_at":                        formatTimePtr(participant.DecisionAt),
				"approved_on_behalf":                 participantApprovedOnBehalf(participant),
				"approved_on_behalf_by_user_id":      strings.TrimSpace(participant.ApprovedOnBehalfByUserID),
				"approved_on_behalf_by_display_name": strings.TrimSpace(participant.ApprovedOnBehalfByDisplayName),
				"approved_on_behalf_reason":          strings.TrimSpace(participant.ApprovedOnBehalfReason),
				"approved_on_behalf_at":              formatTimePtr(participant.ApprovedOnBehalfAt),
				"reminder_status":                    strings.TrimSpace(reminderState.Status),
				"next_due_at":                        formatTimePtr(reminderState.NextDueAt),
				"last_sent_at":                       formatTimePtr(reminderState.LastSentAt),
				"reminder_count":                     reminderState.SentCount,
				"last_error_code":                    strings.TrimSpace(reminderState.LastErrorCode),
				"paused":                             reminderState.Paused,
			})
		}
		payload["participants"] = participants
	}
	if len(summary.ActorMap) > 0 {
		payload["actor_map"] = reviewActorMapToPayload(summary.ActorMap)
	}
	if len(summary.Threads) > 0 {
		threads := make([]map[string]any, 0, len(summary.Threads))
		for _, thread := range summary.Threads {
			threads = append(threads, map[string]any{
				"thread": map[string]any{
					"id":               strings.TrimSpace(thread.Thread.ID),
					"review_id":        strings.TrimSpace(thread.Thread.ReviewID),
					"agreement_id":     strings.TrimSpace(thread.Thread.AgreementID),
					"visibility":       strings.TrimSpace(thread.Thread.Visibility),
					"anchor_type":      strings.TrimSpace(thread.Thread.AnchorType),
					"page_number":      thread.Thread.PageNumber,
					"field_id":         strings.TrimSpace(thread.Thread.FieldID),
					"anchor_x":         thread.Thread.AnchorX,
					"anchor_y":         thread.Thread.AnchorY,
					"status":           strings.TrimSpace(thread.Thread.Status),
					"created_by_type":  strings.TrimSpace(thread.Thread.CreatedByType),
					"created_by_id":    strings.TrimSpace(thread.Thread.CreatedByID),
					"resolved_by_type": strings.TrimSpace(thread.Thread.ResolvedByType),
					"resolved_by_id":   strings.TrimSpace(thread.Thread.ResolvedByID),
					"resolved_at":      formatTimePtr(thread.Thread.ResolvedAt),
					"last_activity_at": formatTimePtr(thread.Thread.LastActivityAt),
				},
				"messages": commentMessagesToMaps(thread.Messages),
			})
		}
		payload["threads"] = threads
	}
	return payload
}

func participantApprovedOnBehalf(participant stores.AgreementReviewParticipantRecord) bool {
	return participant.ApprovedOnBehalfAt != nil
}

func reviewParticipantEffectiveDecisionStatusValue(participant stores.AgreementReviewParticipantRecord) string {
	if participantApprovedOnBehalf(participant) {
		return stores.AgreementReviewDecisionApproved
	}
	normalized := strings.TrimSpace(participant.DecisionStatus)
	if normalized == "" {
		return stores.AgreementReviewDecisionPending
	}
	return normalized
}

func reviewActorMapToPayload(actorMap map[string]services.ReviewActorInfo) map[string]any {
	if len(actorMap) == 0 {
		return nil
	}
	payload := make(map[string]any, len(actorMap))
	for key, actor := range actorMap {
		normalizedKey := strings.TrimSpace(key)
		if normalizedKey == "" {
			continue
		}
		payload[normalizedKey] = map[string]any{
			"name":       strings.TrimSpace(actor.Name),
			"email":      strings.TrimSpace(actor.Email),
			"role":       strings.TrimSpace(actor.Role),
			"actor_type": strings.TrimSpace(actor.ActorType),
			"actor_id":   strings.TrimSpace(actor.ActorID),
		}
	}
	if len(payload) == 0 {
		return nil
	}
	return payload
}

func commentMessagesToMaps(messages []stores.AgreementCommentMessageRecord) []map[string]any {
	out := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		out = append(out, map[string]any{
			"id":              strings.TrimSpace(message.ID),
			"thread_id":       strings.TrimSpace(message.ThreadID),
			"body":            strings.TrimSpace(message.Body),
			"message_kind":    strings.TrimSpace(message.MessageKind),
			"created_by_type": strings.TrimSpace(message.CreatedByType),
			"created_by_id":   strings.TrimSpace(message.CreatedByID),
			"created_at":      formatTimeValue(message.CreatedAt),
		})
	}
	return out
}

func formatTimeValue(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

type agreementLineagePayload struct {
	SupersededByAgreementID string           `json:"superseded_by_agreement_id"`
	RelatedAgreements       []map[string]any `json:"related_agreements"`
}

func applyAgreementLineagePayload(payload map[string]any, lineage agreementLineagePayload, includeRelated bool) {
	if len(payload) == 0 {
		return
	}
	if strings.TrimSpace(lineage.SupersededByAgreementID) != "" {
		payload["superseded_by_agreement_id"] = strings.TrimSpace(lineage.SupersededByAgreementID)
	}
	if includeRelated && len(lineage.RelatedAgreements) > 0 {
		payload["related_agreements"] = lineage.RelatedAgreements
	}
}

func buildAgreementLineageIndex(agreements []stores.AgreementRecord) map[string]agreementLineagePayload {
	if len(agreements) == 0 {
		return nil
	}
	index := map[string]agreementLineagePayload{}
	groups := map[string][]stores.AgreementRecord{}
	for _, agreement := range agreements {
		agreementID := strings.TrimSpace(agreement.ID)
		if agreementID == "" {
			continue
		}
		rootID := firstNonEmptyTrimmed(strings.TrimSpace(agreement.RootAgreementID), agreementID)
		groups[rootID] = append(groups[rootID], agreement)
		if strings.TrimSpace(agreement.ParentAgreementID) == "" {
			continue
		}
		if normalizeAgreementWorkflowKind(agreement.WorkflowKind) != stores.AgreementWorkflowKindCorrection {
			continue
		}
		parentID := strings.TrimSpace(agreement.ParentAgreementID)
		lineage := index[parentID]
		lineage.SupersededByAgreementID = agreementID
		index[parentID] = lineage
	}
	for _, records := range groups {
		sort.SliceStable(records, func(i, j int) bool {
			if records[i].UpdatedAt.Equal(records[j].UpdatedAt) {
				return strings.TrimSpace(records[i].ID) < strings.TrimSpace(records[j].ID)
			}
			return records[i].UpdatedAt.After(records[j].UpdatedAt)
		})
		for _, agreement := range records {
			agreementID := strings.TrimSpace(agreement.ID)
			lineage := index[agreementID]
			for _, related := range records {
				relatedID := strings.TrimSpace(related.ID)
				if relatedID == "" || relatedID == agreementID {
					continue
				}
				lineage.RelatedAgreements = append(lineage.RelatedAgreements, agreementLineageSummaryMap(related))
			}
			index[agreementID] = lineage
		}
	}
	return index
}

func buildCurrentAgreementVersionIDSet(agreements []stores.AgreementRecord) map[string]struct{} {
	if len(agreements) == 0 {
		return nil
	}
	agreementIDs := make(map[string]struct{}, len(agreements))
	for _, agreement := range agreements {
		agreementID := strings.TrimSpace(agreement.ID)
		if agreementID == "" {
			continue
		}
		agreementIDs[agreementID] = struct{}{}
	}
	if len(agreementIDs) == 0 {
		return nil
	}
	hasChild := make(map[string]struct{}, len(agreements))
	for _, agreement := range agreements {
		parentID := strings.TrimSpace(agreement.ParentAgreementID)
		if parentID == "" {
			continue
		}
		if _, ok := agreementIDs[parentID]; ok {
			hasChild[parentID] = struct{}{}
		}
	}
	current := make(map[string]struct{}, len(agreementIDs))
	for agreementID := range agreementIDs {
		if _, ok := hasChild[agreementID]; ok {
			continue
		}
		current[agreementID] = struct{}{}
	}
	return current
}

func normalizeAgreementVersionVisibility(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case agreementVersionsAll:
		return agreementVersionsAll
	case agreementVersionsPrevious:
		return agreementVersionsPrevious
	default:
		return agreementVersionsCurrent
	}
}

func includeAgreementForVersionVisibility(agreementID string, currentVersionIDs map[string]struct{}, visibility string) bool {
	_, isCurrent := currentVersionIDs[strings.TrimSpace(agreementID)]
	switch normalizeAgreementVersionVisibility(visibility) {
	case agreementVersionsAll:
		return true
	case agreementVersionsPrevious:
		return !isCurrent
	default:
		return isCurrent
	}
}

func agreementLineageSummaryMap(agreement stores.AgreementRecord) map[string]any {
	return map[string]any{
		"id":                     strings.TrimSpace(agreement.ID),
		"title":                  strings.TrimSpace(agreement.Title),
		"status":                 strings.TrimSpace(agreement.Status),
		"workflow_kind":          normalizeAgreementWorkflowKind(agreement.WorkflowKind),
		"root_agreement_id":      firstNonEmptyTrimmed(strings.TrimSpace(agreement.RootAgreementID), strings.TrimSpace(agreement.ID)),
		"parent_agreement_id":    strings.TrimSpace(agreement.ParentAgreementID),
		"completed_at":           formatTimePtr(agreement.CompletedAt),
		"sent_at":                formatTimePtr(agreement.SentAt),
		"voided_at":              formatTimePtr(agreement.VoidedAt),
		"parent_executed_sha256": strings.TrimSpace(agreement.ParentExecutedSHA256),
	}
}

func normalizeAgreementWorkflowKind(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case stores.AgreementWorkflowKindCorrection:
		return stores.AgreementWorkflowKindCorrection
	case stores.AgreementWorkflowKindAmendment:
		return stores.AgreementWorkflowKindAmendment
	default:
		return stores.AgreementWorkflowKindStandard
	}
}

func firstNonEmptyTrimmed(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

// computeStageMetrics calculates stage count and active stage from recipients (Task 24.FE.2).
// Returns (stageCount, activeStage) where activeStage is the lowest incomplete signing stage.
func computeStageMetrics(recipients []stores.RecipientRecord) (stageCount int, activeStage int) {
	if len(recipients) == 0 {
		return 0, 0
	}

	maxStage := 0
	stageCompletion := make(map[int]bool) // stage -> all signers complete

	for _, r := range recipients {
		// Only consider signers for stage computation
		if strings.EqualFold(strings.TrimSpace(r.Role), stores.RecipientRoleCC) {
			continue
		}

		stage := r.SigningOrder
		if stage <= 0 {
			stage = 1
		}
		if stage > maxStage {
			maxStage = stage
		}

		// Initialize stage as complete, set to false if any signer is incomplete
		if _, exists := stageCompletion[stage]; !exists {
			stageCompletion[stage] = true
		}

		// Check if signer is complete (has completed_at or was declined)
		isComplete := r.CompletedAt != nil || r.DeclinedAt != nil
		if !isComplete {
			stageCompletion[stage] = false
		}
	}

	if maxStage == 0 {
		return 0, 0
	}

	// Find lowest incomplete stage
	activeStage = maxStage + 1 // default to "all complete" sentinel
	for stage := 1; stage <= maxStage; stage++ {
		if complete, exists := stageCompletion[stage]; exists && !complete {
			activeStage = stage
			break
		}
	}

	// If all stages are complete, set active to the max stage
	if activeStage > maxStage {
		activeStage = maxStage
	}

	return maxStage, activeStage
}

func recipientsToMaps(agreement stores.AgreementRecord, records []stores.RecipientRecord, reminderStates map[string]stores.AgreementReminderStateRecord, activeStage int) []map[string]any {
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		status, signedAt, deliveredAt := recipientPresentationStatus(agreement, record, activeStage)
		recipientSentAt := ""
		if recipientShouldShowSent(agreement, record, activeStage) {
			recipientSentAt = formatTimePtr(agreement.SentAt)
		}
		reminderState, hasReminder := reminderStates[strings.TrimSpace(record.ID)]
		reminderStatus := ""
		nextDueAt := ""
		lastSentAt := ""
		reminderCount := 0
		lastErrorCode := ""
		paused := false
		if hasReminder {
			reminderStatus = strings.TrimSpace(reminderState.Status)
			nextDueAt = formatTimePtr(reminderState.NextDueAt)
			lastSentAt = formatTimePtr(reminderState.LastSentAt)
			reminderCount = reminderState.SentCount
			lastErrorCode = reminderErrorForClient(reminderState)
			paused = strings.EqualFold(strings.TrimSpace(reminderState.Status), stores.AgreementReminderStatusPaused)
		}
		out = append(out, map[string]any{
			"id":              record.ID,
			"participant_id":  record.ID,
			"agreement_id":    record.AgreementID,
			"email":           record.Email,
			"name":            record.Name,
			"role":            record.Role,
			"notify":          record.Notify,
			"status":          status,
			"signing_order":   record.SigningOrder,
			"signing_stage":   record.SigningOrder,
			"sent_at":         recipientSentAt,
			"first_view_at":   formatTimePtr(record.FirstViewAt),
			"last_view_at":    formatTimePtr(record.LastViewAt),
			"declined_at":     formatTimePtr(record.DeclinedAt),
			"decline_reason":  record.DeclineReason,
			"completed_at":    formatTimePtr(record.CompletedAt),
			"signed_at":       signedAt,
			"delivered_at":    deliveredAt,
			"reminder_status": reminderStatus,
			"next_due_at":     nextDueAt,
			"last_sent_at":    lastSentAt,
			"reminder_count":  reminderCount,
			"last_error_code": lastErrorCode,
			"paused":          paused,
			"version":         record.Version,
		})
	}
	return out
}

func recipientPresentationStatus(agreement stores.AgreementRecord, record stores.RecipientRecord, activeStage int) (status string, signedAt string, deliveredAt string) {
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
		if recipientShouldShowSent(agreement, record, activeStage) {
			return "sent", "", ""
		}
		return "pending", "", ""
	}
}

func recipientShouldShowSent(agreement stores.AgreementRecord, record stores.RecipientRecord, activeStage int) bool {
	if agreement.SentAt == nil || agreement.SentAt.IsZero() {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(record.Role), stores.RecipientRoleCC) {
		return true
	}
	if activeStage <= 0 {
		return false
	}
	stage := record.SigningOrder
	if stage <= 0 {
		stage = 1
	}
	return stage <= activeStage
}

func fieldsToMaps(records []stores.FieldRecord) []map[string]any {
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		entry := map[string]any{
			"id":                   record.ID,
			"field_id":             record.ID,
			"agreement_id":         record.AgreementID,
			"recipient_id":         record.RecipientID,
			"participant_id":       record.RecipientID,
			"type":                 record.Type,
			"page":                 record.PageNumber,
			"page_number":          record.PageNumber,
			"pos_x":                record.PosX,
			"pos_y":                record.PosY,
			"x":                    record.PosX,
			"y":                    record.PosY,
			"width":                record.Width,
			"height":               record.Height,
			"placement_source":     strings.TrimSpace(record.PlacementSource),
			"link_group_id":        strings.TrimSpace(record.LinkGroupID),
			"linked_from_field_id": strings.TrimSpace(record.LinkedFromFieldID),
			"is_unlinked":          record.IsUnlinked,
			"required":             record.Required,
		}
		out = append(out, entry)
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
	ID           string `json:"id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Notify       bool   `json:"notify"`
	SigningStage int    `json:"signing_stage"`
}

type agreementFieldFormInput struct {
	ID                string  `json:"id"`
	Type              string  `json:"type"`
	ParticipantID     string  `json:"participant_id"`
	RecipientIndex    int     `json:"recipient_index"`
	PageNumber        int     `json:"page_number"`
	PosX              float64 `json:"pos_x"`
	PosY              float64 `json:"pos_y"`
	Width             float64 `json:"width"`
	Height            float64 `json:"height"`
	PlacementSource   string  `json:"placement_source"`
	LinkGroupID       string  `json:"link_group_id"`
	LinkedFromFieldID string  `json:"linked_from_field_id"`
	IsUnlinked        *bool   `json:"is_unlinked"`
	Required          bool    `json:"required"`
}

type agreementFieldPlacementFormInput struct {
	ID                string  `json:"id"`
	DefinitionID      string  `json:"definition_id"`
	PageNumber        int     `json:"page_number"`
	PosX              float64 `json:"pos_x"`
	PosY              float64 `json:"pos_y"`
	Width             float64 `json:"width"`
	Height            float64 `json:"height"`
	PlacementSource   string  `json:"placement_source"`
	LinkGroupID       string  `json:"link_group_id"`
	LinkedFromFieldID string  `json:"linked_from_field_id"`
	IsUnlinked        *bool   `json:"is_unlinked"`
}

type agreementFieldRuleFormInput struct {
	ID               string `json:"id"`
	Type             string `json:"type"`
	ParticipantID    string `json:"participant_id"`
	ParticipantIndex int    `json:"participant_index"`
	Page             int    `json:"page"`
	FromPage         int    `json:"from_page"`
	ToPage           int    `json:"to_page"`
	ExcludeLastPage  bool   `json:"exclude_last_page"`
	ExcludePages     []int  `json:"exclude_pages"`
	Label            string `json:"label"`
	Required         bool   `json:"required"`
}

func syncAgreementFieldRuleInputs(
	record map[string]any,
	recipients []stores.RecipientRecord,
	fieldInputs []agreementFieldFormInput,
) ([]agreementFieldFormInput, bool, error) {
	ruleInputs, hasRulePayload, err := parseAgreementFieldRuleFormInputs(record)
	if err != nil {
		return nil, false, err
	}
	if !hasRulePayload {
		return fieldInputs, false, nil
	}
	documentPageCount, err := coerceFormInt(record["document_page_count"], "document_page_count")
	if err != nil {
		return nil, false, err
	}
	expanded, err := expandAgreementFieldRules(ruleInputs, recipients, fieldInputs, documentPageCount)
	if err != nil {
		return nil, false, err
	}
	return append(fieldInputs, expanded...), true, nil
}

func mergeAgreementFieldPlacementPayload(
	record map[string]any,
	fieldInputs []agreementFieldFormInput,
) ([]agreementFieldFormInput, bool, error) {
	placementInputs, hasPlacementPayload, err := parseAgreementFieldPlacementInputs(record)
	if err != nil {
		return nil, false, err
	}
	if !hasPlacementPayload || len(fieldInputs) == 0 {
		return fieldInputs, hasPlacementPayload, nil
	}
	return mergeFieldPlacementInputs(fieldInputs, placementInputs), true, nil
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

	fieldInputs, hasFieldPayload, err := parseAgreementFieldFormInputs(record)
	if err != nil {
		return nil, nil, err
	}
	fieldInputs, hasRulePayload, err := syncAgreementFieldRuleInputs(record, recipients, fieldInputs)
	if err != nil {
		return nil, nil, err
	}
	if hasRulePayload {
		hasFieldPayload = true
	}
	fieldInputs, _, err = mergeAgreementFieldPlacementPayload(record, fieldInputs)
	if err != nil {
		return nil, nil, err
	}
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
	existingByID := make(map[string]stores.RecipientRecord, len(existing))
	for _, record := range existing {
		id := strings.TrimSpace(record.ID)
		if id == "" {
			continue
		}
		existingByID[id] = record
	}
	seen := map[string]bool{}
	nextDefaultStage := 1
	for _, input := range inputs {
		email := strings.TrimSpace(input.Email)
		name := strings.TrimSpace(input.Name)
		role := strings.ToLower(strings.TrimSpace(input.Role))
		if role == "" {
			role = stores.RecipientRoleSigner
		}
		signingStage := input.SigningStage
		if signingStage <= 0 {
			signingStage = nextDefaultStage
		}
		if role == stores.RecipientRoleSigner && signingStage >= nextDefaultStage {
			nextDefaultStage = signingStage + 1
		}
		patch := stores.RecipientDraftPatch{
			ID:           strings.TrimSpace(input.ID),
			Email:        &email,
			Name:         &name,
			Role:         &role,
			Notify:       new(input.Notify),
			SigningOrder: &signingStage,
		}
		expectedVersion := int64(0)
		if rec, ok := existingByID[patch.ID]; ok {
			expectedVersion = rec.Version
			seen[patch.ID] = true
		}
		if _, err := r.service.UpsertRecipientDraft(ctx, scope, agreementID, patch, expectedVersion); err != nil {
			return nil, err
		}
	}
	for _, rec := range existing {
		id := strings.TrimSpace(rec.ID)
		if id == "" || seen[id] {
			continue
		}
		if err := r.service.RemoveRecipientDraft(ctx, scope, agreementID, id); err != nil {
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
	recipientIDsByIndex, recipientIDs := agreementFieldRecipientIndexes(recipients)
	existingByID := agreementFieldsByID(existingFields)
	seen := map[string]bool{}
	for _, input := range inputs {
		patch, err := buildAgreementFieldDraftPatch(input, recipientIDsByIndex, recipientIDs)
		if err != nil {
			return nil, err
		}
		markSeenExistingFieldPatch(seen, existingByID, patch.ID)
		if _, err := r.service.UpsertFieldDraft(ctx, scope, agreementID, patch); err != nil {
			return nil, err
		}
	}
	for _, fieldID := range agreementFieldDeleteIDs(existingFields, seen) {
		if err := r.service.DeleteFieldDraft(ctx, scope, agreementID, fieldID); err != nil {
			return nil, err
		}
	}
	return r.agreements.ListFields(ctx, scope, agreementID)
}

func agreementFieldRecipientIndexes(recipients []stores.RecipientRecord) ([]string, map[string]struct{}) {
	recipientIDsByIndex := make([]string, 0, len(recipients))
	recipientIDs := map[string]struct{}{}
	for _, recipient := range recipients {
		id := strings.TrimSpace(recipient.ID)
		if id == "" {
			continue
		}
		recipientIDsByIndex = append(recipientIDsByIndex, id)
		recipientIDs[id] = struct{}{}
	}
	return recipientIDsByIndex, recipientIDs
}

func agreementFieldsByID(fields []stores.FieldRecord) map[string]stores.FieldRecord {
	existingByID := make(map[string]stores.FieldRecord, len(fields))
	for _, field := range fields {
		id := strings.TrimSpace(field.ID)
		if id == "" {
			continue
		}
		existingByID[id] = field
	}
	return existingByID
}

func resolveAgreementFieldParticipantID(
	input agreementFieldFormInput,
	recipientIDsByIndex []string,
	recipientIDs map[string]struct{},
) (string, error) {
	participantID := strings.TrimSpace(input.ParticipantID)
	if participantID == "" && input.RecipientIndex >= 0 && input.RecipientIndex < len(recipientIDsByIndex) {
		participantID = recipientIDsByIndex[input.RecipientIndex]
	}
	if participantID == "" {
		return "", fmt.Errorf("field participant_id is required")
	}
	if _, ok := recipientIDs[participantID]; !ok {
		return "", fmt.Errorf("field participant_id %q is invalid", participantID)
	}
	return participantID, nil
}

func buildAgreementFieldDraftPatch(
	input agreementFieldFormInput,
	recipientIDsByIndex []string,
	recipientIDs map[string]struct{},
) (stores.FieldDraftPatch, error) {
	fieldType := strings.TrimSpace(input.Type)
	if fieldType == "" {
		fieldType = stores.FieldTypeSignature
	}
	participantID, err := resolveAgreementFieldParticipantID(input, recipientIDsByIndex, recipientIDs)
	if err != nil {
		return stores.FieldDraftPatch{}, err
	}
	pageNumber := input.PageNumber
	if pageNumber <= 0 {
		pageNumber = 1
	}
	width := input.Width
	if width <= 0 {
		width = 150
	}
	height := input.Height
	if height <= 0 {
		height = 32
	}
	required := input.Required
	return stores.FieldDraftPatch{
		ID:                strings.TrimSpace(input.ID),
		RecipientID:       &participantID,
		Type:              &fieldType,
		PageNumber:        &pageNumber,
		PosX:              &input.PosX,
		PosY:              &input.PosY,
		Width:             &width,
		Height:            &height,
		PlacementSource:   stringPtr(strings.TrimSpace(strings.ToLower(input.PlacementSource))),
		LinkGroupID:       stringPtr(strings.TrimSpace(input.LinkGroupID)),
		LinkedFromFieldID: stringPtr(strings.TrimSpace(input.LinkedFromFieldID)),
		IsUnlinked:        input.IsUnlinked,
		Required:          &required,
	}, nil
}

func markSeenExistingFieldPatch(seen map[string]bool, existingByID map[string]stores.FieldRecord, fieldID string) {
	fieldID = strings.TrimSpace(fieldID)
	if fieldID == "" {
		return
	}
	if _, ok := existingByID[fieldID]; ok {
		seen[fieldID] = true
	}
}

func agreementFieldDeleteIDs(existingFields []stores.FieldRecord, seen map[string]bool) []string {
	deleteIDs := make([]string, 0, len(existingFields))
	for _, field := range existingFields {
		id := strings.TrimSpace(field.ID)
		if id == "" || seen[id] {
			continue
		}
		deleteIDs = append(deleteIDs, id)
	}
	return deleteIDs
}

func parseAgreementRecipientFormInputs(record map[string]any) ([]agreementRecipientFormInput, bool) {
	entries := map[int]map[string]any{}
	hasPayload := false
	if record == nil {
		return nil, false
	}

	if raw, ok := record["participants"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	if raw, ok := record["recipients"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	for key, value := range record {
		matches := participantBracketKeyPattern.FindStringSubmatch(strings.TrimSpace(key))
		if len(matches) != 3 {
			continue
		}
		hasPayload = true
		index := int(toInt64(matches[2]))
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
		id := strings.TrimSpace(toString(entry["id"]))
		name := strings.TrimSpace(toString(entry["name"]))
		email := strings.TrimSpace(toString(entry["email"]))
		role := strings.ToLower(strings.TrimSpace(toString(entry["role"])))
		stageRaw := strings.TrimSpace(toString(entry["signing_stage"]))
		if stageRaw == "" {
			stageRaw = strings.TrimSpace(toString(entry["signing_order"]))
		}
		notify := true
		if rawNotify, ok := entry["notify"]; ok {
			notify = toBool(rawNotify)
		}
		signingStage := int(toInt64(stageRaw))
		if id == "" && name == "" && email == "" && role == "" && signingStage <= 0 {
			continue
		}
		out = append(out, agreementRecipientFormInput{
			ID:           id,
			Name:         name,
			Email:        email,
			Role:         role,
			Notify:       notify,
			SigningStage: signingStage,
		})
	}
	return out, hasPayload
}

func parseAgreementFieldFormInputs(record map[string]any) ([]agreementFieldFormInput, bool, error) {
	entries := map[int]map[string]any{}
	hasPayload := false
	if record == nil {
		return nil, false, nil
	}

	if raw, ok := record["field_instances"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	if raw, ok := record["fields"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	for key, value := range record {
		matches := fieldBracketKeyPattern.FindStringSubmatch(strings.TrimSpace(key))
		if len(matches) != 3 {
			continue
		}
		hasPayload = true
		index := int(toInt64(matches[2]))
		entry, ok := value.(map[string]any)
		if !ok {
			entry = map[string]any{}
		}
		entries[index] = entry
	}

	indexes := sortedEntryIndexes(entries)
	out := make([]agreementFieldFormInput, 0, len(indexes))
	for _, index := range indexes {
		parsed, skip, err := parseAgreementFieldFormEntry(entries[index], index)
		if err != nil {
			return nil, hasPayload, err
		}
		if skip {
			continue
		}
		out = append(out, parsed)
	}

	return out, hasPayload, nil
}

func parseAgreementFieldFormEntry(entry map[string]any, index int) (agreementFieldFormInput, bool, error) {
	identity, err := parseAgreementFieldFormIdentity(entry, index)
	if err != nil {
		return agreementFieldFormInput{}, false, err
	}
	geometry, err := parseAgreementFieldFormGeometry(entry, index)
	if err != nil {
		return agreementFieldFormInput{}, false, err
	}
	metadata, err := parseAgreementFieldFormMetadata(entry, index)
	if err != nil {
		return agreementFieldFormInput{}, false, err
	}
	if identity.ID == "" && identity.Type == "" && identity.ParticipantID == "" {
		return agreementFieldFormInput{}, true, nil
	}
	identity.PageNumber = geometry.PageNumber
	identity.PosX = geometry.PosX
	identity.PosY = geometry.PosY
	identity.Width = geometry.Width
	identity.Height = geometry.Height
	identity.PlacementSource = metadata.PlacementSource
	identity.LinkGroupID = metadata.LinkGroupID
	identity.LinkedFromFieldID = metadata.LinkedFromFieldID
	identity.IsUnlinked = metadata.IsUnlinked
	identity.Required = metadata.Required
	return identity, false, nil
}

func parseAgreementFieldFormIdentity(entry map[string]any, index int) (agreementFieldFormInput, error) {
	id, err := coerceFormString(entry["id"], fmt.Sprintf("field_instances[%d].id", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	fieldType, err := coerceFormString(entry["type"], fmt.Sprintf("field_instances[%d].type", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	participantID, err := coerceFormString(entry["participant_id"], fmt.Sprintf("field_instances[%d].participant_id", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	if participantID == "" {
		participantID, err = coerceFormString(entry["recipient_id"], fmt.Sprintf("field_instances[%d].recipient_id", index))
		if err != nil {
			return agreementFieldFormInput{}, err
		}
	}
	recipientIndex, err := coerceFormInt(entry["recipient_index"], fmt.Sprintf("field_instances[%d].recipient_index", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	return agreementFieldFormInput{
		ID:             id,
		Type:           fieldType,
		ParticipantID:  participantID,
		RecipientIndex: recipientIndex,
	}, nil
}

func parseAgreementFieldFormGeometry(entry map[string]any, index int) (agreementFieldFormInput, error) {
	pageNumber, err := parseAgreementFieldFormPageNumber(entry, index)
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	posX, err := parseAgreementFieldFormPosition(entry, index, "x", "pos_x")
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	posY, err := parseAgreementFieldFormPosition(entry, index, "y", "pos_y")
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	width, err := coerceFormFloat(entry["width"], fmt.Sprintf("field_instances[%d].width", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	height, err := coerceFormFloat(entry["height"], fmt.Sprintf("field_instances[%d].height", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	return agreementFieldFormInput{
		PageNumber: pageNumber,
		PosX:       posX,
		PosY:       posY,
		Width:      width,
		Height:     height,
	}, nil
}

func parseAgreementFieldFormPageNumber(entry map[string]any, index int) (int, error) {
	pageNumber, err := coerceFormInt(entry["page"], fmt.Sprintf("field_instances[%d].page", index))
	if err != nil {
		return 0, err
	}
	if pageNumber != 0 {
		return pageNumber, nil
	}
	return coerceFormInt(entry["page_number"], fmt.Sprintf("field_instances[%d].page_number", index))
}

func parseAgreementFieldFormPosition(entry map[string]any, index int, primaryKey, fallbackKey string) (float64, error) {
	value, err := coerceFormFloat(entry[primaryKey], fmt.Sprintf("field_instances[%d].%s", index, primaryKey))
	if err != nil {
		return 0, err
	}
	if value != 0 {
		return value, nil
	}
	return coerceFormFloat(entry[fallbackKey], fmt.Sprintf("field_instances[%d].%s", index, fallbackKey))
}

func parseAgreementFieldFormMetadata(entry map[string]any, index int) (agreementFieldFormInput, error) {
	placementSource, err := coerceFormString(entry["placement_source"], fmt.Sprintf("field_instances[%d].placement_source", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	linkGroupID, err := coerceFormString(entry["link_group_id"], fmt.Sprintf("field_instances[%d].link_group_id", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	linkedFromFieldID, err := coerceFormString(entry["linked_from_field_id"], fmt.Sprintf("field_instances[%d].linked_from_field_id", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	isUnlinked, err := parseAgreementFieldFormIsUnlinked(entry, index)
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	required, err := coerceFormBool(entry["required"], fmt.Sprintf("field_instances[%d].required", index))
	if err != nil {
		return agreementFieldFormInput{}, err
	}
	return agreementFieldFormInput{
		PlacementSource:   strings.TrimSpace(strings.ToLower(placementSource)),
		LinkGroupID:       strings.TrimSpace(linkGroupID),
		LinkedFromFieldID: strings.TrimSpace(linkedFromFieldID),
		IsUnlinked:        isUnlinked,
		Required:          required,
	}, nil
}

func parseAgreementFieldFormIsUnlinked(entry map[string]any, index int) (*bool, error) {
	if _, ok := entry["is_unlinked"]; ok {
		parsed, err := coerceFormBool(entry["is_unlinked"], fmt.Sprintf("field_instances[%d].is_unlinked", index))
		if err != nil {
			return nil, err
		}
		return &parsed, nil
	}
	if _, ok := entry["isUnlinked"]; ok {
		parsed, err := coerceFormBool(entry["isUnlinked"], fmt.Sprintf("field_instances[%d].isUnlinked", index))
		if err != nil {
			return nil, err
		}
		return &parsed, nil
	}
	return nil, nil
}

func parseAgreementFieldRuleFormInputs(record map[string]any) ([]agreementFieldRuleFormInput, bool, error) {
	entries := map[int]map[string]any{}
	hasPayload := false
	if record == nil {
		return nil, false, nil
	}
	if raw, ok := record["field_rules"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	if raw, ok := record["fieldRules"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	if decoded, hasJSONPayload, err := decodeFieldRuleJSONPayload(record["field_rules_json"]); err != nil {
		if hasJSONPayload {
			hasPayload = true
		}
		return nil, hasPayload, fmt.Errorf("field_rules_json has invalid json payload")
	} else if hasJSONPayload {
		hasPayload = true
		for index, entry := range decoded {
			entries[index] = entry
		}
	}
	for key, value := range record {
		matches := fieldRuleKeyPattern.FindStringSubmatch(strings.TrimSpace(key))
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
	out := make([]agreementFieldRuleFormInput, 0, len(indexes))
	for _, index := range indexes {
		parsed, skip, err := parseAgreementFieldRuleFormEntry(entries[index], index)
		if err != nil {
			return nil, hasPayload, err
		}
		if skip {
			continue
		}
		out = append(out, parsed)
	}

	return out, hasPayload, nil
}

func parseAgreementFieldRuleFormEntry(entry map[string]any, index int) (agreementFieldRuleFormInput, bool, error) {
	identity, err := parseAgreementFieldRuleIdentity(entry, index)
	if err != nil {
		return agreementFieldRuleFormInput{}, false, err
	}
	pages, err := parseAgreementFieldRulePages(entry, index)
	if err != nil {
		return agreementFieldRuleFormInput{}, false, err
	}
	metadata, err := parseAgreementFieldRuleMetadata(entry, index)
	if err != nil {
		return agreementFieldRuleFormInput{}, false, err
	}
	if identity.ID == "" &&
		identity.Type == "" &&
		identity.ParticipantID == "" &&
		identity.ParticipantIndex < 0 &&
		pages.Page == 0 &&
		pages.FromPage == 0 &&
		pages.ToPage == 0 {
		return agreementFieldRuleFormInput{}, true, nil
	}
	identity.Page = pages.Page
	identity.FromPage = pages.FromPage
	identity.ToPage = pages.ToPage
	identity.ExcludeLastPage = pages.ExcludeLastPage
	identity.ExcludePages = pages.ExcludePages
	identity.Label = metadata.Label
	identity.Required = metadata.Required
	return identity, false, nil
}

func parseAgreementFieldRuleIdentity(entry map[string]any, index int) (agreementFieldRuleFormInput, error) {
	id, err := coerceFormString(entry["id"], fmt.Sprintf("field_rules[%d].id", index))
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	ruleType, err := coerceFormString(entry["type"], fmt.Sprintf("field_rules[%d].type", index))
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	participantID, err := coerceFormString(entry["participant_id"], fmt.Sprintf("field_rules[%d].participant_id", index))
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	if participantID == "" {
		participantID, err = coerceFormString(entry["participantId"], fmt.Sprintf("field_rules[%d].participantId", index))
		if err != nil {
			return agreementFieldRuleFormInput{}, err
		}
	}
	participantIndex, err := parseAgreementFieldRuleParticipantIndex(entry, index)
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	return agreementFieldRuleFormInput{
		ID:               strings.TrimSpace(id),
		Type:             strings.ToLower(strings.TrimSpace(ruleType)),
		ParticipantID:    strings.TrimSpace(participantID),
		ParticipantIndex: participantIndex,
	}, nil
}

func parseAgreementFieldRulePages(entry map[string]any, index int) (agreementFieldRuleFormInput, error) {
	page, err := coerceFormInt(entry["page"], fmt.Sprintf("field_rules[%d].page", index))
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	fromPage, err := parseAgreementFieldRulePageValue(entry, index, "from_page", "fromPage")
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	toPage, err := parseAgreementFieldRulePageValue(entry, index, "to_page", "toPage")
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	excludeLastPage, err := parseAgreementFieldRuleExcludeLastPage(entry, index)
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	excludePages, err := parseAgreementFieldRuleExcludePages(entry, index)
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	return agreementFieldRuleFormInput{
		Page:            page,
		FromPage:        fromPage,
		ToPage:          toPage,
		ExcludeLastPage: excludeLastPage,
		ExcludePages:    excludePages,
	}, nil
}

func parseAgreementFieldRuleMetadata(entry map[string]any, index int) (agreementFieldRuleFormInput, error) {
	label, err := coerceFormString(entry["label"], fmt.Sprintf("field_rules[%d].label", index))
	if err != nil {
		return agreementFieldRuleFormInput{}, err
	}
	required := true
	if raw, ok := entry["required"]; ok {
		required, err = coerceFormBool(raw, fmt.Sprintf("field_rules[%d].required", index))
		if err != nil {
			return agreementFieldRuleFormInput{}, err
		}
	}
	return agreementFieldRuleFormInput{
		Label:    strings.TrimSpace(label),
		Required: required,
	}, nil
}

func parseAgreementFieldRuleParticipantIndex(entry map[string]any, index int) (int, error) {
	if raw, ok := entry["participant_index"]; ok {
		return coerceFormInt(raw, fmt.Sprintf("field_rules[%d].participant_index", index))
	}
	if raw, ok := entry["participantIndex"]; ok {
		return coerceFormInt(raw, fmt.Sprintf("field_rules[%d].participantIndex", index))
	}
	return -1, nil
}

func parseAgreementFieldRulePageValue(entry map[string]any, index int, snakeKey, camelKey string) (int, error) {
	value, err := coerceFormInt(entry[snakeKey], fmt.Sprintf("field_rules[%d].%s", index, snakeKey))
	if err != nil {
		return 0, err
	}
	if value != 0 {
		return value, nil
	}
	return coerceFormInt(entry[camelKey], fmt.Sprintf("field_rules[%d].%s", index, camelKey))
}

func parseAgreementFieldRuleExcludeLastPage(entry map[string]any, index int) (bool, error) {
	excludeLastPage, err := coerceFormBool(entry["exclude_last_page"], fmt.Sprintf("field_rules[%d].exclude_last_page", index))
	if err != nil {
		return false, err
	}
	if excludeLastPage {
		return true, nil
	}
	return coerceFormBool(entry["excludeLastPage"], fmt.Sprintf("field_rules[%d].excludeLastPage", index))
}

func parseAgreementFieldRuleExcludePages(entry map[string]any, index int) ([]int, error) {
	excludePages, err := coerceFormIntSlice(entry["exclude_pages"], fmt.Sprintf("field_rules[%d].exclude_pages", index))
	if err != nil {
		return nil, err
	}
	if len(excludePages) > 0 {
		return excludePages, nil
	}
	return coerceFormIntSlice(entry["excludePages"], fmt.Sprintf("field_rules[%d].excludePages", index))
}

func decodeJSONPayloadEntries(value any, fieldName string) ([]map[string]any, bool, error) {
	switch typed := value.(type) {
	case nil:
		return nil, false, nil
	case string:
		return decodeJSONRawPayloadEntries(typed, fieldName)
	case []byte:
		return decodeJSONRawPayloadEntries(string(typed), fieldName)
	case []string:
		raw, err := coerceFormString(typed, fieldName)
		if err != nil {
			return nil, true, err
		}
		return decodeJSONRawPayloadEntries(raw, fieldName)
	case []any:
		if len(typed) == 0 {
			return nil, false, nil
		}
		rawValues := make([]string, 0, len(typed))
		allStringValues := true
		for _, item := range typed {
			switch value := item.(type) {
			case string:
				rawValues = append(rawValues, value)
			case []byte:
				rawValues = append(rawValues, string(value))
			default:
				allStringValues = false
			}
		}
		if allStringValues {
			raw, err := coerceFormString(rawValues, fieldName)
			if err != nil {
				return nil, true, err
			}
			return decodeJSONRawPayloadEntries(raw, fieldName)
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			return nil, true, err
		}
		return decodeJSONRawPayloadEntries(string(encoded), fieldName)
	default:
		encoded, err := json.Marshal(value)
		if err != nil {
			return nil, true, err
		}
		return decodeJSONRawPayloadEntries(string(encoded), fieldName)
	}
}

func decodeJSONRawPayloadEntries(raw, fieldName string) ([]map[string]any, bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.EqualFold(raw, "null") {
		return nil, false, nil
	}
	var decoded []map[string]any
	if err := json.Unmarshal([]byte(raw), &decoded); err == nil {
		return decoded, true, nil
	}
	var single map[string]any
	if err := json.Unmarshal([]byte(raw), &single); err == nil {
		if len(single) == 0 {
			return []map[string]any{}, true, nil
		}
		return []map[string]any{single}, true, nil
	}
	var generic []any
	if err := json.Unmarshal([]byte(raw), &generic); err != nil {
		return nil, true, err
	}
	decoded = make([]map[string]any, 0, len(generic))
	for index, item := range generic {
		entry, ok := item.(map[string]any)
		if !ok {
			return nil, true, fmt.Errorf("%s[%d] must be an object", fieldName, index)
		}
		decoded = append(decoded, entry)
	}
	return decoded, true, nil
}

func decodeFieldRuleJSONPayload(value any) ([]map[string]any, bool, error) {
	return decodeJSONPayloadEntries(value, "field_rules_json")
}

func expandAgreementFieldRules(
	rules []agreementFieldRuleFormInput,
	recipients []stores.RecipientRecord,
	baseFields []agreementFieldFormInput,
	documentPageCount int,
) ([]agreementFieldFormInput, error) {
	if len(rules) == 0 {
		return nil, nil
	}
	_ = baseFields
	recipientIDsByIndex := agreementFieldRuleRecipientIDsByIndex(recipients)
	terminalPage := agreementFieldRuleTerminalPage(documentPageCount)
	rules = clampAgreementFieldRules(rules, terminalPage)

	out := make([]agreementFieldFormInput, 0, len(rules))
	for index, rule := range rules {
		expanded, skip, err := expandAgreementFieldRule(rule, index, recipientIDsByIndex, terminalPage)
		if err != nil {
			return nil, err
		}
		if skip {
			continue
		}
		out = append(out, expanded...)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].PageNumber != out[j].PageNumber {
			return out[i].PageNumber < out[j].PageNumber
		}
		return strings.TrimSpace(out[i].ID) < strings.TrimSpace(out[j].ID)
	})

	return out, nil
}

func agreementFieldRuleRecipientIDsByIndex(recipients []stores.RecipientRecord) []string {
	recipientIDsByIndex := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		id := strings.TrimSpace(recipient.ID)
		if id == "" {
			continue
		}
		recipientIDsByIndex = append(recipientIDsByIndex, id)
	}
	return recipientIDsByIndex
}

func agreementFieldRuleTerminalPage(documentPageCount int) int {
	if documentPageCount > 0 {
		return documentPageCount
	}
	return 1
}

func clampAgreementFieldRules(rules []agreementFieldRuleFormInput, terminalPage int) []agreementFieldRuleFormInput {
	clamped := make([]agreementFieldRuleFormInput, len(rules))
	copy(clamped, rules)
	for i := range clamped {
		clamped[i].Page = clampAgreementFieldRulePage(clamped[i].Page, terminalPage)
		clamped[i].FromPage = clampAgreementFieldRulePage(clamped[i].FromPage, terminalPage)
		clamped[i].ToPage = clampAgreementFieldRulePage(clamped[i].ToPage, terminalPage)
	}
	return clamped
}

func clampAgreementFieldRulePage(page, terminalPage int) int {
	if page == 0 {
		return 0
	}
	if page < 1 {
		return 1
	}
	if page > terminalPage {
		return terminalPage
	}
	return page
}

func expandAgreementFieldRule(
	rule agreementFieldRuleFormInput,
	index int,
	recipientIDsByIndex []string,
	terminalPage int,
) ([]agreementFieldFormInput, bool, error) {
	ruleType := strings.TrimSpace(rule.Type)
	if ruleType == "" {
		return nil, true, nil
	}
	ruleBaseID := resolveRuleExpansionBaseID(rule, index)
	participantID, err := resolveAgreementFieldRuleParticipantID(rule, recipientIDsByIndex)
	if err != nil {
		return nil, false, err
	}
	switch ruleType {
	case "initials_each_page":
		return expandInitialsEachPageRule(rule, ruleBaseID, participantID, terminalPage), false, nil
	case "signature_once":
		return []agreementFieldFormInput{expandSignatureOnceRule(rule, ruleBaseID, participantID, terminalPage)}, false, nil
	default:
		return nil, false, fmt.Errorf("field rule type %q is not supported", ruleType)
	}
}

func resolveAgreementFieldRuleParticipantID(rule agreementFieldRuleFormInput, recipientIDsByIndex []string) (string, error) {
	participantID := strings.TrimSpace(rule.ParticipantID)
	if participantID == "" && rule.ParticipantIndex >= 0 && rule.ParticipantIndex < len(recipientIDsByIndex) {
		participantID = recipientIDsByIndex[rule.ParticipantIndex]
	}
	if participantID == "" {
		return "", fmt.Errorf("field rule participant_id is required")
	}
	return participantID, nil
}

func resolveRuleExpansionBaseID(rule agreementFieldRuleFormInput, index int) string {
	baseID := strings.TrimSpace(rule.ID)
	if baseID != "" {
		return baseID
	}
	return fmt.Sprintf("rule-%d", index+1)
}

func expandInitialsEachPageRule(
	rule agreementFieldRuleFormInput,
	ruleBaseID, participantID string,
	terminalPage int,
) []agreementFieldFormInput {
	startPage := rule.FromPage
	if startPage <= 0 {
		startPage = 1
	}
	endPage := rule.ToPage
	if endPage <= 0 {
		endPage = terminalPage
	}
	if endPage < startPage {
		startPage, endPage = endPage, startPage
	}
	excluded := buildExcludedRulePages(rule, terminalPage)
	out := make([]agreementFieldFormInput, 0, len(rule.ExcludePages)+1)
	for page := startPage; page <= endPage; page++ {
		if _, skip := excluded[page]; skip {
			continue
		}
		out = append(out, agreementFieldFormInput{
			ID:            fmt.Sprintf("%s-initials-%d", ruleBaseID, page),
			Type:          stores.FieldTypeInitials,
			ParticipantID: participantID,
			PageNumber:    page,
			Width:         80,
			Height:        40,
			Required:      rule.Required,
		})
	}
	return out
}

func buildExcludedRulePages(rule agreementFieldRuleFormInput, terminalPage int) map[int]struct{} {
	excluded := map[int]struct{}{}
	for _, page := range rule.ExcludePages {
		if page <= 0 {
			continue
		}
		if page > terminalPage {
			page = terminalPage
		}
		excluded[page] = struct{}{}
	}
	if rule.ExcludeLastPage {
		excluded[terminalPage] = struct{}{}
	}
	return excluded
}

func expandSignatureOnceRule(
	rule agreementFieldRuleFormInput,
	ruleBaseID, participantID string,
	terminalPage int,
) agreementFieldFormInput {
	page := rule.Page
	if page <= 0 {
		page = rule.ToPage
	}
	if page <= 0 {
		page = terminalPage
	}
	if page <= 0 {
		page = 1
	}
	return agreementFieldFormInput{
		ID:            fmt.Sprintf("%s-signature-%d", ruleBaseID, page),
		Type:          stores.FieldTypeSignature,
		ParticipantID: participantID,
		PageNumber:    page,
		Width:         200,
		Height:        50,
		Required:      rule.Required,
	}
}

func parseAgreementFieldPlacementInputs(record map[string]any) ([]agreementFieldPlacementFormInput, bool, error) {
	entries := map[int]map[string]any{}
	hasPayload := false
	if record == nil {
		return nil, false, nil
	}
	if raw, ok := record["field_placements"]; ok {
		hasPayload = true
		collectIndexedFormEntries(entries, raw)
	}
	if decoded, hasJSONPayload, err := decodeFieldPlacementJSONPayload(record["field_placements_json"]); err != nil {
		if hasJSONPayload {
			hasPayload = true
		}
		return nil, hasPayload, fmt.Errorf("field_placements_json has invalid json payload")
	} else if hasJSONPayload {
		hasPayload = true
		for index, entry := range decoded {
			entries[index] = entry
		}
	}
	for key, value := range record {
		matches := fieldPlacementKeyPattern.FindStringSubmatch(strings.TrimSpace(key))
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
	out := make([]agreementFieldPlacementFormInput, 0, len(indexes))
	for _, index := range indexes {
		parsed, skip, err := parseAgreementFieldPlacementEntry(entries[index], index)
		if err != nil {
			return nil, hasPayload, err
		}
		if skip {
			continue
		}
		out = append(out, parsed)
	}
	return out, hasPayload, nil
}

func parseAgreementFieldPlacementEntry(entry map[string]any, index int) (agreementFieldPlacementFormInput, bool, error) {
	identity, err := parseAgreementFieldPlacementIdentity(entry, index)
	if err != nil {
		return agreementFieldPlacementFormInput{}, false, err
	}
	geometry, err := parseAgreementFieldPlacementGeometry(entry, index)
	if err != nil {
		return agreementFieldPlacementFormInput{}, false, err
	}
	if identity.ID == "" &&
		identity.DefinitionID == "" &&
		geometry.PageNumber <= 0 &&
		geometry.PosX == 0 &&
		geometry.PosY == 0 &&
		geometry.Width == 0 &&
		geometry.Height == 0 {
		return agreementFieldPlacementFormInput{}, true, nil
	}
	identity.PageNumber = geometry.PageNumber
	identity.PosX = geometry.PosX
	identity.PosY = geometry.PosY
	identity.Width = geometry.Width
	identity.Height = geometry.Height
	identity.PlacementSource = parseAgreementFieldPlacementString(entry, index, "placement_source")
	identity.LinkGroupID = parseAgreementFieldPlacementString(entry, index, "link_group_id")
	identity.LinkedFromFieldID = parseAgreementFieldPlacementString(entry, index, "linked_from_field_id")
	identity.IsUnlinked = parseAgreementFieldPlacementIsUnlinked(entry)
	return identity, false, nil
}

func parseAgreementFieldPlacementIdentity(entry map[string]any, index int) (agreementFieldPlacementFormInput, error) {
	id, err := coerceFormString(entry["id"], fmt.Sprintf("field_placements[%d].id", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	definitionID, err := coerceFormString(entry["definition_id"], fmt.Sprintf("field_placements[%d].definition_id", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	if definitionID == "" {
		definitionID, err = coerceFormString(entry["field_definition_id"], fmt.Sprintf("field_placements[%d].field_definition_id", index))
		if err != nil {
			return agreementFieldPlacementFormInput{}, err
		}
	}
	return agreementFieldPlacementFormInput{
		ID:           id,
		DefinitionID: definitionID,
	}, nil
}

func parseAgreementFieldPlacementGeometry(entry map[string]any, index int) (agreementFieldPlacementFormInput, error) {
	pageNumber, err := coerceFormInt(entry["page"], fmt.Sprintf("field_placements[%d].page", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	posX, err := coerceFormFloat(entry["x"], fmt.Sprintf("field_placements[%d].x", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	posY, err := coerceFormFloat(entry["y"], fmt.Sprintf("field_placements[%d].y", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	width, err := coerceFormFloat(entry["width"], fmt.Sprintf("field_placements[%d].width", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	height, err := coerceFormFloat(entry["height"], fmt.Sprintf("field_placements[%d].height", index))
	if err != nil {
		return agreementFieldPlacementFormInput{}, err
	}
	return agreementFieldPlacementFormInput{
		PageNumber: pageNumber,
		PosX:       posX,
		PosY:       posY,
		Width:      width,
		Height:     height,
	}, nil
}

func parseAgreementFieldPlacementString(entry map[string]any, index int, key string) string {
	value, _ := coerceFormString(entry[key], fmt.Sprintf("field_placements[%d].%s", index, key))
	return value
}

func parseAgreementFieldPlacementIsUnlinked(entry map[string]any) *bool {
	if _, ok := entry["is_unlinked"]; ok {
		parsed := toBool(entry["is_unlinked"])
		return &parsed
	}
	if _, ok := entry["isUnlinked"]; ok {
		parsed := toBool(entry["isUnlinked"])
		return &parsed
	}
	return nil
}

func decodeFieldPlacementJSONPayload(value any) ([]map[string]any, bool, error) {
	return decodeJSONPayloadEntries(value, "field_placements_json")
}

func mergeFieldPlacementInputs(fields []agreementFieldFormInput, placements []agreementFieldPlacementFormInput) []agreementFieldFormInput {
	if len(fields) == 0 || len(placements) == 0 {
		return fields
	}
	placementsByDefinitionID := make(map[string]agreementFieldPlacementFormInput, len(placements))
	placementsByID := make(map[string]agreementFieldPlacementFormInput, len(placements))
	for _, placement := range placements {
		if id := strings.TrimSpace(placement.DefinitionID); id != "" {
			placementsByDefinitionID[id] = placement
		}
		if id := strings.TrimSpace(placement.ID); id != "" {
			placementsByID[id] = placement
		}
	}
	for index := range fields {
		fieldID := strings.TrimSpace(fields[index].ID)
		placement, ok := placementsByDefinitionID[fieldID]
		if !ok {
			placement, ok = placementsByID[fieldID]
		}
		if !ok {
			continue
		}
		if placement.PageNumber > 0 {
			fields[index].PageNumber = placement.PageNumber
		}
		fields[index].PosX = placement.PosX
		fields[index].PosY = placement.PosY
		fields[index].Width = placement.Width
		fields[index].Height = placement.Height
		if source := strings.TrimSpace(strings.ToLower(placement.PlacementSource)); source != "" {
			fields[index].PlacementSource = source
		}
		if linkGroupID := strings.TrimSpace(placement.LinkGroupID); linkGroupID != "" {
			fields[index].LinkGroupID = linkGroupID
		}
		if linkedFrom := strings.TrimSpace(placement.LinkedFromFieldID); linkedFrom != "" {
			fields[index].LinkedFromFieldID = linkedFrom
		}
		if placement.IsUnlinked != nil {
			fields[index].IsUnlinked = placement.IsUnlinked
		}
	}
	return fields
}

func coerceFormString(value any, fieldPath string) (string, error) {
	switch typed := value.(type) {
	case nil:
		return "", nil
	case string:
		return strings.TrimSpace(typed), nil
	case []string:
		return coerceFormStringSlice(typed, fieldPath)
	case []any:
		flattened := make([]string, 0, len(typed))
		for _, item := range typed {
			resolved, err := coerceFormString(item, fieldPath)
			if err != nil {
				return "", err
			}
			flattened = append(flattened, resolved)
		}
		return coerceFormStringSlice(flattened, fieldPath)
	default:
		return strings.TrimSpace(fmt.Sprint(typed)), nil
	}
}

func coerceFormStringSlice(values []string, fieldPath string) (string, error) {
	unique := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		unique = append(unique, trimmed)
	}
	switch len(unique) {
	case 0:
		return "", nil
	case 1:
		return unique[0], nil
	default:
		return "", fmt.Errorf("field %s has conflicting values %v", fieldPath, unique)
	}
}

func coerceFormInt(value any, fieldPath string) (int, error) {
	raw, err := coerceFormString(value, fieldPath)
	if err != nil {
		return 0, err
	}
	if raw == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("field %s has invalid integer %q", fieldPath, raw)
	}
	return parsed, nil
}

func coerceFormIntSlice(value any, fieldPath string) ([]int, error) {
	switch typed := value.(type) {
	case nil:
		return nil, nil
	case []any:
		return coerceFormAnyIntSlice(typed, fieldPath)
	case []string:
		return coerceFormStringIntSlice(typed, fieldPath)
	default:
		return coerceFormScalarIntSlice(value, fieldPath)
	}
}

func coerceFormAnyIntSlice(values []any, fieldPath string) ([]int, error) {
	out := make([]int, 0, len(values))
	for index, item := range values {
		raw, err := coerceFormInt(item, fmt.Sprintf("%s[%d]", fieldPath, index))
		if err != nil {
			return nil, err
		}
		if raw <= 0 {
			continue
		}
		out = append(out, raw)
	}
	return out, nil
}

func coerceFormStringIntSlice(values []string, fieldPath string) ([]int, error) {
	out := make([]int, 0, len(values))
	for index, item := range values {
		raw, err := coerceFormInt(item, fmt.Sprintf("%s[%d]", fieldPath, index))
		if err != nil {
			return nil, err
		}
		if raw <= 0 {
			continue
		}
		out = append(out, raw)
	}
	return out, nil
}

func coerceFormScalarIntSlice(value any, fieldPath string) ([]int, error) {
	raw := strings.TrimSpace(toString(value))
	if raw == "" {
		return nil, nil
	}
	if strings.HasPrefix(raw, "[") && strings.HasSuffix(raw, "]") {
		var decoded []any
		if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
			return nil, fmt.Errorf("field %s has invalid list payload", fieldPath)
		}
		return coerceFormIntSlice(decoded, fieldPath)
	}
	return coerceFormStringIntSlice(strings.Split(raw, ","), fieldPath)
}

func coerceFormFloat(value any, fieldPath string) (float64, error) {
	raw, err := coerceFormString(value, fieldPath)
	if err != nil {
		return 0, err
	}
	if raw == "" {
		return 0, nil
	}
	parsed, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, fmt.Errorf("field %s has invalid number %q", fieldPath, raw)
	}
	return parsed, nil
}

func coerceFormBool(value any, fieldPath string) (bool, error) {
	switch typed := value.(type) {
	case nil:
		return false, nil
	case bool:
		return typed, nil
	case []string, []any:
		raw, err := coerceFormString(typed, fieldPath)
		if err != nil {
			return false, err
		}
		return toBool(raw), nil
	default:
		return toBool(value), nil
	}
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
	if raw, ok := primitives.BoolFromAny(value); ok {
		return raw
	}
	return toInt64(value) > 0
}

func shouldSendForSignature(record map[string]any) bool {
	return toBool(record["send_for_signature"])
}

func resolveSendIdempotencyKey(record map[string]any, agreementID string) string {
	if key := strings.TrimSpace(toString(record["send_idempotency_key"])); key != "" {
		return key
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		agreementID = "agreement"
	}
	return fmt.Sprintf("wizard_send_%s_%d", agreementID, time.Now().UTC().UnixNano())
}

func stringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
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

func agreementMatchesStatusFilter(agreement stores.AgreementRecord, raw string) bool {
	values := splitFilterValues(raw)
	if len(values) == 0 {
		return true
	}
	status := strings.ToLower(strings.TrimSpace(agreement.Status))
	return slices.Contains(values, status)
}

func splitFilterValues(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';'
	})
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.ToLower(strings.TrimSpace(part))
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func truthyFilterValue(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
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
	end := min(start+perPage, len(records))
	out := make([]T, 0, end-start)
	out = append(out, records[start:end]...)
	return out
}

func toString(value any) string {
	return primitives.StringFromAny(value)
}

func toInt64(value any) int64 {
	if parsed, ok := primitives.Int64FromAny(value); ok {
		return parsed
	}
	return 0
}

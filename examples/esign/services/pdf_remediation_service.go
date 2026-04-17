package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"strings"
	"sync"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-uploader"
	"github.com/google/uuid"
)

const (
	PDFRemediationStatusRequested = "requested"
	PDFRemediationStatusStarted   = "started"
	PDFRemediationStatusSucceeded = "succeeded"
	PDFRemediationStatusFailed    = "failed"

	defaultPDFRemediationLeaseTTL = 60 * time.Second
)

// PDFRemediationRequest captures typed remediation execution context.
type PDFRemediationRequest struct {
	DocumentID    string     `json:"document_id"`
	AgreementID   string     `json:"agreement_id"`
	ActorID       string     `json:"actor_id"`
	CommandID     string     `json:"command_id"`
	DispatchID    string     `json:"dispatch_id"`
	CorrelationID string     `json:"correlation_id"`
	ExecutionMode string     `json:"execution_mode"`
	RequestedAt   *time.Time `json:"requested_at"`
	Force         bool       `json:"force"`
}

// PDFRemediationResult captures remediation outcome metadata.
type PDFRemediationResult struct {
	Document        stores.DocumentRecord  `json:"document"`
	Compatibility   PDFCompatibilityStatus `json:"compatibility"`
	Analysis        PDFAnalysis            `json:"analysis"`
	OutputObjectKey string                 `json:"output_object_key"`
}

// PDFRemediationService executes bounded PDF remediation and persists compatibility metadata.
type PDFRemediationService struct {
	documents  stores.DocumentStore
	leases     stores.DocumentRemediationLeaseStore
	audits     stores.AuditEventStore
	objects    documentObjectStore
	pdfs       PDFService
	runner     PDFRemediationRunner
	activity   coreadmin.ActivitySink
	projector  remediationActivityProjector
	now        func() time.Time
	leaseTTL   time.Duration
	workerPref string
}

type pdfRemediationExecution struct {
	documentID    string
	agreementID   string
	actorID       string
	commandID     string
	dispatchID    string
	correlationID string
	executionMode string
	requestedAt   time.Time
	baseMeta      map[string]any
}

type pdfRemediationState struct {
	request   pdfRemediationExecution
	document  stores.DocumentRecord
	lease     stores.DocumentRemediationLeaseToken
	startedAt time.Time
}

type remediationActivityProjector interface {
	ProjectAgreement(ctx context.Context, scope stores.Scope, agreementID string) error
}

// PDFRemediationOption customizes remediation service behavior.
type PDFRemediationOption func(*PDFRemediationService)

// WithPDFRemediationPDFService overrides the PDF policy/analyzer used by remediation.
func WithPDFRemediationPDFService(service PDFService) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil {
			return
		}
		s.pdfs = service
	}
}

// WithPDFRemediationClock overrides the service clock.
func WithPDFRemediationClock(now func() time.Time) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithPDFRemediationActivitySink wires lifecycle activity feed emission.
func WithPDFRemediationActivitySink(sink coreadmin.ActivitySink) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil {
			return
		}
		s.activity = sink
	}
}

// WithPDFRemediationAuditStore wires agreement-scoped append-only audit events.
func WithPDFRemediationAuditStore(store stores.AuditEventStore) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil {
			return
		}
		s.audits = store
	}
}

// WithPDFRemediationActivityProjector wires agreement audit -> activity projection.
func WithPDFRemediationActivityProjector(projector remediationActivityProjector) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil {
			return
		}
		s.projector = projector
	}
}

// WithPDFRemediationLeaseTTL overrides distributed lease ttl.
func WithPDFRemediationLeaseTTL(ttl time.Duration) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.leaseTTL = ttl
	}
}

// WithPDFRemediationWorkerPrefix overrides worker id prefix for lease ownership.
func WithPDFRemediationWorkerPrefix(prefix string) PDFRemediationOption {
	return func(s *PDFRemediationService) {
		if s == nil {
			return
		}
		prefix = strings.TrimSpace(prefix)
		if prefix != "" {
			s.workerPref = prefix
		}
	}
}

// NewPDFRemediationService constructs the remediation service.
func NewPDFRemediationService(store stores.Store, objects documentObjectStore, runner PDFRemediationRunner, opts ...PDFRemediationOption) PDFRemediationService {
	service := PDFRemediationService{
		documents:  store,
		leases:     store,
		audits:     store,
		objects:    objects,
		pdfs:       NewPDFService(),
		runner:     runner,
		now:        func() time.Time { return time.Now().UTC() },
		leaseTTL:   defaultPDFRemediationLeaseTTL,
		workerPref: "esign.pdf.remediation",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&service)
		}
	}
	return service
}

// Remediate executes one document remediation attempt with lease fencing and lifecycle tracking.
func (s PDFRemediationService) Remediate(ctx context.Context, scope stores.Scope, input PDFRemediationRequest) (result PDFRemediationResult, err error) {
	if validateErr := s.validateRemediationDependencies(); validateErr != nil {
		return PDFRemediationResult{}, validateErr
	}
	req, err := s.normalizePDFRemediationRequest(scope, input)
	if err != nil {
		return PDFRemediationResult{}, err
	}
	if emitErr := s.emitLifecycle(ctx, req.agreementID, req.actorID, PDFRemediationStatusRequested, req.requestedAt, req.baseMeta, ""); emitErr != nil {
		return PDFRemediationResult{}, emitErr
	}
	state, err := s.startPDFRemediation(ctx, scope, req)
	if err != nil {
		return PDFRemediationResult{}, err
	}
	defer func() {
		releaseErr := s.leases.ReleaseDocumentRemediationLease(ctx, scope, req.documentID, stores.DocumentRemediationLeaseReleaseInput{
			Now:   s.now().UTC(),
			Lease: state.lease,
		})
		if releaseErr == nil {
			return
		}
		observeRemediationLockSignal(ctx, releaseErr)
		if err == nil {
			err = releaseErr
			return
		}
		err = errors.Join(err, releaseErr)
	}()

	return s.executePDFRemediation(ctx, scope, &state)
}

func (s PDFRemediationService) validateRemediationDependencies() error {
	if s.documents == nil {
		return domainValidationError("documents", "store", "not configured")
	}
	if s.leases == nil {
		return domainValidationError("document_remediation", "lease_store", "not configured")
	}
	if s.objects == nil {
		return domainValidationError("documents", "object_store", "not configured")
	}
	if s.runner == nil {
		return domainValidationError("document_remediation", "runner", "not configured")
	}
	return nil
}

func (s PDFRemediationService) normalizePDFRemediationRequest(scope stores.Scope, input PDFRemediationRequest) (pdfRemediationExecution, error) {
	documentID := strings.TrimSpace(input.DocumentID)
	if documentID == "" {
		return pdfRemediationExecution{}, domainValidationError("documents", "document_id", "required")
	}
	commandID := strings.TrimSpace(input.CommandID)
	if commandID == "" {
		commandID = "esign.pdf.remediate"
	}
	executionMode := strings.ToLower(strings.TrimSpace(input.ExecutionMode))
	if executionMode == "" {
		executionMode = "inline"
	}
	requestedAt := s.now().UTC()
	if input.RequestedAt != nil && !input.RequestedAt.IsZero() {
		requestedAt = input.RequestedAt.UTC()
	}
	correlationID := observability.ResolveCorrelationID(strings.TrimSpace(input.CorrelationID), commandID, documentID)
	req := pdfRemediationExecution{
		documentID:    documentID,
		agreementID:   strings.TrimSpace(input.AgreementID),
		actorID:       strings.TrimSpace(input.ActorID),
		commandID:     commandID,
		dispatchID:    strings.TrimSpace(input.DispatchID),
		correlationID: correlationID,
		executionMode: executionMode,
		requestedAt:   requestedAt,
	}
	req.baseMeta = remediationLifecycleMetadata(scope, req.documentID, req.commandID, req.dispatchID, req.correlationID, req.executionMode)
	return req, nil
}

func (s PDFRemediationService) startPDFRemediation(
	ctx context.Context,
	scope stores.Scope,
	req pdfRemediationExecution,
) (pdfRemediationState, error) {
	document, err := s.documents.Get(ctx, scope, req.documentID)
	if err != nil {
		observeRemediationLockSignal(ctx, err)
		_ = s.emitLifecycle(ctx, req.agreementID, req.actorID, PDFRemediationStatusFailed, s.now().UTC(), req.baseMeta, err.Error())
		return pdfRemediationState{}, err
	}
	claim, err := s.leases.AcquireDocumentRemediationLease(ctx, scope, req.documentID, stores.DocumentRemediationLeaseAcquireInput{
		Now:           s.now().UTC(),
		TTL:           s.leaseTTL,
		WorkerID:      s.workerID(req.correlationID),
		CorrelationID: req.correlationID,
	})
	if err != nil {
		observeRemediationLockSignal(ctx, err)
		_ = s.emitLifecycle(ctx, req.agreementID, req.actorID, PDFRemediationStatusFailed, s.now().UTC(), req.baseMeta, err.Error())
		return pdfRemediationState{}, err
	}
	state := pdfRemediationState{
		request:   req,
		document:  document,
		lease:     claim.Lease,
		startedAt: s.now().UTC(),
	}
	updatedDocument, err := s.persistStartedRemediationState(ctx, scope, state)
	if err != nil {
		_ = s.emitLifecycle(ctx, req.agreementID, req.actorID, PDFRemediationStatusFailed, s.now().UTC(), req.baseMeta, err.Error())
		return pdfRemediationState{}, err
	}
	state.document = updatedDocument
	if emitErr := s.emitLifecycle(ctx, req.agreementID, req.actorID, PDFRemediationStatusStarted, state.startedAt, req.baseMeta, ""); emitErr != nil {
		return pdfRemediationState{}, emitErr
	}
	return state, nil
}

func (s PDFRemediationService) persistStartedRemediationState(
	ctx context.Context,
	scope stores.Scope,
	state pdfRemediationState,
) (stores.DocumentRecord, error) {
	startPatch := documentMetadataPatchFromRecord(state.document)
	startPatch.RemediationStatus = PDFRemediationStatusStarted
	startPatch.RemediationActorID = state.request.actorID
	startPatch.RemediationCommandID = state.request.commandID
	startPatch.RemediationDispatchID = state.request.dispatchID
	startPatch.RemediationExecMode = state.request.executionMode
	startPatch.RemediationCorrelation = state.request.correlationID
	startPatch.RemediationFailure = ""
	if strings.TrimSpace(startPatch.RemediationOriginalKey) == "" {
		startPatch.RemediationOriginalKey = strings.TrimSpace(state.document.SourceObjectKey)
	}
	startPatch.RemediationRequestedAt = cloneDocumentTimePtr(state.request.requestedAt)
	startPatch.RemediationStartedAt = cloneDocumentTimePtr(state.startedAt)
	startPatch.RemediationCompletedAt = nil
	return s.documents.SaveMetadata(ctx, scope, state.request.documentID, startPatch)
}

func (s PDFRemediationService) executePDFRemediation(
	ctx context.Context,
	scope stores.Scope,
	state *pdfRemediationState,
) (PDFRemediationResult, error) {
	sourcePDF, err := s.loadRemediationSourcePDF(ctx, scope, *state)
	if err != nil {
		return PDFRemediationResult{}, err
	}
	runResult, err := s.runPDFRemediationJob(ctx, scope, state, sourcePDF)
	if err != nil {
		return PDFRemediationResult{}, err
	}
	analysis, err := s.pdfs.Analyze(ctx, scope, runResult.OutputPDF)
	if err != nil {
		return PDFRemediationResult{}, s.failStartedPDFRemediation(ctx, scope, *state, err)
	}
	outputKey, err := s.storeRemediationOutput(ctx, state.document, runResult.OutputPDF)
	if err != nil {
		return PDFRemediationResult{}, s.failStartedPDFRemediation(ctx, scope, *state, err)
	}
	return s.completePDFRemediation(ctx, scope, *state, analysis, outputKey)
}

func (s PDFRemediationService) loadRemediationSourcePDF(
	ctx context.Context,
	scope stores.Scope,
	state pdfRemediationState,
) ([]byte, error) {
	sourceKey := strings.TrimSpace(state.document.SourceObjectKey)
	if sourceKey == "" {
		err := domainValidationError("documents", "source_object_key", "required")
		return nil, s.failStartedPDFRemediation(ctx, scope, state, err)
	}
	sourcePDF, sourceErr := s.objects.GetFile(ctx, sourceKey)
	if sourceErr != nil || len(sourcePDF) == 0 {
		err := fmt.Errorf("load remediation source pdf: %w", sourceErr)
		if sourceErr == nil {
			err = fmt.Errorf("load remediation source pdf: payload unavailable")
		}
		return nil, s.failStartedPDFRemediation(ctx, scope, state, err)
	}
	if err := validateRemediationSourceDigest(state.document, sourcePDF); err != nil {
		return nil, s.failStartedPDFRemediation(ctx, scope, state, err)
	}
	return sourcePDF, nil
}

func validateRemediationSourceDigest(document stores.DocumentRecord, sourcePDF []byte) error {
	expected := strings.TrimSpace(document.SourceSHA256)
	if expected == "" {
		return nil
	}
	sum := sha256.Sum256(sourcePDF)
	if got := hex.EncodeToString(sum[:]); strings.EqualFold(got, expected) {
		return nil
	}
	return fmt.Errorf("remediation source digest mismatch")
}

func (s PDFRemediationService) runPDFRemediationJob(
	ctx context.Context,
	scope stores.Scope,
	state *pdfRemediationState,
	sourcePDF []byte,
) (PDFRemediationRunResult, error) {
	runResult, finalLease, err := s.runWithLeaseHeartbeat(ctx, scope, state.request.documentID, state.lease, func(opCtx context.Context) (PDFRemediationRunResult, error) {
		return s.runner.Run(opCtx, PDFRemediationRunInput{SourcePDF: sourcePDF})
	})
	state.lease = finalLease
	if err != nil {
		observeRemediationLockSignal(ctx, err)
		return PDFRemediationRunResult{}, s.failStartedPDFRemediation(ctx, scope, *state, err)
	}
	return runResult, nil
}

func (s PDFRemediationService) storeRemediationOutput(ctx context.Context, document stores.DocumentRecord, outputPDF []byte) (string, error) {
	outputKey := strings.TrimSpace(document.RemediationOutputKey)
	if outputKey == "" {
		outputKey = remediatedObjectKeyForSource(strings.TrimSpace(document.SourceObjectKey))
	}
	if _, err := s.objects.UploadFile(ctx, outputKey, outputPDF,
		uploader.WithContentType("application/pdf"),
		uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
	); err != nil {
		return "", fmt.Errorf("persist remediation output: %w", err)
	}
	return outputKey, nil
}

func (s PDFRemediationService) completePDFRemediation(
	ctx context.Context,
	scope stores.Scope,
	state pdfRemediationState,
	analysis PDFAnalysis,
	outputKey string,
) (PDFRemediationResult, error) {
	compatibility := resolveDocumentCompatibility(s.pdfs.Policy(ctx, scope), stores.DocumentRecord{
		PDFCompatibilityTier:   strings.TrimSpace(string(analysis.CompatibilityTier)),
		PDFCompatibilityReason: strings.TrimSpace(string(analysis.ReasonCode)),
		PDFNormalizationStatus: strings.TrimSpace(string(PDFNormalizationStatusCompleted)),
	})
	completedAt := s.now().UTC()
	successPatch := documentMetadataPatchFromRecord(state.document)
	successPatch.NormalizedObjectKey = outputKey
	successPatch.PDFCompatibilityTier = strings.TrimSpace(string(compatibility.Tier))
	successPatch.PDFCompatibilityReason = strings.TrimSpace(compatibility.Reason)
	successPatch.PDFNormalizationStatus = strings.TrimSpace(string(PDFNormalizationStatusCompleted))
	successPatch.PDFAnalyzedAt = cloneDocumentTimePtr(completedAt)
	successPatch.PDFPolicyVersion = PDFPolicyVersion
	successPatch.SizeBytes = analysis.SizeBytes
	successPatch.PageCount = analysis.PageCount
	successPatch.RemediationStatus = PDFRemediationStatusSucceeded
	successPatch.RemediationActorID = state.request.actorID
	successPatch.RemediationCommandID = state.request.commandID
	successPatch.RemediationDispatchID = state.request.dispatchID
	successPatch.RemediationExecMode = state.request.executionMode
	successPatch.RemediationCorrelation = state.request.correlationID
	successPatch.RemediationFailure = ""
	successPatch.RemediationRequestedAt = cloneDocumentTimePtr(state.request.requestedAt)
	successPatch.RemediationStartedAt = cloneDocumentTimePtr(state.startedAt)
	successPatch.RemediationCompletedAt = cloneDocumentTimePtr(completedAt)
	successPatch.RemediationOriginalKey = strings.TrimSpace(state.document.SourceObjectKey)
	successPatch.RemediationOutputKey = outputKey

	updated, err := s.documents.SaveMetadata(ctx, scope, state.request.documentID, successPatch)
	if err != nil {
		_ = s.emitLifecycle(ctx, state.request.agreementID, state.request.actorID, PDFRemediationStatusFailed, s.now().UTC(), state.request.baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}
	if emitErr := s.emitLifecycle(ctx, state.request.agreementID, state.request.actorID, PDFRemediationStatusSucceeded, completedAt, state.request.baseMeta, ""); emitErr != nil {
		return PDFRemediationResult{}, emitErr
	}
	return PDFRemediationResult{
		Document:        updated,
		Compatibility:   compatibility,
		Analysis:        analysis,
		OutputObjectKey: outputKey,
	}, nil
}

func (s PDFRemediationService) failStartedPDFRemediation(
	ctx context.Context,
	scope stores.Scope,
	state pdfRemediationState,
	err error,
) error {
	_ = s.persistFailureState(
		ctx,
		scope,
		state.request.documentID,
		state.document,
		state.request.actorID,
		state.request.commandID,
		state.request.dispatchID,
		state.request.executionMode,
		state.request.correlationID,
		state.request.requestedAt,
		state.startedAt,
		err.Error(),
	)
	_ = s.emitLifecycle(ctx, state.request.agreementID, state.request.actorID, PDFRemediationStatusFailed, s.now().UTC(), state.request.baseMeta, err.Error())
	return err
}

func (s PDFRemediationService) emitLifecycle(
	ctx context.Context,
	agreementID string,
	actorID string,
	status string,
	occurredAt time.Time,
	metadata map[string]any,
	failure string,
) error {
	metadata = cloneRemediationMetadata(metadata)
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadata["status"] = strings.TrimSpace(status)
	if strings.TrimSpace(failure) != "" {
		metadata["failure"] = trimRemediationFailure(failure)
	}
	observability.ObserveRemediationLifecycle(ctx, strings.TrimSpace(status), strings.TrimSpace(failure))

	if s.activity != nil {
		actor := strings.TrimSpace(actorID)
		if actor == "" {
			actor = "system"
		}
		if err := s.activity.Record(ctx, coreadmin.ActivityEntry{
			Actor:     actor,
			Action:    "esign.pdf_remediation." + strings.TrimSpace(status),
			Object:    "document:" + strings.TrimSpace(fmt.Sprint(metadata["document_id"])),
			Metadata:  cloneRemediationMetadata(metadata),
			CreatedAt: occurredAt.UTC(),
		}); err != nil {
			return err
		}
	}

	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" || s.audits == nil {
		return nil
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	actorType := "system"
	if strings.TrimSpace(actorID) != "" {
		actorType = "user"
	}
	scope := stores.Scope{
		TenantID: strings.TrimSpace(fmt.Sprint(metadata["tenant_id"])),
		OrgID:    strings.TrimSpace(fmt.Sprint(metadata["org_id"])),
	}
	if _, err := s.audits.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  agreementID,
		EventType:    "document.remediation." + strings.TrimSpace(status),
		ActorType:    actorType,
		ActorID:      strings.TrimSpace(actorID),
		MetadataJSON: string(payload),
		CreatedAt:    occurredAt.UTC(),
	}); err != nil {
		return err
	}
	if s.projector != nil {
		return s.projector.ProjectAgreement(ctx, scope, agreementID)
	}
	return nil
}

func (s PDFRemediationService) persistFailureState(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
	current stores.DocumentRecord,
	actorID string,
	commandID string,
	dispatchID string,
	executionMode string,
	correlationID string,
	requestedAt time.Time,
	startedAt time.Time,
	failure string,
) error {
	completedAt := s.now().UTC()
	patch := documentMetadataPatchFromRecord(current)
	patch.RemediationStatus = PDFRemediationStatusFailed
	patch.RemediationActorID = strings.TrimSpace(actorID)
	patch.RemediationCommandID = strings.TrimSpace(commandID)
	patch.RemediationDispatchID = strings.TrimSpace(dispatchID)
	patch.RemediationExecMode = strings.TrimSpace(executionMode)
	patch.RemediationCorrelation = strings.TrimSpace(correlationID)
	patch.RemediationFailure = trimRemediationFailure(failure)
	patch.RemediationRequestedAt = cloneDocumentTimePtr(requestedAt)
	if !startedAt.IsZero() {
		patch.RemediationStartedAt = cloneDocumentTimePtr(startedAt)
	}
	patch.RemediationCompletedAt = cloneDocumentTimePtr(completedAt)
	if strings.TrimSpace(patch.RemediationOriginalKey) == "" {
		patch.RemediationOriginalKey = strings.TrimSpace(current.SourceObjectKey)
	}
	_, err := s.documents.SaveMetadata(ctx, scope, documentID, patch)
	return err
}

func (s PDFRemediationService) runWithLeaseHeartbeat(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
	lease stores.DocumentRemediationLeaseToken,
	run func(context.Context) (PDFRemediationRunResult, error),
) (PDFRemediationRunResult, stores.DocumentRemediationLeaseToken, error) {
	ttl := s.leaseTTL
	if ttl <= 0 {
		ttl = defaultPDFRemediationLeaseTTL
	}
	renewEvery := max(ttl/2, 500*time.Millisecond)

	var (
		leaseMu sync.Mutex
	)
	setLease := func(next stores.DocumentRemediationLeaseToken) {
		leaseMu.Lock()
		lease = next
		leaseMu.Unlock()
	}
	getLease := func() stores.DocumentRemediationLeaseToken {
		leaseMu.Lock()
		defer leaseMu.Unlock()
		return lease
	}

	opCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	renewErrCh := make(chan error, 1)
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(renewEvery)
		defer ticker.Stop()
		for {
			select {
			case <-opCtx.Done():
				return
			case <-ticker.C:
				renewed, err := s.leases.RenewDocumentRemediationLease(opCtx, scope, documentID, stores.DocumentRemediationLeaseRenewInput{
					Now:   s.now().UTC(),
					TTL:   ttl,
					Lease: getLease(),
				})
				if err != nil {
					select {
					case renewErrCh <- err:
					default:
					}
					cancel()
					return
				}
				setLease(renewed.Lease)
			}
		}
	}()

	result, runErr := run(opCtx)
	cancel()
	<-done

	lease = getLease()
	select {
	case renewErr := <-renewErrCh:
		if runErr == nil {
			runErr = renewErr
		}
	default:
	}
	return result, lease, runErr
}

func (s PDFRemediationService) workerID(correlationID string) string {
	prefix := strings.TrimSpace(s.workerPref)
	if prefix == "" {
		prefix = "esign.pdf.remediation"
	}
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	return prefix + ":" + correlationID
}

func remediationLifecycleMetadata(scope stores.Scope, documentID, commandID, dispatchID, correlationID, executionMode string) map[string]any {
	return map[string]any{
		"tenant_id":      strings.TrimSpace(scope.TenantID),
		"org_id":         strings.TrimSpace(scope.OrgID),
		"document_id":    strings.TrimSpace(documentID),
		"command_id":     strings.TrimSpace(commandID),
		"dispatch_id":    strings.TrimSpace(dispatchID),
		"correlation_id": strings.TrimSpace(correlationID),
		"execution_mode": strings.TrimSpace(executionMode),
	}
}

func documentMetadataPatchFromRecord(record stores.DocumentRecord) stores.DocumentMetadataPatch {
	return stores.DocumentMetadataPatch{
		NormalizedObjectKey:    strings.TrimSpace(record.NormalizedObjectKey),
		PDFCompatibilityTier:   strings.TrimSpace(record.PDFCompatibilityTier),
		PDFCompatibilityReason: strings.TrimSpace(record.PDFCompatibilityReason),
		PDFNormalizationStatus: strings.TrimSpace(record.PDFNormalizationStatus),
		PDFAnalyzedAt:          cloneTimePtr(record.PDFAnalyzedAt),
		PDFPolicyVersion:       strings.TrimSpace(record.PDFPolicyVersion),
		RemediationStatus:      strings.TrimSpace(record.RemediationStatus),
		RemediationActorID:     strings.TrimSpace(record.RemediationActorID),
		RemediationCommandID:   strings.TrimSpace(record.RemediationCommandID),
		RemediationDispatchID:  strings.TrimSpace(record.RemediationDispatchID),
		RemediationExecMode:    strings.TrimSpace(record.RemediationExecMode),
		RemediationCorrelation: strings.TrimSpace(record.RemediationCorrelation),
		RemediationFailure:     strings.TrimSpace(record.RemediationFailure),
		RemediationOriginalKey: strings.TrimSpace(record.RemediationOriginalKey),
		RemediationOutputKey:   strings.TrimSpace(record.RemediationOutputKey),
		RemediationRequestedAt: cloneTimePtr(record.RemediationRequestedAt),
		RemediationStartedAt:   cloneTimePtr(record.RemediationStartedAt),
		RemediationCompletedAt: cloneTimePtr(record.RemediationCompletedAt),
		SizeBytes:              record.SizeBytes,
		PageCount:              record.PageCount,
	}
}

func remediatedObjectKeyForSource(sourceObjectKey string) string {
	sourceObjectKey = strings.TrimSpace(sourceObjectKey)
	if sourceObjectKey == "" {
		return ""
	}
	ext := strings.ToLower(strings.TrimSpace(filepathExt(sourceObjectKey)))
	if ext == ".pdf" {
		return strings.TrimSuffix(sourceObjectKey, filepathExt(sourceObjectKey)) + ".remediated.pdf"
	}
	return sourceObjectKey + ".remediated.pdf"
}

func filepathExt(value string) string {
	lastDot := strings.LastIndex(value, ".")
	if lastDot < 0 {
		return ""
	}
	return value[lastDot:]
}

func trimRemediationFailure(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 1024 {
		return value
	}
	return value[:1024]
}

func cloneRemediationMetadata(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

func observeRemediationLockSignal(ctx context.Context, err error) {
	signal := remediationLockSignalFromError(err)
	if signal == "" {
		return
	}
	observability.ObserveRemediationLockSignal(ctx, signal)
}

func remediationLockSignalFromError(err error) string {
	if err == nil {
		return ""
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "timeout"
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) && coded != nil {
		switch strings.ToLower(strings.TrimSpace(coded.TextCode)) {
		case "document_remediation_lease_conflict", "document_remediation_lease_lost":
			return "contention"
		}
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(msg, "lease conflict"), strings.Contains(msg, "lease lost"):
		return "contention"
	case strings.Contains(msg, "deadline exceeded"), strings.Contains(msg, "timed out"), strings.Contains(msg, "timeout"):
		return "timeout"
	default:
		return ""
	}
}

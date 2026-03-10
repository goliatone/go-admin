package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
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
	DocumentID    string
	AgreementID   string
	ActorID       string
	CommandID     string
	DispatchID    string
	CorrelationID string
	ExecutionMode string
	RequestedAt   *time.Time
	Force         bool
}

// PDFRemediationResult captures remediation outcome metadata.
type PDFRemediationResult struct {
	Document        stores.DocumentRecord
	Compatibility   PDFCompatibilityStatus
	Analysis        PDFAnalysis
	OutputObjectKey string
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
	if s.documents == nil {
		return PDFRemediationResult{}, domainValidationError("documents", "store", "not configured")
	}
	if s.leases == nil {
		return PDFRemediationResult{}, domainValidationError("document_remediation", "lease_store", "not configured")
	}
	if s.objects == nil {
		return PDFRemediationResult{}, domainValidationError("documents", "object_store", "not configured")
	}
	if s.runner == nil {
		return PDFRemediationResult{}, domainValidationError("document_remediation", "runner", "not configured")
	}

	documentID := strings.TrimSpace(input.DocumentID)
	if documentID == "" {
		return PDFRemediationResult{}, domainValidationError("documents", "document_id", "required")
	}
	commandID := strings.TrimSpace(input.CommandID)
	if commandID == "" {
		commandID = "esign.pdf.remediate"
	}
	correlationID := observability.ResolveCorrelationID(strings.TrimSpace(input.CorrelationID), commandID, documentID)
	executionMode := strings.ToLower(strings.TrimSpace(input.ExecutionMode))
	if executionMode == "" {
		executionMode = "inline"
	}
	dispatchID := strings.TrimSpace(input.DispatchID)
	actorID := strings.TrimSpace(input.ActorID)
	agreementID := strings.TrimSpace(input.AgreementID)
	requestedAt := s.now().UTC()
	if input.RequestedAt != nil && !input.RequestedAt.IsZero() {
		requestedAt = input.RequestedAt.UTC()
	}

	baseMeta := remediationLifecycleMetadata(scope, documentID, commandID, dispatchID, correlationID, executionMode)
	if emitErr := s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusRequested, requestedAt, baseMeta, ""); emitErr != nil {
		return PDFRemediationResult{}, emitErr
	}

	document, err := s.documents.Get(ctx, scope, documentID)
	if err != nil {
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}

	workerID := s.workerID(correlationID)
	claim, err := s.leases.AcquireDocumentRemediationLease(ctx, scope, documentID, stores.DocumentRemediationLeaseAcquireInput{
		Now:           s.now().UTC(),
		TTL:           s.leaseTTL,
		WorkerID:      workerID,
		CorrelationID: correlationID,
	})
	if err != nil {
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}
	currentLease := claim.Lease
	defer func() {
		releaseErr := s.leases.ReleaseDocumentRemediationLease(ctx, scope, documentID, stores.DocumentRemediationLeaseReleaseInput{
			Now:   s.now().UTC(),
			Lease: currentLease,
		})
		if releaseErr == nil {
			return
		}
		if err == nil {
			err = releaseErr
			return
		}
		err = errors.Join(err, releaseErr)
	}()

	startedAt := s.now().UTC()
	startPatch := documentMetadataPatchFromRecord(document)
	startPatch.RemediationStatus = PDFRemediationStatusStarted
	startPatch.RemediationActorID = actorID
	startPatch.RemediationCommandID = commandID
	startPatch.RemediationDispatchID = dispatchID
	startPatch.RemediationExecMode = executionMode
	startPatch.RemediationCorrelation = correlationID
	startPatch.RemediationFailure = ""
	if strings.TrimSpace(startPatch.RemediationOriginalKey) == "" {
		startPatch.RemediationOriginalKey = strings.TrimSpace(document.SourceObjectKey)
	}
	startPatch.RemediationRequestedAt = cloneDocumentTimePtr(requestedAt)
	startPatch.RemediationStartedAt = cloneDocumentTimePtr(startedAt)
	startPatch.RemediationCompletedAt = nil

	document, err = s.documents.SaveMetadata(ctx, scope, documentID, startPatch)
	if err != nil {
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}
	if emitErr := s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusStarted, startedAt, baseMeta, ""); emitErr != nil {
		return PDFRemediationResult{}, emitErr
	}

	sourceKey := strings.TrimSpace(document.SourceObjectKey)
	if sourceKey == "" {
		err = domainValidationError("documents", "source_object_key", "required")
		_ = s.persistFailureState(ctx, scope, documentID, document, actorID, commandID, dispatchID, executionMode, correlationID, requestedAt, startedAt, err.Error())
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}

	sourcePDF, sourceErr := s.objects.GetFile(ctx, sourceKey)
	if sourceErr != nil || len(sourcePDF) == 0 {
		err = fmt.Errorf("load remediation source pdf: %w", sourceErr)
		if sourceErr == nil {
			err = fmt.Errorf("load remediation source pdf: payload unavailable")
		}
		_ = s.persistFailureState(ctx, scope, documentID, document, actorID, commandID, dispatchID, executionMode, correlationID, requestedAt, startedAt, err.Error())
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}
	if expected := strings.TrimSpace(document.SourceSHA256); expected != "" {
		sum := sha256.Sum256(sourcePDF)
		if got := hex.EncodeToString(sum[:]); !strings.EqualFold(got, expected) {
			err = fmt.Errorf("remediation source digest mismatch")
			_ = s.persistFailureState(ctx, scope, documentID, document, actorID, commandID, dispatchID, executionMode, correlationID, requestedAt, startedAt, err.Error())
			_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
			return PDFRemediationResult{}, err
		}
	}

	runResult, finalLease, runErr := s.runWithLeaseHeartbeat(ctx, scope, documentID, currentLease, func(opCtx context.Context) (PDFRemediationRunResult, error) {
		return s.runner.Run(opCtx, PDFRemediationRunInput{SourcePDF: sourcePDF})
	})
	currentLease = finalLease
	if runErr != nil {
		err = runErr
		_ = s.persistFailureState(ctx, scope, documentID, document, actorID, commandID, dispatchID, executionMode, correlationID, requestedAt, startedAt, err.Error())
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}

	analysis, analyzeErr := s.pdfs.Analyze(ctx, scope, runResult.OutputPDF)
	if analyzeErr != nil {
		err = analyzeErr
		_ = s.persistFailureState(ctx, scope, documentID, document, actorID, commandID, dispatchID, executionMode, correlationID, requestedAt, startedAt, err.Error())
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}

	outputKey := strings.TrimSpace(document.RemediationOutputKey)
	if outputKey == "" {
		outputKey = remediatedObjectKeyForSource(sourceKey)
	}
	if _, uploadErr := s.objects.UploadFile(ctx, outputKey, runResult.OutputPDF,
		uploader.WithContentType("application/pdf"),
		uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
	); uploadErr != nil {
		err = fmt.Errorf("persist remediation output: %w", uploadErr)
		_ = s.persistFailureState(ctx, scope, documentID, document, actorID, commandID, dispatchID, executionMode, correlationID, requestedAt, startedAt, err.Error())
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}

	compatibility := resolveDocumentCompatibility(s.pdfs.Policy(ctx, scope), stores.DocumentRecord{
		PDFCompatibilityTier:   strings.TrimSpace(string(analysis.CompatibilityTier)),
		PDFCompatibilityReason: strings.TrimSpace(string(analysis.ReasonCode)),
		PDFNormalizationStatus: strings.TrimSpace(string(PDFNormalizationStatusCompleted)),
	})
	completedAt := s.now().UTC()
	successPatch := documentMetadataPatchFromRecord(document)
	successPatch.NormalizedObjectKey = outputKey
	successPatch.PDFCompatibilityTier = strings.TrimSpace(string(compatibility.Tier))
	successPatch.PDFCompatibilityReason = strings.TrimSpace(compatibility.Reason)
	successPatch.PDFNormalizationStatus = strings.TrimSpace(string(PDFNormalizationStatusCompleted))
	successPatch.PDFAnalyzedAt = cloneDocumentTimePtr(completedAt)
	successPatch.PDFPolicyVersion = PDFPolicyVersion
	successPatch.SizeBytes = analysis.SizeBytes
	successPatch.PageCount = analysis.PageCount
	successPatch.RemediationStatus = PDFRemediationStatusSucceeded
	successPatch.RemediationActorID = actorID
	successPatch.RemediationCommandID = commandID
	successPatch.RemediationDispatchID = dispatchID
	successPatch.RemediationExecMode = executionMode
	successPatch.RemediationCorrelation = correlationID
	successPatch.RemediationFailure = ""
	successPatch.RemediationRequestedAt = cloneDocumentTimePtr(requestedAt)
	successPatch.RemediationStartedAt = cloneDocumentTimePtr(startedAt)
	successPatch.RemediationCompletedAt = cloneDocumentTimePtr(completedAt)
	successPatch.RemediationOriginalKey = strings.TrimSpace(document.SourceObjectKey)
	successPatch.RemediationOutputKey = outputKey

	updated, saveErr := s.documents.SaveMetadata(ctx, scope, documentID, successPatch)
	if saveErr != nil {
		err = saveErr
		_ = s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusFailed, s.now().UTC(), baseMeta, err.Error())
		return PDFRemediationResult{}, err
	}
	if emitErr := s.emitLifecycle(ctx, agreementID, actorID, PDFRemediationStatusSucceeded, completedAt, baseMeta, ""); emitErr != nil {
		return PDFRemediationResult{}, emitErr
	}

	return PDFRemediationResult{
		Document:        updated,
		Compatibility:   compatibility,
		Analysis:        analysis,
		OutputObjectKey: outputKey,
	}, nil
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
		AgreementID: agreementID,
		EventType:   "document.remediation." + strings.TrimSpace(status),
		ActorType:   actorType,
		ActorID:     strings.TrimSpace(actorID),
		MetadataJSON: string(payload),
		CreatedAt:   occurredAt.UTC(),
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
	renewEvery := ttl / 2
	if renewEvery < 500*time.Millisecond {
		renewEvery = 500 * time.Millisecond
	}

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
	for key, value := range in {
		out[key] = value
	}
	return out
}

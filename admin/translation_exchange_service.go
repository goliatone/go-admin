package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"
)

var (
	// ErrTranslationExchangeLinkageNotFound indicates missing deterministic row linkage.
	ErrTranslationExchangeLinkageNotFound = errors.New("translation exchange linkage not found")
)

type TranslationExchangeLinkageKey struct {
	Resource     string `json:"resource"`
	EntityID     string `json:"entity_id"`
	FamilyID     string `json:"family_id"`
	TargetLocale string `json:"target_locale"`
	FieldPath    string `json:"field_path"`
}

func (k TranslationExchangeLinkageKey) String() string {
	return strings.Join([]string{
		strings.TrimSpace(k.Resource),
		strings.TrimSpace(k.EntityID),
		strings.TrimSpace(k.FamilyID),
		strings.TrimSpace(k.TargetLocale),
		strings.TrimSpace(k.FieldPath),
	}, "::")
}

type TranslationExchangeLinkage struct {
	Key          TranslationExchangeLinkageKey `json:"key"`
	SourceHash   string                        `json:"source_hash"`
	TargetExists bool                          `json:"target_exists"`
}

type TranslationExchangeApplyRequest struct {
	Key               TranslationExchangeLinkageKey `json:"key"`
	TranslatedText    string                        `json:"translated_text"`
	CreateTranslation bool                          `json:"create_translation"`
	WorkflowStatus    string                        `json:"workflow_status"`
	Path              string                        `json:"path,omitempty"`
	RouteKey          string                        `json:"route_key,omitempty"`
}

// TranslationExchangeStore abstracts deterministic linkage resolution and row writes.
type TranslationExchangeStore interface {
	ExportRows(ctx context.Context, filter TranslationExportFilter) ([]TranslationExchangeRow, error)
	ResolveLinkage(ctx context.Context, key TranslationExchangeLinkageKey) (TranslationExchangeLinkage, error)
	ApplyTranslation(ctx context.Context, req TranslationExchangeApplyRequest) error
}

// TranslationExchangeService contains transport-agnostic exchange domain behavior.
type TranslationExchangeService struct {
	store    TranslationExchangeStore
	ledger   translationExchangeApplyRecordStore
	applyMu  sync.Mutex
	applied  map[string]translationExchangeAppliedRecord
	inFlight map[string]*translationExchangeApplyFlight
}

type TranslationExchangeServiceOption func(*TranslationExchangeService)

type translationExchangeApplyRecordStore interface {
	LookupApplyRecord(context.Context, translationTransportIdentity, string, string) (translationExchangeAppliedRecord, bool, error)
	RecordApplyRecord(context.Context, translationTransportIdentity, translationExchangeAppliedRecord) (translationExchangeAppliedRecord, bool, error)
}

func WithTranslationExchangeApplyRecordStore(store translationExchangeApplyRecordStore) TranslationExchangeServiceOption {
	return func(s *TranslationExchangeService) {
		if s != nil {
			s.ledger = store
		}
	}
}

func NewTranslationExchangeService(store TranslationExchangeStore, opts ...TranslationExchangeServiceOption) *TranslationExchangeService {
	service := &TranslationExchangeService{
		store:    store,
		applied:  map[string]translationExchangeAppliedRecord{},
		inFlight: map[string]*translationExchangeApplyFlight{},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(service)
		}
	}
	return service
}

type translationExchangeAppliedRecord struct {
	LinkageKey  string                          `json:"linkage_key"`
	PayloadHash string                          `json:"payload_hash"`
	Request     TranslationExchangeApplyRequest `json:"request"`
	AppliedAt   time.Time                       `json:"applied_at"`
}

type translationExchangeApplyFlight struct {
	done chan struct{}
}

func (s *TranslationExchangeService) Export(ctx context.Context, input TranslationExportInput) (TranslationExportResult, error) {
	if s == nil || s.store == nil {
		return TranslationExportResult{}, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}
	rows, err := s.store.ExportRows(ctx, input.Filter)
	if err != nil {
		return TranslationExportResult{}, err
	}
	if input.Filter.IncludeSourceHash {
		for i := range rows {
			if strings.TrimSpace(rows[i].SourceHash) == "" {
				rows[i].SourceHash = translationExchangeSourceHash(rows[i].SourceText)
			}
		}
	}
	return TranslationExportResult{
		RowCount: len(rows),
		Rows:     rows,
	}, nil
}

func (s *TranslationExchangeService) ValidateImport(ctx context.Context, input TranslationImportValidateInput) (TranslationExchangeResult, error) {
	if s == nil || s.store == nil {
		return TranslationExchangeResult{}, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}
	result := TranslationExchangeResult{
		Results:   make([]TranslationExchangeRowResult, 0, len(input.Rows)),
		TotalRows: len(input.Rows),
	}
	seen := map[string]int{}
	for i, row := range input.Rows {
		rowResult := translationExchangeRowResult(i, row)
		result.Add(s.validateImportRow(ctx, row, rowResult, seen))
	}
	return result, nil
}

func (s *TranslationExchangeService) validateImportRow(
	ctx context.Context,
	row TranslationExchangeRow,
	rowResult TranslationExchangeRowResult,
	seen map[string]int,
) TranslationExchangeRowResult {
	key, err := ResolveTranslationExchangeLinkageKey(row)
	if err != nil {
		return translationExchangeInvalidPayloadResult(rowResult, err)
	}
	if duplicateResult, duplicate := translationExchangeDuplicateRowResult(rowResult, key, seen); duplicate {
		return duplicateResult
	}
	linkage, err := s.store.ResolveLinkage(ctx, key)
	if err != nil {
		return translationExchangeLinkageErrorResult(rowResult, err)
	}
	if hasSourceHashConflict(row, linkage) {
		return translationExchangeStaleSourceResult(rowResult, linkage, normalizeProvidedSourceHash(row))
	}
	rowResult.Status = translationExchangeRowStatusSuccess
	rowResult.Metadata = map[string]any{
		"linkage_key":             key.String(),
		"target_exists":           linkage.TargetExists,
		"create_translation_hint": !linkage.TargetExists,
		"source_hash_present":     strings.TrimSpace(linkage.SourceHash) != "",
		"no_auto_publish":         true,
	}
	return rowResult
}

func translationExchangeInvalidPayloadResult(rowResult TranslationExchangeRowResult, err error) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusError
	rowResult.Error = err.Error()
	rowResult.Metadata = map[string]any{
		"error_code": TextCodeTranslationExchangeInvalidPayload,
	}
	return rowResult
}

func translationExchangeDuplicateRowResult(
	rowResult TranslationExchangeRowResult,
	key TranslationExchangeLinkageKey,
	seen map[string]int,
) (TranslationExchangeRowResult, bool) {
	keyString := key.String()
	if firstIndex, duplicate := seen[keyString]; duplicate {
		rowResult.Status = translationExchangeRowStatusConflict
		rowResult.Error = "duplicate row linkage in import payload"
		rowResult.Conflict = &TranslationExchangeConflictInfo{
			Type:    translationExchangeConflictTypeDuplicateRow,
			Message: "duplicate linkage key in import payload",
		}
		rowResult.Metadata = map[string]any{
			"error_code":       TextCodeTranslationExchangeDuplicateRow,
			"duplicate_of_row": firstIndex,
		}
		return rowResult, true
	}
	seen[keyString] = rowResult.Index
	return rowResult, false
}

func translationExchangeLinkageErrorResult(rowResult TranslationExchangeRowResult, err error) TranslationExchangeRowResult {
	if errors.Is(err, ErrTranslationExchangeLinkageNotFound) || errors.Is(err, ErrNotFound) {
		rowResult.Status = translationExchangeRowStatusConflict
		rowResult.Error = "row linkage could not be resolved"
		rowResult.Conflict = &TranslationExchangeConflictInfo{
			Type:    translationExchangeConflictTypeMissingLinkage,
			Message: "resource/entity linkage not found",
		}
		rowResult.Metadata = map[string]any{
			"error_code": TextCodeTranslationExchangeMissingLinkage,
		}
		return rowResult
	}
	rowResult.Status = translationExchangeRowStatusError
	rowResult.Error = err.Error()
	return rowResult
}

func translationExchangeStaleSourceResult(
	rowResult TranslationExchangeRowResult,
	linkage TranslationExchangeLinkage,
	providedSourceHash string,
) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusConflict
	rowResult.Error = "source hash mismatch"
	rowResult.Conflict = &TranslationExchangeConflictInfo{
		Type:               translationExchangeConflictTypeStaleSource,
		Message:            "source hash mismatch",
		CurrentSourceHash:  strings.TrimSpace(linkage.SourceHash),
		ProvidedSourceHash: providedSourceHash,
	}
	rowResult.Metadata = map[string]any{
		"error_code":           TextCodeTranslationExchangeStaleSourceHash,
		"current_source_hash":  strings.TrimSpace(linkage.SourceHash),
		"provided_source_hash": providedSourceHash,
	}
	return rowResult
}

func (s *TranslationExchangeService) ApplyImport(ctx context.Context, input TranslationImportApplyInput) (TranslationExchangeResult, error) {
	if s == nil || s.store == nil {
		return TranslationExchangeResult{}, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}

	result := TranslationExchangeResult{
		Results:   make([]TranslationExchangeRowResult, 0, len(input.Rows)),
		TotalRows: len(input.Rows),
	}
	seen := map[string]int{}
	resolutions := translationExchangeResolutionMap(input.Resolutions)

	for i, row := range input.Rows {
		outcome, err := s.applyImportRow(ctx, input, row, i, seen, resolutions)
		if err != nil {
			return TranslationExchangeResult{}, err
		}
		result.Add(outcome.RowResult)
		if outcome.TerminalStop {
			appendSkippedRows(&result, input.Rows, i+1)
			break
		}
	}

	return result, nil
}

func translationExchangeResolutionMap(resolutions []TranslationExchangeConflictResolution) map[int]TranslationExchangeConflictResolution {
	if len(resolutions) == 0 {
		return nil
	}
	out := make(map[int]TranslationExchangeConflictResolution, len(resolutions))
	for _, resolution := range resolutions {
		if resolution.Row < 0 {
			continue
		}
		out[resolution.Row] = resolution
	}
	return out
}

func translationExchangeResolutionForRow(
	resolutions map[int]TranslationExchangeConflictResolution,
	row int,
) *TranslationExchangeConflictResolution {
	if len(resolutions) == 0 {
		return nil
	}
	resolution, ok := resolutions[row]
	if !ok {
		return nil
	}
	return &resolution
}

func translationExchangeResolutionAllows(
	resolution *TranslationExchangeConflictResolution,
	target string,
) bool {
	if resolution == nil {
		return false
	}
	return strings.TrimSpace(resolution.Decision) == strings.TrimSpace(target)
}

type translationExchangeApplyRowOutcome struct {
	RowResult      TranslationExchangeRowResult `json:"row_result"`
	SeenKey        string                       `json:"seen_key"`
	SeenRegistered bool                         `json:"seen_registered"`
	TerminalStop   bool                         `json:"terminal_stop"`
}

type translationExchangePreparedApplyRow struct {
	RowResult               TranslationExchangeRowResult
	RowResolution           *TranslationExchangeConflictResolution
	Key                     TranslationExchangeLinkageKey
	KeyString               string
	Linkage                 TranslationExchangeLinkage
	AllowSourceHashOverride bool
	CreateTranslation       bool
	PayloadHash             string
}

func (s *TranslationExchangeService) applyImportRow(
	ctx context.Context,
	input TranslationImportApplyInput,
	row TranslationExchangeRow,
	rowIndex int,
	seen map[string]int,
	resolutions map[int]TranslationExchangeConflictResolution,
) (translationExchangeApplyRowOutcome, error) {
	rowResult := translationExchangeRowResult(rowIndex, row)
	rowResolution := translationExchangeResolutionForRow(resolutions, rowResult.Index)
	if rowResolution != nil && strings.TrimSpace(rowResolution.Decision) == translationExchangeResolutionSkip {
		return translationExchangeApplyRowOutcome{
			RowResult: translationExchangeSkippedApplyRowResult(rowResult),
		}, nil
	}
	prepared, outcome := s.prepareImportRow(ctx, input, row, seen, rowResult, rowResolution)
	if outcome != nil {
		return *outcome, nil
	}
	if input.DryRun {
		return translationExchangeRegisteredApplyOutcome(translationExchangeApplyRowOutcome{
			RowResult: translationExchangeDryRunApplyRowResult(
				prepared.RowResult,
				prepared.Key,
				prepared.PayloadHash,
				prepared.CreateTranslation,
				prepared.AllowSourceHashOverride,
				row,
				prepared.RowResolution,
				prepared.Linkage,
			),
		}, prepared.KeyString), nil
	}
	return s.executeImportRow(ctx, input, row, prepared)
}

func (s *TranslationExchangeService) prepareImportRow(
	ctx context.Context,
	input TranslationImportApplyInput,
	row TranslationExchangeRow,
	seen map[string]int,
	rowResult TranslationExchangeRowResult,
	rowResolution *TranslationExchangeConflictResolution,
) (translationExchangePreparedApplyRow, *translationExchangeApplyRowOutcome) {
	key, err := ResolveTranslationExchangeLinkageKey(row)
	if err != nil {
		rowResult.Status = translationExchangeRowStatusError
		rowResult.Error = err.Error()
		rowResult.Metadata = map[string]any{
			"error_code": TextCodeTranslationExchangeInvalidPayload,
		}
		outcome := translationExchangeApplyStopOutcome(rowResult, input)
		return translationExchangePreparedApplyRow{}, &outcome
	}
	keyString := key.String()
	if firstIndex, duplicate := seen[keyString]; duplicate {
		outcome := translationExchangeApplyStopOutcome(
			translationExchangeDuplicateApplyRowResult(rowResult, firstIndex),
			input,
		)
		return translationExchangePreparedApplyRow{}, &outcome
	}
	seen[keyString] = rowResult.Index
	linkage, err := s.store.ResolveLinkage(ctx, key)
	if err != nil {
		outcome := translationExchangeRegisteredApplyOutcome(
			translationExchangeApplyResolveLinkageOutcome(rowResult, err, input),
			keyString,
		)
		return translationExchangePreparedApplyRow{}, &outcome
	}
	allowSourceHashOverride := input.AllowSourceHashOverride ||
		translationExchangeResolutionAllows(rowResolution, translationExchangeResolutionOverrideSourceHash)
	if !allowSourceHashOverride && hasSourceHashConflict(row, linkage) {
		outcome := translationExchangeRegisteredApplyOutcome(
			translationExchangeApplyStopOutcome(
				translationExchangeStaleSourceResult(rowResult, linkage, normalizeProvidedSourceHash(row)),
				input,
			),
			keyString,
		)
		return translationExchangePreparedApplyRow{}, &outcome
	}
	createTranslation := !linkage.TargetExists
	payloadHash := translationExchangeApplyPayloadHash(strings.TrimSpace(row.TranslatedText), createTranslation, translationExchangeWorkflowDraft, row.Path, row.RouteKey)
	allowCreateMissing := row.CreateTranslation ||
		input.AllowCreateMissing ||
		translationExchangeResolutionAllows(rowResolution, translationExchangeResolutionCreateMissing)
	if createTranslation && !allowCreateMissing {
		outcome := translationExchangeRegisteredApplyOutcome(
			translationExchangeApplyStopOutcome(
				translationExchangeCreateRequiredApplyRowResult(rowResult, key, payloadHash),
				input,
			),
			keyString,
		)
		return translationExchangePreparedApplyRow{}, &outcome
	}
	return translationExchangePreparedApplyRow{
		RowResult:               rowResult,
		RowResolution:           rowResolution,
		Key:                     key,
		KeyString:               keyString,
		Linkage:                 linkage,
		AllowSourceHashOverride: allowSourceHashOverride,
		CreateTranslation:       createTranslation,
		PayloadHash:             payloadHash,
	}, nil
}

func (s *TranslationExchangeService) executeImportRow(
	ctx context.Context,
	input TranslationImportApplyInput,
	row TranslationExchangeRow,
	prepared translationExchangePreparedApplyRow,
) (translationExchangeApplyRowOutcome, error) {
	applyReq := TranslationExchangeApplyRequest{
		Key:               prepared.Key,
		TranslatedText:    strings.TrimSpace(row.TranslatedText),
		CreateTranslation: prepared.CreateTranslation,
		WorkflowStatus:    translationExchangeWorkflowDraft,
		Path:              strings.TrimSpace(row.Path),
		RouteKey:          strings.TrimSpace(row.RouteKey),
	}
	record, replay, err := s.applyTranslationIdempotently(ctx, applyReq, prepared.PayloadHash)
	if err != nil {
		prepared.RowResult.Status = translationExchangeRowStatusError
		prepared.RowResult.Error = err.Error()
		prepared.RowResult.Metadata = map[string]any{
			"linkage_key":  prepared.Key.String(),
			"payload_hash": prepared.PayloadHash,
		}
		return translationExchangeRegisteredApplyOutcome(
			translationExchangeApplyStopOutcome(prepared.RowResult, input),
			prepared.KeyString,
		), nil
	}
	return translationExchangeRegisteredApplyOutcome(translationExchangeApplyRowOutcome{
		RowResult: translationExchangeAppliedRowResult(
			prepared.RowResult,
			record,
			replay,
			prepared.AllowSourceHashOverride,
			row,
			prepared.RowResolution,
			prepared.Linkage,
		),
	}, prepared.KeyString), nil
}

func translationExchangeApplyStopOutcome(rowResult TranslationExchangeRowResult, input TranslationImportApplyInput) translationExchangeApplyRowOutcome {
	return translationExchangeApplyRowOutcome{
		RowResult:    rowResult,
		TerminalStop: !input.ContinueOnError,
	}
}

func translationExchangeRegisteredApplyOutcome(outcome translationExchangeApplyRowOutcome, key string) translationExchangeApplyRowOutcome {
	outcome.SeenKey = key
	outcome.SeenRegistered = true
	return outcome
}

func translationExchangeSkippedApplyRowResult(rowResult TranslationExchangeRowResult) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusSkipped
	rowResult.Error = "skipped by explicit retry resolution"
	rowResult.Metadata = map[string]any{
		"resolution_decision": translationExchangeResolutionSkip,
	}
	return rowResult
}

func translationExchangeDuplicateApplyRowResult(rowResult TranslationExchangeRowResult, firstIndex int) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusConflict
	rowResult.Error = "duplicate row linkage in import payload"
	rowResult.Conflict = &TranslationExchangeConflictInfo{
		Type:    translationExchangeConflictTypeDuplicateRow,
		Message: "duplicate linkage key in import payload",
	}
	rowResult.Metadata = map[string]any{
		"error_code":       TextCodeTranslationExchangeDuplicateRow,
		"duplicate_of_row": firstIndex,
	}
	return rowResult
}

func translationExchangeApplyResolveLinkageOutcome(rowResult TranslationExchangeRowResult, err error, input TranslationImportApplyInput) translationExchangeApplyRowOutcome {
	rowResult = translationExchangeLinkageErrorResult(rowResult, err)
	return translationExchangeApplyStopOutcome(rowResult, input)
}

func translationExchangeCreateRequiredApplyRowResult(rowResult TranslationExchangeRowResult, key TranslationExchangeLinkageKey, payloadHash string) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusError
	rowResult.Error = "target locale record missing; explicit create intent required"
	rowResult.Metadata = map[string]any{
		"create_translation_required": true,
		"error_code":                  TextCodeTranslationExchangeInvalidPayload,
		"linkage_key":                 key.String(),
		"payload_hash":                payloadHash,
	}
	return rowResult
}

func translationExchangeDryRunApplyRowResult(
	rowResult TranslationExchangeRowResult,
	key TranslationExchangeLinkageKey,
	payloadHash string,
	createTranslation bool,
	allowSourceHashOverride bool,
	row TranslationExchangeRow,
	rowResolution *TranslationExchangeConflictResolution,
	linkage TranslationExchangeLinkage,
) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusSuccess
	rowResult.Metadata = map[string]any{
		"dry_run":            true,
		"linkage_key":        key.String(),
		"payload_hash":       payloadHash,
		"no_auto_publish":    true,
		"create_translation": createTranslation,
	}
	translationExchangeApplyResolutionMetadata(rowResult.Metadata, allowSourceHashOverride, row, rowResolution, linkage)
	return rowResult
}

func translationExchangeAppliedRowResult(
	rowResult TranslationExchangeRowResult,
	record translationExchangeAppliedRecord,
	replay bool,
	allowSourceHashOverride bool,
	row TranslationExchangeRow,
	rowResolution *TranslationExchangeConflictResolution,
	linkage TranslationExchangeLinkage,
) TranslationExchangeRowResult {
	rowResult.Status = translationExchangeRowStatusSuccess
	rowResult.Metadata = map[string]any{
		"create_translation": record.Request.CreateTranslation,
		"workflow_status":    record.Request.WorkflowStatus,
		"idempotency_hit":    replay,
		"linkage_key":        record.LinkageKey,
		"payload_hash":       record.PayloadHash,
		"applied_at":         record.AppliedAt.UTC().Format(time.RFC3339Nano),
		"no_auto_publish":    true,
	}
	translationExchangeApplyResolutionMetadata(rowResult.Metadata, allowSourceHashOverride, row, rowResolution, linkage)
	return rowResult
}

func translationExchangeApplyResolutionMetadata(
	meta map[string]any,
	allowSourceHashOverride bool,
	row TranslationExchangeRow,
	rowResolution *TranslationExchangeConflictResolution,
	linkage TranslationExchangeLinkage,
) {
	if meta == nil {
		return
	}
	if allowSourceHashOverride && hasSourceHashConflict(row, linkage) {
		meta["source_hash_override"] = true
	}
	if rowResolution != nil && strings.TrimSpace(rowResolution.Decision) != "" {
		meta["resolution_decision"] = strings.TrimSpace(rowResolution.Decision)
	}
}

// ResolveTranslationExchangeLinkageKey canonicalizes deterministic row linkage identifiers.
func ResolveTranslationExchangeLinkageKey(row TranslationExchangeRow) (TranslationExchangeLinkageKey, error) {
	key := TranslationExchangeLinkageKey{
		Resource:     strings.ToLower(strings.TrimSpace(row.Resource)),
		EntityID:     strings.TrimSpace(row.EntityID),
		FamilyID:     strings.TrimSpace(row.FamilyID),
		TargetLocale: strings.ToLower(strings.TrimSpace(row.TargetLocale)),
		FieldPath:    strings.TrimSpace(row.FieldPath),
	}
	if key.Resource == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("resource", map[string]any{"component": "translation_exchange"})
	}
	if key.EntityID == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("entity_id", map[string]any{"component": "translation_exchange"})
	}
	if key.FamilyID == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("family_id", map[string]any{"component": "translation_exchange"})
	}
	if key.TargetLocale == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("target_locale", map[string]any{"component": "translation_exchange"})
	}
	if key.FieldPath == "" {
		return TranslationExchangeLinkageKey{}, requiredFieldDomainError("field_path", map[string]any{"component": "translation_exchange"})
	}
	return key, nil
}

func translationExchangeSourceHash(sourceText string) string {
	hash := sha256.Sum256([]byte(strings.TrimSpace(sourceText)))
	return hex.EncodeToString(hash[:])
}

func translationExchangeApplyPayloadHash(translatedText string, createTranslation bool, workflowStatus, path, routeKey string) string {
	payload := map[string]any{
		"translated_text":    strings.TrimSpace(translatedText),
		"create_translation": createTranslation,
		"workflow_status":    strings.TrimSpace(workflowStatus),
		"path":               strings.TrimSpace(path),
		"route_key":          strings.TrimSpace(routeKey),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return translationExchangeSourceHash(strings.TrimSpace(translatedText) + "|" + workflowStatus + "|" + path + "|" + routeKey)
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func translationExchangeApplyFingerprint(key TranslationExchangeLinkageKey, payloadHash string) string {
	return strings.TrimSpace(key.String()) + "::" + strings.TrimSpace(payloadHash)
}

func (s *TranslationExchangeService) applyTranslationIdempotently(
	ctx context.Context,
	req TranslationExchangeApplyRequest,
	payloadHash string,
) (translationExchangeAppliedRecord, bool, error) {
	if s == nil {
		return translationExchangeAppliedRecord{}, false, serviceNotConfiguredDomainError("translation exchange store", map[string]any{
			"component": "translation_exchange_service",
		})
	}
	fingerprint := translationExchangeApplyFingerprint(req.Key, payloadHash)
	identity := translationTransportIdentity{
		TenantID: tenantIDFromContext(ctx),
		OrgID:    orgIDFromContext(ctx),
	}
	for {
		if record, ok, err := s.lookupAppliedRecord(ctx, identity, req.Key.String(), payloadHash, fingerprint); err != nil {
			return translationExchangeAppliedRecord{}, false, err
		} else if ok {
			return record, true, nil
		}
		flight, leader := s.acquireApplyFlight(fingerprint)
		if !leader {
			<-flight.done
			continue
		}

		err := s.store.ApplyTranslation(ctx, req)
		record := translationExchangeAppliedRecord{
			LinkageKey:  req.Key.String(),
			PayloadHash: payloadHash,
			Request:     req,
			AppliedAt:   time.Now().UTC(),
		}
		persisted, persistErr := s.completeApplyFlight(ctx, identity, fingerprint, record, err == nil)
		if persistErr != nil {
			return translationExchangeAppliedRecord{}, false, persistErr
		}
		if err != nil {
			return translationExchangeAppliedRecord{}, false, err
		}
		return persisted, false, nil
	}
}

func (s *TranslationExchangeService) lookupAppliedRecord(ctx context.Context, identity translationTransportIdentity, linkageKey, payloadHash, fingerprint string) (translationExchangeAppliedRecord, bool, error) {
	if s == nil {
		return translationExchangeAppliedRecord{}, false, nil
	}
	if s.ledger != nil {
		record, ok, err := s.ledger.LookupApplyRecord(ctx, identity, linkageKey, payloadHash)
		if err != nil || ok {
			return record, ok, err
		}
	}
	s.applyMu.Lock()
	defer s.applyMu.Unlock()
	record, ok := s.applied[strings.TrimSpace(fingerprint)]
	return record, ok, nil
}

func (s *TranslationExchangeService) acquireApplyFlight(fingerprint string) (*translationExchangeApplyFlight, bool) {
	s.applyMu.Lock()
	defer s.applyMu.Unlock()
	fingerprint = strings.TrimSpace(fingerprint)
	if record, ok := s.applied[fingerprint]; ok {
		flight := &translationExchangeApplyFlight{done: make(chan struct{})}
		close(flight.done)
		s.applied[fingerprint] = record
		return flight, false
	}
	if flight, ok := s.inFlight[fingerprint]; ok {
		return flight, false
	}
	flight := &translationExchangeApplyFlight{done: make(chan struct{})}
	s.inFlight[fingerprint] = flight
	return flight, true
}

func (s *TranslationExchangeService) completeApplyFlight(ctx context.Context, identity translationTransportIdentity, fingerprint string, record translationExchangeAppliedRecord, persist bool) (translationExchangeAppliedRecord, error) {
	s.applyMu.Lock()
	defer s.applyMu.Unlock()
	fingerprint = strings.TrimSpace(fingerprint)
	flight, ok := s.inFlight[fingerprint]
	persisted := record
	if persist {
		if s.ledger != nil {
			stored, replay, err := s.ledger.RecordApplyRecord(ctx, identity, record)
			if err != nil {
				if ok {
					close(flight.done)
				}
				delete(s.inFlight, fingerprint)
				return translationExchangeAppliedRecord{}, err
			}
			if replay {
				persisted = stored
			}
		}
		s.applied[fingerprint] = persisted
	}
	delete(s.inFlight, fingerprint)
	if ok {
		close(flight.done)
	}
	return persisted, nil
}

func hasSourceHashConflict(row TranslationExchangeRow, linkage TranslationExchangeLinkage) bool {
	provided := normalizeProvidedSourceHash(row)
	current := strings.TrimSpace(strings.ToLower(linkage.SourceHash))
	if provided == "" || current == "" {
		return false
	}
	return provided != current
}

func normalizeProvidedSourceHash(row TranslationExchangeRow) string {
	if sourceHash := strings.TrimSpace(strings.ToLower(row.SourceHash)); sourceHash != "" {
		return sourceHash
	}
	if sourceText := strings.TrimSpace(row.SourceText); sourceText != "" {
		return strings.ToLower(translationExchangeSourceHash(sourceText))
	}
	return ""
}

func translationExchangeRowResult(index int, row TranslationExchangeRow) TranslationExchangeRowResult {
	out := TranslationExchangeRowResult{
		Index:        row.Index,
		Resource:     strings.TrimSpace(row.Resource),
		EntityID:     strings.TrimSpace(row.EntityID),
		FamilyID:     strings.TrimSpace(row.FamilyID),
		TargetLocale: strings.TrimSpace(row.TargetLocale),
		FieldPath:    strings.TrimSpace(row.FieldPath),
	}
	if out.Index <= 0 {
		out.Index = index
	}
	return out
}

func appendSkippedRows(result *TranslationExchangeResult, rows []TranslationExchangeRow, from int) {
	if result == nil {
		return
	}
	for i := from; i < len(rows); i++ {
		rowResult := translationExchangeRowResult(i, rows[i])
		rowResult.Status = translationExchangeRowStatusSkipped
		rowResult.Error = "skipped due to previous row failure and continue_on_error=false"
		result.Add(rowResult)
	}
}

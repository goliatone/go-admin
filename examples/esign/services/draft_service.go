package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"maps"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

const (
	// DefaultDraftTTL defines wizard draft expiry from the last successful write.
	DefaultDraftTTL = 7 * 24 * time.Hour
)

// DraftService coordinates six-step wizard draft persistence and send conversion.
type DraftService struct {
	drafts     stores.DraftStore
	audits     stores.DraftAuditEventStore
	agreements AgreementService
	tx         stores.TransactionManager
	now        func() time.Time
	ttl        time.Duration
}

// DraftServiceOption customizes draft service behavior.
type DraftServiceOption func(*DraftService)

// WithDraftClock sets draft service clock.
func WithDraftClock(now func() time.Time) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithDraftTTL sets draft TTL policy applied on create/update.
func WithDraftTTL(ttl time.Duration) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.ttl = ttl
	}
}

// WithDraftAuditStore overrides append-only audit sink for draft lifecycle events.
func WithDraftAuditStore(audits stores.DraftAuditEventStore) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil || audits == nil {
			return
		}
		s.audits = audits
	}
}

// WithDraftAgreementService injects agreement lifecycle service used for draft send conversion.
func WithDraftAgreementService(agreements AgreementService) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil {
			return
		}
		s.agreements = agreements
	}
}

// DraftCreateInput captures draft creation payload.
type DraftCreateInput struct {
	WizardID        string
	WizardState     map[string]any
	Title           string
	CurrentStep     int
	DocumentID      string
	CreatedByUserID string
}

// DraftUpdateInput captures revision-aware draft update payload.
type DraftUpdateInput struct {
	ExpectedRevision int64
	WizardState      map[string]any
	Title            string
	CurrentStep      int
	DocumentID       *string
	UpdatedByUserID  string
}

// DraftListInput captures paginated draft list query.
type DraftListInput struct {
	CreatedByUserID string
	Limit           int
	Cursor          string
}

// DraftSendInput captures draft-to-agreement send preconditions.
type DraftSendInput struct {
	ExpectedRevision int64
	CreatedByUserID  string
	IPAddress        string
	CorrelationID    string
	IdempotencyKey   string
}

// DraftSendResult captures send conversion output contract.
type DraftSendResult struct {
	AgreementID  string
	Status       string
	DraftID      string
	DraftDeleted bool
}

// NewDraftService builds a draft lifecycle service over the shared e-sign store.
func NewDraftService(store stores.Store, opts ...DraftServiceOption) DraftService {
	agreements := NewAgreementService(store)
	svc := DraftService{
		drafts:     store,
		audits:     store,
		agreements: agreements,
		tx:         store,
		now:        func() time.Time { return time.Now().UTC() },
		ttl:        DefaultDraftTTL,
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	if svc.audits == nil {
		svc.audits = store
	}
	if svc.ttl <= 0 {
		svc.ttl = DefaultDraftTTL
	}
	return svc
}

func (s DraftService) forTx(tx stores.TxStore) DraftService {
	txSvc := s
	txSvc.drafts = tx
	txSvc.audits = tx
	txSvc.agreements = s.agreements.forTx(tx)
	txSvc.tx = nil
	return txSvc
}

func (s DraftService) withWriteTx(ctx context.Context, fn func(DraftService) error) error {
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

// Create persists a durable wizard draft with idempotent replay by wizard_id.
func (s DraftService) Create(ctx context.Context, scope stores.Scope, input DraftCreateInput) (stores.DraftRecord, bool, error) {
	if s.drafts == nil {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "store", "not configured")
	}
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "created_by_user_id", "required")
	}
	wizardID := strings.TrimSpace(input.WizardID)
	if wizardID == "" {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "wizard_id", "required")
	}
	if input.WizardState == nil {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "wizard_state", "required")
	}
	if input.CurrentStep <= 0 || input.CurrentStep > 6 {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "current_step", "must be between 1 and 6")
	}
	normalizedWizardState, resolvedDocumentID, err := s.normalizeWizardStateForPersistence(ctx, scope, input.WizardState, input.DocumentID)
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	documentID := strings.TrimSpace(input.DocumentID)
	if documentID == "" {
		documentID = resolvedDocumentID
	}

	now := s.now().UTC()
	expiresAt := now.Add(s.ttl).UTC()
	record := stores.DraftRecord{}
	replay := false
	err = s.withWriteTx(ctx, func(txSvc DraftService) error {
		record, replay, err = txSvc.drafts.CreateDraftSession(ctx, scope, stores.DraftRecord{
			WizardID:        wizardID,
			CreatedByUserID: createdByUserID,
			DocumentID:      documentID,
			Title:           strings.TrimSpace(input.Title),
			CurrentStep:     input.CurrentStep,
			WizardStateJSON: mustJSON(normalizedWizardState),
			CreatedAt:       now,
			UpdatedAt:       now,
			ExpiresAt:       expiresAt,
		})
		if err != nil {
			return err
		}

		eventType := "draft.created"
		if replay {
			eventType = "draft.replayed"
		}
		return txSvc.appendDraftAudit(ctx, scope, record.ID, eventType, createdByUserID, map[string]any{
			"wizard_id":    record.WizardID,
			"current_step": record.CurrentStep,
			"revision":     record.Revision,
			"replay":       replay,
		})
	})
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	return record, replay, nil
}

// List returns paginated draft summaries for the requesting actor scope.
func (s DraftService) List(ctx context.Context, scope stores.Scope, input DraftListInput) ([]stores.DraftRecord, string, int, error) {
	if s.drafts == nil {
		return nil, "", 0, domainValidationError("drafts", "store", "not configured")
	}
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		return nil, "", 0, domainValidationError("drafts", "created_by_user_id", "required")
	}
	limit := input.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	rows, nextCursor, err := s.drafts.ListDraftSessions(ctx, scope, stores.DraftQuery{
		CreatedByUserID: createdByUserID,
		Limit:           limit,
		Cursor:          strings.TrimSpace(input.Cursor),
		SortDesc:        true,
	})
	if err != nil {
		return nil, "", 0, err
	}
	total, err := s.countDrafts(ctx, scope, createdByUserID)
	if err != nil {
		return nil, "", 0, err
	}
	return rows, nextCursor, total, nil
}

// Get resolves a scoped draft detail by id.
func (s DraftService) Get(ctx context.Context, scope stores.Scope, id, createdByUserID string) (stores.DraftRecord, error) {
	if s.drafts == nil {
		return stores.DraftRecord{}, domainValidationError("drafts", "store", "not configured")
	}
	createdByUserID = strings.TrimSpace(createdByUserID)
	if createdByUserID == "" {
		return stores.DraftRecord{}, domainValidationError("drafts", "created_by_user_id", "required")
	}
	draft, err := s.drafts.GetDraftSession(ctx, scope, strings.TrimSpace(id))
	if err != nil {
		return stores.DraftRecord{}, err
	}
	if strings.TrimSpace(draft.CreatedByUserID) != createdByUserID {
		return stores.DraftRecord{}, draftNotFoundError(strings.TrimSpace(id))
	}
	return draft, nil
}

// Update applies revision-aware mutations and refreshes draft TTL.
func (s DraftService) Update(ctx context.Context, scope stores.Scope, id string, input DraftUpdateInput) (stores.DraftRecord, error) {
	if s.drafts == nil {
		return stores.DraftRecord{}, domainValidationError("drafts", "store", "not configured")
	}
	if input.ExpectedRevision <= 0 {
		return stores.DraftRecord{}, domainValidationError("drafts", "expected_revision", "required")
	}
	if input.WizardState == nil {
		return stores.DraftRecord{}, domainValidationError("drafts", "wizard_state", "required")
	}
	if input.CurrentStep <= 0 || input.CurrentStep > 6 {
		return stores.DraftRecord{}, domainValidationError("drafts", "current_step", "must be between 1 and 6")
	}
	if _, err := s.Get(ctx, scope, id, input.UpdatedByUserID); err != nil {
		return stores.DraftRecord{}, err
	}
	documentIDHint := ""
	if input.DocumentID != nil {
		documentIDHint = strings.TrimSpace(*input.DocumentID)
	}
	normalizedWizardState, resolvedDocumentID, err := s.normalizeWizardStateForPersistence(ctx, scope, input.WizardState, documentIDHint)
	if err != nil {
		return stores.DraftRecord{}, err
	}

	now := s.now().UTC()
	expiresAt := now.Add(s.ttl).UTC()
	wizardStateJSON := mustJSON(normalizedWizardState)
	title := strings.TrimSpace(input.Title)

	patch := stores.DraftPatch{
		WizardStateJSON: &wizardStateJSON,
		Title:           &title,
		CurrentStep:     &input.CurrentStep,
		ExpiresAt:       &expiresAt,
		UpdatedAt:       &now,
	}
	if input.DocumentID != nil {
		documentID := resolvedDocumentID
		if documentID == "" {
			documentID = strings.TrimSpace(*input.DocumentID)
		}
		patch.DocumentID = &documentID
	}

	record := stores.DraftRecord{}
	err = s.withWriteTx(ctx, func(txSvc DraftService) error {
		record, err = txSvc.drafts.UpdateDraftSession(ctx, scope, strings.TrimSpace(id), patch, input.ExpectedRevision)
		if err != nil {
			return err
		}
		return txSvc.appendDraftAudit(ctx, scope, record.ID, "draft.updated", strings.TrimSpace(input.UpdatedByUserID), map[string]any{
			"wizard_id":    record.WizardID,
			"current_step": record.CurrentStep,
			"revision":     record.Revision,
		})
	})
	if err != nil {
		return stores.DraftRecord{}, err
	}
	return record, nil
}

func (s DraftService) normalizeWizardStateForPersistence(
	ctx context.Context,
	scope stores.Scope,
	wizardState map[string]any,
	documentIDHint string,
) (map[string]any, string, error) {
	if wizardState == nil {
		return nil, "", domainValidationError("drafts", "wizard_state", "required")
	}
	normalized, err := cloneJSONMap(wizardState)
	if err != nil {
		return nil, "", domainValidationError("drafts", "wizard_state", "invalid json payload")
	}
	documentIDHint = strings.TrimSpace(documentIDHint)

	documentState := map[string]any{}
	if entry, ok := normalized["document"].(map[string]any); ok {
		documentState = entry
	} else {
		normalized["document"] = documentState
	}
	documentID := primitives.FirstNonEmpty(documentIDHint, strings.TrimSpace(wizardAnyToString(documentState["id"])))

	pageCount := 0
	if parsed, ok := anyToPositiveInt(documentState["pageCount"]); ok {
		pageCount = parsed
	}
	if pageCount <= 0 {
		if parsed, ok := anyToPositiveInt(documentState["page_count"]); ok {
			pageCount = parsed
		}
	}
	pageCount = s.resolveWizardDocumentPageCount(ctx, scope, documentID, pageCount)

	if documentID != "" {
		documentState["id"] = documentID
	}
	documentState["pageCount"] = pageCount
	if _, hasSnake := documentState["page_count"]; hasSnake {
		documentState["page_count"] = pageCount
	}

	normalizePageFieldsInObjectArray(normalized, "fieldDefinitions", pageCount, []string{"page"})
	normalizePageFieldsInObjectArray(normalized, "field_definitions", pageCount, []string{"page"})
	normalizePageFieldsInObjectArray(normalized, "fieldPlacements", pageCount, []string{"page"})
	normalizePageFieldsInObjectArray(normalized, "field_placements", pageCount, []string{"page"})

	ruleKeys := []string{"page", "fromPage", "toPage", "from_page", "to_page"}
	normalizePageFieldsInObjectArray(normalized, "fieldRules", pageCount, ruleKeys)
	normalizePageFieldsInObjectArray(normalized, "field_rules", pageCount, ruleKeys)
	normalizeExcludePagesInObjectArray(normalized, "fieldRules", pageCount, []string{"excludePages", "exclude_pages"})
	normalizeExcludePagesInObjectArray(normalized, "field_rules", pageCount, []string{"excludePages", "exclude_pages"})

	return normalized, documentID, nil
}

func (s DraftService) resolveWizardDocumentPageCount(ctx context.Context, scope stores.Scope, documentID string, hint int) int {
	pageCount := hint
	documentID = strings.TrimSpace(documentID)
	if documentID != "" && s.agreements.documents != nil {
		if document, err := s.agreements.documents.Get(ctx, scope, documentID); err == nil {
			if document.PageCount > 0 {
				pageCount = document.PageCount
			}
		}
	}
	if pageCount <= 0 {
		pageCount = 1
	}
	return pageCount
}

func normalizePageFieldsInObjectArray(state map[string]any, key string, maxPage int, fields []string) {
	if state == nil {
		return
	}
	raw, ok := state[key]
	if !ok {
		return
	}
	entries, ok := raw.([]any)
	if !ok {
		return
	}
	for _, item := range entries {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		for _, field := range fields {
			normalizePageField(entry, field, maxPage)
		}
	}
}

func normalizeExcludePagesInObjectArray(state map[string]any, key string, maxPage int, fields []string) {
	if state == nil {
		return
	}
	raw, ok := state[key]
	if !ok {
		return
	}
	entries, ok := raw.([]any)
	if !ok {
		return
	}
	for _, item := range entries {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		for _, field := range fields {
			if _, exists := entry[field]; !exists {
				continue
			}
			entry[field] = normalizeBoundedIntSlice(entry[field], maxPage)
		}
	}
}

func normalizePageField(entry map[string]any, field string, maxPage int) {
	if entry == nil {
		return
	}
	value, exists := entry[field]
	if !exists {
		return
	}
	page, ok := anyToInt(value)
	if !ok {
		return
	}
	if page < 1 {
		page = 1
	}
	if maxPage > 0 && page > maxPage {
		page = maxPage
	}
	entry[field] = page
}

func normalizeBoundedIntSlice(value any, maxPage int) []int {
	var out []int
	switch typed := value.(type) {
	case []any:
		for _, item := range typed {
			parsed, ok := anyToInt(item)
			if !ok || parsed <= 0 {
				continue
			}
			if maxPage > 0 && parsed > maxPage {
				parsed = maxPage
			}
			out = append(out, parsed)
		}
	case []int:
		for _, item := range typed {
			parsed := item
			if parsed <= 0 {
				continue
			}
			if maxPage > 0 && parsed > maxPage {
				parsed = maxPage
			}
			out = append(out, parsed)
		}
	case []string:
		for _, item := range typed {
			parsed, ok := anyToInt(item)
			if !ok || parsed <= 0 {
				continue
			}
			if maxPage > 0 && parsed > maxPage {
				parsed = maxPage
			}
			out = append(out, parsed)
		}
	default:
		raw := strings.TrimSpace(wizardAnyToString(value))
		if raw == "" {
			return []int{}
		}
		for part := range strings.SplitSeq(raw, ",") {
			parsed, ok := anyToInt(strings.TrimSpace(part))
			if !ok || parsed <= 0 {
				continue
			}
			if maxPage > 0 && parsed > maxPage {
				parsed = maxPage
			}
			out = append(out, parsed)
		}
	}
	if len(out) == 0 {
		return []int{}
	}
	seen := map[int]struct{}{}
	unique := make([]int, 0, len(out))
	for _, item := range out {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		unique = append(unique, item)
	}
	sort.Ints(unique)
	return unique
}

func anyToPositiveInt(value any) (int, bool) {
	parsed, ok := anyToInt(value)
	if !ok || parsed <= 0 {
		return 0, false
	}
	return parsed, true
}

func anyToInt(value any) (int, bool) {
	switch typed := value.(type) {
	case nil:
		return 0, false
	case int:
		return typed, true
	case int8:
		return int(typed), true
	case int16:
		return int(typed), true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case uint:
		return int(typed), true
	case uint8:
		return int(typed), true
	case uint16:
		return int(typed), true
	case uint32:
		return int(typed), true
	case uint64:
		return int(typed), true
	case float32:
		if !isFinite(float64(typed)) {
			return 0, false
		}
		return int(typed), true
	case float64:
		if !isFinite(typed) {
			return 0, false
		}
		return int(typed), true
	case json.Number:
		parsed, err := typed.Int64()
		if err != nil {
			return 0, false
		}
		return int(parsed), true
	case string:
		raw := strings.TrimSpace(typed)
		if raw == "" {
			return 0, false
		}
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func wizardAnyToString(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case []byte:
		return string(typed)
	default:
		return fmt.Sprintf("%v", value)
	}
}

func cloneJSONMap(value map[string]any) (map[string]any, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	decoded := map[string]any{}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		return nil, err
	}
	return decoded, nil
}

// Delete removes a scoped draft record.
func (s DraftService) Delete(ctx context.Context, scope stores.Scope, id, createdByUserID string) error {
	if s.drafts == nil {
		return domainValidationError("drafts", "store", "not configured")
	}
	draft, err := s.Get(ctx, scope, id, createdByUserID)
	if err != nil {
		return err
	}
	return s.withWriteTx(ctx, func(txSvc DraftService) error {
		if err := txSvc.drafts.DeleteDraftSession(ctx, scope, strings.TrimSpace(id)); err != nil {
			return err
		}
		return txSvc.appendDraftAudit(ctx, scope, draft.ID, "draft.deleted", strings.TrimSpace(createdByUserID), map[string]any{
			"wizard_id": draft.WizardID,
		})
	})
}

// Send converts a draft to a sent agreement in a single transaction and deletes the draft on success.
func (s DraftService) Send(ctx context.Context, scope stores.Scope, id string, input DraftSendInput) (DraftSendResult, error) {
	if input.ExpectedRevision <= 0 {
		return DraftSendResult{}, domainValidationError("drafts", "expected_revision", "required")
	}
	if strings.TrimSpace(input.CreatedByUserID) == "" {
		return DraftSendResult{}, domainValidationError("drafts", "created_by_user_id", "required")
	}

	result := DraftSendResult{}
	correlationID := strings.TrimSpace(input.CorrelationID)
	sendStartedAt := time.Now()
	LogSendDebug("draft_service", "send_start", SendDebugFields(scope, correlationID, map[string]any{
		"draft_id":           strings.TrimSpace(id),
		"expected_revision":  input.ExpectedRevision,
		"created_by_user_id": strings.TrimSpace(input.CreatedByUserID),
	}))
	err := stores.WithTxHooksContext(ctx, s.tx, func(txCtx context.Context, tx stores.TxStore, hooks *stores.TxHooks) error {
		txSvc := s
		if tx != nil {
			txSvc = s.forTx(tx)
		}
		loadStartedAt := time.Now()
		draft, err := txSvc.Get(txCtx, scope, id, input.CreatedByUserID)
		if err != nil {
			LogSendPhaseDuration("draft_service", "draft_load_failed", loadStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"draft_id": strings.TrimSpace(id),
				"error":    strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("draft_service", "draft_loaded", loadStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":       strings.TrimSpace(draft.ID),
			"wizard_id":      strings.TrimSpace(draft.WizardID),
			"draft_revision": draft.Revision,
		}))
		if draft.Revision != input.ExpectedRevision {
			return staleRevisionError(draft.Revision)
		}
		materializeStartedAt := time.Now()
		agreement, err := txSvc.materializeDraftAgreement(txCtx, scope, draft, input.IPAddress)
		if err != nil {
			LogSendPhaseDuration("draft_service", "materialize_agreement_failed", materializeStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"draft_id":  strings.TrimSpace(draft.ID),
				"wizard_id": strings.TrimSpace(draft.WizardID),
				"error":     strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("draft_service", "materialize_agreement_complete", materializeStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draft.ID),
			"wizard_id":    strings.TrimSpace(draft.WizardID),
			"agreement_id": strings.TrimSpace(agreement.ID),
		}))
		agreementSendStartedAt := time.Now()
		sent, err := txSvc.agreements.Send(txCtx, scope, agreement.ID, SendInput{
			IdempotencyKey: fmt.Sprintf("draft_send_%s_rev_%d", strings.TrimSpace(draft.ID), draft.Revision),
			IPAddress:      input.IPAddress,
			CorrelationID:  correlationID,
		})
		if err != nil {
			LogSendPhaseDuration("draft_service", "agreement_send_failed", agreementSendStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"draft_id":     strings.TrimSpace(draft.ID),
				"wizard_id":    strings.TrimSpace(draft.WizardID),
				"agreement_id": strings.TrimSpace(agreement.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("draft_service", "agreement_send_complete", agreementSendStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draft.ID),
			"wizard_id":    strings.TrimSpace(draft.WizardID),
			"agreement_id": strings.TrimSpace(sent.ID),
		}))
		deleteStartedAt := time.Now()
		if err := txSvc.drafts.DeleteDraftSession(txCtx, scope, draft.ID); err != nil {
			LogSendPhaseDuration("draft_service", "draft_delete_failed", deleteStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"draft_id":     strings.TrimSpace(draft.ID),
				"wizard_id":    strings.TrimSpace(draft.WizardID),
				"agreement_id": strings.TrimSpace(sent.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("draft_service", "draft_delete_complete", deleteStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draft.ID),
			"wizard_id":    strings.TrimSpace(draft.WizardID),
			"agreement_id": strings.TrimSpace(sent.ID),
		}))
		auditStartedAt := time.Now()
		if err := txSvc.appendDraftAudit(txCtx, scope, draft.ID, "draft.sent", strings.TrimSpace(input.CreatedByUserID), map[string]any{
			"agreement_id":    strings.TrimSpace(sent.ID),
			"wizard_id":       draft.WizardID,
			"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
			"revision":        draft.Revision + 1,
			"status":          "sent",
			"draft_deleted":   true,
		}); err != nil {
			LogSendPhaseDuration("draft_service", "draft_audit_failed", auditStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"draft_id":     strings.TrimSpace(draft.ID),
				"wizard_id":    strings.TrimSpace(draft.WizardID),
				"agreement_id": strings.TrimSpace(sent.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("draft_service", "draft_audit_complete", auditStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draft.ID),
			"wizard_id":    strings.TrimSpace(draft.WizardID),
			"agreement_id": strings.TrimSpace(sent.ID),
		}))
		if hooks != nil {
			agreementID := strings.TrimSpace(sent.ID)
			draftID := strings.TrimSpace(draft.ID)
			createdByUserID := strings.TrimSpace(input.CreatedByUserID)
			wizardID := strings.TrimSpace(draft.WizardID)
			hooks.AfterCommit(func() error {
				return s.verifySendPersistenceInvariants(ctx, scope, draftID, createdByUserID, agreementID, correlationID, wizardID)
			})
			LogSendDebug("draft_service", "after_commit_verify_registered", SendDebugFields(scope, correlationID, map[string]any{
				"draft_id":     draftID,
				"wizard_id":    wizardID,
				"agreement_id": agreementID,
			}))
		}
		result = DraftSendResult{
			AgreementID:  strings.TrimSpace(sent.ID),
			Status:       primitives.FirstNonEmpty(strings.TrimSpace(sent.Status), stores.AgreementStatusSent),
			DraftID:      strings.TrimSpace(draft.ID),
			DraftDeleted: true,
		}
		return nil
	})
	if err != nil {
		LogSendPhaseDuration("draft_service", "send_failed", sendStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":           strings.TrimSpace(id),
			"expected_revision":  input.ExpectedRevision,
			"created_by_user_id": strings.TrimSpace(input.CreatedByUserID),
			"error":              strings.TrimSpace(err.Error()),
		}))
		return DraftSendResult{}, err
	}
	LogSendPhaseDuration("draft_service", "send_complete", sendStartedAt, SendDebugFields(scope, correlationID, map[string]any{
		"draft_id":           strings.TrimSpace(result.DraftID),
		"agreement_id":       strings.TrimSpace(result.AgreementID),
		"expected_revision":  input.ExpectedRevision,
		"created_by_user_id": strings.TrimSpace(input.CreatedByUserID),
	}))
	return result, nil
}

// CleanupExpiredDrafts removes drafts whose expires_at is before `before`.
func (s DraftService) CleanupExpiredDrafts(ctx context.Context, before time.Time) (int, error) {
	if s.drafts == nil {
		return 0, domainValidationError("drafts", "store", "not configured")
	}
	if before.IsZero() {
		before = s.now().UTC()
	}
	count := 0
	err := s.withWriteTx(ctx, func(txSvc DraftService) error {
		var err error
		count, err = txSvc.drafts.DeleteExpiredDraftSessions(ctx, before)
		if err != nil {
			return err
		}
		return txSvc.appendDraftAudit(ctx, stores.Scope{TenantID: "system", OrgID: "system"}, "draft_cleanup", "draft.cleanup_expired", "system", map[string]any{
			"deleted": count,
			"before":  before.UTC().Format(time.RFC3339Nano),
		})
	})
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s DraftService) countDrafts(ctx context.Context, scope stores.Scope, createdByUserID string) (int, error) {
	cursor := ""
	total := 0
	guard := map[string]struct{}{}
	for {
		if _, seen := guard[cursor]; seen {
			return total, nil
		}
		guard[cursor] = struct{}{}
		rows, nextCursor, err := s.drafts.ListDraftSessions(ctx, scope, stores.DraftQuery{
			CreatedByUserID: strings.TrimSpace(createdByUserID),
			Limit:           50,
			Cursor:          cursor,
			SortDesc:        true,
		})
		if err != nil {
			return 0, err
		}
		total += len(rows)
		if strings.TrimSpace(nextCursor) == "" {
			break
		}
		cursor = strings.TrimSpace(nextCursor)
	}
	return total, nil
}

func (s DraftService) verifySendPersistenceInvariants(
	ctx context.Context,
	scope stores.Scope,
	draftID string,
	createdByUserID string,
	agreementID string,
	correlationID string,
	wizardID string,
) error {
	verifyStartedAt := time.Now()
	LogSendDebug("draft_service", "verify_persistence_start", SendDebugFields(scope, correlationID, map[string]any{
		"draft_id":     strings.TrimSpace(draftID),
		"wizard_id":    strings.TrimSpace(wizardID),
		"agreement_id": strings.TrimSpace(agreementID),
	}))
	if s.agreements.agreements == nil {
		return fmt.Errorf("draft send invariant violation: agreement store not configured")
	}
	loadAgreementStartedAt := time.Now()
	if _, err := s.agreements.agreements.GetAgreement(ctx, scope, agreementID); err != nil {
		LogSendPhaseDuration("draft_service", "verify_persistence_agreement_missing", loadAgreementStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draftID),
			"wizard_id":    strings.TrimSpace(wizardID),
			"agreement_id": strings.TrimSpace(agreementID),
			"error":        strings.TrimSpace(err.Error()),
		}))
		return fmt.Errorf("draft send invariant violation: agreement %s missing after commit: %w", strings.TrimSpace(agreementID), err)
	}
	LogSendPhaseDuration("draft_service", "verify_persistence_agreement_loaded", loadAgreementStartedAt, SendDebugFields(scope, correlationID, map[string]any{
		"draft_id":     strings.TrimSpace(draftID),
		"wizard_id":    strings.TrimSpace(wizardID),
		"agreement_id": strings.TrimSpace(agreementID),
	}))
	loadDraftStartedAt := time.Now()
	_, err := s.Get(ctx, scope, draftID, createdByUserID)
	if err == nil {
		LogSendPhaseDuration("draft_service", "verify_persistence_draft_still_present", loadDraftStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draftID),
			"wizard_id":    strings.TrimSpace(wizardID),
			"agreement_id": strings.TrimSpace(agreementID),
		}))
		return fmt.Errorf("draft send invariant violation: draft %s still present after commit", strings.TrimSpace(draftID))
	}
	if isDraftStoreNotFoundError(err) {
		LogSendPhaseDuration("draft_service", "verify_persistence_draft_absent", loadDraftStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draftID),
			"wizard_id":    strings.TrimSpace(wizardID),
			"agreement_id": strings.TrimSpace(agreementID),
		}))
		LogSendPhaseDuration("draft_service", "verify_persistence_complete", verifyStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"draft_id":     strings.TrimSpace(draftID),
			"wizard_id":    strings.TrimSpace(wizardID),
			"agreement_id": strings.TrimSpace(agreementID),
		}))
		return nil
	}
	LogSendPhaseDuration("draft_service", "verify_persistence_draft_check_failed", loadDraftStartedAt, SendDebugFields(scope, correlationID, map[string]any{
		"draft_id":     strings.TrimSpace(draftID),
		"wizard_id":    strings.TrimSpace(wizardID),
		"agreement_id": strings.TrimSpace(agreementID),
		"error":        strings.TrimSpace(err.Error()),
	}))
	return fmt.Errorf("draft send invariant violation: verify draft %s deletion: %w", strings.TrimSpace(draftID), err)
}

func (s DraftService) materializeDraftAgreement(ctx context.Context, scope stores.Scope, draft stores.DraftRecord, ipAddress string) (stores.AgreementRecord, error) {
	if s.agreements.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	state, err := decodeWizardState(draft.WizardStateJSON)
	if err != nil {
		return stores.AgreementRecord{}, domainValidationError("drafts", "wizard_state", "invalid json payload")
	}
	documentID := primitives.FirstNonEmpty(strings.TrimSpace(draft.DocumentID), strings.TrimSpace(state.Document.ID))
	if documentID == "" {
		return stores.AgreementRecord{}, domainValidationError("drafts", "document_id", "required")
	}

	agreement, err := s.agreements.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      documentID,
		Title:           primitives.FirstNonEmpty(strings.TrimSpace(state.Details.Title), strings.TrimSpace(draft.Title), "Untitled Agreement"),
		Message:         strings.TrimSpace(state.Details.Message),
		CreatedByUserID: strings.TrimSpace(draft.CreatedByUserID),
		IPAddress:       ipAddress,
	})
	if err != nil {
		var coded *goerrors.Error
		if errors.As(err, &coded) && strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") {
			return stores.AgreementRecord{}, domainValidationError("drafts", "document_id", "document not found")
		}
		return stores.AgreementRecord{}, err
	}

	participantMap := map[string]stores.ParticipantRecord{}
	for idx, participant := range state.Participants {
		role := normalizeDraftParticipantRole(participant.Role)
		signingStage := participant.SigningStage
		if signingStage <= 0 {
			signingStage = participant.Order
		}
		if signingStage <= 0 {
			signingStage = idx + 1
		}
		email := strings.TrimSpace(participant.Email)
		name := strings.TrimSpace(participant.Name)
		notify := true
		if participant.Notify != nil {
			notify = *participant.Notify
		}
		created, err := s.agreements.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
			Email:        &email,
			Name:         &name,
			Role:         &role,
			Notify:       new(notify),
			SigningStage: new(signingStage),
		}, 0)
		if err != nil {
			return stores.AgreementRecord{}, err
		}
		if key := strings.TrimSpace(participant.TempID); key != "" {
			participantMap[key] = created
		}
	}

	definitions := materializeFieldDefinitions(state)
	for idx, definition := range definitions {
		participantID := resolveFieldParticipantID(definition, participantMap)
		if participantID == "" {
			return stores.AgreementRecord{}, domainValidationError("field_definitions", "participant_id", "field definition participant is not resolvable")
		}
		fieldType := normalizeDraftFieldType(definition.Type)
		required := definition.Required
		created, err := s.agreements.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
			ParticipantID: &participantID,
			Type:          &fieldType,
			Required:      &required,
		})
		if err != nil {
			return stores.AgreementRecord{}, err
		}

		placement := resolveFieldPlacementGeometry(state, definition, idx)
		label := strings.TrimSpace(definition.Label)
		if _, err := s.agreements.UpsertFieldInstanceDraft(ctx, scope, agreement.ID, stores.FieldInstanceDraftPatch{
			FieldDefinitionID: &created.ID,
			PageNumber:        &placement.Page,
			X:                 &placement.X,
			Y:                 &placement.Y,
			Width:             &placement.Width,
			Height:            &placement.Height,
			PlacementSource:   draftStringPtr(strings.TrimSpace(placement.PlacementSource)),
			LinkGroupID:       draftStringPtr(strings.TrimSpace(placement.LinkGroupID)),
			LinkedFromFieldID: draftStringPtr(strings.TrimSpace(placement.LinkedFromFieldID)),
			IsUnlinked:        new(placement.IsUnlinked),
			TabIndex:          new(idx + 1),
			Label:             &label,
		}); err != nil {
			return stores.AgreementRecord{}, err
		}
	}

	return agreement, nil
}

func resolveFieldParticipantID(definition wizardFieldDefinitionState, participants map[string]stores.ParticipantRecord) string {
	tempID := strings.TrimSpace(definition.ParticipantTempID)
	if tempID == "" {
		tempID = strings.TrimSpace(definition.ParticipantID)
	}
	if tempID == "" {
		return ""
	}
	participant, ok := participants[tempID]
	if !ok {
		return ""
	}
	return strings.TrimSpace(participant.ID)
}

func resolveFieldPlacementGeometry(state wizardStatePayload, definition wizardFieldDefinitionState, index int) wizardFieldPlacementState {
	placement := findPlacementForField(state.FieldPlacements, definition)
	if strings.TrimSpace(placement.PlacementSource) == "" {
		placement.PlacementSource = strings.TrimSpace(placement.PlacementSourceV2)
	}
	if strings.TrimSpace(placement.LinkGroupID) == "" {
		placement.LinkGroupID = strings.TrimSpace(placement.LinkGroupIDV2)
	}
	if strings.TrimSpace(placement.LinkedFromFieldID) == "" {
		placement.LinkedFromFieldID = strings.TrimSpace(placement.LinkedFromFieldIDV2)
	}
	if !placement.IsUnlinked && placement.IsUnlinkedV2 {
		placement.IsUnlinked = true
	}
	terminalPage := resolveWizardTerminalPage(state)
	if terminalPage <= 0 {
		terminalPage = 1
	}
	page := placement.Page
	if page <= 0 {
		page = definition.Page
	}
	if page <= 0 {
		page = 1
	}
	if page > terminalPage {
		page = terminalPage
	}

	x := placement.X
	y := placement.Y
	width := placement.Width
	height := placement.Height

	if width <= 0 {
		width = 180
	}
	if height <= 0 {
		height = 32
	}
	if x <= 0 {
		x = 72
	}
	if y <= 0 {
		y = float64(96 + (index * 48))
	}
	placement.Page = page
	placement.X = x
	placement.Y = y
	placement.Width = width
	placement.Height = height
	placement.PlacementSource = strings.TrimSpace(strings.ToLower(placement.PlacementSource))
	return placement
}

func findPlacementForField(placements []wizardFieldPlacementState, definition wizardFieldDefinitionState) wizardFieldPlacementState {
	definitionID := strings.TrimSpace(definition.ID)
	definitionTempID := strings.TrimSpace(definition.TempID)
	for _, placement := range placements {
		placementTempID := strings.TrimSpace(placement.FieldTempID)
		if placementTempID != "" {
			if definitionTempID != "" && placementTempID == definitionTempID {
				return placement
			}
			if definitionID != "" && placementTempID == definitionID {
				return placement
			}
		}
		placementDefinitionIDs := []string{
			strings.TrimSpace(placement.FieldDefinitionID),
			strings.TrimSpace(placement.DefinitionID),
			strings.TrimSpace(placement.FieldDefinitionIDV2),
		}
		for _, placementDefinitionID := range placementDefinitionIDs {
			if placementDefinitionID == "" {
				continue
			}
			if definitionID != "" && placementDefinitionID == definitionID {
				return placement
			}
			if definitionTempID != "" && placementDefinitionID == definitionTempID {
				return placement
			}
		}
	}
	return wizardFieldPlacementState{}
}

func normalizeDraftParticipantRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case stores.RecipientRoleCC:
		return stores.RecipientRoleCC
	default:
		return stores.RecipientRoleSigner
	}
}

func normalizeDraftFieldType(fieldType string) string {
	fieldType = strings.ToLower(strings.TrimSpace(fieldType))
	switch fieldType {
	case stores.FieldTypeSignature,
		stores.FieldTypeInitials,
		stores.FieldTypeDateSigned,
		stores.FieldTypeText,
		stores.FieldTypeCheckbox:
		return fieldType
	default:
		return stores.FieldTypeText
	}
}

func staleRevisionError(currentRevision int64) error {
	return goerrors.New("stale revision", goerrors.CategoryConflict).
		WithCode(409).
		WithTextCode("stale_revision").
		WithMetadata(map[string]any{"current_revision": currentRevision})
}

func draftNotFoundError(id string) error {
	return goerrors.New("draft not found", goerrors.CategoryNotFound).
		WithCode(404).
		WithTextCode("NOT_FOUND").
		WithMetadata(map[string]any{"id": strings.TrimSpace(id)})
}

func isDraftStoreNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") || coded.Category == goerrors.CategoryNotFound
	}
	return false
}

func (s DraftService) appendDraftAudit(ctx context.Context, scope stores.Scope, draftID, eventType, actorID string, metadata map[string]any) error {
	if s.audits == nil {
		return nil
	}
	if strings.TrimSpace(eventType) == "" {
		return nil
	}
	actorType := "system"
	if strings.TrimSpace(actorID) != "" {
		actorType = "user"
	}
	payload := map[string]any{"draft_id": strings.TrimSpace(draftID)}
	maps.Copy(payload, metadata)
	encoded, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("draft audit encode %s for %s: %w", strings.TrimSpace(eventType), strings.TrimSpace(draftID), err)
	}
	if _, err := s.audits.AppendDraftEvent(ctx, scope, stores.DraftAuditEventRecord{
		DraftID:      strings.TrimSpace(draftID),
		EventType:    strings.TrimSpace(eventType),
		ActorType:    actorType,
		ActorID:      strings.TrimSpace(actorID),
		MetadataJSON: string(encoded),
		CreatedAt:    s.now().UTC(),
	}); err != nil {
		return fmt.Errorf("draft audit append %s for %s: %w", strings.TrimSpace(eventType), strings.TrimSpace(draftID), err)
	}
	return nil
}

type wizardStatePayload struct {
	Document         wizardDocumentState          `json:"document"`
	Details          wizardDetailsState           `json:"details"`
	Participants     []wizardParticipantState     `json:"participants"`
	FieldDefinitions []wizardFieldDefinitionState `json:"fieldDefinitions"`
	FieldPlacements  []wizardFieldPlacementState  `json:"fieldPlacements"`
	FieldRules       []wizardFieldRuleState       `json:"fieldRules"`
	FieldRulesSnake  []wizardFieldRuleState       `json:"field_rules"`
}

type wizardDocumentState struct {
	ID        string `json:"id"`
	PageCount int    `json:"pageCount"`
}

type wizardDetailsState struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

type wizardParticipantState struct {
	TempID       string `json:"tempId"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Notify       *bool  `json:"notify"`
	Order        int    `json:"order"`
	SigningStage int    `json:"signingStage"`
}

type wizardFieldDefinitionState struct {
	ID                string `json:"id"`
	TempID            string `json:"tempId"`
	Type              string `json:"type"`
	ParticipantID     string `json:"participantId"`
	ParticipantTempID string `json:"participantTempId"`
	Label             string `json:"label"`
	Required          bool   `json:"required"`
	Page              int    `json:"page"`
	TabIndex          int    `json:"tabIndex"`
}

type wizardFieldPlacementState struct {
	FieldDefinitionID   string  `json:"field_definition_id"`
	DefinitionID        string  `json:"definition_id"`
	FieldDefinitionIDV2 string  `json:"definitionId"`
	FieldTempID         string  `json:"fieldTempId"`
	Page                int     `json:"page"`
	X                   float64 `json:"x"`
	Y                   float64 `json:"y"`
	Width               float64 `json:"width"`
	Height              float64 `json:"height"`
	PlacementSource     string  `json:"placement_source"`
	PlacementSourceV2   string  `json:"placementSource"`
	LinkGroupID         string  `json:"link_group_id"`
	LinkGroupIDV2       string  `json:"linkGroupId"`
	LinkedFromFieldID   string  `json:"linked_from_field_id"`
	LinkedFromFieldIDV2 string  `json:"linkedFromFieldId"`
	IsUnlinked          bool    `json:"is_unlinked"`
	IsUnlinkedV2        bool    `json:"isUnlinked"`
}

type wizardFieldRuleState struct {
	ID                string `json:"id"`
	Type              string `json:"type"`
	ParticipantID     string `json:"participantId"`
	ParticipantTempID string `json:"participantTempId"`
	Page              int    `json:"page"`
	FromPage          int    `json:"fromPage"`
	ToPage            int    `json:"toPage"`
	ExcludeLastPage   bool   `json:"excludeLastPage"`
	ExcludePages      []int  `json:"excludePages"`
	Label             string `json:"label"`
	Required          *bool  `json:"required,omitempty"`
}

func decodeWizardState(raw string) (wizardStatePayload, error) {
	state := wizardStatePayload{}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return state, fmt.Errorf("wizard state payload is empty")
	}
	if err := json.Unmarshal([]byte(raw), &state); err != nil {
		return wizardStatePayload{}, err
	}
	if state.Participants == nil {
		state.Participants = []wizardParticipantState{}
	}
	if state.FieldDefinitions == nil {
		state.FieldDefinitions = []wizardFieldDefinitionState{}
	}
	if state.FieldPlacements == nil {
		state.FieldPlacements = []wizardFieldPlacementState{}
	}
	if state.FieldRules == nil {
		state.FieldRules = []wizardFieldRuleState{}
	}
	if len(state.FieldRules) == 0 && len(state.FieldRulesSnake) > 0 {
		state.FieldRules = append([]wizardFieldRuleState{}, state.FieldRulesSnake...)
	}
	return state, nil
}

func materializeFieldDefinitions(state wizardStatePayload) []wizardFieldDefinitionState {
	definitions := make([]wizardFieldDefinitionState, 0, len(state.FieldDefinitions))
	definitions = append(definitions, state.FieldDefinitions...)
	definitions = append(definitions, expandFieldRules(state)...)

	sort.SliceStable(definitions, func(i, j int) bool {
		leftPage := definitions[i].Page
		if leftPage <= 0 {
			leftPage = 1
		}
		rightPage := definitions[j].Page
		if rightPage <= 0 {
			rightPage = 1
		}
		if leftPage != rightPage {
			return leftPage < rightPage
		}
		leftTab := definitions[i].TabIndex
		rightTab := definitions[j].TabIndex
		if leftTab > 0 && rightTab > 0 && leftTab != rightTab {
			return leftTab < rightTab
		}
		if (leftTab > 0) != (rightTab > 0) {
			return leftTab > 0
		}
		leftY, leftX := placementSeedForDefinition(state, definitions[i])
		rightY, rightX := placementSeedForDefinition(state, definitions[j])
		if leftY != rightY {
			return leftY < rightY
		}
		if leftX != rightX {
			return leftX < rightX
		}
		return strings.TrimSpace(definitions[i].TempID) < strings.TrimSpace(definitions[j].TempID)
	})
	return definitions
}

func placementSeedForDefinition(state wizardStatePayload, definition wizardFieldDefinitionState) (float64, float64) {
	placement := findPlacementForField(state.FieldPlacements, definition)
	seedY := placement.Y
	seedX := placement.X
	if seedY <= 0 {
		seedY = 1e9
	}
	if seedX <= 0 {
		seedX = 1e9
	}
	return seedY, seedX
}

func expandFieldRules(state wizardStatePayload) []wizardFieldDefinitionState {
	if len(state.FieldRules) == 0 {
		return []wizardFieldDefinitionState{}
	}
	terminalPage := resolveWizardTerminalPage(state)
	if terminalPage <= 0 {
		terminalPage = 1
	}
	expanded := make([]wizardFieldDefinitionState, 0)
	for index, rule := range state.FieldRules {
		ruleType := strings.ToLower(strings.TrimSpace(rule.Type))
		if ruleType == "" {
			continue
		}
		ruleBaseID := resolveWizardRuleExpansionBaseID(rule, index)
		rulePage := rule.Page
		if rulePage < 0 {
			rulePage = 1
		}
		if rulePage > terminalPage {
			rulePage = terminalPage
		}
		fromPage := rule.FromPage
		if fromPage < 0 {
			fromPage = 1
		}
		if fromPage > terminalPage {
			fromPage = terminalPage
		}
		toPage := rule.ToPage
		if toPage < 0 {
			toPage = 1
		}
		if toPage > terminalPage {
			toPage = terminalPage
		}

		required := true
		if rule.Required != nil {
			required = *rule.Required
		}
		switch ruleType {
		case "initials_each_page":
			startPage := fromPage
			if startPage <= 0 {
				startPage = 1
			}
			endPage := toPage
			if endPage <= 0 {
				endPage = terminalPage
			}
			if endPage < startPage {
				startPage, endPage = endPage, startPage
			}
			excludedPages := map[int]struct{}{}
			for _, page := range rule.ExcludePages {
				if page > 0 {
					if page > terminalPage {
						page = terminalPage
					}
					excludedPages[page] = struct{}{}
				}
			}
			if rule.ExcludeLastPage {
				excludedPages[terminalPage] = struct{}{}
			}
			for page := startPage; page <= endPage; page++ {
				if _, excluded := excludedPages[page]; excluded {
					continue
				}
				defID := fmt.Sprintf("%s-initials-%d", ruleBaseID, page)
				expanded = append(expanded, wizardFieldDefinitionState{
					ID:                defID,
					TempID:            defID,
					Type:              stores.FieldTypeInitials,
					ParticipantID:     strings.TrimSpace(rule.ParticipantID),
					ParticipantTempID: strings.TrimSpace(rule.ParticipantTempID),
					Label:             primitives.FirstNonEmpty(strings.TrimSpace(rule.Label), "Initials"),
					Required:          required,
					Page:              page,
				})
			}
		case "signature_once":
			page := rulePage
			if page <= 0 {
				page = toPage
			}
			if page <= 0 {
				page = terminalPage
			}
			if page <= 0 {
				page = 1
			}
			defID := fmt.Sprintf("%s-signature-%d", ruleBaseID, page)
			expanded = append(expanded, wizardFieldDefinitionState{
				ID:                defID,
				TempID:            defID,
				Type:              stores.FieldTypeSignature,
				ParticipantID:     strings.TrimSpace(rule.ParticipantID),
				ParticipantTempID: strings.TrimSpace(rule.ParticipantTempID),
				Label:             primitives.FirstNonEmpty(strings.TrimSpace(rule.Label), "Signature"),
				Required:          required,
				Page:              page,
			})
		}
	}
	return expanded
}

func resolveWizardRuleExpansionBaseID(rule wizardFieldRuleState, index int) string {
	baseID := strings.TrimSpace(rule.ID)
	if baseID != "" {
		return baseID
	}
	return fmt.Sprintf("rule-%d", index+1)
}

func resolveWizardTerminalPage(state wizardStatePayload) int {
	if state.Document.PageCount > 0 {
		return state.Document.PageCount
	}
	maxPage := 1
	for _, definition := range state.FieldDefinitions {
		if definition.Page > maxPage {
			maxPage = definition.Page
		}
	}
	for _, placement := range state.FieldPlacements {
		if placement.Page > maxPage {
			maxPage = placement.Page
		}
	}
	for _, rule := range state.FieldRules {
		if rule.Page > maxPage {
			maxPage = rule.Page
		}
		if rule.ToPage > maxPage {
			maxPage = rule.ToPage
		}
	}
	return maxPage
}

//go:fix inline
func draftIntPtr(value int) *int {
	return new(value)
}

//go:fix inline
func draftBoolPtr(value bool) *bool {
	return new(value)
}

func draftStringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

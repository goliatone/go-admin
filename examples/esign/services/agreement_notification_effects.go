package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const GuardedEffectGroupTypeAgreement = "agreement"

type AgreementNotificationEffectDetail struct {
	EffectID      string     `json:"effect_id"`
	GroupType     string     `json:"group_type,omitempty"`
	GroupID       string     `json:"group_id,omitempty"`
	Kind          string     `json:"kind"`
	RecipientID   string     `json:"recipient_id,omitempty"`
	Notification  string     `json:"notification,omitempty"`
	Status        string     `json:"status"`
	DispatchID    string     `json:"dispatch_id,omitempty"`
	CorrelationID string     `json:"correlation_id,omitempty"`
	Error         string     `json:"error,omitempty"`
	AttemptCount  int        `json:"attempt_count"`
	MaxAttempts   int        `json:"max_attempts"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DispatchedAt  *time.Time `json:"dispatched_at,omitempty"`
	FinalizedAt   *time.Time `json:"finalized_at,omitempty"`
	AbortedAt     *time.Time `json:"aborted_at,omitempty"`
	RetryAt       *time.Time `json:"retry_at,omitempty"`
	Resumable     bool       `json:"resumable"`
}

type AgreementNotificationSummary struct {
	Status         string
	DeliveryEffect string
	LastError      string
	LastAttemptAt  *time.Time
	Effects        []AgreementNotificationEffectDetail
	Recoverable    bool
}

type AgreementNotificationEffectsReader interface {
	ListAgreementNotificationEffects(ctx context.Context, scope stores.Scope, agreementID string) ([]AgreementNotificationEffectDetail, error)
}

type GuardedEffectResumeInput struct {
	ActorID       string
	CorrelationID string
}

type GuardedEffectResumeResult struct {
	AgreementID string
	Effect      AgreementNotificationEffectDetail
}

type AgreementDeliveryResumeInput struct {
	ActorID       string
	CorrelationID string
}

type AgreementDeliveryResumeResult struct {
	Agreement stores.AgreementRecord
	Effects   []AgreementNotificationEffectDetail
}

type AgreementNotificationRecoveryService struct {
	store                stores.Store
	tokens               AgreementTokenService
	notificationDispatch AgreementNotificationDispatchTrigger
	now                  func() time.Time
}

type AgreementNotificationRecoveryOption func(*AgreementNotificationRecoveryService)

func WithAgreementNotificationRecoveryClock(now func() time.Time) AgreementNotificationRecoveryOption {
	return func(s *AgreementNotificationRecoveryService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func WithAgreementNotificationRecoveryDispatch(trigger AgreementNotificationDispatchTrigger) AgreementNotificationRecoveryOption {
	return func(s *AgreementNotificationRecoveryService) {
		if s == nil {
			return
		}
		s.notificationDispatch = trigger
	}
}

func NewAgreementNotificationRecoveryService(
	store stores.Store,
	tokens AgreementTokenService,
	opts ...AgreementNotificationRecoveryOption,
) AgreementNotificationRecoveryService {
	svc := AgreementNotificationRecoveryService{
		store:  store,
		tokens: tokens,
		now:    func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s AgreementNotificationRecoveryService) tokensForTx(tx stores.TxStore) AgreementTokenService {
	if tx == nil {
		return s.tokens
	}
	switch typed := s.tokens.(type) {
	case stores.TokenService:
		return typed.ForTx(tx)
	case *stores.TokenService:
		return typed.ForTx(tx)
	case interface {
		ForTx(tx stores.TxStore) AgreementTokenService
	}:
		return typed.ForTx(tx)
	default:
		return stores.NewTokenService(tx)
	}
}

func isAgreementNotificationEffectKind(kind string) bool {
	switch strings.TrimSpace(kind) {
	case GuardedEffectKindAgreementSendInvitation, GuardedEffectKindAgreementResendReminder:
		return true
	default:
		return false
	}
}

func agreementNotificationTypeFromPreparePayload(payload agreementNotificationEffectPreparePayload, kind string) AgreementNotificationType {
	switch strings.TrimSpace(payload.Notification) {
	case string(NotificationSigningInvitation):
		return NotificationSigningInvitation
	case string(NotificationSigningReminder):
		return NotificationSigningReminder
	case string(NotificationCompletionPackage):
		return NotificationCompletionPackage
	}
	switch strings.TrimSpace(kind) {
	case GuardedEffectKindAgreementResendReminder:
		return NotificationSigningReminder
	default:
		return NotificationSigningInvitation
	}
}

func canResumeAgreementNotificationEffect(record guardedeffects.Record) bool {
	return isAgreementNotificationEffectKind(record.Kind) && guardedeffects.NormalizeStatus(record.Status) == guardedeffects.StatusDeadLettered
}

func notificationEffectSortLess(left, right guardedeffects.Record) bool {
	leftRank := notificationStatusRank(left.Status)
	rightRank := notificationStatusRank(right.Status)
	if leftRank != rightRank {
		return leftRank > rightRank
	}
	if !left.UpdatedAt.Equal(right.UpdatedAt) {
		return left.UpdatedAt.After(right.UpdatedAt)
	}
	return strings.TrimSpace(left.EffectID) < strings.TrimSpace(right.EffectID)
}

func notificationStatusRank(status string) int {
	switch guardedeffects.NormalizeStatus(status) {
	case guardedeffects.StatusDeadLettered:
		return 6
	case guardedeffects.StatusRetrying:
		return 5
	case guardedeffects.StatusGuardPending:
		return 4
	case guardedeffects.StatusDispatching:
		return 3
	case guardedeffects.StatusPrepared:
		return 2
	case guardedeffects.StatusFinalized:
		return 1
	case guardedeffects.StatusAborted:
		return 0
	default:
		return -1
	}
}

func selectAgreementNotificationStatus(records []guardedeffects.Record) string {
	best := ""
	bestRank := -1
	hasFinalized := false
	hasAborted := false
	for _, record := range records {
		switch guardedeffects.NormalizeStatus(record.Status) {
		case guardedeffects.StatusDeadLettered, guardedeffects.StatusRetrying, guardedeffects.StatusGuardPending, guardedeffects.StatusDispatching, guardedeffects.StatusPrepared:
			rank := notificationStatusRank(record.Status)
			if rank > bestRank {
				bestRank = rank
				best = guardedeffects.NormalizeStatus(record.Status)
			}
		case guardedeffects.StatusFinalized:
			hasFinalized = true
		case guardedeffects.StatusAborted:
			hasAborted = true
		}
	}
	if best != "" {
		return best
	}
	if hasFinalized {
		return guardedeffects.StatusFinalized
	}
	if hasAborted {
		return guardedeffects.StatusAborted
	}
	return ""
}

func agreementNotificationPayload(record guardedeffects.Record) agreementNotificationEffectPreparePayload {
	payload := agreementNotificationEffectPreparePayload{}
	_ = json.Unmarshal([]byte(record.PreparePayloadJSON), &payload)
	return payload
}

func AgreementNotificationEffectDetailFromRecord(record guardedeffects.Record) AgreementNotificationEffectDetail {
	payload := agreementNotificationPayload(record)
	return AgreementNotificationEffectDetail{
		EffectID:      strings.TrimSpace(record.EffectID),
		GroupType:     strings.TrimSpace(record.GroupType),
		GroupID:       strings.TrimSpace(record.GroupID),
		Kind:          strings.TrimSpace(record.Kind),
		RecipientID:   firstNonEmpty(strings.TrimSpace(payload.RecipientID), strings.TrimSpace(record.SubjectID)),
		Notification:  strings.TrimSpace(payload.Notification),
		Status:        guardedeffects.NormalizeStatus(record.Status),
		DispatchID:    strings.TrimSpace(record.DispatchID),
		CorrelationID: strings.TrimSpace(record.CorrelationID),
		Error:         strings.TrimSpace(record.ErrorJSON),
		AttemptCount:  record.AttemptCount,
		MaxAttempts:   record.MaxAttempts,
		UpdatedAt:     record.UpdatedAt.UTC(),
		DispatchedAt:  cloneAgreementTime(record.DispatchedAt),
		FinalizedAt:   cloneAgreementTime(record.FinalizedAt),
		AbortedAt:     cloneAgreementTime(record.AbortedAt),
		RetryAt:       cloneAgreementTime(record.RetryAt),
		Resumable:     canResumeAgreementNotificationEffect(record),
	}
}

func compatibilityDeliveryEffect(records []guardedeffects.Record, summaryStatus string) string {
	if len(records) == 0 {
		return ""
	}
	summaryStatus = guardedeffects.NormalizeStatus(summaryStatus)
	recipientIDs := make(map[string]struct{}, len(records))
	for _, record := range records {
		recipientID := strings.TrimSpace(firstNonEmpty(agreementNotificationPayload(record).RecipientID, record.SubjectID))
		if recipientID == "" {
			continue
		}
		recipientIDs[recipientID] = struct{}{}
	}
	if len(recipientIDs) <= 1 {
		return strings.TrimSpace(records[0].EffectID)
	}
	if summaryStatus == "" {
		return ""
	}
	match := ""
	for _, record := range records {
		if guardedeffects.NormalizeStatus(record.Status) != summaryStatus {
			continue
		}
		if match != "" {
			return ""
		}
		match = strings.TrimSpace(record.EffectID)
	}
	return match
}

func summarizeAgreementNotificationEffects(records []guardedeffects.Record) AgreementNotificationSummary {
	out := AgreementNotificationSummary{
		Status:  selectAgreementNotificationStatus(records),
		Effects: make([]AgreementNotificationEffectDetail, 0, len(records)),
	}
	if len(records) == 0 {
		return out
	}
	ordered := append([]guardedeffects.Record{}, records...)
	sort.Slice(ordered, func(i, j int) bool {
		return notificationEffectSortLess(ordered[i], ordered[j])
	})
	out.DeliveryEffect = compatibilityDeliveryEffect(ordered, out.Status)
	for _, record := range ordered {
		detail := AgreementNotificationEffectDetailFromRecord(record)
		out.Effects = append(out.Effects, detail)
		if detail.Resumable {
			out.Recoverable = true
		}
		if out.LastError == "" && strings.TrimSpace(detail.Error) != "" {
			out.LastError = strings.TrimSpace(detail.Error)
		}
		candidate := record.UpdatedAt
		if record.DispatchedAt != nil && record.DispatchedAt.After(candidate) {
			candidate = record.DispatchedAt.UTC()
		}
		if candidate.IsZero() {
			continue
		}
		if out.LastAttemptAt == nil || candidate.After(out.LastAttemptAt.UTC()) {
			ts := candidate.UTC()
			out.LastAttemptAt = &ts
		}
	}
	return out
}

func listAgreementNotificationEffectRecords(
	ctx context.Context,
	store stores.GuardedEffectStore,
	scope stores.Scope,
	agreementID string,
) ([]guardedeffects.Record, error) {
	if store == nil {
		return nil, domainValidationError("guarded_effects", "store", "not configured")
	}
	records, err := store.ListGuardedEffects(ctx, scope, stores.GuardedEffectQuery{
		GroupType: GuardedEffectGroupTypeAgreement,
		GroupID:   strings.TrimSpace(agreementID),
	})
	if err != nil {
		return nil, err
	}
	out := make([]guardedeffects.Record, 0, len(records))
	for _, record := range records {
		if isAgreementNotificationEffectKind(record.Kind) {
			out = append(out, record)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return strings.TrimSpace(out[i].EffectID) < strings.TrimSpace(out[j].EffectID)
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func ApplyAgreementNotificationSummary(
	ctx context.Context,
	agreements stores.AgreementStore,
	effects stores.GuardedEffectStore,
	scope stores.Scope,
	agreementID string,
) (stores.AgreementRecord, AgreementNotificationSummary, error) {
	if agreements == nil {
		return stores.AgreementRecord{}, AgreementNotificationSummary{}, domainValidationError("agreements", "store", "not configured")
	}
	records, err := listAgreementNotificationEffectRecords(ctx, effects, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, AgreementNotificationSummary{}, err
	}
	summary := summarizeAgreementNotificationEffects(records)
	patch := stores.AgreementDeliveryStatePatch{
		DeliveryStatus:        ptrString(summary.Status),
		DeliveryEffectID:      ptrString(summary.DeliveryEffect),
		LastDeliveryError:     ptrString(summary.LastError),
		LastDeliveryAttemptAt: cloneAgreementTime(summary.LastAttemptAt),
	}
	agreement, err := agreements.UpdateAgreementDeliveryState(ctx, scope, agreementID, patch)
	return agreement, summary, err
}

func (s AgreementService) ListAgreementNotificationEffects(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
) ([]AgreementNotificationEffectDetail, error) {
	if s.effects == nil {
		return nil, domainValidationError("guarded_effects", "store", "not configured")
	}
	records, err := listAgreementNotificationEffectRecords(ctx, s.effects, scope, agreementID)
	if err != nil {
		return nil, err
	}
	summary := summarizeAgreementNotificationEffects(records)
	return summary.Effects, nil
}

func (s AgreementNotificationRecoveryService) ResumeEffect(
	ctx context.Context,
	scope stores.Scope,
	effectID string,
	input GuardedEffectResumeInput,
) (GuardedEffectResumeResult, error) {
	if s.store == nil {
		return GuardedEffectResumeResult{}, domainValidationError("guarded_effects", "store", "not configured")
	}
	if s.tokens == nil {
		return GuardedEffectResumeResult{}, domainValidationError("signing_tokens", "service", "not configured")
	}
	effectID = strings.TrimSpace(effectID)
	if effectID == "" {
		return GuardedEffectResumeResult{}, domainValidationError("guarded_effects", "effect_id", "required")
	}
	var result GuardedEffectResumeResult
	err := s.store.WithTx(ctx, func(tx stores.TxStore) error {
		record, innerErr := tx.GetGuardedEffect(ctx, effectID)
		if innerErr != nil {
			return innerErr
		}
		detail, agreementID, innerErr := s.resumeAgreementNotificationEffect(ctx, tx, s.tokensForTx(tx), scope, record, input)
		if innerErr != nil {
			return innerErr
		}
		result = GuardedEffectResumeResult{AgreementID: agreementID, Effect: detail}
		return nil
	})
	if err != nil {
		return GuardedEffectResumeResult{}, err
	}
	if s.notificationDispatch != nil {
		s.notificationDispatch.NotifyScope(scope)
	}
	return result, nil
}

func (s AgreementNotificationRecoveryService) ResumeAgreementDelivery(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	input AgreementDeliveryResumeInput,
) (AgreementDeliveryResumeResult, error) {
	if s.store == nil {
		return AgreementDeliveryResumeResult{}, domainValidationError("guarded_effects", "store", "not configured")
	}
	if s.tokens == nil {
		return AgreementDeliveryResumeResult{}, domainValidationError("signing_tokens", "service", "not configured")
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return AgreementDeliveryResumeResult{}, domainValidationError("agreements", "id", "required")
	}
	var result AgreementDeliveryResumeResult
	err := s.store.WithTx(ctx, func(tx stores.TxStore) error {
		records, innerErr := listAgreementNotificationEffectRecords(ctx, tx, scope, agreementID)
		if innerErr != nil {
			return innerErr
		}
		resumed := make([]AgreementNotificationEffectDetail, 0)
		for _, record := range records {
			if !canResumeAgreementNotificationEffect(record) {
				continue
			}
			detail, _, resumeErr := s.resumeAgreementNotificationEffect(ctx, tx, s.tokensForTx(tx), scope, record, GuardedEffectResumeInput{
				ActorID:       strings.TrimSpace(input.ActorID),
				CorrelationID: strings.TrimSpace(input.CorrelationID),
			})
			if resumeErr != nil {
				return resumeErr
			}
			resumed = append(resumed, detail)
		}
		if len(resumed) == 0 {
			return domainValidationError("guarded_effects", "status", "no dead-lettered notification effects to resume")
		}
		agreement, _, innerErr := ApplyAgreementNotificationSummary(ctx, tx, tx, scope, agreementID)
		if innerErr != nil {
			return innerErr
		}
		result = AgreementDeliveryResumeResult{
			Agreement: agreement,
			Effects:   resumed,
		}
		return nil
	})
	if err != nil {
		return AgreementDeliveryResumeResult{}, err
	}
	if s.notificationDispatch != nil {
		s.notificationDispatch.NotifyScope(scope)
	}
	return result, nil
}

func (s AgreementNotificationRecoveryService) resumeAgreementNotificationEffect(
	ctx context.Context,
	tx stores.TxStore,
	tokens AgreementTokenService,
	scope stores.Scope,
	record guardedeffects.Record,
	input GuardedEffectResumeInput,
) (AgreementNotificationEffectDetail, string, error) {
	if !canResumeAgreementNotificationEffect(record) {
		return AgreementNotificationEffectDetail{}, "", domainValidationError("guarded_effects", "status", "resume requires dead_lettered notification effect")
	}
	payload := agreementNotificationPayload(record)
	agreementID := strings.TrimSpace(firstNonEmpty(payload.AgreementID, record.GroupID))
	recipientID := strings.TrimSpace(firstNonEmpty(payload.RecipientID, record.SubjectID))
	if agreementID == "" || recipientID == "" {
		return AgreementNotificationEffectDetail{}, "", fmt.Errorf("resume guarded effect: missing agreement or recipient")
	}
	if pendingTokenID := strings.TrimSpace(payload.PendingTokenID); pendingTokenID != "" {
		_, _ = tokens.AbortPending(ctx, scope, pendingTokenID)
	}
	issued, err := tokens.IssuePending(ctx, scope, agreementID, recipientID)
	if err != nil {
		return AgreementNotificationEffectDetail{}, "", err
	}
	now := s.now().UTC()
	correlationID := strings.TrimSpace(firstNonEmpty(input.CorrelationID, record.CorrelationID, record.EffectID))
	notification := AgreementNotification{
		AgreementID:   agreementID,
		RecipientID:   recipientID,
		EffectID:      strings.TrimSpace(record.EffectID),
		CorrelationID: correlationID,
		Type:          agreementNotificationTypeFromPreparePayload(payload, record.Kind),
		Token:         issued,
	}
	preparePayload, err := json.Marshal(agreementNotificationEffectPreparePayload{
		AgreementID:       agreementID,
		RecipientID:       recipientID,
		PendingTokenID:    strings.TrimSpace(issued.Record.ID),
		Notification:      strings.TrimSpace(firstNonEmpty(payload.Notification, string(notification.Type))),
		FailureAuditEvent: strings.TrimSpace(payload.FailureAuditEvent),
	})
	if err != nil {
		return AgreementNotificationEffectDetail{}, "", err
	}
	outboxRecord, err := buildEmailNotificationOutboxRecord(scope, notification, strings.TrimSpace(payload.FailureAuditEvent), now)
	if err != nil {
		return AgreementNotificationEffectDetail{}, "", err
	}
	record.CorrelationID = correlationID
	record.Status = guardedeffects.StatusPrepared
	record.PreparePayloadJSON = string(preparePayload)
	record.DispatchPayloadJSON = strings.TrimSpace(outboxRecord.PayloadJSON)
	record.ResultPayloadJSON = ""
	record.ErrorJSON = ""
	record.DispatchID = ""
	record.FinalizedAt = nil
	record.AbortedAt = nil
	record.RetryAt = nil
	record.UpdatedAt = now
	record.GroupType = strings.TrimSpace(firstNonEmpty(record.GroupType, GuardedEffectGroupTypeAgreement))
	record.GroupID = strings.TrimSpace(firstNonEmpty(record.GroupID, agreementID))
	saved, err := tx.SaveGuardedEffect(ctx, scope, record)
	if err != nil {
		return AgreementNotificationEffectDetail{}, "", err
	}
	if _, err := tx.EnqueueOutboxMessage(ctx, scope, outboxRecord); err != nil {
		return AgreementNotificationEffectDetail{}, "", err
	}
	if _, _, err := ApplyAgreementNotificationSummary(ctx, tx, tx, scope, agreementID); err != nil {
		return AgreementNotificationEffectDetail{}, "", err
	}
	metadata, _ := json.Marshal(map[string]any{
		"effect_id":      strings.TrimSpace(saved.EffectID),
		"recipient_id":   recipientID,
		"notification":   strings.TrimSpace(payload.Notification),
		"resumed_by":     strings.TrimSpace(input.ActorID),
		"correlation_id": correlationID,
	})
	actorType := "admin"
	if strings.TrimSpace(input.ActorID) == "" {
		actorType = "system"
	}
	_, _ = tx.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  agreementID,
		EventType:    "agreement.notification_delivery_resumed",
		ActorType:    actorType,
		ActorID:      strings.TrimSpace(input.ActorID),
		MetadataJSON: string(metadata),
		CreatedAt:    now,
	})
	return AgreementNotificationEffectDetailFromRecord(saved), agreementID, nil
}

func cloneAgreementTime(src *time.Time) *time.Time {
	if src == nil || src.IsZero() {
		return nil
	}
	out := src.UTC()
	return &out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

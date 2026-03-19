package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	reminders "github.com/goliatone/go-notifications/pkg/reminders"
)

const reminderInternalErrorTTL = 30 * 24 * time.Hour

// AgreementReminderSweepResult summarizes one reminder sweep execution.
type AgreementReminderSweepResult struct {
	Claimed                 int            `json:"claimed"`
	Sent                    int            `json:"sent"`
	Skipped                 int            `json:"skipped"`
	Failed                  int            `json:"failed"`
	LeaseLost               int            `json:"lease_lost"`
	LeaseConflict           int            `json:"lease_conflict"`
	StateInvariantViolation int            `json:"state_invariant_violation"`
	PolicyBlock             int            `json:"policy_block"`
	SkipReasons             map[string]int `json:"skip_reasons"`
	FailureReasons          map[string]int `json:"failure_reasons"`
	ClaimToSendMS           []float64      `json:"claim_to_send_ms"`
	DueToSendMS             []float64      `json:"due_to_send_ms"`
	DueBacklogAgeMS         []float64      `json:"due_backlog_age_ms"`
}

// ReviewReminderControlInput captures actor/context for participant-level review reminder controls.
type ReviewReminderControlInput struct {
	ParticipantID string `json:"participant_id"`
	RecipientID   string `json:"recipient_id"`
	ActorType     string `json:"actor_type"`
	ActorID       string `json:"actor_id"`
	IPAddress     string `json:"ip_address"`
	CorrelationID string `json:"correlation_id"`
}

// ReviewReminderState summarizes derived review reminder cadence for one review participant.
type ReviewReminderState struct {
	AgreementID        string     `json:"agreement_id"`
	ReviewID           string     `json:"review_id"`
	ParticipantID      string     `json:"participant_id"`
	RecipientID        string     `json:"recipient_id"`
	Status             string     `json:"status"`
	SentCount          int        `json:"sent_count"`
	FirstSentAt        *time.Time `json:"first_sent_at"`
	LastSentAt         *time.Time `json:"last_sent_at"`
	LastViewedAt       *time.Time `json:"last_viewed_at"`
	LastManualResendAt *time.Time `json:"last_manual_resend_at"`
	NextDueAt          *time.Time `json:"next_due_at"`
	LastReasonCode     string     `json:"last_reason_code"`
	LastErrorCode      string     `json:"last_error_code"`
	Paused             bool       `json:"paused"`
}

// AgreementReminderService coordinates due reminder claims and resend dispatch.
type AgreementReminderService struct {
	agreements stores.AgreementStore
	reminders  stores.AgreementReminderStore
	lifecycle  AgreementService
	now        func() time.Time
	workerID   string
}

// AgreementReminderServiceOption customizes reminder service behavior.
type AgreementReminderServiceOption func(*AgreementReminderService)

// WithAgreementReminderClock overrides wall clock.
func WithAgreementReminderClock(now func() time.Time) AgreementReminderServiceOption {
	return func(s *AgreementReminderService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithAgreementReminderWorkerID sets the reminder sweep worker id used for lease fencing.
func WithAgreementReminderWorkerID(workerID string) AgreementReminderServiceOption {
	return func(s *AgreementReminderService) {
		if s == nil {
			return
		}
		s.workerID = strings.TrimSpace(workerID)
	}
}

func NewAgreementReminderService(store stores.Store, lifecycle AgreementService, opts ...AgreementReminderServiceOption) AgreementReminderService {
	svc := AgreementReminderService{
		agreements: store,
		reminders:  store,
		lifecycle:  lifecycle,
		now:        func() time.Time { return time.Now().UTC() },
		workerID:   "agreement-reminder-sweep",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func reminderErrorTextCode(err error) string {
	if err == nil {
		return ""
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return ""
	}
	return strings.TrimSpace(strings.ToUpper(coded.TextCode))
}

func classifyReminderMutationErr(err error) (outcome, reason string, handled bool) {
	switch reminderErrorTextCode(err) {
	case "REMINDER_LEASE_LOST":
		return "skipped", "lease_lost", true
	case "REMINDER_LEASE_CONFLICT":
		return "skipped", "lease_conflict", true
	case "REMINDER_STATE_INVARIANT_VIOLATION":
		return "failed", "state_invariant_violation", true
	default:
		return "", "", false
	}
}

func reminderHeartbeatInterval(leaseSeconds int) time.Duration {
	if leaseSeconds <= 0 {
		leaseSeconds = 120
	}
	interval := (time.Duration(leaseSeconds) * time.Second) / 3
	if interval <= 0 {
		interval = time.Second
	}
	maxInterval := 30 * time.Second
	if interval > maxInterval {
		interval = maxInterval
	}
	return interval
}

func (s AgreementReminderService) encryptReminderFailure(ctx context.Context, failure string, now time.Time) (string, *time.Time, error) {
	failure = sanitizeReminderFailureText(failure)
	if failure == "" {
		return "", nil, nil
	}
	key := strings.TrimSpace(appcfg.Active().Services.EncryptionKey)
	if err := appcfg.ValidateReminderInternalErrorEncryptionKey(key); err != nil {
		return "", nil, err
	}
	cipher := NewAESGCMCredentialCipher([]byte(key))
	encrypted, err := cipher.Encrypt(ctx, failure)
	if err != nil {
		return "", nil, err
	}
	expiresAt := now.Add(reminderInternalErrorTTL).UTC()
	return encrypted, &expiresAt, nil
}

func (s AgreementReminderService) Sweep(ctx context.Context, scope stores.Scope) (AgreementReminderSweepResult, error) {
	out := AgreementReminderSweepResult{
		SkipReasons:    map[string]int{},
		FailureReasons: map[string]int{},
	}
	if s.reminders == nil || s.agreements == nil {
		return out, fmt.Errorf("agreement reminder service not configured")
	}
	cfg := appcfg.Active().Reminders
	if !cfg.Enabled {
		return out, nil
	}
	now := s.now().UTC()
	workerID := strings.TrimSpace(s.workerID)
	if workerID == "" {
		workerID = "agreement-reminder-sweep"
	}
	sweepID := fmt.Sprintf("%s:%d", workerID, now.UnixNano())
	claims, err := s.reminders.ClaimDueAgreementReminders(ctx, scope, stores.AgreementReminderClaimInput{
		Now:          now,
		Limit:        cfg.BatchSize,
		LeaseSeconds: cfg.ClaimLeaseSeconds,
		WorkerID:     workerID,
		SweepID:      sweepID,
	})
	if err != nil {
		return out, err
	}
	out.Claimed = len(claims)
	policy := ReminderPolicyFromConfig(appcfg.Active())
	for _, claim := range claims {
		if claim.State.NextDueAt != nil {
			out.DueBacklogAgeMS = append(out.DueBacklogAgeMS, durationMillisNonNegative(now.Sub(claim.State.NextDueAt.UTC())))
		}
		outcome, reason, sentAt, processErr := s.processClaimedReminder(ctx, scope, claim, policy, cfg.ClaimLeaseSeconds)
		if processErr != nil {
			out.Failed++
			out.FailureReasons["process_failed"]++
			continue
		}
		switch outcome {
		case "sent":
			out.Sent++
			if sentAt != nil {
				if claim.State.ClaimedAt != nil {
					out.ClaimToSendMS = append(out.ClaimToSendMS, durationMillisNonNegative(sentAt.Sub(claim.State.ClaimedAt.UTC())))
				}
				if claim.State.NextDueAt != nil {
					out.DueToSendMS = append(out.DueToSendMS, durationMillisNonNegative(sentAt.Sub(claim.State.NextDueAt.UTC())))
				}
			}
		case "skipped":
			out.Skipped++
			if strings.TrimSpace(reason) != "" {
				out.SkipReasons[reason]++
			}
			if reason == "lease_lost" {
				out.LeaseLost++
			}
			if reason == "lease_conflict" {
				out.LeaseConflict++
			}
			if reason == "policy_block" {
				out.PolicyBlock++
			}
		case "failed":
			out.Failed++
			if strings.TrimSpace(reason) != "" {
				out.FailureReasons[reason]++
			}
			if reason == "state_invariant_violation" {
				out.StateInvariantViolation++
			}
		}
	}
	reviewResult, err := s.sweepReviewReminders(ctx, scope, now, policy)
	if err != nil {
		return out, err
	}
	mergeAgreementReminderSweepResult(&out, reviewResult)
	return out, nil
}

func (s AgreementReminderService) CleanupInternalErrors(ctx context.Context, scope stores.Scope, now time.Time, limit int) (int, error) {
	if s.reminders == nil {
		return 0, fmt.Errorf("agreement reminder service not configured")
	}
	if now.IsZero() {
		now = s.now().UTC()
	}
	if limit <= 0 {
		limit = 1000
	}
	return s.reminders.CleanupAgreementReminderInternalErrors(ctx, scope, now.UTC(), limit)
}

func (s AgreementReminderService) processClaimedReminder(
	ctx context.Context,
	scope stores.Scope,
	claim stores.AgreementReminderClaim,
	policy reminders.Policy,
	leaseSeconds int,
) (string, string, *time.Time, error) {
	state := claim.State
	stableKey := reminderStableKey(scope, state.AgreementID, state.RecipientID)
	if leaseSeconds <= 0 {
		leaseSeconds = appcfg.Active().Reminders.ClaimLeaseSeconds
	}
	if leaseSeconds <= 0 {
		leaseSeconds = 120
	}
	leaseToken := claim.Lease
	var leaseMu sync.Mutex
	getLease := func() stores.AgreementReminderLeaseToken {
		leaseMu.Lock()
		defer leaseMu.Unlock()
		return leaseToken
	}
	setLease := func(next stores.AgreementReminderLeaseToken) {
		leaseMu.Lock()
		defer leaseMu.Unlock()
		leaseToken = next
	}

	handleMutationErr := func(err error) (string, string, error) {
		if err == nil {
			return "", "", nil
		}
		if outcome, reason, handled := classifyReminderMutationErr(err); handled {
			return outcome, reason, nil
		}
		return "failed", "", err
	}

	markSkip := func(reason string, due *time.Time, terminalReason string) (string, string, error) {
		markAt := s.now().UTC()
		_, err := s.reminders.MarkAgreementReminderSkipped(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderMarkInput{
			ReasonCode:     reason,
			OccurredAt:     markAt,
			NextDueAt:      due,
			LeaseSeconds:   leaseSeconds,
			Lease:          getLease(),
			TerminalReason: terminalReason,
		})
		if err != nil {
			return handleMutationErr(err)
		}
		return "skipped", reason, nil
	}
	computeNextDue := func(at time.Time) *time.Time {
		next := reminders.ComputeNextDue(at, policy, stableKey)
		return &next
	}
	markFail := func(reason, failure string) (string, string, error) {
		markAt := s.now().UTC()
		nextDue := reminders.ComputeNextDue(markAt, policy, stableKey)
		failure = sanitizeReminderFailureText(failure)
		encryptedFailure, expiresAt, encryptErr := s.encryptReminderFailure(ctx, failure, markAt)
		if encryptErr != nil {
			encryptedFailure = ""
			expiresAt = nil
		}
		_, err := s.reminders.MarkAgreementReminderFailed(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderMarkInput{
			ReasonCode:             reason,
			Failure:                failure,
			OccurredAt:             markAt,
			NextDueAt:              &nextDue,
			LeaseSeconds:           leaseSeconds,
			Lease:                  getLease(),
			ErrorInternalEncrypted: encryptedFailure,
			ErrorInternalExpiresAt: expiresAt,
		})
		if err != nil {
			return handleMutationErr(err)
		}
		return "failed", reason, nil
	}

	agreement, err := s.agreements.GetAgreement(ctx, scope, state.AgreementID)
	if err != nil {
		outcome, reason, markErr := markFail("agreement_lookup_failed", err.Error())
		return outcome, reason, nil, markErr
	}
	switch strings.TrimSpace(agreement.Status) {
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
	case stores.AgreementStatusCompleted, stores.AgreementStatusVoided, stores.AgreementStatusDeclined, stores.AgreementStatusExpired:
		_, pauseErr := s.reminders.PauseAgreementReminder(ctx, scope, state.AgreementID, state.RecipientID, s.now().UTC())
		if pauseErr != nil {
			return "failed", "pause_failed", nil, pauseErr
		}
		return "skipped", "agreement_terminal", nil, nil
	default:
		outcome, reason, markErr := markSkip("agreement_not_active", computeNextDue(s.now().UTC()), "")
		return outcome, reason, nil, markErr
	}

	recipients, err := s.agreements.ListRecipients(ctx, scope, state.AgreementID)
	if err != nil {
		outcome, reason, markErr := markFail("recipient_lookup_failed", err.Error())
		return outcome, reason, nil, markErr
	}
	activeStage, activeSigners, ok := activeSignerStage(recipients)
	if !ok {
		outcome, reason, markErr := markSkip("no_active_signer", computeNextDue(s.now().UTC()), "")
		return outcome, reason, nil, markErr
	}
	target, found := recipientByID(recipients, state.RecipientID)
	if !found {
		outcome, reason, markErr := markFail("recipient_not_found", "recipient not found")
		return outcome, reason, nil, markErr
	}
	if target.Role != stores.RecipientRoleSigner {
		outcome, reason, markErr := markSkip("recipient_not_signer", computeNextDue(s.now().UTC()), "")
		return outcome, reason, nil, markErr
	}
	if target.CompletedAt != nil || target.DeclinedAt != nil {
		_, pauseErr := s.reminders.PauseAgreementReminder(ctx, scope, state.AgreementID, state.RecipientID, s.now().UTC())
		if pauseErr != nil {
			return "failed", "pause_failed", nil, pauseErr
		}
		return "skipped", "recipient_terminal", nil, nil
	}
	if !containsRecipientID(recipientIDs(activeSigners), target.ID) && !appcfg.Active().Reminders.AllowOutOfOrder {
		_ = activeStage
		outcome, reason, markErr := markSkip("recipient_not_in_active_stage", computeNextDue(s.now().UTC()), "")
		return outcome, reason, nil, markErr
	}

	observedLastViewedAt := newerTimePtr(state.LastViewedAt, target.LastViewAt)
	now := s.now().UTC()

	decision := reminders.Evaluate(now, policy, reminders.State{
		SentCount:          state.SentCount,
		FirstSentAt:        state.FirstSentAt,
		LastSentAt:         state.LastSentAt,
		LastViewedAt:       observedLastViewedAt,
		LastManualResendAt: state.LastManualResendAt,
		NextDueAt:          state.NextDueAt,
	})
	if !decision.Due {
		reason := strings.TrimSpace(decision.ReasonCode)
		if reason == stores.AgreementReminderTerminalReasonMaxCountReached {
			outcome, skipReason, markErr := markSkip(reason, nil, stores.AgreementReminderTerminalReasonMaxCountReached)
			return outcome, skipReason, nil, markErr
		}
		if decision.NextDueAt == nil {
			outcome, skipReason, markErr := markSkip(reason, computeNextDue(s.now().UTC()), "")
			return outcome, skipReason, nil, markErr
		}
		outcome, skipReason, markErr := markSkip(reason, decision.NextDueAt, "")
		return outcome, skipReason, nil, markErr
	}

	renewed, renewErr := s.reminders.RenewAgreementReminderLease(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderLeaseRenewInput{
		Now:          s.now().UTC(),
		LeaseSeconds: leaseSeconds,
		Lease:        getLease(),
	})
	if renewErr != nil {
		outcome, reason, markErr := handleMutationErr(renewErr)
		return outcome, reason, nil, markErr
	}
	setLease(renewed.Lease)

	heartbeatCtx, heartbeatCancel := context.WithCancel(ctx)
	heartbeatErrCh := make(chan error, 1)
	heartbeatDone := make(chan struct{})
	heartbeatInterval := reminderHeartbeatInterval(leaseSeconds)
	go func() {
		defer close(heartbeatDone)
		ticker := time.NewTicker(heartbeatInterval)
		defer ticker.Stop()
		for {
			select {
			case <-heartbeatCtx.Done():
				return
			case <-ticker.C:
				renewed, err := s.reminders.RenewAgreementReminderLease(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderLeaseRenewInput{
					Now:          s.now().UTC(),
					LeaseSeconds: leaseSeconds,
					Lease:        getLease(),
				})
				if err != nil {
					select {
					case heartbeatErrCh <- err:
					default:
					}
					heartbeatCancel()
					return
				}
				setLease(renewed.Lease)
			}
		}
	}()

	_, resendErr := s.lifecycle.Resend(heartbeatCtx, scope, agreement.ID, ResendInput{
		RecipientID:           target.ID,
		RotateToken:           appcfg.Active().Reminders.RotateToken,
		InvalidateExisting:    appcfg.Active().Reminders.RotateToken,
		AllowOutOfOrderResend: appcfg.Active().Reminders.AllowOutOfOrder,
		IdempotencyKey:        fmt.Sprintf("reminder:%s:%s:%s:%d", agreement.ID, target.ID, claim.Lease.SweepID, claim.Lease.LeaseSeq),
		Source:                ResendSourceAutoReminder,
		ReminderLease:         getLease(),
		ReminderLeaseSeconds:  leaseSeconds,
	})
	heartbeatCancel()
	<-heartbeatDone
	select {
	case heartbeatErr := <-heartbeatErrCh:
		if resendErr == nil {
			outcome, reason, markErr := handleMutationErr(heartbeatErr)
			return outcome, reason, nil, markErr
		}
	default:
	}
	if resendErr != nil {
		outcome, reason, markErr := markFail("resend_failed", resendErr.Error())
		return outcome, reason, nil, markErr
	}

	markAt := s.now().UTC()
	nextDue := reminders.ComputeNextDue(markAt, policy, stableKey)
	_, err = s.reminders.MarkAgreementReminderSent(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderMarkInput{
		ReasonCode:   reminders.ReasonDue,
		OccurredAt:   markAt,
		NextDueAt:    &nextDue,
		LeaseSeconds: leaseSeconds,
		Lease:        getLease(),
	})
	if err != nil {
		outcome, reason, markErr := handleMutationErr(err)
		return outcome, reason, nil, markErr
	}
	return "sent", "", cloneServiceTimePtr(&markAt), nil
}

func durationMillisNonNegative(value time.Duration) float64 {
	if value < 0 {
		return 0
	}
	return float64(value.Milliseconds())
}

func mergeAgreementReminderSweepResult(dst *AgreementReminderSweepResult, src AgreementReminderSweepResult) {
	if dst == nil {
		return
	}
	dst.Claimed += src.Claimed
	dst.Sent += src.Sent
	dst.Skipped += src.Skipped
	dst.Failed += src.Failed
	dst.LeaseLost += src.LeaseLost
	dst.LeaseConflict += src.LeaseConflict
	dst.StateInvariantViolation += src.StateInvariantViolation
	dst.PolicyBlock += src.PolicyBlock
	if dst.SkipReasons == nil {
		dst.SkipReasons = map[string]int{}
	}
	for key, value := range src.SkipReasons {
		dst.SkipReasons[key] += value
	}
	if dst.FailureReasons == nil {
		dst.FailureReasons = map[string]int{}
	}
	for key, value := range src.FailureReasons {
		dst.FailureReasons[key] += value
	}
	dst.ClaimToSendMS = append(dst.ClaimToSendMS, src.ClaimToSendMS...)
	dst.DueToSendMS = append(dst.DueToSendMS, src.DueToSendMS...)
	dst.DueBacklogAgeMS = append(dst.DueBacklogAgeMS, src.DueBacklogAgeMS...)
}

type derivedReviewReminderState struct {
	Snapshot          ReviewReminderState `json:"snapshot"`
	State             reminders.State     `json:"state"`
	AutoReminderCount int                 `json:"auto_reminder_count"`
	pausedNextDueAt   *time.Time
}

func (s AgreementReminderService) sweepReviewReminders(
	ctx context.Context,
	scope stores.Scope,
	now time.Time,
	policy reminders.Policy,
) (AgreementReminderSweepResult, error) {
	out := AgreementReminderSweepResult{
		SkipReasons:    map[string]int{},
		FailureReasons: map[string]int{},
	}
	if s.agreements == nil {
		return out, nil
	}
	audits, ok := s.agreements.(stores.AuditEventStore)
	if !ok || audits == nil {
		return out, nil
	}
	agreements, err := s.agreements.ListAgreements(ctx, scope, stores.AgreementQuery{
		Status: stores.AgreementStatusDraft,
		Limit:  500,
	})
	if err != nil {
		return out, err
	}
	for _, agreement := range agreements {
		if strings.TrimSpace(agreement.ReviewStatus) != stores.AgreementReviewStatusInReview {
			continue
		}
		summary, err := s.lifecycle.GetReviewSummary(ctx, scope, agreement.ID)
		if err != nil {
			out.Failed++
			out.FailureReasons["review_summary_failed"]++
			continue
		}
		if summary.Review == nil || strings.TrimSpace(summary.Status) != stores.AgreementReviewStatusInReview {
			continue
		}
		events, err := audits.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
		if err != nil {
			out.Failed++
			out.FailureReasons["review_audit_lookup_failed"]++
			continue
		}
		sort.Slice(events, func(i, j int) bool {
			if !events[i].CreatedAt.Equal(events[j].CreatedAt) {
				return events[i].CreatedAt.Before(events[j].CreatedAt)
			}
			return events[i].ID < events[j].ID
		})
		for _, participant := range summary.Participants {
			if reviewParticipantEffectiveDecisionStatus(participant) != stores.AgreementReviewDecisionPending {
				continue
			}
			derived, ok := deriveReviewReminderState(scope, agreement.ID, summary.Status, now, participant, events, policy)
			if !ok {
				continue
			}
			if strings.TrimSpace(derived.Snapshot.Status) == stores.AgreementReminderStatusPaused {
				out.Skipped++
				out.SkipReasons["review_paused"]++
				continue
			}
			decision := reminders.Evaluate(now, policy, derived.State)
			if derived.State.NextDueAt != nil {
				out.DueBacklogAgeMS = append(out.DueBacklogAgeMS, durationMillisNonNegative(now.Sub(derived.State.NextDueAt.UTC())))
			}
			if !decision.Due {
				out.Skipped++
				reason := prefixReviewReminderReason(decision.ReasonCode)
				if reason != "" {
					out.SkipReasons[reason]++
				}
				continue
			}
			out.Claimed++
			correlationID := fmt.Sprintf("review-reminder:%s:%s:%d", strings.TrimSpace(agreement.ID), strings.TrimSpace(participant.ID), derived.AutoReminderCount+1)
			notifyStartedAt := s.now().UTC()
			if _, err := s.lifecycle.NotifyReviewers(ctx, scope, agreement.ID, ReviewNotifyInput{
				ParticipantID: strings.TrimSpace(participant.ID),
				RequestedByID: "",
				ActorType:     "system",
				ActorID:       "",
				CorrelationID: correlationID,
				Source:        ReviewNotificationSourceAutoReminder,
			}); err != nil {
				out.Failed++
				out.FailureReasons["review_notify_failed"]++
				continue
			}
			out.Sent++
			out.ClaimToSendMS = append(out.ClaimToSendMS, 0)
			if derived.State.NextDueAt != nil {
				out.DueToSendMS = append(out.DueToSendMS, durationMillisNonNegative(notifyStartedAt.Sub(derived.State.NextDueAt.UTC())))
			}
		}
	}
	return out, nil
}

func deriveReviewReminderState(
	scope stores.Scope,
	agreementID string,
	reviewStatus string,
	now time.Time,
	participant stores.AgreementReviewParticipantRecord,
	events []stores.AuditEventRecord,
	policy reminders.Policy,
) (derivedReviewReminderState, bool) {
	state := reminders.State{}
	snapshot := ReviewReminderState{
		AgreementID:   strings.TrimSpace(agreementID),
		ReviewID:      strings.TrimSpace(participant.ReviewID),
		ParticipantID: strings.TrimSpace(participant.ID),
		RecipientID:   strings.TrimSpace(participant.RecipientID),
		Status:        stores.AgreementReminderStatusActive,
	}
	stableKey := reviewReminderStableKey(scope, participant)
	var cycleStart *time.Time
	for _, event := range events {
		if !reviewReminderEventApplies(event, participant) {
			continue
		}
		switch strings.TrimSpace(event.EventType) {
		case "agreement.review_requested", "agreement.review_reopened":
			startedAt := event.CreatedAt.UTC()
			cycleStart = &startedAt
			state = reminders.State{
				FirstSentAt: &startedAt,
				LastSentAt:  &startedAt,
			}
			snapshot = ReviewReminderState{
				AgreementID:   strings.TrimSpace(agreementID),
				ReviewID:      strings.TrimSpace(participant.ReviewID),
				ParticipantID: strings.TrimSpace(participant.ID),
				RecipientID:   strings.TrimSpace(participant.RecipientID),
				Status:        stores.AgreementReminderStatusActive,
				FirstSentAt:   cloneServiceTimePtr(&startedAt),
				LastSentAt:    cloneServiceTimePtr(&startedAt),
			}
		}
	}
	if cycleStart == nil {
		return derivedReviewReminderState{}, false
	}
	derived := derivedReviewReminderState{Snapshot: snapshot, State: state}
	for _, event := range events {
		eventAt := event.CreatedAt.UTC()
		if eventAt.Before(*cycleStart) {
			continue
		}
		if !reviewReminderEventApplies(event, participant) {
			continue
		}
		switch strings.TrimSpace(event.EventType) {
		case "agreement.review_requested", "agreement.review_reopened":
			derived.State.FirstSentAt = cloneServiceTimePtr(&eventAt)
			derived.State.LastSentAt = cloneServiceTimePtr(&eventAt)
			derived.Snapshot.FirstSentAt = cloneServiceTimePtr(&eventAt)
			derived.Snapshot.LastSentAt = cloneServiceTimePtr(&eventAt)
			derived.Snapshot.Status = stores.AgreementReminderStatusActive
			derived.Snapshot.Paused = false
			derived.Snapshot.NextDueAt = nil
			derived.Snapshot.LastReasonCode = ""
			derived.pausedNextDueAt = nil
		case "agreement.review_notified":
			source := reviewReminderEventSource(event)
			derived.State.LastSentAt = cloneServiceTimePtr(&eventAt)
			derived.Snapshot.LastSentAt = cloneServiceTimePtr(&eventAt)
			if source == ReviewNotificationSourceAutoReminder {
				derived.AutoReminderCount++
				derived.State.SentCount = derived.AutoReminderCount
				derived.Snapshot.SentCount = derived.AutoReminderCount
			} else {
				derived.State.LastManualResendAt = cloneServiceTimePtr(&eventAt)
				derived.Snapshot.LastManualResendAt = cloneServiceTimePtr(&eventAt)
			}
		case "agreement.review_viewed":
			derived.State.LastViewedAt = newerTimePtr(derived.State.LastViewedAt, &eventAt)
			derived.Snapshot.LastViewedAt = newerTimePtr(derived.Snapshot.LastViewedAt, &eventAt)
		case "agreement.review_reminders_paused":
			derived.Snapshot.Status = stores.AgreementReminderStatusPaused
			derived.Snapshot.Paused = true
			derived.Snapshot.LastReasonCode = "paused"
			derived.pausedNextDueAt = reviewReminderEventNextDueAt(event)
			derived.Snapshot.NextDueAt = nil
		case "agreement.review_reminders_resumed":
			derived.Snapshot.Status = stores.AgreementReminderStatusActive
			derived.Snapshot.Paused = false
			derived.Snapshot.LastReasonCode = "resumed"
			derived.Snapshot.NextDueAt = reviewReminderEventNextDueAt(event)
			derived.pausedNextDueAt = nil
		}
	}
	if derived.State.FirstSentAt == nil {
		return derivedReviewReminderState{}, false
	}
	derived.Snapshot.FirstSentAt = newerTimePtr(derived.Snapshot.FirstSentAt, derived.State.FirstSentAt)
	derived.Snapshot.LastSentAt = newerTimePtr(derived.Snapshot.LastSentAt, derived.State.LastSentAt)
	derived.Snapshot.LastViewedAt = newerTimePtr(derived.Snapshot.LastViewedAt, derived.State.LastViewedAt)
	derived.Snapshot.LastManualResendAt = newerTimePtr(derived.Snapshot.LastManualResendAt, derived.State.LastManualResendAt)
	if reviewParticipantEffectiveDecisionStatus(participant) != stores.AgreementReviewDecisionPending || strings.TrimSpace(reviewStatus) != stores.AgreementReviewStatusInReview {
		derived.Snapshot.Status = stores.AgreementReminderStatusTerminal
		derived.Snapshot.Paused = false
		derived.Snapshot.NextDueAt = nil
		derived.State.NextDueAt = nil
		return derived, true
	}
	if derived.Snapshot.Paused {
		derived.State.NextDueAt = nil
		derived.Snapshot.NextDueAt = nil
		return derived, true
	}
	baseline := newerTimePtr(derived.State.LastSentAt, derived.State.FirstSentAt)
	if derived.Snapshot.NextDueAt != nil {
		derived.State.NextDueAt = cloneServiceTimePtr(derived.Snapshot.NextDueAt)
	} else if baseline != nil {
		decision := reminders.Evaluate(now.UTC(), policy, reminders.State{
			SentCount:          derived.State.SentCount,
			FirstSentAt:        derived.State.FirstSentAt,
			LastSentAt:         derived.State.LastSentAt,
			LastViewedAt:       derived.State.LastViewedAt,
			LastManualResendAt: derived.State.LastManualResendAt,
			NextDueAt:          derived.State.NextDueAt,
		})
		if decision.NextDueAt != nil {
			derived.State.NextDueAt = cloneServiceTimePtr(decision.NextDueAt)
			derived.Snapshot.NextDueAt = cloneServiceTimePtr(decision.NextDueAt)
		} else {
			nextDue := reminders.ComputeNextDue(baseline.UTC(), policy, stableKey)
			derived.State.NextDueAt = &nextDue
			derived.Snapshot.NextDueAt = cloneServiceTimePtr(&nextDue)
		}
	}
	return derived, true
}

func reviewReminderStableKey(scope stores.Scope, participant stores.AgreementReviewParticipantRecord) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(participant.ReviewID),
		strings.TrimSpace(participant.ID),
	}, "|")
}

func reviewReminderEventApplies(event stores.AuditEventRecord, participant stores.AgreementReviewParticipantRecord) bool {
	switch strings.TrimSpace(event.EventType) {
	case "agreement.review_requested", "agreement.review_reopened", "agreement.review_notified", "agreement.review_reminders_paused", "agreement.review_reminders_resumed":
		for _, reviewParticipant := range reviewReminderEventParticipants(event) {
			if strings.TrimSpace(fmt.Sprint(reviewParticipant["participant_id"])) == strings.TrimSpace(participant.ID) {
				return true
			}
		}
	case "agreement.review_viewed":
		metadata := reviewReminderEventMetadata(event)
		return strings.TrimSpace(fmt.Sprint(metadata["participant_id"])) == strings.TrimSpace(participant.ID)
	}
	return false
}

func reviewReminderEventSource(event stores.AuditEventRecord) string {
	metadata := reviewReminderEventMetadata(event)
	return normalizeReviewNotificationSource(strings.TrimSpace(fmt.Sprint(metadata["source"])))
}

func reviewReminderEventNextDueAt(event stores.AuditEventRecord) *time.Time {
	metadata := reviewReminderEventMetadata(event)
	raw := strings.TrimSpace(fmt.Sprint(metadata["next_due_at"]))
	if raw == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return nil
	}
	return cloneServiceTimePtr(&parsed)
}

func reviewReminderEventParticipants(event stores.AuditEventRecord) []map[string]any {
	metadata := reviewReminderEventMetadata(event)
	raw, ok := metadata["review_participants"].([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(raw))
	for _, entry := range raw {
		typed, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		out = append(out, typed)
	}
	return out
}

func reviewReminderEventMetadata(event stores.AuditEventRecord) map[string]any {
	metadata := map[string]any{}
	if strings.TrimSpace(event.MetadataJSON) == "" {
		return metadata
	}
	_ = json.Unmarshal([]byte(event.MetadataJSON), &metadata)
	return metadata
}

func prefixReviewReminderReason(reason string) string {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return "review_not_due"
	}
	return "review_" + reason
}

func recipientByID(recipients []stores.RecipientRecord, id string) (stores.RecipientRecord, bool) {
	id = strings.TrimSpace(id)
	for _, recipient := range recipients {
		if strings.TrimSpace(recipient.ID) == id {
			return recipient, true
		}
	}
	return stores.RecipientRecord{}, false
}

func (s AgreementService) ReviewReminderStates(ctx context.Context, scope stores.Scope, agreementID string) (map[string]ReviewReminderState, error) {
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, domainValidationError("agreements", "id", "required")
	}
	summary, err := s.GetReviewSummary(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	if summary.Review == nil || len(summary.Participants) == 0 || s.audits == nil {
		return map[string]ReviewReminderState{}, nil
	}
	events, err := s.audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{})
	if err != nil {
		return nil, err
	}
	sort.Slice(events, func(i, j int) bool {
		if !events[i].CreatedAt.Equal(events[j].CreatedAt) {
			return events[i].CreatedAt.Before(events[j].CreatedAt)
		}
		return events[i].ID < events[j].ID
	})
	policy := ReminderPolicyFromConfig(appcfg.Active())
	out := make(map[string]ReviewReminderState, len(summary.Participants))
	for _, participant := range summary.Participants {
		derived, ok := deriveReviewReminderState(scope, agreementID, summary.Status, s.now().UTC(), participant, events, policy)
		if !ok {
			continue
		}
		out[strings.TrimSpace(participant.ID)] = derived.Snapshot
	}
	return out, nil
}

func (s AgreementService) PauseReviewReminder(ctx context.Context, scope stores.Scope, agreementID string, input ReviewReminderControlInput) (ReviewReminderState, error) {
	var out ReviewReminderState
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		target, err := txSvc.resolveReviewReminderTarget(ctx, scope, agreementID, input.ParticipantID, input.RecipientID)
		if err != nil {
			return err
		}
		if strings.TrimSpace(target.State.Snapshot.Status) == stores.AgreementReminderStatusPaused {
			out = target.State.Snapshot
			return nil
		}
		now := txSvc.now().UTC()
		target.Review.LastActivityAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, target.Review); err != nil {
			return err
		}
		metadata := map[string]any{
			"review_id":           target.Review.ID,
			"review_status":       target.Review.Status,
			"reminder_status":     stores.AgreementReminderStatusPaused,
			"review_participants": normalizeReviewParticipantMetadata([]stores.AgreementReviewParticipantRecord{target.Participant}),
		}
		if target.State.Snapshot.NextDueAt != nil {
			metadata["next_due_at"] = target.State.Snapshot.NextDueAt.UTC().Format(time.RFC3339Nano)
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, strings.TrimSpace(agreementID), "agreement.review_reminders_paused", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, metadata); err != nil {
			return err
		}
		states, err := txSvc.ReviewReminderStates(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		out = states[strings.TrimSpace(target.Participant.ID)]
		return nil
	})
	return out, err
}

func (s AgreementService) ResumeReviewReminder(ctx context.Context, scope stores.Scope, agreementID string, input ReviewReminderControlInput) (ReviewReminderState, error) {
	var out ReviewReminderState
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		target, err := txSvc.resolveReviewReminderTarget(ctx, scope, agreementID, input.ParticipantID, input.RecipientID)
		if err != nil {
			return err
		}
		if strings.TrimSpace(target.State.Snapshot.Status) != stores.AgreementReminderStatusPaused {
			out = target.State.Snapshot
			return nil
		}
		now := txSvc.now().UTC()
		nextDueAt := now
		if target.State.pausedNextDueAt != nil && target.State.pausedNextDueAt.After(now) {
			nextDueAt = target.State.pausedNextDueAt.UTC()
		}
		target.Review.LastActivityAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, target.Review); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, strings.TrimSpace(agreementID), "agreement.review_reminders_resumed", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":           target.Review.ID,
			"review_status":       target.Review.Status,
			"reminder_status":     stores.AgreementReminderStatusActive,
			"next_due_at":         nextDueAt.UTC().Format(time.RFC3339Nano),
			"review_participants": normalizeReviewParticipantMetadata([]stores.AgreementReviewParticipantRecord{target.Participant}),
		}); err != nil {
			return err
		}
		states, err := txSvc.ReviewReminderStates(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		out = states[strings.TrimSpace(target.Participant.ID)]
		return nil
	})
	return out, err
}

func (s AgreementService) SendReviewReminderNow(ctx context.Context, scope stores.Scope, agreementID string, input ReviewReminderControlInput) (ReviewSummary, error) {
	target, err := s.resolveReviewReminderTarget(ctx, scope, agreementID, input.ParticipantID, input.RecipientID)
	if err != nil {
		return ReviewSummary{}, err
	}
	now := s.now().UTC()
	decision := reminders.Evaluate(now, ReminderPolicyFromConfig(appcfg.Active()), target.State.State)
	if !decision.Due {
		return ReviewSummary{}, domainValidationError("reminders", "policy", "send_now blocked by reminder policy")
	}
	return s.NotifyReviewers(ctx, scope, agreementID, ReviewNotifyInput{
		ParticipantID: strings.TrimSpace(target.Participant.ID),
		RecipientID:   strings.TrimSpace(target.Participant.RecipientID),
		RequestedByID: strings.TrimSpace(input.ActorID),
		ActorType:     normalizeReviewActorType(input.ActorType),
		ActorID:       strings.TrimSpace(input.ActorID),
		IPAddress:     input.IPAddress,
		CorrelationID: strings.TrimSpace(input.CorrelationID),
		Source:        ReviewNotificationSourceManual,
		Reason:        "send_now",
	})
}

type resolvedReviewReminderTarget struct {
	Agreement   stores.AgreementRecord                  `json:"agreement"`
	Review      stores.AgreementReviewRecord            `json:"review"`
	Participant stores.AgreementReviewParticipantRecord `json:"participant"`
	State       derivedReviewReminderState              `json:"state"`
}

func (s AgreementService) resolveReviewReminderTarget(ctx context.Context, scope stores.Scope, agreementID, participantID, recipientID string) (resolvedReviewReminderTarget, error) {
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return resolvedReviewReminderTarget{}, domainValidationError("agreements", "id", "required")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return resolvedReviewReminderTarget{}, err
	}
	if strings.TrimSpace(agreement.Status) != stores.AgreementStatusDraft {
		return resolvedReviewReminderTarget{}, domainValidationError("agreements", "status", "review reminders require draft agreement")
	}
	review, err := s.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
	if err != nil {
		return resolvedReviewReminderTarget{}, err
	}
	if err := ensureReviewCycleMutable(review, "agreement_reviews", "override_active"); err != nil {
		return resolvedReviewReminderTarget{}, err
	}
	if strings.TrimSpace(review.Status) != stores.AgreementReviewStatusInReview {
		return resolvedReviewReminderTarget{}, domainValidationError("agreement_reviews", "status", "review reminders require active review")
	}
	participants, err := s.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
	if err != nil {
		return resolvedReviewReminderTarget{}, err
	}
	participant, _, err := findReviewParticipant(participants, participantID, recipientID)
	if err != nil {
		return resolvedReviewReminderTarget{}, err
	}
	if reviewParticipantEffectiveDecisionStatus(participant) != stores.AgreementReviewDecisionPending {
		return resolvedReviewReminderTarget{}, domainValidationError("agreement_review_participants", "decision_status", "review reminders require pending reviewer")
	}
	if s.audits == nil {
		return resolvedReviewReminderTarget{}, fmt.Errorf("review reminder audit store not configured")
	}
	events, err := s.audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{})
	if err != nil {
		return resolvedReviewReminderTarget{}, err
	}
	sort.Slice(events, func(i, j int) bool {
		if !events[i].CreatedAt.Equal(events[j].CreatedAt) {
			return events[i].CreatedAt.Before(events[j].CreatedAt)
		}
		return events[i].ID < events[j].ID
	})
	derived, ok := deriveReviewReminderState(scope, agreementID, review.Status, s.now().UTC(), participant, events, ReminderPolicyFromConfig(appcfg.Active()))
	if !ok {
		return resolvedReviewReminderTarget{}, domainValidationError("agreement_review_participants", "participant_id", "review reminder state unavailable")
	}
	return resolvedReviewReminderTarget{
		Agreement:   agreement,
		Review:      review,
		Participant: participant,
		State:       derived,
	}, nil
}

func (s AgreementReminderService) Pause(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	if s.reminders == nil || s.agreements == nil {
		return stores.AgreementReminderStateRecord{}, fmt.Errorf("agreement reminder service not configured")
	}
	agreement, recipient, err := s.resolveRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	if _, err := s.lifecycle.ensureReminderState(ctx, scope, agreement, recipient); err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	return s.reminders.PauseAgreementReminder(ctx, scope, agreement.ID, recipient.ID, s.now().UTC())
}

func (s AgreementReminderService) Resume(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	if s.reminders == nil || s.agreements == nil {
		return stores.AgreementReminderStateRecord{}, fmt.Errorf("agreement reminder service not configured")
	}
	agreement, recipient, err := s.resolveRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	state, err := s.lifecycle.ensureReminderState(ctx, scope, agreement, recipient)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	now := s.now().UTC()
	nextDue := now
	if state.NextDueAt != nil && state.NextDueAt.After(now) {
		nextDue = state.NextDueAt.UTC()
	}
	return s.reminders.ResumeAgreementReminder(ctx, scope, agreement.ID, recipient.ID, now, &nextDue)
}

func (s AgreementReminderService) SendNow(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (ResendResult, error) {
	if s.reminders == nil || s.agreements == nil {
		return ResendResult{}, fmt.Errorf("agreement reminder service not configured")
	}
	agreement, recipient, err := s.resolveRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return ResendResult{}, err
	}
	state, err := s.lifecycle.ensureReminderState(ctx, scope, agreement, recipient)
	if err != nil {
		return ResendResult{}, err
	}
	now := s.now().UTC()
	state.LastViewedAt = newerTimePtr(state.LastViewedAt, recipient.LastViewAt)
	state.LastEvaluatedAt = cloneServiceTimePtr(&now)
	state.UpdatedAt = now
	if _, err := s.reminders.UpsertAgreementReminderState(ctx, scope, state); err != nil {
		return ResendResult{}, err
	}
	policy := ReminderPolicyFromConfig(appcfg.Active())
	decision := reminders.Evaluate(now, policy, reminders.State{
		SentCount:          state.SentCount,
		FirstSentAt:        state.FirstSentAt,
		LastSentAt:         state.LastSentAt,
		LastViewedAt:       state.LastViewedAt,
		LastManualResendAt: state.LastManualResendAt,
		NextDueAt:          state.NextDueAt,
	})
	if !decision.Due {
		state.LastReasonCode = strings.TrimSpace(decision.ReasonCode)
		state.LastEvaluatedAt = cloneServiceTimePtr(&now)
		if state.Status == stores.AgreementReminderStatusActive && decision.NextDueAt != nil {
			state.NextDueAt = cloneServiceTimePtr(decision.NextDueAt)
		}
		state.UpdatedAt = now
		_, _ = s.reminders.UpsertAgreementReminderState(ctx, scope, state)
		return ResendResult{}, domainValidationError("reminders", "policy", "send_now blocked by reminder policy")
	}
	return s.lifecycle.Resend(ctx, scope, agreement.ID, ResendInput{
		RecipientID:           recipient.ID,
		RotateToken:           appcfg.Active().Reminders.RotateToken,
		InvalidateExisting:    appcfg.Active().Reminders.RotateToken,
		AllowOutOfOrderResend: appcfg.Active().Reminders.AllowOutOfOrder,
		IdempotencyKey:        fmt.Sprintf("reminder-send-now:%s:%s:%d", agreement.ID, recipient.ID, now.UnixNano()),
		Source:                ResendSourceManual,
	})
}

func (s AgreementReminderService) resolveRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementRecord, stores.RecipientRecord, error) {
	agreementID = strings.TrimSpace(agreementID)
	recipientID = strings.TrimSpace(recipientID)
	if agreementID == "" {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("agreements", "id", "required")
	}
	if recipientID == "" {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("recipients", "id", "required")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, err
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, err
	}
	recipient, ok := recipientByID(recipients, recipientID)
	if !ok {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("recipients", "id", "not found")
	}
	if recipient.Role != stores.RecipientRoleSigner {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("recipients", "role", "reminders require signer recipient")
	}
	return agreement, recipient, nil
}

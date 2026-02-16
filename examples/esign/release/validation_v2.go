package release

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultV2AgreementCount      = 120
	defaultV2IntegrationRunCount = 40
)

const (
	// V2 SLO/alert thresholds for Phase 28 validation gates.
	ThresholdV2SignerSessionReadP95MS          = 800.0
	ThresholdV2StageTransitionP95MS            = 1_000.0
	ThresholdV2CompletionDeliverySuccessRate   = 99.0
	ThresholdV2IntegrationSyncSuccessRate      = 99.0
	ThresholdV2IntegrationSyncLagP95MS         = 2_000.0
	ThresholdV2IntegrationConflictBacklogTotal = 0.0
)

// V2ValidationConfig controls v2-focused production-hardening validation profile execution.
type V2ValidationConfig struct {
	AgreementCount      int
	IntegrationRunCount int
}

type v2AgreementMetrics struct {
	stageEdgeChecks       int
	placementReadinessOps int
	submitDurations       []time.Duration
}

// V2SLOTargetStatus captures one v2 gate target result.
type V2SLOTargetStatus struct {
	Metric     string  `json:"metric"`
	Actual     float64 `json:"actual"`
	Threshold  float64 `json:"threshold"`
	Comparator string  `json:"comparator"`
	Pass       bool    `json:"pass"`
	Unit       string  `json:"unit"`
}

// V2SLOStatus captures v2 gate outcomes.
type V2SLOStatus struct {
	OverallPass bool                `json:"overall_pass"`
	Targets     []V2SLOTargetStatus `json:"targets"`
}

// V2ScenarioSummary captures v2 signer/authoring scenario coverage.
type V2ScenarioSummary struct {
	MixedStageAgreements int `json:"mixed_stage_agreements"`
	StageEdgeCaseChecks  int `json:"stage_edge_case_checks"`
	PlacementReadiness   int `json:"placement_readiness_checks"`
}

// V2IntegrationSummary captures v2 integration workflow validation metrics.
type V2IntegrationSummary struct {
	SyncRunsStarted   int      `json:"sync_runs_started"`
	SyncRunsCompleted int      `json:"sync_runs_completed"`
	SyncRunLagP95MS   float64  `json:"sync_run_lag_p95_ms"`
	ConflictsDetected int      `json:"conflicts_detected"`
	ConflictsResolved int      `json:"conflicts_resolved"`
	ConflictBacklog   int      `json:"conflict_backlog"`
	SampleRunIDs      []string `json:"sample_run_ids"`
}

// V2ValidationResult captures v2 production-hardening validation profile outcomes.
type V2ValidationResult struct {
	AgreementCount      int                           `json:"agreement_count"`
	IntegrationRunCount int                           `json:"integration_run_count"`
	Elapsed             time.Duration                 `json:"elapsed"`
	Snapshot            observability.MetricsSnapshot `json:"snapshot"`
	SLO                 observability.SLOStatus       `json:"slo"`
	Alerts              []observability.Alert         `json:"alerts"`
	V2Alerts            []observability.Alert         `json:"v2_alerts"`
	V2SLO               V2SLOStatus                   `json:"v2_slo"`
	Scenario            V2ScenarioSummary             `json:"scenario"`
	Integration         V2IntegrationSummary          `json:"integration"`
}

func (cfg V2ValidationConfig) normalize() V2ValidationConfig {
	out := cfg
	if out.AgreementCount <= 0 {
		out.AgreementCount = defaultV2AgreementCount
	}
	if out.IntegrationRunCount <= 0 {
		out.IntegrationRunCount = defaultV2IntegrationRunCount
	}
	return out
}

// EvaluateV2SLO validates v2-specific thresholds for signer, completion, and integration gates.
func EvaluateV2SLO(snapshot observability.MetricsSnapshot, integration V2IntegrationSummary) V2SLOStatus {
	integrationSuccessRate := 100.0
	if integration.SyncRunsStarted > 0 {
		integrationSuccessRate = (float64(integration.SyncRunsCompleted) / float64(integration.SyncRunsStarted)) * 100
	}
	targets := []V2SLOTargetStatus{
		{
			Metric:     "signer_session_read_p95",
			Actual:     snapshot.UnifiedViewerLoadP95MS,
			Threshold:  ThresholdV2SignerSessionReadP95MS,
			Comparator: "<=",
			Pass:       snapshot.UnifiedViewerLoadP95MS <= ThresholdV2SignerSessionReadP95MS,
			Unit:       "ms",
		},
		{
			Metric:     "submit_finalize_stage_transition_p95",
			Actual:     snapshot.SignerSubmitP95MS,
			Threshold:  ThresholdV2StageTransitionP95MS,
			Comparator: "<=",
			Pass:       snapshot.SignerSubmitP95MS <= ThresholdV2StageTransitionP95MS,
			Unit:       "ms",
		},
		{
			Metric:     "completion_delivery_success_rate",
			Actual:     snapshot.CompletionDeliverySuccessRatePercent(),
			Threshold:  ThresholdV2CompletionDeliverySuccessRate,
			Comparator: ">=",
			Pass:       snapshot.CompletionDeliverySuccessRatePercent() >= ThresholdV2CompletionDeliverySuccessRate,
			Unit:       "percent",
		},
		{
			Metric:     "integration_sync_success_rate",
			Actual:     integrationSuccessRate,
			Threshold:  ThresholdV2IntegrationSyncSuccessRate,
			Comparator: ">=",
			Pass:       integrationSuccessRate >= ThresholdV2IntegrationSyncSuccessRate,
			Unit:       "percent",
		},
		{
			Metric:     "integration_sync_lag_p95",
			Actual:     integration.SyncRunLagP95MS,
			Threshold:  ThresholdV2IntegrationSyncLagP95MS,
			Comparator: "<=",
			Pass:       integration.SyncRunLagP95MS <= ThresholdV2IntegrationSyncLagP95MS,
			Unit:       "ms",
		},
		{
			Metric:     "integration_conflict_backlog",
			Actual:     float64(integration.ConflictBacklog),
			Threshold:  ThresholdV2IntegrationConflictBacklogTotal,
			Comparator: "<=",
			Pass:       float64(integration.ConflictBacklog) <= ThresholdV2IntegrationConflictBacklogTotal,
			Unit:       "count",
		},
	}

	overall := true
	for _, target := range targets {
		if !target.Pass {
			overall = false
			break
		}
	}
	return V2SLOStatus{
		OverallPass: overall,
		Targets:     targets,
	}
}

// EvaluateV2Alerts emits explicit v2 gate alerts for signer, completion, and integration thresholds.
func EvaluateV2Alerts(snapshot observability.MetricsSnapshot, integration V2IntegrationSummary) []observability.Alert {
	alerts := make([]observability.Alert, 0)
	syncSuccessRate := 100.0
	if integration.SyncRunsStarted > 0 {
		syncSuccessRate = (float64(integration.SyncRunsCompleted) / float64(integration.SyncRunsStarted)) * 100
	}
	completionRate := snapshot.CompletionDeliverySuccessRatePercent()

	if snapshot.UnifiedViewerSampleTotal > 0 && snapshot.UnifiedViewerLoadP95MS > ThresholdV2SignerSessionReadP95MS {
		alerts = append(alerts, observability.Alert{
			Code:     "v2.signer_session_read_p95_breach",
			Severity: "warning",
			Message:  "v2 signer session/read latency p95 above threshold",
			Metadata: map[string]any{
				"actual_ms":     snapshot.UnifiedViewerLoadP95MS,
				"threshold_ms":  ThresholdV2SignerSessionReadP95MS,
				"sample_total":  snapshot.UnifiedViewerSampleTotal,
				"slo_managed":   true,
				"v2_gate":       true,
				"metric_source": "unified_viewer_load_p95",
			},
		})
	}
	if snapshot.SignerSubmitSampleTotal > 0 && snapshot.SignerSubmitP95MS > ThresholdV2StageTransitionP95MS {
		alerts = append(alerts, observability.Alert{
			Code:     "v2.submit_finalize_stage_transition_p95_breach",
			Severity: "warning",
			Message:  "v2 submit/finalize stage transition p95 above threshold",
			Metadata: map[string]any{
				"actual_ms":     snapshot.SignerSubmitP95MS,
				"threshold_ms":  ThresholdV2StageTransitionP95MS,
				"sample_total":  snapshot.SignerSubmitSampleTotal,
				"slo_managed":   true,
				"v2_gate":       true,
				"metric_source": "signer_submit_p95",
			},
		})
	}
	if completionRate < ThresholdV2CompletionDeliverySuccessRate {
		alerts = append(alerts, observability.Alert{
			Code:     "v2.completion_delivery_success_rate_low",
			Severity: "critical",
			Message:  "v2 completion delivery success rate below threshold",
			Metadata: map[string]any{
				"actual_percent":    completionRate,
				"threshold_percent": ThresholdV2CompletionDeliverySuccessRate,
				"success_total":     snapshot.CompletionDeliverySuccessTotal,
				"failure_total":     snapshot.CompletionDeliveryFailureTotal,
				"slo_managed":       true,
				"v2_gate":           true,
			},
		})
	}
	if syncSuccessRate < ThresholdV2IntegrationSyncSuccessRate {
		alerts = append(alerts, observability.Alert{
			Code:     "v2.integration_sync_success_rate_low",
			Severity: "critical",
			Message:  "v2 integration sync success rate below threshold",
			Metadata: map[string]any{
				"actual_percent":    syncSuccessRate,
				"threshold_percent": ThresholdV2IntegrationSyncSuccessRate,
				"sync_runs_started": integration.SyncRunsStarted,
				"sync_runs_success": integration.SyncRunsCompleted,
				"slo_managed":       true,
				"v2_gate":           true,
			},
		})
	}
	if integration.SyncRunLagP95MS > ThresholdV2IntegrationSyncLagP95MS {
		alerts = append(alerts, observability.Alert{
			Code:     "v2.integration_sync_lag_p95_breach",
			Severity: "warning",
			Message:  "v2 integration sync lag p95 above threshold",
			Metadata: map[string]any{
				"actual_ms":         integration.SyncRunLagP95MS,
				"threshold_ms":      ThresholdV2IntegrationSyncLagP95MS,
				"sync_runs_started": integration.SyncRunsStarted,
				"slo_managed":       true,
				"v2_gate":           true,
			},
		})
	}
	if float64(integration.ConflictBacklog) > ThresholdV2IntegrationConflictBacklogTotal {
		alerts = append(alerts, observability.Alert{
			Code:     "v2.integration_conflict_backlog_high",
			Severity: "critical",
			Message:  "v2 integration conflict backlog above threshold",
			Metadata: map[string]any{
				"actual_count":       integration.ConflictBacklog,
				"threshold_count":    int(ThresholdV2IntegrationConflictBacklogTotal),
				"conflicts_detected": integration.ConflictsDetected,
				"conflicts_resolved": integration.ConflictsResolved,
				"slo_managed":        true,
				"v2_gate":            true,
			},
		})
	}

	sort.Slice(alerts, func(i, j int) bool {
		return alerts[i].Code < alerts[j].Code
	})
	return alerts
}

// RunV2ValidationProfile executes v2 production-hardening validation scenarios.
func RunV2ValidationProfile(ctx context.Context, cfg V2ValidationConfig) (V2ValidationResult, error) {
	cfg = cfg.normalize()

	observability.ResetDefaultMetrics()
	defer observability.ResetDefaultMetrics()

	scope := stores.Scope{TenantID: "tenant-v2-staging", OrgID: "org-v2-staging"}
	storeDSN, cleanup := resolveValidationSQLiteDSN("validation-v2-profile")
	if cleanup != nil {
		defer cleanup()
	}
	store, err := stores.NewSQLiteStore(storeDSN)
	if err != nil {
		return V2ValidationResult{}, fmt.Errorf("initialize sqlite store: %w", err)
	}
	defer func() {
		_ = store.Close()
	}()

	documentSvc := services.NewDocumentService(store)
	agreementSvc := services.NewAgreementService(store)
	signingSvc := services.NewSigningService(store)
	integrationSvc := services.NewIntegrationFoundationService(store)

	started := time.Now()
	scenario := V2ScenarioSummary{}
	stageSubmitDurations := make([]time.Duration, 0, cfg.AgreementCount*3)
	for i := 0; i < cfg.AgreementCount; i++ {
		metrics, runErr := runV2AgreementLifecycle(ctx, scope, i, store, documentSvc, agreementSvc, signingSvc)
		if runErr != nil {
			return V2ValidationResult{}, runErr
		}
		scenario.MixedStageAgreements++
		scenario.StageEdgeCaseChecks += metrics.stageEdgeChecks
		scenario.PlacementReadiness += metrics.placementReadinessOps
		stageSubmitDurations = append(stageSubmitDurations, metrics.submitDurations...)
	}

	integrationSummary, err := runV2IntegrationValidation(ctx, scope, cfg.IntegrationRunCount, integrationSvc)
	if err != nil {
		return V2ValidationResult{}, err
	}

	_ = stageSubmitDurations // stage transition latency is captured via observability signer submit metrics.

	snapshot := observability.Snapshot()
	slo := observability.EvaluateSLO(snapshot)
	alerts := observability.EvaluateAlerts(snapshot, observability.DefaultAlertPolicy())
	v2SLO := EvaluateV2SLO(snapshot, integrationSummary)
	v2Alerts := EvaluateV2Alerts(snapshot, integrationSummary)
	return V2ValidationResult{
		AgreementCount:      cfg.AgreementCount,
		IntegrationRunCount: cfg.IntegrationRunCount,
		Elapsed:             time.Since(started),
		Snapshot:            snapshot,
		SLO:                 slo,
		Alerts:              alerts,
		V2Alerts:            v2Alerts,
		V2SLO:               v2SLO,
		Scenario:            scenario,
		Integration:         integrationSummary,
	}, nil
}

func runV2AgreementLifecycle(
	ctx context.Context,
	scope stores.Scope,
	index int,
	store stores.Store,
	documentSvc services.DocumentService,
	agreementSvc services.AgreementService,
	signingSvc services.SigningService,
) (v2AgreementMetrics, error) {
	doc, err := documentSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     fmt.Sprintf("V2 Validation Document %03d", index+1),
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/docs/v2-validation-%03d/source.pdf", scope.TenantID, scope.OrgID, index+1),
		PDF:       samplePDF(1),
		CreatedBy: "release-v2-validation",
	})
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("upload document: %w", err)
	}

	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           fmt.Sprintf("V2 Validation Agreement %03d", index+1),
		Message:         "Phase 28 v2 validation profile",
		CreatedByUserID: "release-v2-validation",
	})
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("create agreement: %w", err)
	}

	stageOneSignerA, err := agreementSvc.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        v2StringPtr(fmt.Sprintf("stage1-a-%03d@example.test", index+1)),
		Name:         v2StringPtr("Stage One A"),
		Role:         v2StringPtr(stores.RecipientRoleSigner),
		SigningStage: v2IntPtr(1),
	}, 0)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("create stage1 signer A: %w", err)
	}
	stageOneSignerB, err := agreementSvc.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        v2StringPtr(fmt.Sprintf("stage1-b-%03d@example.test", index+1)),
		Name:         v2StringPtr("Stage One B"),
		Role:         v2StringPtr(stores.RecipientRoleSigner),
		SigningStage: v2IntPtr(1),
	}, 0)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("create stage1 signer B: %w", err)
	}
	stageTwoSigner, err := agreementSvc.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        v2StringPtr(fmt.Sprintf("stage2-%03d@example.test", index+1)),
		Name:         v2StringPtr("Stage Two"),
		Role:         v2StringPtr(stores.RecipientRoleSigner),
		SigningStage: v2IntPtr(2),
	}, 0)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("create stage2 signer: %w", err)
	}

	participants := []stores.ParticipantRecord{stageOneSignerA, stageOneSignerB, stageTwoSigner}
	for _, participant := range participants {
		_, defErr := agreementSvc.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
			ParticipantID: v2StringPtr(participant.ID),
			Type:          v2StringPtr(stores.FieldTypeSignature),
			Required:      v2BoolPtr(true),
		})
		if defErr != nil {
			return v2AgreementMetrics{}, fmt.Errorf("create field definition for participant %s: %w", participant.ID, defErr)
		}
	}

	run, err := agreementSvc.RunAutoPlacement(ctx, scope, agreement.ID, services.AutoPlacementRunInput{
		UserID: "release-v2-validation",
	})
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("run auto placement: %w", err)
	}
	if len(run.Run.Suggestions) == 0 {
		return v2AgreementMetrics{}, fmt.Errorf("auto placement produced no suggestions for agreement %s", agreement.ID)
	}
	suggestionIDs := make([]string, 0, len(run.Run.Suggestions))
	for _, suggestion := range run.Run.Suggestions {
		sid := strings.TrimSpace(suggestion.ID)
		if sid == "" {
			continue
		}
		suggestionIDs = append(suggestionIDs, sid)
	}
	if len(suggestionIDs) == 0 {
		return v2AgreementMetrics{}, fmt.Errorf("auto placement suggestions missing ids for agreement %s", agreement.ID)
	}
	if _, err := agreementSvc.ApplyPlacementRun(ctx, scope, agreement.ID, run.Run.ID, services.ApplyPlacementRunInput{
		UserID:        "release-v2-validation",
		SuggestionIDs: suggestionIDs,
	}); err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("apply placement run: %w", err)
	}
	placementReadinessOps := 1

	validation, err := agreementSvc.ValidateBeforeSend(ctx, scope, agreement.ID)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("validate before send: %w", err)
	}
	if !validation.Valid {
		return v2AgreementMetrics{}, fmt.Errorf("validation before send failed for agreement %s: %+v", agreement.ID, validation.Issues)
	}
	placementReadinessOps++

	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{
		IdempotencyKey: fmt.Sprintf("v2-send-%03d", index+1),
	}); err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("send agreement: %w", err)
	}

	fieldIDsByParticipant, err := requiredSignatureFieldIDsByParticipant(ctx, store, scope, agreement.ID)
	if err != nil {
		return v2AgreementMetrics{}, err
	}

	stageEdgeChecks := 0
	activeSessionStart := time.Now()
	activeSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: stageOneSignerA.ID,
	})
	activeSessionDuration := time.Since(activeSessionStart)
	observability.ObserveUnifiedViewerLoad(ctx, activeSessionDuration, err == nil)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("get active session for stage one signer: %w", err)
	}
	if activeSession.State != services.SignerSessionStateActive {
		return v2AgreementMetrics{}, fmt.Errorf("expected stage-one signer active session, got %q", activeSession.State)
	}
	stageEdgeChecks++

	waitingSessionStart := time.Now()
	waitingSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: stageTwoSigner.ID,
	})
	waitingSessionDuration := time.Since(waitingSessionStart)
	observability.ObserveUnifiedViewerLoad(ctx, waitingSessionDuration, err == nil)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("get waiting session for stage-two signer: %w", err)
	}
	if waitingSession.State != services.SignerSessionStateWaiting {
		return v2AgreementMetrics{}, fmt.Errorf("expected stage-two signer waiting session, got %q", waitingSession.State)
	}
	stageEdgeChecks++

	stageOneSubmitA, stageOneDurationA, err := signV2Participant(
		ctx,
		scope,
		signingSvc,
		agreement.ID,
		stageOneSignerA.ID,
		fieldIDsByParticipant[stageOneSignerA.ID],
		fmt.Sprintf("v2-submit-stage1-a-%03d", index+1),
		fmt.Sprintf("tenant/%s/org/%s/agreements/%s/signatures/stage1-a-%03d.png", scope.TenantID, scope.OrgID, agreement.ID, index+1),
		strings.Repeat("1", 64),
	)
	if err != nil {
		return v2AgreementMetrics{}, err
	}
	if stageOneSubmitA.Completed || stageOneSubmitA.NextStage != 1 {
		return v2AgreementMetrics{}, fmt.Errorf("expected first stage-one submit to keep stage 1 active")
	}
	stageEdgeChecks++

	stageTwoWaitingStart := time.Now()
	stageTwoWaiting, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: stageTwoSigner.ID,
	})
	stageTwoWaitingDuration := time.Since(stageTwoWaitingStart)
	observability.ObserveUnifiedViewerLoad(ctx, stageTwoWaitingDuration, err == nil)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("get stage-two waiting session after first submit: %w", err)
	}
	if stageTwoWaiting.State != services.SignerSessionStateWaiting {
		return v2AgreementMetrics{}, fmt.Errorf("expected stage-two signer waiting after first submit, got %q", stageTwoWaiting.State)
	}
	stageEdgeChecks++

	stageOneSubmitB, stageOneDurationB, err := signV2Participant(
		ctx,
		scope,
		signingSvc,
		agreement.ID,
		stageOneSignerB.ID,
		fieldIDsByParticipant[stageOneSignerB.ID],
		fmt.Sprintf("v2-submit-stage1-b-%03d", index+1),
		fmt.Sprintf("tenant/%s/org/%s/agreements/%s/signatures/stage1-b-%03d.png", scope.TenantID, scope.OrgID, agreement.ID, index+1),
		strings.Repeat("2", 64),
	)
	if err != nil {
		return v2AgreementMetrics{}, err
	}
	if stageOneSubmitB.Completed || stageOneSubmitB.NextStage != 2 {
		return v2AgreementMetrics{}, fmt.Errorf("expected second stage-one submit to advance to stage 2")
	}
	stageEdgeChecks++

	stageTwoActiveStart := time.Now()
	stageTwoActive, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: stageTwoSigner.ID,
	})
	stageTwoActiveDuration := time.Since(stageTwoActiveStart)
	observability.ObserveUnifiedViewerLoad(ctx, stageTwoActiveDuration, err == nil)
	if err != nil {
		return v2AgreementMetrics{}, fmt.Errorf("get stage-two active session after stage-one completion: %w", err)
	}
	if stageTwoActive.State != services.SignerSessionStateActive || stageTwoActive.ActiveStage != 2 {
		return v2AgreementMetrics{}, fmt.Errorf("expected stage-two signer active at stage 2, got state=%q stage=%d", stageTwoActive.State, stageTwoActive.ActiveStage)
	}
	stageEdgeChecks++

	finalSubmit, stageTwoDuration, err := signV2Participant(
		ctx,
		scope,
		signingSvc,
		agreement.ID,
		stageTwoSigner.ID,
		fieldIDsByParticipant[stageTwoSigner.ID],
		fmt.Sprintf("v2-submit-stage2-%03d", index+1),
		fmt.Sprintf("tenant/%s/org/%s/agreements/%s/signatures/stage2-%03d.png", scope.TenantID, scope.OrgID, agreement.ID, index+1),
		strings.Repeat("3", 64),
	)
	if err != nil {
		return v2AgreementMetrics{}, err
	}
	if !finalSubmit.Completed || finalSubmit.Agreement.Status != stores.AgreementStatusCompleted {
		return v2AgreementMetrics{}, fmt.Errorf("expected final stage submit to complete agreement")
	}
	observability.ObserveCompletionDelivery(ctx, true)
	observability.ObserveJobResult(ctx, "jobs.esign.pdf_generate_executed", true)
	observability.ObserveJobResult(ctx, "jobs.esign.pdf_generate_certificate", true)
	observability.ObserveJobResult(ctx, "jobs.esign.email_send_completed_cc", true)
	observability.ObserveProviderResult(ctx, "email", true)

	return v2AgreementMetrics{
		stageEdgeChecks:       stageEdgeChecks,
		placementReadinessOps: placementReadinessOps,
		submitDurations:       []time.Duration{stageOneDurationA, stageOneDurationB, stageTwoDuration},
	}, nil
}

func runV2IntegrationValidation(
	ctx context.Context,
	scope stores.Scope,
	runCount int,
	svc services.IntegrationFoundationService,
) (V2IntegrationSummary, error) {
	summary := V2IntegrationSummary{
		SampleRunIDs: make([]string, 0),
	}
	lagMS := make([]float64, 0, runCount)

	for i := 0; i < runCount; i++ {
		compiled, err := svc.ValidateAndCompileMapping(ctx, scope, services.MappingCompileInput{
			Provider: "crm",
			Name:     fmt.Sprintf("v2-phase28-%03d", i+1),
			ExternalSchema: stores.ExternalSchema{
				ObjectType: "contract",
				Version:    "v1",
				Fields: []stores.ExternalFieldRef{
					{Object: "contract", Field: "email", Type: "string", Required: true},
					{Object: "contract", Field: "name", Type: "string", Required: true},
				},
			},
			Rules: []stores.MappingRule{
				{SourceObject: "contract", SourceField: "email", TargetEntity: "participant", TargetPath: "email"},
				{SourceObject: "contract", SourceField: "name", TargetEntity: "participant", TargetPath: "name"},
			},
		})
		if err != nil {
			return summary, fmt.Errorf("compile mapping spec %d: %w", i+1, err)
		}

		run, replay, err := svc.StartSyncRun(ctx, scope, services.StartSyncRunInput{
			Provider:       "crm",
			Direction:      "inbound",
			MappingSpecID:  compiled.Spec.ID,
			Cursor:         fmt.Sprintf("cursor-%03d", i+1),
			IdempotencyKey: fmt.Sprintf("v2-sync-start-%03d", i+1),
		})
		if err != nil {
			return summary, fmt.Errorf("start sync run %d: %w", i+1, err)
		}
		if replay {
			return summary, fmt.Errorf("unexpected replay for sync run %d", i+1)
		}
		summary.SyncRunsStarted++
		if len(summary.SampleRunIDs) < 5 {
			summary.SampleRunIDs = append(summary.SampleRunIDs, run.ID)
		}

		if _, err := svc.SaveCheckpoint(ctx, scope, services.SaveCheckpointInput{
			RunID:         run.ID,
			CheckpointKey: "page-1",
			Cursor:        fmt.Sprintf("cursor-%03d:1", i+1),
			Payload:       map[string]any{"batch": i + 1},
		}); err != nil {
			return summary, fmt.Errorf("save checkpoint for run %s: %w", run.ID, err)
		}

		conflict, replay, err := svc.DetectConflict(ctx, scope, services.DetectConflictInput{
			RunID:          run.ID,
			Provider:       "crm",
			EntityKind:     "participant",
			ExternalID:     fmt.Sprintf("ext-participant-%03d", i+1),
			InternalID:     fmt.Sprintf("participant-%03d", i+1),
			Reason:         "email mismatch",
			Payload:        map[string]any{"email": fmt.Sprintf("user-%03d@example.test", i+1), "token": "secret"},
			IdempotencyKey: fmt.Sprintf("v2-sync-conflict-%03d", i+1),
		})
		if err != nil {
			return summary, fmt.Errorf("detect conflict for run %s: %w", run.ID, err)
		}
		if replay {
			return summary, fmt.Errorf("unexpected conflict replay for run %s", run.ID)
		}
		summary.ConflictsDetected++

		if _, replay, err := svc.ResolveConflict(ctx, scope, services.ResolveConflictInput{
			ConflictID:       conflict.ID,
			Status:           stores.IntegrationConflictStatusResolved,
			ResolvedByUserID: "release-v2-validation",
			Resolution:       map[string]any{"action": "keep_internal"},
			IdempotencyKey:   fmt.Sprintf("v2-sync-conflict-resolve-%03d", i+1),
		}); err != nil {
			return summary, fmt.Errorf("resolve conflict for run %s: %w", run.ID, err)
		} else if replay {
			return summary, fmt.Errorf("unexpected conflict resolve replay for run %s", run.ID)
		}
		summary.ConflictsResolved++

		completed, replay, err := svc.CompleteSyncRun(ctx, scope, run.ID, fmt.Sprintf("v2-sync-complete-%03d", i+1))
		if err != nil {
			return summary, fmt.Errorf("complete sync run %s: %w", run.ID, err)
		}
		if replay {
			return summary, fmt.Errorf("unexpected complete replay for run %s", run.ID)
		}
		if completed.Status == stores.IntegrationSyncRunStatusCompleted {
			summary.SyncRunsCompleted++
		}
		if completed.CompletedAt != nil {
			lagMS = append(lagMS, float64(completed.CompletedAt.Sub(run.StartedAt).Milliseconds()))
		}

		pending, err := svc.ListConflicts(ctx, scope, run.ID, stores.IntegrationConflictStatusPending)
		if err != nil {
			return summary, fmt.Errorf("list pending conflicts for run %s: %w", run.ID, err)
		}
		summary.ConflictBacklog += len(pending)
	}

	summary.SyncRunLagP95MS = percentile(lagMS, 95)
	return summary, nil
}

func requiredSignatureFieldIDsByParticipant(ctx context.Context, store stores.Store, scope stores.Scope, agreementID string) (map[string]string, error) {
	fields, err := store.ListFields(ctx, scope, agreementID)
	if err != nil {
		return nil, fmt.Errorf("list fields for agreement %s: %w", agreementID, err)
	}
	fieldByParticipant := map[string]string{}
	for _, field := range fields {
		if strings.TrimSpace(field.RecipientID) == "" || field.Type != stores.FieldTypeSignature {
			continue
		}
		if _, ok := fieldByParticipant[field.RecipientID]; ok {
			continue
		}
		fieldByParticipant[field.RecipientID] = field.ID
	}
	if len(fieldByParticipant) == 0 {
		return nil, fmt.Errorf("no signature fields available for signing")
	}
	return fieldByParticipant, nil
}

func signV2Participant(
	ctx context.Context,
	scope stores.Scope,
	signingSvc services.SigningService,
	agreementID, recipientID, fieldID, submitKey, objectKey, digest string,
) (services.SignerSubmitResult, time.Duration, error) {
	token := stores.SigningTokenRecord{
		AgreementID: agreementID,
		RecipientID: recipientID,
	}
	if _, err := signingSvc.CaptureConsent(ctx, scope, token, services.SignerConsentInput{
		Accepted:  true,
		IPAddress: "127.0.0.1",
		UserAgent: "release-v2-validation",
	}); err != nil {
		return services.SignerSubmitResult{}, 0, fmt.Errorf("capture consent recipient=%s: %w", recipientID, err)
	}
	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, services.SignerSignatureInput{
		FieldID:   strings.TrimSpace(fieldID),
		Type:      "typed",
		ObjectKey: strings.TrimSpace(objectKey),
		SHA256:    strings.TrimSpace(digest),
		ValueText: "V2 Validation Signer",
		IPAddress: "127.0.0.1",
		UserAgent: "release-v2-validation",
	}); err != nil {
		return services.SignerSubmitResult{}, 0, fmt.Errorf("attach signature recipient=%s: %w", recipientID, err)
	}

	started := time.Now()
	submit, err := signingSvc.Submit(ctx, scope, token, services.SignerSubmitInput{
		IdempotencyKey: strings.TrimSpace(submitKey),
		IPAddress:      "127.0.0.1",
		UserAgent:      "release-v2-validation",
	})
	elapsed := time.Since(started)
	observability.ObserveSignerSubmit(ctx, elapsed, err == nil)
	observability.ObserveFinalize(ctx, elapsed, err == nil && submit.Completed)
	if err != nil {
		return services.SignerSubmitResult{}, elapsed, fmt.Errorf("submit recipient=%s: %w", recipientID, err)
	}
	return submit, elapsed, nil
}

func percentile(values []float64, pct int) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := append([]float64{}, values...)
	sort.Float64s(sorted)
	if pct <= 0 {
		return sorted[0]
	}
	if pct >= 100 {
		return sorted[len(sorted)-1]
	}
	rank := int(math.Ceil((float64(pct) / 100.0) * float64(len(sorted))))
	if rank < 1 {
		rank = 1
	}
	if rank > len(sorted) {
		rank = len(sorted)
	}
	return sorted[rank-1]
}

func v2StringPtr(v string) *string { return &v }
func v2IntPtr(v int) *int          { return &v }
func v2BoolPtr(v bool) *bool       { return &v }

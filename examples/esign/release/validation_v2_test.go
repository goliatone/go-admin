package release

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/observability"
)

func TestRunV2ValidationProfilePassesGates(t *testing.T) {
	result, err := RunV2ValidationProfile(context.Background(), V2ValidationConfig{
		AgreementCount:      6,
		IntegrationRunCount: 4,
	})
	if err != nil {
		t.Fatalf("RunV2ValidationProfile: %v", err)
	}
	if result.AgreementCount != 6 {
		t.Fatalf("expected agreement_count=6, got %d", result.AgreementCount)
	}
	if result.IntegrationRunCount != 4 {
		t.Fatalf("expected integration_run_count=4, got %d", result.IntegrationRunCount)
	}
	if result.Scenario.MixedStageAgreements != 6 {
		t.Fatalf("expected mixed_stage_agreements=6, got %d", result.Scenario.MixedStageAgreements)
	}
	if result.Scenario.StageEdgeCaseChecks == 0 {
		t.Fatalf("expected stage edge-case checks > 0")
	}
	if result.Scenario.PlacementReadiness == 0 {
		t.Fatalf("expected placement/readiness checks > 0")
	}
	if result.Integration.SyncRunsStarted != 4 {
		t.Fatalf("expected sync_runs_started=4, got %d", result.Integration.SyncRunsStarted)
	}
	if result.Integration.SyncRunsCompleted != 4 {
		t.Fatalf("expected sync_runs_completed=4, got %d", result.Integration.SyncRunsCompleted)
	}
	if result.Integration.ConflictsDetected != 4 {
		t.Fatalf("expected conflicts_detected=4, got %d", result.Integration.ConflictsDetected)
	}
	if result.Integration.ConflictsResolved != 4 {
		t.Fatalf("expected conflicts_resolved=4, got %d", result.Integration.ConflictsResolved)
	}
	if result.Integration.ConflictBacklog != 0 {
		t.Fatalf("expected conflict backlog=0, got %d", result.Integration.ConflictBacklog)
	}
	if !result.SLO.OverallPass {
		t.Fatalf("expected base SLO pass, got %+v", result.SLO)
	}
	if !result.V2SLO.OverallPass {
		t.Fatalf("expected v2 SLO pass, got %+v", result.V2SLO)
	}
	if result.Snapshot.UnifiedViewerSampleTotal == 0 {
		t.Fatalf("expected unified viewer samples > 0")
	}
	if result.Snapshot.SignerSubmitSampleTotal == 0 {
		t.Fatalf("expected signer submit samples > 0")
	}
	if result.Snapshot.CompletionDeliverySuccessTotal == 0 {
		t.Fatalf("expected completion delivery success samples > 0")
	}
}

func TestEvaluateV2SLODetectsFailures(t *testing.T) {
	snapshot := observability.MetricsSnapshot{
		UnifiedViewerLoadP95MS:         900,
		SignerSubmitP95MS:              1_200,
		UnifiedViewerSampleTotal:       10,
		SignerSubmitSampleTotal:        10,
		CompletionDeliverySuccessTotal: 80,
		CompletionDeliveryFailureTotal: 20,
	}
	integration := V2IntegrationSummary{
		SyncRunsStarted:   100,
		SyncRunsCompleted: 90,
		SyncRunLagP95MS:   2_500,
		ConflictBacklog:   2,
	}

	status := EvaluateV2SLO(snapshot, integration)
	if status.OverallPass {
		t.Fatalf("expected v2 slo failure, got %+v", status)
	}
	if len(status.Targets) == 0 {
		t.Fatalf("expected target statuses")
	}

	targetsByMetric := map[string]V2SLOTargetStatus{}
	for _, target := range status.Targets {
		targetsByMetric[target.Metric] = target
	}
	for _, metric := range []string{
		"signer_session_read_p95",
		"submit_finalize_stage_transition_p95",
		"completion_delivery_success_rate",
		"integration_sync_success_rate",
		"integration_sync_lag_p95",
		"integration_conflict_backlog",
	} {
		target, ok := targetsByMetric[metric]
		if !ok {
			t.Fatalf("expected target for metric %s", metric)
		}
		if target.Pass {
			t.Fatalf("expected metric %s to fail, got %+v", metric, target)
		}
	}

	alerts := EvaluateV2Alerts(snapshot, integration)
	if len(alerts) == 0 {
		t.Fatalf("expected v2 alerts for failing thresholds")
	}

	codes := map[string]bool{}
	for _, alert := range alerts {
		codes[alert.Code] = true
	}
	for _, code := range []string{
		"v2.signer_session_read_p95_breach",
		"v2.submit_finalize_stage_transition_p95_breach",
		"v2.completion_delivery_success_rate_low",
		"v2.integration_sync_success_rate_low",
		"v2.integration_sync_lag_p95_breach",
		"v2.integration_conflict_backlog_high",
	} {
		if !codes[code] {
			t.Fatalf("expected v2 alert code %s in %+v", code, alerts)
		}
	}
}

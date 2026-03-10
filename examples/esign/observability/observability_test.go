package observability

import (
	"context"
	"testing"
	"time"
)

func TestResolveCorrelationIDUsesFirstCandidateOrGenerates(t *testing.T) {
	id := ResolveCorrelationID("", "  req-1  ", "fallback")
	if id != "req-1" {
		t.Fatalf("expected req-1, got %q", id)
	}
	generated := ResolveCorrelationID("", " ")
	if generated == "" {
		t.Fatal("expected generated correlation id")
	}
}

func TestMetricsSnapshotComputesPercentilesAndRates(t *testing.T) {
	metrics := newInMemoryMetrics()
	ctx := context.Background()
	for _, ms := range []int{100, 150, 200, 250, 300} {
		metrics.ObserveAdminRead(ctx, time.Duration(ms)*time.Millisecond, true, "agreements.list")
	}
	metrics.ObserveSend(ctx, 250*time.Millisecond, true)
	metrics.ObserveSend(ctx, 900*time.Millisecond, false)
	metrics.ObserveCommandDispatch(ctx, "esign.pdf.remediate", "queued", true, 80*time.Millisecond)
	metrics.ObserveCommandDispatch(ctx, "esign.pdf.remediate", "queued", true, 120*time.Millisecond)
	metrics.ObserveCommandDispatchRejected(ctx, "esign.pdf.remediate", "queued", "dedup_store_missing")
	metrics.ObserveDedupStoreMiss(ctx, "esign.pdf.remediate")
	metrics.ObserveSignerLinkOpen(ctx, true)
	metrics.ObserveSignerLinkOpen(ctx, false)
	metrics.ObserveUnifiedViewerLoad(ctx, 120*time.Millisecond, true)
	metrics.ObserveUnifiedViewerLoad(ctx, 240*time.Millisecond, false)
	metrics.ObserveUnifiedFieldSave(ctx, 80*time.Millisecond, true)
	metrics.ObserveUnifiedFieldSave(ctx, 180*time.Millisecond, false)
	metrics.ObserveUnifiedSignatureAttach(ctx, 95*time.Millisecond, true)
	metrics.ObserveUnifiedSignatureAttach(ctx, 145*time.Millisecond, false)
	metrics.ObserveUnifiedSubmitConversion(ctx, true)
	metrics.ObserveUnifiedSubmitConversion(ctx, false)
	metrics.ObserveSignerSubmit(ctx, 400*time.Millisecond, true)
	metrics.ObserveFinalize(ctx, 90*time.Second, true)
	metrics.ObserveFinalize(ctx, 125*time.Second, false)
	metrics.ObserveEmailDispatchStart(ctx, 45*time.Second, true)
	metrics.ObserveEmailDispatchStart(ctx, 61*time.Second, false)
	metrics.ObserveCompletionDelivery(ctx, true)
	metrics.ObserveCompletionDelivery(ctx, false)
	metrics.ObserveJobResult(ctx, "jobs.esign.pdf_generate_executed", true)
	metrics.ObserveJobResult(ctx, "jobs.esign.pdf_generate_executed", false)
	metrics.ObserveProviderResult(ctx, "email", true)
	metrics.ObserveProviderResult(ctx, "email", false)
	metrics.ObserveReminderSweep(
		ctx,
		300*time.Millisecond,
		5,
		2,
		1,
		2,
		map[string]int{"lease_lost": 1},
		map[string]int{"state_invariant_violation": 2},
		[]float64{50, 100},
		[]float64{150},
		[]float64{900, 1000},
	)
	metrics.ObserveTokenValidationFailure(ctx, "TOKEN_EXPIRED")
	metrics.ObserveGoogleImport(ctx, true, "")
	metrics.ObserveGoogleImport(ctx, false, "GOOGLE_PERMISSION_DENIED")
	metrics.ObserveGoogleAuthChurn(ctx, "oauth_connected")
	metrics.ObserveGoogleAuthChurn(ctx, "access_revoked")
	metrics.ObservePDFIngestAnalyzeFailure(ctx, "parse.failed", "unsupported")
	metrics.ObservePDFIngestPolicyReject(ctx, "policy.max_source_bytes", "unsupported")
	metrics.ObservePDFPreviewFallback(ctx, "preview_fallback_forced", "limited")
	metrics.ObservePDFRenderImportFail(ctx, "import.failed", "limited")
	metrics.ObserveRemediationLifecycle(ctx, "requested", "")
	metrics.ObserveRemediationLifecycle(ctx, "started", "")
	metrics.ObserveRemediationLifecycle(ctx, "succeeded", "")
	metrics.ObserveRemediationLifecycle(ctx, "failed", "runner_failed")
	metrics.ObserveRemediationDispatchStateTransition(ctx, "retrying")
	metrics.ObserveRemediationDispatchStateTransition(ctx, "dead_letter")
	metrics.ObserveRemediationDispatchStateTransition(ctx, "canceled")
	metrics.ObserveRemediationDuplicateSuppressed(ctx)
	metrics.ObserveRemediationLockSignal(ctx, "contention")
	metrics.ObserveRemediationLockSignal(ctx, "timeout")

	snapshot := metrics.Snapshot()
	if snapshot.AdminReadP95MS == 0 {
		t.Fatalf("expected admin read p95 > 0, got %+v", snapshot)
	}
	if snapshot.SendFailureTotal != 1 || snapshot.SendSuccessTotal != 1 {
		t.Fatalf("expected send success/failure totals, got %+v", snapshot)
	}
	if snapshot.CommandDispatchAcceptedTotal != 2 {
		t.Fatalf("expected command dispatch accepted total 2, got %+v", snapshot)
	}
	if snapshot.CommandDispatchRejectedByReason["dedup_store_missing"] != 1 {
		t.Fatalf("expected command dispatch rejection reason counter, got %+v", snapshot.CommandDispatchRejectedByReason)
	}
	if snapshot.DedupStoreMissTotal != 1 || snapshot.DedupStoreMissByCommandID["esign.pdf.remediate"] != 1 {
		t.Fatalf("expected dedup-store miss counters, got %+v", snapshot)
	}
	if snapshot.EmailFailureTotal != 1 || snapshot.EmailSuccessTotal != 1 {
		t.Fatalf("expected email success/failure totals, got %+v", snapshot)
	}
	if snapshot.ReminderSweepClaimedTotal != 5 || snapshot.ReminderSweepSentTotal != 2 {
		t.Fatalf("expected reminder sweep claimed/sent totals, got %+v", snapshot)
	}
	if snapshot.ReminderLeaseLostTotal != 1 {
		t.Fatalf("expected reminder lease_lost total 1, got %+v", snapshot)
	}
	if snapshot.ReminderStateInvariantTotal != 2 {
		t.Fatalf("expected reminder state invariant total from failure reasons, got %+v", snapshot)
	}
	if snapshot.ReminderClaimToSendP95MS != 100 || snapshot.ReminderDueToSendP95MS != 150 || snapshot.ReminderDueBacklogAgeP95MS != 1000 {
		t.Fatalf("expected reminder latency/backlog p95 metrics to be computed, got %+v", snapshot)
	}
	if snapshot.TokenFailureByReason["token_expired"] != 1 {
		t.Fatalf("expected token_expired counter, got %+v", snapshot.TokenFailureByReason)
	}
	if snapshot.GoogleImportSuccessTotal != 1 || snapshot.GoogleImportFailureTotal != 1 {
		t.Fatalf("expected google import success/failure totals, got %+v", snapshot)
	}
	if snapshot.GoogleImportFailureByReason["google_permission_denied"] != 1 {
		t.Fatalf("expected google permission denied import failure counter, got %+v", snapshot.GoogleImportFailureByReason)
	}
	if snapshot.GoogleAuthChurnTotal != 2 {
		t.Fatalf("expected google auth churn total 2, got %+v", snapshot.GoogleAuthChurnByReason)
	}
	if snapshot.GoogleAuthChurnByReason["access_revoked"] != 1 {
		t.Fatalf("expected access_revoked churn counter, got %+v", snapshot.GoogleAuthChurnByReason)
	}
	if snapshot.PDFIngestAnalyzeFailTotal != 1 {
		t.Fatalf("expected pdf ingest analyze fail total 1, got %+v", snapshot)
	}
	if snapshot.PDFIngestAnalyzeFailByReasonTier["reason=parse.failed,tier=unsupported"] != 1 {
		t.Fatalf("expected labeled pdf ingest analyze fail counter, got %+v", snapshot.PDFIngestAnalyzeFailByReasonTier)
	}
	if snapshot.PDFIngestPolicyRejectTotal != 1 {
		t.Fatalf("expected pdf ingest policy reject total 1, got %+v", snapshot)
	}
	if snapshot.PDFIngestPolicyRejectByReasonTier["reason=policy.max_source_bytes,tier=unsupported"] != 1 {
		t.Fatalf("expected labeled pdf ingest policy reject counter, got %+v", snapshot.PDFIngestPolicyRejectByReasonTier)
	}
	if snapshot.PDFPreviewFallbackTotal != 1 {
		t.Fatalf("expected pdf preview fallback total 1, got %+v", snapshot)
	}
	if snapshot.PDFPreviewFallbackByReasonTier["reason=preview_fallback_forced,tier=limited"] != 1 {
		t.Fatalf("expected labeled pdf preview fallback counter, got %+v", snapshot.PDFPreviewFallbackByReasonTier)
	}
	if snapshot.PDFRenderImportFailTotal != 1 {
		t.Fatalf("expected pdf render import fail total 1, got %+v", snapshot)
	}
	if snapshot.PDFRenderImportFailByReasonTier["reason=import.failed,tier=limited"] != 1 {
		t.Fatalf("expected labeled pdf render import fail counter, got %+v", snapshot.PDFRenderImportFailByReasonTier)
	}
	if snapshot.RemediationCandidateTotal != 1 || snapshot.RemediationStartedTotal != 1 || snapshot.RemediationSucceededTotal != 1 || snapshot.RemediationFailedTotal != 1 {
		t.Fatalf("expected remediation lifecycle counters, got %+v", snapshot)
	}
	if snapshot.RemediationFailureByReason["runner_failed"] != 1 {
		t.Fatalf("expected remediation failure reason counter, got %+v", snapshot.RemediationFailureByReason)
	}
	if snapshot.RemediationRetryingTotal != 1 || snapshot.RemediationDeadLetterTotal != 1 || snapshot.RemediationCanceledTotal != 1 {
		t.Fatalf("expected remediation dispatch transition counters, got %+v", snapshot.RemediationDispatchStateByStatus)
	}
	if snapshot.RemediationDuplicateSuppressedTotal != 1 {
		t.Fatalf("expected remediation duplicate suppression counter, got %+v", snapshot)
	}
	if snapshot.RemediationLockContentionTotal != 1 || snapshot.RemediationLockTimeoutTotal != 1 {
		t.Fatalf("expected remediation lock counters, got %+v", snapshot.RemediationLockSignals)
	}
	if snapshot.SignerLinkOpenSuccessTotal != 1 || snapshot.SignerLinkOpenFailureTotal != 1 {
		t.Fatalf("expected signer link open counters, got %+v", snapshot)
	}
	if snapshot.UnifiedViewerSuccessTotal != 1 || snapshot.UnifiedViewerFailureTotal != 1 {
		t.Fatalf("expected unified viewer counters, got %+v", snapshot)
	}
	if snapshot.UnifiedFieldSaveSuccessTotal != 1 || snapshot.UnifiedFieldSaveFailureTotal != 1 {
		t.Fatalf("expected unified field save counters, got %+v", snapshot)
	}
	if snapshot.UnifiedSignatureSuccessTotal != 1 || snapshot.UnifiedSignatureFailureTotal != 1 {
		t.Fatalf("expected unified signature counters, got %+v", snapshot)
	}
	if snapshot.UnifiedSubmitSuccessTotal != 1 || snapshot.UnifiedSubmitFailureTotal != 1 {
		t.Fatalf("expected unified submit conversion counters, got %+v", snapshot)
	}
	if snapshot.UnifiedSubmitConversionPercent() != 100 {
		t.Fatalf("expected unified submit conversion percent 100, got %f", snapshot.UnifiedSubmitConversionPercent())
	}
	if snapshot.CompletionDeliverySuccessTotal != 1 || snapshot.CompletionDeliveryFailureTotal != 1 {
		t.Fatalf("expected completion delivery counters, got %+v", snapshot)
	}
	if snapshot.JobSuccessRatePercent() <= 0 || snapshot.JobSuccessRatePercent() >= 100 {
		t.Fatalf("expected mixed success rate, got %f", snapshot.JobSuccessRatePercent())
	}
}

func TestEvaluateAlertsForProviderAndJobThresholdBreaches(t *testing.T) {
	snapshot := MetricsSnapshot{
		ProviderSuccessByName: map[string]int64{"email": 90},
		ProviderFailureByName: map[string]int64{"email": 10},
		JobSuccessByName:      map[string]int64{"jobs.esign.email_send_signing_request": 90},
		JobFailureByName:      map[string]int64{"jobs.esign.email_send_signing_request": 10},
	}
	alerts := EvaluateAlerts(snapshot, AlertPolicy{
		ProviderFailureRatePercentThreshold: 5,
		JobFailureRatePercentThreshold:      5,
	})
	if len(alerts) != 3 {
		t.Fatalf("expected 3 alerts, got %d (%+v)", len(alerts), alerts)
	}
	if !hasAlertCode(alerts, "provider.failure_rate_high") {
		t.Fatalf("expected provider failure rate alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "job.failure_rate_high") {
		t.Fatalf("expected job failure rate alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "slo.monthly_job_success_rate_breach") {
		t.Fatalf("expected monthly job success slo alert, got %+v", alerts)
	}
}

func TestEvaluateSLOAndBuildDashboardPayload(t *testing.T) {
	snapshot := MetricsSnapshot{
		AdminReadP95MS:          350,
		SendP95MS:               650,
		EmailDispatchStartP99MS: 30_000,
		FinalizeP99MS:           100_000,
		JobSuccessTotal:         995,
		JobFailureTotal:         5,
		EmailSuccessTotal:       100,
		EmailFailureTotal:       1,
	}
	slo := EvaluateSLO(snapshot)
	if !slo.OverallPass {
		t.Fatalf("expected passing slo status, got %+v", slo)
	}
	dashboard := BuildSLODashboard(snapshot, slo, nil)
	if dashboard["slo_overall_pass"] != true {
		t.Fatalf("expected slo_overall_pass=true, got %+v", dashboard)
	}
	if _, ok := dashboard["slo_targets"].([]SLOTargetStatus); !ok {
		t.Fatalf("expected slo_targets payload, got %+v", dashboard)
	}
	for _, key := range []string{
		"signer_link_open_rate",
		"signer_submit_conversion_rate",
		"unified_submit_conversion_rate",
		"completion_delivery_success_rate",
	} {
		if _, ok := dashboard[key]; !ok {
			t.Fatalf("expected %s in dashboard payload, got %+v", key, dashboard)
		}
	}
}

func TestEvaluateAlertsForGoogleImportFailuresAndAuthChurn(t *testing.T) {
	snapshot := MetricsSnapshot{
		GoogleImportSuccessTotal:    2,
		GoogleImportFailureTotal:    3,
		GoogleImportFailureByReason: map[string]int64{"google_permission_denied": 2, "google_access_revoked": 1},
		GoogleAuthChurnTotal:        6,
		GoogleAuthChurnByReason:     map[string]int64{"oauth_connected": 3, "oauth_disconnected": 2, "access_revoked": 1},
	}
	alerts := EvaluateAlerts(snapshot, AlertPolicy{
		GoogleImportFailureTotalThreshold: 2,
		GoogleAuthChurnTotalThreshold:     5,
	})
	if !hasAlertCode(alerts, "google.import_failures_detected") {
		t.Fatalf("expected google import failures alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "google.auth_churn_high") {
		t.Fatalf("expected google auth churn alert, got %+v", alerts)
	}
}

func TestEvaluateAlertsForSignerAndCompletionDeliveryRates(t *testing.T) {
	snapshot := MetricsSnapshot{
		SignerLinkOpenSuccessTotal:     5,
		SignerLinkOpenFailureTotal:     5,
		SignerSubmitSuccessTotal:       2,
		CompletionDeliverySuccessTotal: 8,
		CompletionDeliveryFailureTotal: 2,
	}
	alerts := EvaluateAlerts(snapshot, AlertPolicy{
		SignerLinkOpenRatePercentFloor:     80,
		SignerSubmitConversionPercentFloor: 70,
		CompletionDeliverySuccessRateFloor: 90,
	})
	if !hasAlertCode(alerts, "signer.link_open_rate_low") {
		t.Fatalf("expected signer link open rate alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "signer.submit_conversion_low") {
		t.Fatalf("expected signer submit conversion alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "completion.delivery_success_rate_low") {
		t.Fatalf("expected completion delivery success rate alert, got %+v", alerts)
	}
}

func TestEvaluateAlertsForPDFHardeningSignals(t *testing.T) {
	snapshot := MetricsSnapshot{
		PDFIngestAnalyzeFailTotal:         2,
		PDFIngestAnalyzeFailByReasonTier:  map[string]int64{"reason=parse.failed,tier=unsupported": 2},
		PDFIngestPolicyRejectTotal:        3,
		PDFIngestPolicyRejectByReasonTier: map[string]int64{"reason=policy.max_pages,tier=unsupported": 3},
		PDFPreviewFallbackTotal:           4,
		PDFPreviewFallbackByReasonTier:    map[string]int64{"reason=preview_fallback_forced,tier=limited": 4},
		PDFRenderImportFailTotal:          1,
		PDFRenderImportFailByReasonTier:   map[string]int64{"reason=import.failed,tier=limited": 1},
	}
	alerts := EvaluateAlerts(snapshot, AlertPolicy{
		PDFIngestAnalyzeFailTotalThreshold:  1,
		PDFIngestPolicyRejectTotalThreshold: 1,
		PDFPreviewFallbackTotalThreshold:    1,
		PDFRenderImportFailTotalThreshold:   1,
	})
	if !hasAlertCode(alerts, "pdf.ingest_analyze_failures_high") {
		t.Fatalf("expected pdf analyze failure alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.ingest_policy_rejects_high") {
		t.Fatalf("expected pdf policy reject alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.preview_fallback_high") {
		t.Fatalf("expected pdf preview fallback alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.render_import_failures_high") {
		t.Fatalf("expected pdf render import failure alert, got %+v", alerts)
	}
}

func TestEvaluateAlertsForRemediationAndDedupSignals(t *testing.T) {
	snapshot := MetricsSnapshot{
		DedupStoreMissTotal:             2,
		DedupStoreMissByCommandID:       map[string]int64{"esign.pdf.remediate": 2},
		CommandDispatchRejectedByReason: map[string]int64{"dedup_store_missing": 2},
		RemediationRetryingTotal:        3,
		RemediationDeadLetterTotal:      2,
		RemediationLockContentionTotal:  4,
		RemediationLockTimeoutTotal:     1,
		RemediationDispatchStateByStatus: map[string]int64{
			"retrying":    3,
			"dead_letter": 2,
		},
		RemediationLockSignals: map[string]int64{
			"contention": 4,
			"timeout":    1,
		},
	}
	alerts := EvaluateAlerts(snapshot, AlertPolicy{
		DedupStoreMissTotalThreshold:        1,
		RemediationRetryingTotalThreshold:   1,
		RemediationDeadLetterTotalThreshold: 1,
		RemediationLockContentionThreshold:  1,
		RemediationLockTimeoutThreshold:     1,
	})
	if !hasAlertCode(alerts, "command.dedup_store_miss_detected") {
		t.Fatalf("expected dedup-store miss alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.remediation_retrying_high") {
		t.Fatalf("expected remediation retrying alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.remediation_dead_letter_high") {
		t.Fatalf("expected remediation dead-letter alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.remediation_lock_contention_high") {
		t.Fatalf("expected remediation lock contention alert, got %+v", alerts)
	}
	if !hasAlertCode(alerts, "pdf.remediation_lock_timeout_high") {
		t.Fatalf("expected remediation lock timeout alert, got %+v", alerts)
	}
}

func TestSLOThresholdConstantsMatchTDD(t *testing.T) {
	if ThresholdAdminReadP95MS != 400 {
		t.Fatalf("expected admin read p95 threshold 400ms, got %f", ThresholdAdminReadP95MS)
	}
	if ThresholdSendEnqueueP95MS != 700 {
		t.Fatalf("expected send enqueue p95 threshold 700ms, got %f", ThresholdSendEnqueueP95MS)
	}
	if ThresholdEmailDispatchP99MS != 60_000 {
		t.Fatalf("expected email dispatch p99 threshold 60000ms, got %f", ThresholdEmailDispatchP99MS)
	}
	if ThresholdFinalizeCompletionP99MS != 120_000 {
		t.Fatalf("expected finalize completion p99 threshold 120000ms, got %f", ThresholdFinalizeCompletionP99MS)
	}
	if ThresholdMonthlyJobSuccessRate != 99.5 {
		t.Fatalf("expected monthly job success threshold 99.5%%, got %f", ThresholdMonthlyJobSuccessRate)
	}
}

func hasAlertCode(alerts []Alert, code string) bool {
	for _, alert := range alerts {
		if alert.Code == code {
			return true
		}
	}
	return false
}

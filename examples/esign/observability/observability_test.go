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
	metrics.ObserveTokenValidationFailure(ctx, "TOKEN_EXPIRED")
	metrics.ObserveGoogleImport(ctx, true, "")
	metrics.ObserveGoogleImport(ctx, false, "GOOGLE_PERMISSION_DENIED")
	metrics.ObserveGoogleAuthChurn(ctx, "oauth_connected")
	metrics.ObserveGoogleAuthChurn(ctx, "access_revoked")

	snapshot := metrics.Snapshot()
	if snapshot.AdminReadP95MS == 0 {
		t.Fatalf("expected admin read p95 > 0, got %+v", snapshot)
	}
	if snapshot.SendFailureTotal != 1 || snapshot.SendSuccessTotal != 1 {
		t.Fatalf("expected send success/failure totals, got %+v", snapshot)
	}
	if snapshot.EmailFailureTotal != 1 || snapshot.EmailSuccessTotal != 1 {
		t.Fatalf("expected email success/failure totals, got %+v", snapshot)
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

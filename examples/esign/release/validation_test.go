package release

import (
	"context"
	"testing"
)

func TestRunValidationProfilePassesSLOGates(t *testing.T) {
	result, err := RunValidationProfile(context.Background(), ValidationConfig{AgreementCount: 120})
	if err != nil {
		t.Fatalf("RunValidationProfile: %v", err)
	}
	if result.AgreementCount != 120 {
		t.Fatalf("expected agreement_count=120, got %d", result.AgreementCount)
	}
	if !result.SLO.OverallPass {
		t.Fatalf("expected SLO pass, got %+v", result.SLO)
	}
	if result.Snapshot.SendSampleTotal < 120 {
		t.Fatalf("expected at least 120 send samples, got %d", result.Snapshot.SendSampleTotal)
	}
	if result.Snapshot.SignerSubmitSampleTotal < 120 {
		t.Fatalf("expected at least 120 signer submit samples, got %d", result.Snapshot.SignerSubmitSampleTotal)
	}
	if result.Snapshot.FinalizeSampleTotal < 120 {
		t.Fatalf("expected at least 120 finalize samples, got %d", result.Snapshot.FinalizeSampleTotal)
	}
	if result.Snapshot.JobSuccessRatePercent() < 99.5 {
		t.Fatalf("expected job success rate >= 99.5, got %.2f", result.Snapshot.JobSuccessRatePercent())
	}

	t.Logf(
		"validation profile pass: agreements=%d elapsed=%s admin_read_p95=%.2fms send_p95=%.2fms finalize_p99=%.2fms email_dispatch_p99=%.2fms job_success=%.2f%%",
		result.AgreementCount,
		result.Elapsed,
		result.Snapshot.AdminReadP95MS,
		result.Snapshot.SendP95MS,
		result.Snapshot.FinalizeP99MS,
		result.Snapshot.EmailDispatchStartP99MS,
		result.Snapshot.JobSuccessRatePercent(),
	)
}

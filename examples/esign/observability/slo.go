package observability

const (
	// SLO thresholds from ESIGN_APP_TDD.md section 10.2.
	ThresholdAdminReadP95MS          = 400.0
	ThresholdSendEnqueueP95MS        = 700.0
	ThresholdEmailDispatchP99MS      = 60_000.0
	ThresholdFinalizeCompletionP99MS = 120_000.0
	ThresholdMonthlyJobSuccessRate   = 99.5
)

type SLOTargetStatus struct {
	Metric     string  `json:"metric"`
	Actual     float64 `json:"actual"`
	Threshold  float64 `json:"threshold"`
	Comparator string  `json:"comparator"`
	Pass       bool    `json:"pass"`
	Unit       string  `json:"unit"`
}

type SLOStatus struct {
	OverallPass bool              `json:"overall_pass"`
	Targets     []SLOTargetStatus `json:"targets"`
}

// EvaluateSLO validates snapshot telemetry against TDD numeric thresholds.
func EvaluateSLO(snapshot MetricsSnapshot) SLOStatus {
	targets := []SLOTargetStatus{
		{
			Metric:     "admin_read_p95",
			Actual:     snapshot.AdminReadP95MS,
			Threshold:  ThresholdAdminReadP95MS,
			Comparator: "<=",
			Pass:       snapshot.AdminReadP95MS <= ThresholdAdminReadP95MS,
			Unit:       "ms",
		},
		{
			Metric:     "send_enqueue_p95",
			Actual:     snapshot.SendP95MS,
			Threshold:  ThresholdSendEnqueueP95MS,
			Comparator: "<=",
			Pass:       snapshot.SendP95MS <= ThresholdSendEnqueueP95MS,
			Unit:       "ms",
		},
		{
			Metric:     "email_dispatch_start_p99",
			Actual:     snapshot.EmailDispatchStartP99MS,
			Threshold:  ThresholdEmailDispatchP99MS,
			Comparator: "<=",
			Pass:       snapshot.EmailDispatchStartP99MS <= ThresholdEmailDispatchP99MS,
			Unit:       "ms",
		},
		{
			Metric:     "finalize_completion_p99",
			Actual:     snapshot.FinalizeP99MS,
			Threshold:  ThresholdFinalizeCompletionP99MS,
			Comparator: "<=",
			Pass:       snapshot.FinalizeP99MS <= ThresholdFinalizeCompletionP99MS,
			Unit:       "ms",
		},
		{
			Metric:     "monthly_job_success_rate",
			Actual:     snapshot.JobSuccessRatePercent(),
			Threshold:  ThresholdMonthlyJobSuccessRate,
			Comparator: ">=",
			Pass:       snapshot.JobSuccessRatePercent() >= ThresholdMonthlyJobSuccessRate,
			Unit:       "percent",
		},
	}

	overall := true
	for _, target := range targets {
		if !target.Pass {
			overall = false
			break
		}
	}

	return SLOStatus{
		OverallPass: overall,
		Targets:     targets,
	}
}

// BuildSLODashboard converts snapshot/evaluations into dashboard-friendly payload.
func BuildSLODashboard(snapshot MetricsSnapshot, slo SLOStatus, alerts []Alert) map[string]any {
	return map[string]any{
		"slo_overall_pass":                  slo.OverallPass,
		"slo_targets":                       slo.Targets,
		"alerts":                            alerts,
		"email_success_rate":                snapshot.EmailSuccessRatePercent(),
		"emails_sent":                       snapshot.EmailSuccessTotal,
		"emails_failed":                     snapshot.EmailFailureTotal,
		"job_success_rate":                  snapshot.JobSuccessRatePercent(),
		"jobs_completed":                    snapshot.JobSuccessTotal,
		"jobs_failed":                       snapshot.JobFailureTotal,
		"google_import_successes":           snapshot.GoogleImportSuccessTotal,
		"google_import_failures":            snapshot.GoogleImportFailureTotal,
		"google_auth_churn_total":           snapshot.GoogleAuthChurnTotal,
		"signer_link_open_rate":             snapshot.SignerLinkOpenRatePercent(),
		"signer_submit_conversion_rate":     snapshot.SignerSubmitConversionPercent(),
		"unified_viewer_load_p95_ms":        snapshot.UnifiedViewerLoadP95MS,
		"unified_field_save_p95_ms":         snapshot.UnifiedFieldSaveP95MS,
		"unified_signature_attach_p95_ms":   snapshot.UnifiedSignatureP95MS,
		"unified_submit_conversion_rate":    snapshot.UnifiedSubmitConversionPercent(),
		"completion_delivery_success_rate":  snapshot.CompletionDeliverySuccessRatePercent(),
		"signer_link_open_success_total":    snapshot.SignerLinkOpenSuccessTotal,
		"signer_link_open_failure_total":    snapshot.SignerLinkOpenFailureTotal,
		"completion_delivery_success_total": snapshot.CompletionDeliverySuccessTotal,
		"completion_delivery_failure_total": snapshot.CompletionDeliveryFailureTotal,
		"period":                            "rolling window",
	}
}

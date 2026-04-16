package observability

import "strings"

// AlertPolicy defines thresholds for provider/job health checks.
type AlertPolicy struct {
	ProviderFailureRatePercentThreshold float64 `json:"provider_failure_rate_percent_threshold"`
	JobFailureRatePercentThreshold      float64 `json:"job_failure_rate_percent_threshold"`
	GoogleImportFailureTotalThreshold   int64   `json:"google_import_failure_total_threshold"`
	GoogleAuthChurnTotalThreshold       int64   `json:"google_auth_churn_total_threshold"`
	SignerLinkOpenRatePercentFloor      float64 `json:"signer_link_open_rate_percent_floor"`
	SignerSubmitConversionPercentFloor  float64 `json:"signer_submit_conversion_percent_floor"`
	CompletionDeliverySuccessRateFloor  float64 `json:"completion_delivery_success_rate_floor"`
	PDFIngestAnalyzeFailTotalThreshold  int64   `json:"pdf_ingest_analyze_fail_total_threshold"`
	PDFIngestPolicyRejectTotalThreshold int64   `json:"pdf_ingest_policy_reject_total_threshold"`
	PDFPreviewFallbackTotalThreshold    int64   `json:"pdf_preview_fallback_total_threshold"`
	PDFRenderImportFailTotalThreshold   int64   `json:"pdf_render_import_fail_total_threshold"`
	DedupStoreMissTotalThreshold        int64   `json:"dedup_store_miss_total_threshold"`
	RemediationRetryingTotalThreshold   int64   `json:"remediation_retrying_total_threshold"`
	RemediationDeadLetterTotalThreshold int64   `json:"remediation_dead_letter_total_threshold"`
	RemediationLockContentionThreshold  int64   `json:"remediation_lock_contention_threshold"`
	RemediationLockTimeoutThreshold     int64   `json:"remediation_lock_timeout_threshold"`
}

// DefaultAlertPolicy returns baseline thresholds for e-sign runtime alerting.
func DefaultAlertPolicy() AlertPolicy {
	return AlertPolicy{
		ProviderFailureRatePercentThreshold: 5.0,
		JobFailureRatePercentThreshold:      2.0,
		GoogleImportFailureTotalThreshold:   1,
		GoogleAuthChurnTotalThreshold:       5,
		SignerLinkOpenRatePercentFloor:      95.0,
		SignerSubmitConversionPercentFloor:  70.0,
		CompletionDeliverySuccessRateFloor:  99.0,
		PDFIngestAnalyzeFailTotalThreshold:  1,
		PDFIngestPolicyRejectTotalThreshold: 1,
		PDFPreviewFallbackTotalThreshold:    1,
		PDFRenderImportFailTotalThreshold:   1,
		DedupStoreMissTotalThreshold:        1,
		RemediationRetryingTotalThreshold:   1,
		RemediationDeadLetterTotalThreshold: 1,
		RemediationLockContentionThreshold:  1,
		RemediationLockTimeoutThreshold:     1,
	}
}

// Alert captures an actionable operator-facing alert.
type Alert struct {
	Code     string         `json:"code"`
	Severity string         `json:"severity"`
	Message  string         `json:"message"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// EvaluateAlerts returns active alerts for provider/job failure rates above policy thresholds.
func EvaluateAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	policy = normalizedAlertPolicy(policy)
	alerts := []Alert{}
	alerts = append(alerts, evaluateProviderAlerts(snapshot, policy)...)
	alerts = append(alerts, evaluateJobAlerts(snapshot, policy)...)
	alerts = append(alerts, evaluateGoogleAlerts(snapshot, policy)...)
	alerts = append(alerts, evaluateSignerAlerts(snapshot, policy)...)
	alerts = append(alerts, evaluatePDFAccessAlerts(snapshot, policy)...)
	alerts = append(alerts, evaluateRemediationAlerts(snapshot, policy)...)
	alerts = append(alerts, evaluateSLOThresholdAlerts(snapshot)...)
	return alerts
}

func normalizedAlertPolicy(policy AlertPolicy) AlertPolicy {
	defaults := DefaultAlertPolicy()
	policy.ProviderFailureRatePercentThreshold = alertFloat64OrDefault(policy.ProviderFailureRatePercentThreshold, defaults.ProviderFailureRatePercentThreshold)
	policy.JobFailureRatePercentThreshold = alertFloat64OrDefault(policy.JobFailureRatePercentThreshold, defaults.JobFailureRatePercentThreshold)
	policy.GoogleImportFailureTotalThreshold = alertInt64OrDefault(policy.GoogleImportFailureTotalThreshold, defaults.GoogleImportFailureTotalThreshold)
	policy.GoogleAuthChurnTotalThreshold = alertInt64OrDefault(policy.GoogleAuthChurnTotalThreshold, defaults.GoogleAuthChurnTotalThreshold)
	policy.SignerLinkOpenRatePercentFloor = alertFloat64OrDefault(policy.SignerLinkOpenRatePercentFloor, defaults.SignerLinkOpenRatePercentFloor)
	policy.SignerSubmitConversionPercentFloor = alertFloat64OrDefault(policy.SignerSubmitConversionPercentFloor, defaults.SignerSubmitConversionPercentFloor)
	policy.CompletionDeliverySuccessRateFloor = alertFloat64OrDefault(policy.CompletionDeliverySuccessRateFloor, defaults.CompletionDeliverySuccessRateFloor)
	policy.PDFIngestAnalyzeFailTotalThreshold = alertInt64OrDefault(policy.PDFIngestAnalyzeFailTotalThreshold, defaults.PDFIngestAnalyzeFailTotalThreshold)
	policy.PDFIngestPolicyRejectTotalThreshold = alertInt64OrDefault(policy.PDFIngestPolicyRejectTotalThreshold, defaults.PDFIngestPolicyRejectTotalThreshold)
	policy.PDFPreviewFallbackTotalThreshold = alertInt64OrDefault(policy.PDFPreviewFallbackTotalThreshold, defaults.PDFPreviewFallbackTotalThreshold)
	policy.PDFRenderImportFailTotalThreshold = alertInt64OrDefault(policy.PDFRenderImportFailTotalThreshold, defaults.PDFRenderImportFailTotalThreshold)
	policy.DedupStoreMissTotalThreshold = alertInt64OrDefault(policy.DedupStoreMissTotalThreshold, defaults.DedupStoreMissTotalThreshold)
	policy.RemediationRetryingTotalThreshold = alertInt64OrDefault(policy.RemediationRetryingTotalThreshold, defaults.RemediationRetryingTotalThreshold)
	policy.RemediationDeadLetterTotalThreshold = alertInt64OrDefault(policy.RemediationDeadLetterTotalThreshold, defaults.RemediationDeadLetterTotalThreshold)
	policy.RemediationLockContentionThreshold = alertInt64OrDefault(policy.RemediationLockContentionThreshold, defaults.RemediationLockContentionThreshold)
	policy.RemediationLockTimeoutThreshold = alertInt64OrDefault(policy.RemediationLockTimeoutThreshold, defaults.RemediationLockTimeoutThreshold)
	return policy
}

func alertFloat64OrDefault(value, fallback float64) float64 {
	if value > 0 {
		return value
	}
	return fallback
}

func alertInt64OrDefault(value, fallback int64) int64 {
	if value > 0 {
		return value
	}
	return fallback
}

func evaluateProviderAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	alerts := []Alert{}
	for provider, failures := range snapshot.ProviderFailureByName {
		successes := snapshot.ProviderSuccessByName[provider]
		rate := failureRatePercent(successes, failures)
		if rate <= policy.ProviderFailureRatePercentThreshold {
			continue
		}
		alerts = append(alerts, Alert{
			Code:     "provider.failure_rate_high",
			Severity: "warning",
			Message:  "provider failure rate above threshold",
			Metadata: map[string]any{
				"provider":             strings.TrimSpace(provider),
				"success_total":        successes,
				"failure_total":        failures,
				"failure_rate_percent": rate,
				"threshold_percent":    policy.ProviderFailureRatePercentThreshold,
			},
		})
	}
	return alerts
}

func evaluateJobAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	alerts := []Alert{}
	for jobName, failures := range snapshot.JobFailureByName {
		successes := snapshot.JobSuccessByName[jobName]
		rate := failureRatePercent(successes, failures)
		if rate <= policy.JobFailureRatePercentThreshold {
			continue
		}
		alerts = append(alerts, Alert{
			Code:     "job.failure_rate_high",
			Severity: "critical",
			Message:  "job failure rate above threshold",
			Metadata: map[string]any{
				"job_name":             strings.TrimSpace(jobName),
				"success_total":        successes,
				"failure_total":        failures,
				"failure_rate_percent": rate,
				"threshold_percent":    policy.JobFailureRatePercentThreshold,
			},
		})
	}
	return alerts
}

func evaluateGoogleAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	alerts := []Alert{}
	if snapshot.GoogleImportFailureTotal >= policy.GoogleImportFailureTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "google.import_failures_detected",
			Severity: "warning",
			Message:  "google import failures detected above threshold",
			Metadata: map[string]any{
				"failure_total":     snapshot.GoogleImportFailureTotal,
				"success_total":     snapshot.GoogleImportSuccessTotal,
				"failure_by_reason": snapshot.GoogleImportFailureByReason,
				"threshold_total":   policy.GoogleImportFailureTotalThreshold,
			},
		})
	}
	if snapshot.GoogleAuthChurnTotal >= policy.GoogleAuthChurnTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "google.auth_churn_high",
			Severity: "warning",
			Message:  "google integration auth churn above threshold",
			Metadata: map[string]any{
				"churn_total":     snapshot.GoogleAuthChurnTotal,
				"churn_by_reason": snapshot.GoogleAuthChurnByReason,
				"threshold_total": policy.GoogleAuthChurnTotalThreshold,
			},
		})
	}
	return alerts
}

func evaluateSignerAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	alerts := []Alert{}
	linkOpenRate := snapshot.SignerLinkOpenRatePercent()
	if linkOpenRate < policy.SignerLinkOpenRatePercentFloor {
		alerts = append(alerts, Alert{
			Code:     "signer.link_open_rate_low",
			Severity: "warning",
			Message:  "signer link open rate below threshold",
			Metadata: map[string]any{
				"open_rate_percent": linkOpenRate,
				"threshold_percent": policy.SignerLinkOpenRatePercentFloor,
				"open_success":      snapshot.SignerLinkOpenSuccessTotal,
				"open_failure":      snapshot.SignerLinkOpenFailureTotal,
			},
		})
	}
	submitConversion := snapshot.SignerSubmitConversionPercent()
	if submitConversion < policy.SignerSubmitConversionPercentFloor {
		alerts = append(alerts, Alert{
			Code:     "signer.submit_conversion_low",
			Severity: "warning",
			Message:  "signer submit conversion below threshold",
			Metadata: map[string]any{
				"conversion_percent": submitConversion,
				"threshold_percent":  policy.SignerSubmitConversionPercentFloor,
				"submit_success":     snapshot.SignerSubmitSuccessTotal,
				"link_open_success":  snapshot.SignerLinkOpenSuccessTotal,
			},
		})
	}
	completionRate := snapshot.CompletionDeliverySuccessRatePercent()
	if completionRate < policy.CompletionDeliverySuccessRateFloor {
		alerts = append(alerts, Alert{
			Code:     "completion.delivery_success_rate_low",
			Severity: "critical",
			Message:  "completion delivery success rate below threshold",
			Metadata: map[string]any{
				"success_rate_percent": completionRate,
				"threshold_percent":    policy.CompletionDeliverySuccessRateFloor,
				"success_total":        snapshot.CompletionDeliverySuccessTotal,
				"failure_total":        snapshot.CompletionDeliveryFailureTotal,
			},
		})
	}
	return alerts
}

func evaluatePDFAccessAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	alerts := []Alert{}
	if snapshot.PDFIngestAnalyzeFailTotal >= policy.PDFIngestAnalyzeFailTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.ingest_analyze_failures_high",
			Severity: "warning",
			Message:  "pdf ingest analyze failures above threshold",
			Metadata: map[string]any{
				"failure_total":    snapshot.PDFIngestAnalyzeFailTotal,
				"threshold_total":  policy.PDFIngestAnalyzeFailTotalThreshold,
				"failure_by_label": snapshot.PDFIngestAnalyzeFailByReasonTier,
			},
		})
	}
	if snapshot.PDFIngestPolicyRejectTotal >= policy.PDFIngestPolicyRejectTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.ingest_policy_rejects_high",
			Severity: "warning",
			Message:  "pdf ingest policy rejects above threshold",
			Metadata: map[string]any{
				"reject_total":     snapshot.PDFIngestPolicyRejectTotal,
				"threshold_total":  policy.PDFIngestPolicyRejectTotalThreshold,
				"reject_by_label":  snapshot.PDFIngestPolicyRejectByReasonTier,
				"analyze_failures": snapshot.PDFIngestAnalyzeFailTotal,
			},
		})
	}
	if snapshot.PDFPreviewFallbackTotal >= policy.PDFPreviewFallbackTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.preview_fallback_high",
			Severity: "warning",
			Message:  "pdf preview fallbacks above threshold",
			Metadata: map[string]any{
				"fallback_total":    snapshot.PDFPreviewFallbackTotal,
				"threshold_total":   policy.PDFPreviewFallbackTotalThreshold,
				"fallback_by_label": snapshot.PDFPreviewFallbackByReasonTier,
			},
		})
	}
	if snapshot.PDFRenderImportFailTotal >= policy.PDFRenderImportFailTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.render_import_failures_high",
			Severity: "critical",
			Message:  "pdf render import failures above threshold",
			Metadata: map[string]any{
				"failure_total":    snapshot.PDFRenderImportFailTotal,
				"threshold_total":  policy.PDFRenderImportFailTotalThreshold,
				"failure_by_label": snapshot.PDFRenderImportFailByReasonTier,
			},
		})
	}
	if snapshot.DedupStoreMissTotal >= policy.DedupStoreMissTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "command.dedup_store_miss_detected",
			Severity: "critical",
			Message:  "command dedup-store misses detected",
			Metadata: map[string]any{
				"dedup_store_miss_total":       snapshot.DedupStoreMissTotal,
				"threshold_total":              policy.DedupStoreMissTotalThreshold,
				"dedup_store_miss_by_command":  snapshot.DedupStoreMissByCommandID,
				"dispatch_rejected_by_reason":  snapshot.CommandDispatchRejectedByReason,
				"dispatch_accepted_by_command": snapshot.CommandDispatchAcceptedByID,
			},
		})
	}
	return alerts
}

func evaluateRemediationAlerts(snapshot MetricsSnapshot, policy AlertPolicy) []Alert {
	alerts := []Alert{}
	if snapshot.RemediationRetryingTotal >= policy.RemediationRetryingTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.remediation_retrying_high",
			Severity: "warning",
			Message:  "pdf remediation retrying transitions above threshold",
			Metadata: map[string]any{
				"retrying_total":  snapshot.RemediationRetryingTotal,
				"threshold_total": policy.RemediationRetryingTotalThreshold,
				"dispatch_states": snapshot.RemediationDispatchStateByStatus,
			},
		})
	}
	if snapshot.RemediationDeadLetterTotal >= policy.RemediationDeadLetterTotalThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.remediation_dead_letter_high",
			Severity: "critical",
			Message:  "pdf remediation dead-letter transitions above threshold",
			Metadata: map[string]any{
				"dead_letter_total": snapshot.RemediationDeadLetterTotal,
				"threshold_total":   policy.RemediationDeadLetterTotalThreshold,
				"dispatch_states":   snapshot.RemediationDispatchStateByStatus,
			},
		})
	}
	if snapshot.RemediationLockContentionTotal >= policy.RemediationLockContentionThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.remediation_lock_contention_high",
			Severity: "warning",
			Message:  "pdf remediation lock contention above threshold",
			Metadata: map[string]any{
				"contention_total": snapshot.RemediationLockContentionTotal,
				"threshold_total":  policy.RemediationLockContentionThreshold,
				"lock_signals":     snapshot.RemediationLockSignals,
			},
		})
	}
	if snapshot.RemediationLockTimeoutTotal >= policy.RemediationLockTimeoutThreshold {
		alerts = append(alerts, Alert{
			Code:     "pdf.remediation_lock_timeout_high",
			Severity: "critical",
			Message:  "pdf remediation lock timeouts above threshold",
			Metadata: map[string]any{
				"timeout_total":   snapshot.RemediationLockTimeoutTotal,
				"threshold_total": policy.RemediationLockTimeoutThreshold,
				"lock_signals":    snapshot.RemediationLockSignals,
			},
		})
	}
	return alerts
}

func evaluateSLOThresholdAlerts(snapshot MetricsSnapshot) []Alert {
	alerts := []Alert{}
	if snapshot.AdminReadSampleTotal > 0 && snapshot.AdminReadP95MS > ThresholdAdminReadP95MS {
		alerts = append(alerts, sloThresholdAlert(
			"slo.admin_read_p95_breach",
			"warning",
			"admin read p95 above threshold",
			snapshot.AdminReadP95MS,
			ThresholdAdminReadP95MS,
			"<=",
			"ms",
		))
	}
	if snapshot.SendSampleTotal > 0 && snapshot.SendP95MS > ThresholdSendEnqueueP95MS {
		alerts = append(alerts, sloThresholdAlert(
			"slo.send_enqueue_p95_breach",
			"warning",
			"send enqueue p95 above threshold",
			snapshot.SendP95MS,
			ThresholdSendEnqueueP95MS,
			"<=",
			"ms",
		))
	}
	if snapshot.EmailDispatchSampleTotal > 0 && snapshot.EmailDispatchStartP99MS > ThresholdEmailDispatchP99MS {
		alerts = append(alerts, sloThresholdAlert(
			"slo.email_dispatch_start_p99_breach",
			"critical",
			"email dispatch start p99 above threshold",
			snapshot.EmailDispatchStartP99MS,
			ThresholdEmailDispatchP99MS,
			"<=",
			"ms",
		))
	}
	if snapshot.FinalizeSampleTotal > 0 && snapshot.FinalizeP99MS > ThresholdFinalizeCompletionP99MS {
		alerts = append(alerts, sloThresholdAlert(
			"slo.finalize_completion_p99_breach",
			"critical",
			"finalize completion p99 above threshold",
			snapshot.FinalizeP99MS,
			ThresholdFinalizeCompletionP99MS,
			"<=",
			"ms",
		))
	}
	jobSuccessTotal := snapshot.JobSuccessTotal
	jobFailureTotal := snapshot.JobFailureTotal
	if jobSuccessTotal+jobFailureTotal == 0 {
		jobSuccessTotal = sumMap(snapshot.JobSuccessByName)
		jobFailureTotal = sumMap(snapshot.JobFailureByName)
	}
	if jobSuccessTotal+jobFailureTotal > 0 && (float64(jobSuccessTotal)/float64(jobSuccessTotal+jobFailureTotal))*100 < ThresholdMonthlyJobSuccessRate {
		alerts = append(alerts, sloThresholdAlert(
			"slo.monthly_job_success_rate_breach",
			"critical",
			"monthly job success rate below threshold",
			(float64(jobSuccessTotal)/float64(jobSuccessTotal+jobFailureTotal))*100,
			ThresholdMonthlyJobSuccessRate,
			">=",
			"percent",
		))
	}
	return alerts
}

func sloThresholdAlert(code, severity, message string, actual, threshold float64, comparator, unit string) Alert {
	return Alert{
		Code:     strings.TrimSpace(code),
		Severity: strings.TrimSpace(severity),
		Message:  strings.TrimSpace(message),
		Metadata: map[string]any{
			"actual":      actual,
			"threshold":   threshold,
			"comparator":  comparator,
			"unit":        strings.TrimSpace(unit),
			"slo_managed": true,
		},
	}
}

func failureRatePercent(successes, failures int64) float64 {
	total := successes + failures
	if total <= 0 {
		return 0
	}
	return (float64(failures) / float64(total)) * 100
}

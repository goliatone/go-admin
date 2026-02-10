package observability

import "strings"

// AlertPolicy defines thresholds for provider/job health checks.
type AlertPolicy struct {
	ProviderFailureRatePercentThreshold float64
	JobFailureRatePercentThreshold      float64
	GoogleImportFailureTotalThreshold   int64
	GoogleAuthChurnTotalThreshold       int64
}

// DefaultAlertPolicy returns baseline thresholds for e-sign runtime alerting.
func DefaultAlertPolicy() AlertPolicy {
	return AlertPolicy{
		ProviderFailureRatePercentThreshold: 5.0,
		JobFailureRatePercentThreshold:      2.0,
		GoogleImportFailureTotalThreshold:   1,
		GoogleAuthChurnTotalThreshold:       5,
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
	if policy.ProviderFailureRatePercentThreshold <= 0 {
		policy.ProviderFailureRatePercentThreshold = DefaultAlertPolicy().ProviderFailureRatePercentThreshold
	}
	if policy.JobFailureRatePercentThreshold <= 0 {
		policy.JobFailureRatePercentThreshold = DefaultAlertPolicy().JobFailureRatePercentThreshold
	}
	if policy.GoogleImportFailureTotalThreshold <= 0 {
		policy.GoogleImportFailureTotalThreshold = DefaultAlertPolicy().GoogleImportFailureTotalThreshold
	}
	if policy.GoogleAuthChurnTotalThreshold <= 0 {
		policy.GoogleAuthChurnTotalThreshold = DefaultAlertPolicy().GoogleAuthChurnTotalThreshold
	}

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

	alerts = append(alerts, evaluateSLOThresholdAlerts(snapshot)...)

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

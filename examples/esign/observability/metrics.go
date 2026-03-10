package observability

import (
	"context"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"
)

// Metrics captures e-sign telemetry needed for observability/SLO evaluation.
type Metrics interface {
	ObserveAdminRead(ctx context.Context, duration time.Duration, success bool, endpoint string)
	ObserveSend(ctx context.Context, duration time.Duration, success bool)
	ObserveReminderSweep(
		ctx context.Context,
		duration time.Duration,
		claimed, sent, skipped, failed int,
		skipReasons map[string]int,
		failureReasons map[string]int,
		claimToSendMS, dueToSendMS, dueBacklogAgeMS []float64,
	)
	ObserveSignerLinkOpen(ctx context.Context, success bool)
	ObserveUnifiedViewerLoad(ctx context.Context, duration time.Duration, success bool)
	ObserveUnifiedFieldSave(ctx context.Context, duration time.Duration, success bool)
	ObserveUnifiedSignatureAttach(ctx context.Context, duration time.Duration, success bool)
	ObserveUnifiedSubmitConversion(ctx context.Context, success bool)
	ObserveSignerSubmit(ctx context.Context, duration time.Duration, success bool)
	ObserveFinalize(ctx context.Context, duration time.Duration, success bool)
	ObserveEmailDispatchStart(ctx context.Context, duration time.Duration, success bool)
	ObserveCompletionDelivery(ctx context.Context, success bool)
	ObserveJobResult(ctx context.Context, jobName string, success bool)
	ObserveProviderResult(ctx context.Context, provider string, success bool)
	ObserveTokenValidationFailure(ctx context.Context, reason string)
	ObserveGoogleImport(ctx context.Context, success bool, reason string)
	ObserveGoogleAuthChurn(ctx context.Context, reason string)
	ObservePDFIngestAnalyzeFailure(ctx context.Context, reason, tier string)
	ObservePDFIngestPolicyReject(ctx context.Context, reason, tier string)
	ObservePDFPreviewFallback(ctx context.Context, reason, tier string)
	ObservePDFRenderImportFail(ctx context.Context, reason, tier string)
	Snapshot() MetricsSnapshot
}

// MetricsSnapshot is a read-model used by alerting and SLO dashboards.
type MetricsSnapshot struct {
	AdminReadP95MS          float64
	SendP95MS               float64
	ReminderSweepP95MS      float64
	SignerSubmitP95MS       float64
	UnifiedViewerLoadP95MS  float64
	UnifiedFieldSaveP95MS   float64
	UnifiedSignatureP95MS   float64
	FinalizeP99MS           float64
	EmailDispatchStartP99MS float64

	AdminReadSampleTotal     int64
	SendSampleTotal          int64
	ReminderSweepSampleTotal int64
	SignerSubmitSampleTotal  int64
	UnifiedViewerSampleTotal int64
	UnifiedFieldSaveTotal    int64
	UnifiedSignatureTotal    int64
	FinalizeSampleTotal      int64
	EmailDispatchSampleTotal int64

	SendSuccessTotal               int64
	SendFailureTotal               int64
	ReminderSweepClaimedTotal      int64
	ReminderSweepSentTotal         int64
	ReminderSweepSkippedTotal      int64
	ReminderSweepFailedTotal       int64
	ReminderSweepSkipByReason      map[string]int64
	ReminderSweepFailureByReason   map[string]int64
	ReminderLeaseLostTotal         int64
	ReminderLeaseConflictTotal     int64
	ReminderStateInvariantTotal    int64
	ReminderPolicyBlockTotal       int64
	ReminderClaimToSendP95MS       float64
	ReminderDueToSendP95MS         float64
	ReminderDueBacklogAgeP95MS     float64
	SignerLinkOpenSuccessTotal     int64
	SignerLinkOpenFailureTotal     int64
	SignerSubmitSuccessTotal       int64
	SignerSubmitFailureTotal       int64
	UnifiedViewerSuccessTotal      int64
	UnifiedViewerFailureTotal      int64
	UnifiedFieldSaveSuccessTotal   int64
	UnifiedFieldSaveFailureTotal   int64
	UnifiedSignatureSuccessTotal   int64
	UnifiedSignatureFailureTotal   int64
	UnifiedSubmitSuccessTotal      int64
	UnifiedSubmitFailureTotal      int64
	FinalizeSuccessTotal           int64
	FinalizeFailureTotal           int64
	CompletionDeliverySuccessTotal int64
	CompletionDeliveryFailureTotal int64

	JobSuccessTotal      int64
	JobFailureTotal      int64
	EmailSuccessTotal    int64
	EmailFailureTotal    int64
	TokenFailureTotal    int64
	TokenFailureByReason map[string]int64

	GoogleImportSuccessTotal    int64
	GoogleImportFailureTotal    int64
	GoogleImportFailureByReason map[string]int64
	GoogleAuthChurnTotal        int64
	GoogleAuthChurnByReason     map[string]int64

	ProviderSuccessByName map[string]int64
	ProviderFailureByName map[string]int64
	JobSuccessByName      map[string]int64
	JobFailureByName      map[string]int64

	PDFIngestAnalyzeFailTotal         int64
	PDFIngestAnalyzeFailByReasonTier  map[string]int64
	PDFIngestPolicyRejectTotal        int64
	PDFIngestPolicyRejectByReasonTier map[string]int64
	PDFPreviewFallbackTotal           int64
	PDFPreviewFallbackByReasonTier    map[string]int64
	PDFRenderImportFailTotal          int64
	PDFRenderImportFailByReasonTier   map[string]int64
}

func (s MetricsSnapshot) JobSuccessRatePercent() float64 {
	total := s.JobSuccessTotal + s.JobFailureTotal
	if total <= 0 {
		return 100
	}
	return (float64(s.JobSuccessTotal) / float64(total)) * 100
}

func (s MetricsSnapshot) EmailSuccessRatePercent() float64 {
	total := s.EmailSuccessTotal + s.EmailFailureTotal
	if total <= 0 {
		return 100
	}
	return (float64(s.EmailSuccessTotal) / float64(total)) * 100
}

func (s MetricsSnapshot) SignerLinkOpenRatePercent() float64 {
	total := s.SignerLinkOpenSuccessTotal + s.SignerLinkOpenFailureTotal
	if total <= 0 {
		return 100
	}
	return (float64(s.SignerLinkOpenSuccessTotal) / float64(total)) * 100
}

func (s MetricsSnapshot) SignerSubmitConversionPercent() float64 {
	if s.SignerLinkOpenSuccessTotal <= 0 {
		return 100
	}
	return (float64(s.SignerSubmitSuccessTotal) / float64(s.SignerLinkOpenSuccessTotal)) * 100
}

func (s MetricsSnapshot) UnifiedSubmitConversionPercent() float64 {
	if s.UnifiedViewerSuccessTotal <= 0 {
		return 100
	}
	return (float64(s.UnifiedSubmitSuccessTotal) / float64(s.UnifiedViewerSuccessTotal)) * 100
}

func (s MetricsSnapshot) CompletionDeliverySuccessRatePercent() float64 {
	total := s.CompletionDeliverySuccessTotal + s.CompletionDeliveryFailureTotal
	if total <= 0 {
		return 100
	}
	return (float64(s.CompletionDeliverySuccessTotal) / float64(total)) * 100
}

type inMemoryMetrics struct {
	mu sync.Mutex

	adminReadDurationsMS           []float64
	sendDurationsMS                []float64
	reminderSweepDurationsMS       []float64
	signerSubmitDurationsMS        []float64
	unifiedViewerDurationsMS       []float64
	unifiedFieldSaveDurationsMS    []float64
	unifiedSignatureDurationsMS    []float64
	finalizeDurationsMS            []float64
	emailDispatchDurationsMS       []float64
	sendSuccessTotal               int64
	sendFailureTotal               int64
	reminderSweepClaimedTotal      int64
	reminderSweepSentTotal         int64
	reminderSweepSkippedTotal      int64
	reminderSweepFailedTotal       int64
	reminderSweepSkipByReason      map[string]int64
	reminderSweepFailureByReason   map[string]int64
	reminderClaimToSendDurationsMS []float64
	reminderDueToSendDurationsMS   []float64
	reminderDueBacklogAgeMS        []float64
	signerLinkOpenSuccessTotal     int64
	signerLinkOpenFailureTotal     int64
	signerSubmitSuccessTotal       int64
	signerSubmitFailureTotal       int64
	unifiedViewerSuccessTotal      int64
	unifiedViewerFailureTotal      int64
	unifiedFieldSaveSuccessTotal   int64
	unifiedFieldSaveFailureTotal   int64
	unifiedSignatureSuccessTotal   int64
	unifiedSignatureFailureTotal   int64
	unifiedSubmitSuccessTotal      int64
	unifiedSubmitFailureTotal      int64
	finalizeSuccessTotal           int64
	finalizeFailureTotal           int64
	completionDeliverySuccessTotal int64
	completionDeliveryFailureTotal int64
	jobSuccessByName               map[string]int64
	jobFailureByName               map[string]int64
	providerSuccessByName          map[string]int64
	providerFailureByName          map[string]int64
	tokenValidationByReason        map[string]int64
	googleImportFailureByKey       map[string]int64
	googleAuthChurnByReason        map[string]int64
	googleImportSuccessTotal       int64
	adminReadSuccessByPath         map[string]int64
	adminReadFailureByPath         map[string]int64
	pdfIngestAnalyzeFailByLabel    map[string]int64
	pdfIngestPolicyRejectByLabel   map[string]int64
	pdfPreviewFallbackByLabel      map[string]int64
	pdfRenderImportFailByLabel     map[string]int64
}

func newInMemoryMetrics() *inMemoryMetrics {
	return &inMemoryMetrics{
		jobSuccessByName:             map[string]int64{},
		jobFailureByName:             map[string]int64{},
		providerSuccessByName:        map[string]int64{},
		providerFailureByName:        map[string]int64{},
		tokenValidationByReason:      map[string]int64{},
		reminderSweepSkipByReason:    map[string]int64{},
		reminderSweepFailureByReason: map[string]int64{},
		googleImportFailureByKey:     map[string]int64{},
		googleAuthChurnByReason:      map[string]int64{},
		adminReadSuccessByPath:       map[string]int64{},
		adminReadFailureByPath:       map[string]int64{},
		pdfIngestAnalyzeFailByLabel:  map[string]int64{},
		pdfIngestPolicyRejectByLabel: map[string]int64{},
		pdfPreviewFallbackByLabel:    map[string]int64{},
		pdfRenderImportFailByLabel:   map[string]int64{},
	}
}

func (m *inMemoryMetrics) ObserveAdminRead(_ context.Context, duration time.Duration, success bool, endpoint string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.adminReadDurationsMS = appendDurationMS(m.adminReadDurationsMS, duration)
	key := normalizeMetricKey(endpoint, "unknown")
	if success {
		m.adminReadSuccessByPath[key]++
		return
	}
	m.adminReadFailureByPath[key]++
}

func (m *inMemoryMetrics) ObserveSend(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sendDurationsMS = appendDurationMS(m.sendDurationsMS, duration)
	if success {
		m.sendSuccessTotal++
		return
	}
	m.sendFailureTotal++
}

func (m *inMemoryMetrics) ObserveReminderSweep(
	_ context.Context,
	duration time.Duration,
	claimed, sent, skipped, failed int,
	skipReasons map[string]int,
	failureReasons map[string]int,
	claimToSendMS, dueToSendMS, dueBacklogAgeMS []float64,
) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.reminderSweepDurationsMS = appendDurationMS(m.reminderSweepDurationsMS, duration)
	m.reminderSweepClaimedTotal += int64(claimed)
	m.reminderSweepSentTotal += int64(sent)
	m.reminderSweepSkippedTotal += int64(skipped)
	m.reminderSweepFailedTotal += int64(failed)
	for reason, count := range skipReasons {
		key := normalizeMetricKey(reason, "unknown")
		if count <= 0 {
			continue
		}
		m.reminderSweepSkipByReason[key] += int64(count)
	}
	for reason, count := range failureReasons {
		key := normalizeMetricKey(reason, "unknown")
		if count <= 0 {
			continue
		}
		m.reminderSweepFailureByReason[key] += int64(count)
	}
	m.reminderClaimToSendDurationsMS = appendMetricSamples(m.reminderClaimToSendDurationsMS, claimToSendMS)
	m.reminderDueToSendDurationsMS = appendMetricSamples(m.reminderDueToSendDurationsMS, dueToSendMS)
	m.reminderDueBacklogAgeMS = appendMetricSamples(m.reminderDueBacklogAgeMS, dueBacklogAgeMS)
}

func (m *inMemoryMetrics) ObserveSignerLinkOpen(_ context.Context, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if success {
		m.signerLinkOpenSuccessTotal++
		return
	}
	m.signerLinkOpenFailureTotal++
}

func (m *inMemoryMetrics) ObserveUnifiedViewerLoad(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.unifiedViewerDurationsMS = appendDurationMS(m.unifiedViewerDurationsMS, duration)
	if success {
		m.unifiedViewerSuccessTotal++
		return
	}
	m.unifiedViewerFailureTotal++
}

func (m *inMemoryMetrics) ObserveUnifiedFieldSave(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.unifiedFieldSaveDurationsMS = appendDurationMS(m.unifiedFieldSaveDurationsMS, duration)
	if success {
		m.unifiedFieldSaveSuccessTotal++
		return
	}
	m.unifiedFieldSaveFailureTotal++
}

func (m *inMemoryMetrics) ObserveUnifiedSignatureAttach(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.unifiedSignatureDurationsMS = appendDurationMS(m.unifiedSignatureDurationsMS, duration)
	if success {
		m.unifiedSignatureSuccessTotal++
		return
	}
	m.unifiedSignatureFailureTotal++
}

func (m *inMemoryMetrics) ObserveUnifiedSubmitConversion(_ context.Context, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if success {
		m.unifiedSubmitSuccessTotal++
		return
	}
	m.unifiedSubmitFailureTotal++
}

func (m *inMemoryMetrics) ObserveSignerSubmit(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.signerSubmitDurationsMS = appendDurationMS(m.signerSubmitDurationsMS, duration)
	if success {
		m.signerSubmitSuccessTotal++
		return
	}
	m.signerSubmitFailureTotal++
}

func (m *inMemoryMetrics) ObserveFinalize(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.finalizeDurationsMS = appendDurationMS(m.finalizeDurationsMS, duration)
	if success {
		m.finalizeSuccessTotal++
		return
	}
	m.finalizeFailureTotal++
}

func (m *inMemoryMetrics) ObserveEmailDispatchStart(_ context.Context, duration time.Duration, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.emailDispatchDurationsMS = appendDurationMS(m.emailDispatchDurationsMS, duration)
	_ = success
}

func (m *inMemoryMetrics) ObserveCompletionDelivery(_ context.Context, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if success {
		m.completionDeliverySuccessTotal++
		return
	}
	m.completionDeliveryFailureTotal++
}

func (m *inMemoryMetrics) ObserveJobResult(_ context.Context, jobName string, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := normalizeMetricKey(jobName, "unknown")
	if success {
		m.jobSuccessByName[key]++
		return
	}
	m.jobFailureByName[key]++
}

func (m *inMemoryMetrics) ObserveProviderResult(_ context.Context, provider string, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := normalizeMetricKey(provider, "unknown")
	if success {
		m.providerSuccessByName[key]++
		return
	}
	m.providerFailureByName[key]++
}

func (m *inMemoryMetrics) ObserveTokenValidationFailure(_ context.Context, reason string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := normalizeMetricKey(reason, "unknown")
	m.tokenValidationByReason[key]++
}

func (m *inMemoryMetrics) ObserveGoogleImport(_ context.Context, success bool, reason string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if success {
		m.googleImportSuccessTotal++
		return
	}
	key := normalizeMetricKey(reason, "unknown")
	m.googleImportFailureByKey[key]++
}

func (m *inMemoryMetrics) ObserveGoogleAuthChurn(_ context.Context, reason string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := normalizeMetricKey(reason, "unknown")
	m.googleAuthChurnByReason[key]++
}

func (m *inMemoryMetrics) ObservePDFIngestAnalyzeFailure(_ context.Context, reason, tier string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	incrementLabeledCounter(m.pdfIngestAnalyzeFailByLabel, reason, tier)
}

func (m *inMemoryMetrics) ObservePDFIngestPolicyReject(_ context.Context, reason, tier string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	incrementLabeledCounter(m.pdfIngestPolicyRejectByLabel, reason, tier)
}

func (m *inMemoryMetrics) ObservePDFPreviewFallback(_ context.Context, reason, tier string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	incrementLabeledCounter(m.pdfPreviewFallbackByLabel, reason, tier)
}

func (m *inMemoryMetrics) ObservePDFRenderImportFail(_ context.Context, reason, tier string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	incrementLabeledCounter(m.pdfRenderImportFailByLabel, reason, tier)
}

func (m *inMemoryMetrics) Snapshot() MetricsSnapshot {
	m.mu.Lock()
	defer m.mu.Unlock()

	jobSuccessTotal := sumMap(m.jobSuccessByName)
	jobFailureTotal := sumMap(m.jobFailureByName)
	emailSuccessTotal := m.providerSuccessByName["email"]
	emailFailureTotal := m.providerFailureByName["email"]
	tokenFailureTotal := sumMap(m.tokenValidationByReason)
	googleImportFailureTotal := sumMap(m.googleImportFailureByKey)
	googleAuthChurnTotal := sumMap(m.googleAuthChurnByReason)
	pdfIngestAnalyzeFailTotal := sumMap(m.pdfIngestAnalyzeFailByLabel)
	pdfIngestPolicyRejectTotal := sumMap(m.pdfIngestPolicyRejectByLabel)
	pdfPreviewFallbackTotal := sumMap(m.pdfPreviewFallbackByLabel)
	pdfRenderImportFailTotal := sumMap(m.pdfRenderImportFailByLabel)

	return MetricsSnapshot{
		AdminReadP95MS:          percentile(m.adminReadDurationsMS, 95),
		SendP95MS:               percentile(m.sendDurationsMS, 95),
		ReminderSweepP95MS:      percentile(m.reminderSweepDurationsMS, 95),
		SignerSubmitP95MS:       percentile(m.signerSubmitDurationsMS, 95),
		UnifiedViewerLoadP95MS:  percentile(m.unifiedViewerDurationsMS, 95),
		UnifiedFieldSaveP95MS:   percentile(m.unifiedFieldSaveDurationsMS, 95),
		UnifiedSignatureP95MS:   percentile(m.unifiedSignatureDurationsMS, 95),
		FinalizeP99MS:           percentile(m.finalizeDurationsMS, 99),
		EmailDispatchStartP99MS: percentile(m.emailDispatchDurationsMS, 99),

		AdminReadSampleTotal:     int64(len(m.adminReadDurationsMS)),
		SendSampleTotal:          int64(len(m.sendDurationsMS)),
		ReminderSweepSampleTotal: int64(len(m.reminderSweepDurationsMS)),
		SignerSubmitSampleTotal:  int64(len(m.signerSubmitDurationsMS)),
		UnifiedViewerSampleTotal: int64(len(m.unifiedViewerDurationsMS)),
		UnifiedFieldSaveTotal:    int64(len(m.unifiedFieldSaveDurationsMS)),
		UnifiedSignatureTotal:    int64(len(m.unifiedSignatureDurationsMS)),
		FinalizeSampleTotal:      int64(len(m.finalizeDurationsMS)),
		EmailDispatchSampleTotal: int64(len(m.emailDispatchDurationsMS)),

		SendSuccessTotal:               m.sendSuccessTotal,
		SendFailureTotal:               m.sendFailureTotal,
		ReminderSweepClaimedTotal:      m.reminderSweepClaimedTotal,
		ReminderSweepSentTotal:         m.reminderSweepSentTotal,
		ReminderSweepSkippedTotal:      m.reminderSweepSkippedTotal,
		ReminderSweepFailedTotal:       m.reminderSweepFailedTotal,
		ReminderSweepSkipByReason:      cloneInt64Map(m.reminderSweepSkipByReason),
		ReminderSweepFailureByReason:   cloneInt64Map(m.reminderSweepFailureByReason),
		ReminderLeaseLostTotal:         m.reminderSweepSkipByReason["lease_lost"],
		ReminderLeaseConflictTotal:     m.reminderSweepSkipByReason["lease_conflict"],
		ReminderStateInvariantTotal:    m.reminderSweepFailureByReason["state_invariant_violation"],
		ReminderPolicyBlockTotal:       m.reminderSweepSkipByReason["policy_block"],
		ReminderClaimToSendP95MS:       percentile(m.reminderClaimToSendDurationsMS, 95),
		ReminderDueToSendP95MS:         percentile(m.reminderDueToSendDurationsMS, 95),
		ReminderDueBacklogAgeP95MS:     percentile(m.reminderDueBacklogAgeMS, 95),
		SignerLinkOpenSuccessTotal:     m.signerLinkOpenSuccessTotal,
		SignerLinkOpenFailureTotal:     m.signerLinkOpenFailureTotal,
		SignerSubmitSuccessTotal:       m.signerSubmitSuccessTotal,
		SignerSubmitFailureTotal:       m.signerSubmitFailureTotal,
		UnifiedViewerSuccessTotal:      m.unifiedViewerSuccessTotal,
		UnifiedViewerFailureTotal:      m.unifiedViewerFailureTotal,
		UnifiedFieldSaveSuccessTotal:   m.unifiedFieldSaveSuccessTotal,
		UnifiedFieldSaveFailureTotal:   m.unifiedFieldSaveFailureTotal,
		UnifiedSignatureSuccessTotal:   m.unifiedSignatureSuccessTotal,
		UnifiedSignatureFailureTotal:   m.unifiedSignatureFailureTotal,
		UnifiedSubmitSuccessTotal:      m.unifiedSubmitSuccessTotal,
		UnifiedSubmitFailureTotal:      m.unifiedSubmitFailureTotal,
		FinalizeSuccessTotal:           m.finalizeSuccessTotal,
		FinalizeFailureTotal:           m.finalizeFailureTotal,
		CompletionDeliverySuccessTotal: m.completionDeliverySuccessTotal,
		CompletionDeliveryFailureTotal: m.completionDeliveryFailureTotal,

		JobSuccessTotal:             jobSuccessTotal,
		JobFailureTotal:             jobFailureTotal,
		EmailSuccessTotal:           emailSuccessTotal,
		EmailFailureTotal:           emailFailureTotal,
		TokenFailureTotal:           tokenFailureTotal,
		TokenFailureByReason:        cloneInt64Map(m.tokenValidationByReason),
		GoogleImportSuccessTotal:    m.googleImportSuccessTotal,
		GoogleImportFailureTotal:    googleImportFailureTotal,
		GoogleImportFailureByReason: cloneInt64Map(m.googleImportFailureByKey),
		GoogleAuthChurnTotal:        googleAuthChurnTotal,
		GoogleAuthChurnByReason:     cloneInt64Map(m.googleAuthChurnByReason),

		ProviderSuccessByName: cloneInt64Map(m.providerSuccessByName),
		ProviderFailureByName: cloneInt64Map(m.providerFailureByName),
		JobSuccessByName:      cloneInt64Map(m.jobSuccessByName),
		JobFailureByName:      cloneInt64Map(m.jobFailureByName),

		PDFIngestAnalyzeFailTotal:         pdfIngestAnalyzeFailTotal,
		PDFIngestAnalyzeFailByReasonTier:  cloneInt64Map(m.pdfIngestAnalyzeFailByLabel),
		PDFIngestPolicyRejectTotal:        pdfIngestPolicyRejectTotal,
		PDFIngestPolicyRejectByReasonTier: cloneInt64Map(m.pdfIngestPolicyRejectByLabel),
		PDFPreviewFallbackTotal:           pdfPreviewFallbackTotal,
		PDFPreviewFallbackByReasonTier:    cloneInt64Map(m.pdfPreviewFallbackByLabel),
		PDFRenderImportFailTotal:          pdfRenderImportFailTotal,
		PDFRenderImportFailByReasonTier:   cloneInt64Map(m.pdfRenderImportFailByLabel),
	}
}

var (
	defaultMetricsMu sync.RWMutex
	defaultMetrics   Metrics = newInMemoryMetrics()
)

func currentMetrics() Metrics {
	defaultMetricsMu.RLock()
	metrics := defaultMetrics
	defaultMetricsMu.RUnlock()
	return metrics
}

func SetMetrics(metrics Metrics) {
	if metrics == nil {
		return
	}
	defaultMetricsMu.Lock()
	defaultMetrics = metrics
	defaultMetricsMu.Unlock()
}

func ResetDefaultMetrics() {
	defaultMetricsMu.Lock()
	defaultMetrics = newInMemoryMetrics()
	defaultMetricsMu.Unlock()
}

func Snapshot() MetricsSnapshot {
	metrics := currentMetrics()
	if metrics == nil {
		return MetricsSnapshot{}
	}
	return metrics.Snapshot()
}

func ObserveAdminRead(ctx context.Context, duration time.Duration, success bool, endpoint string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveAdminRead(ctx, duration, success, endpoint)
}

func ObserveSend(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveSend(ctx, duration, success)
}

func ObserveReminderSweep(
	ctx context.Context,
	duration time.Duration,
	claimed, sent, skipped, failed int,
	skipReasons map[string]int,
	failureReasons map[string]int,
	claimToSendMS, dueToSendMS, dueBacklogAgeMS []float64,
) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveReminderSweep(
		ctx,
		duration,
		claimed,
		sent,
		skipped,
		failed,
		skipReasons,
		failureReasons,
		claimToSendMS,
		dueToSendMS,
		dueBacklogAgeMS,
	)
}

func ObserveSignerLinkOpen(ctx context.Context, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveSignerLinkOpen(ctx, success)
}

func ObserveUnifiedViewerLoad(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveUnifiedViewerLoad(ctx, duration, success)
}

func ObserveUnifiedFieldSave(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveUnifiedFieldSave(ctx, duration, success)
}

func ObserveUnifiedSignatureAttach(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveUnifiedSignatureAttach(ctx, duration, success)
}

func ObserveUnifiedSubmitConversion(ctx context.Context, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveUnifiedSubmitConversion(ctx, success)
}

func ObserveSignerSubmit(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveSignerSubmit(ctx, duration, success)
}

func ObserveFinalize(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveFinalize(ctx, duration, success)
}

func ObserveEmailDispatchStart(ctx context.Context, duration time.Duration, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveEmailDispatchStart(ctx, duration, success)
}

func ObserveCompletionDelivery(ctx context.Context, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveCompletionDelivery(ctx, success)
}

func ObserveJobResult(ctx context.Context, jobName string, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveJobResult(ctx, jobName, success)
}

func ObserveProviderResult(ctx context.Context, provider string, success bool) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveProviderResult(ctx, provider, success)
}

func ObserveTokenValidationFailure(ctx context.Context, reason string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveTokenValidationFailure(ctx, reason)
}

func ObserveGoogleImport(ctx context.Context, success bool, reason string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveGoogleImport(ctx, success, reason)
}

func ObserveGoogleAuthChurn(ctx context.Context, reason string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObserveGoogleAuthChurn(ctx, reason)
}

func ObservePDFIngestAnalyzeFailure(ctx context.Context, reason, tier string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObservePDFIngestAnalyzeFailure(ctx, reason, tier)
	LogOperation(ctx, slog.LevelWarn, "pdf", "ingest_analyze_fail", "error", "", 0, nil, map[string]any{
		"metric": "pdf_ingest_analyze_fail_total",
		"reason": normalizeMetricKey(reason, "unknown"),
		"tier":   normalizeMetricKey(tier, "unknown"),
	})
}

func ObservePDFIngestPolicyReject(ctx context.Context, reason, tier string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObservePDFIngestPolicyReject(ctx, reason, tier)
	LogOperation(ctx, slog.LevelWarn, "pdf", "ingest_policy_reject", "error", "", 0, nil, map[string]any{
		"metric": "pdf_ingest_policy_reject_total",
		"reason": normalizeMetricKey(reason, "unknown"),
		"tier":   normalizeMetricKey(tier, "unknown"),
	})
}

func ObservePDFPreviewFallback(ctx context.Context, reason, tier string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObservePDFPreviewFallback(ctx, reason, tier)
	LogOperation(ctx, slog.LevelWarn, "pdf", "preview_fallback", "degraded", "", 0, nil, map[string]any{
		"metric": "pdf_preview_fallback_total",
		"reason": normalizeMetricKey(reason, "unknown"),
		"tier":   normalizeMetricKey(tier, "unknown"),
	})
}

func ObservePDFRenderImportFail(ctx context.Context, reason, tier string) {
	metrics := currentMetrics()
	if metrics == nil {
		return
	}
	metrics.ObservePDFRenderImportFail(ctx, reason, tier)
	LogOperation(ctx, slog.LevelWarn, "pdf", "render_import_fail", "error", "", 0, nil, map[string]any{
		"metric": "pdf_render_import_fail_total",
		"reason": normalizeMetricKey(reason, "unknown"),
		"tier":   normalizeMetricKey(tier, "unknown"),
	})
}

func appendDurationMS(dst []float64, duration time.Duration) []float64 {
	ms := float64(duration.Milliseconds())
	if ms < 0 {
		ms = 0
	}
	dst = append(dst, ms)
	if len(dst) > 5000 {
		return dst[len(dst)-5000:]
	}
	return dst
}

func appendMetricSamples(dst []float64, samples []float64) []float64 {
	for _, sample := range samples {
		if sample < 0 {
			sample = 0
		}
		dst = append(dst, sample)
	}
	if len(dst) > 5000 {
		return dst[len(dst)-5000:]
	}
	return dst
}

func percentile(values []float64, p int) float64 {
	if len(values) == 0 {
		return 0
	}
	if p <= 0 {
		p = 1
	}
	if p > 100 {
		p = 100
	}
	cp := append([]float64{}, values...)
	sort.Float64s(cp)
	index := int((float64(p)/100.0)*float64(len(cp)-1) + 0.5)
	if index < 0 {
		index = 0
	}
	if index >= len(cp) {
		index = len(cp) - 1
	}
	return cp[index]
}

func sumMap(values map[string]int64) int64 {
	var out int64
	for _, value := range values {
		out += value
	}
	return out
}

func cloneInt64Map(values map[string]int64) map[string]int64 {
	out := map[string]int64{}
	for key, value := range values {
		out[key] = value
	}
	return out
}

func incrementLabeledCounter(counter map[string]int64, reason, tier string) {
	if counter == nil {
		return
	}
	counter[metricLabelKey(reason, tier)]++
}

func metricLabelKey(reason, tier string) string {
	return "reason=" + normalizeMetricKey(reason, "unknown") + ",tier=" + normalizeMetricKey(tier, "unknown")
}

func normalizeMetricKey(value, fallback string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return strings.TrimSpace(strings.ToLower(fallback))
	}
	value = strings.ReplaceAll(value, " ", "_")
	value = strings.ReplaceAll(value, ",", "_")
	value = strings.ReplaceAll(value, "=", "_")
	return value
}

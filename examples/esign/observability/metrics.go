package observability

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"
)

// Metrics captures e-sign telemetry needed for observability/SLO evaluation.
type Metrics interface {
	ObserveAdminRead(ctx context.Context, duration time.Duration, success bool, endpoint string)
	ObserveSend(ctx context.Context, duration time.Duration, success bool)
	ObserveSignerSubmit(ctx context.Context, duration time.Duration, success bool)
	ObserveFinalize(ctx context.Context, duration time.Duration, success bool)
	ObserveEmailDispatchStart(ctx context.Context, duration time.Duration, success bool)
	ObserveJobResult(ctx context.Context, jobName string, success bool)
	ObserveProviderResult(ctx context.Context, provider string, success bool)
	ObserveTokenValidationFailure(ctx context.Context, reason string)
	ObserveGoogleImport(ctx context.Context, success bool, reason string)
	ObserveGoogleAuthChurn(ctx context.Context, reason string)
	Snapshot() MetricsSnapshot
}

// MetricsSnapshot is a read-model used by alerting and SLO dashboards.
type MetricsSnapshot struct {
	AdminReadP95MS          float64
	SendP95MS               float64
	SignerSubmitP95MS       float64
	FinalizeP99MS           float64
	EmailDispatchStartP99MS float64

	AdminReadSampleTotal     int64
	SendSampleTotal          int64
	SignerSubmitSampleTotal  int64
	FinalizeSampleTotal      int64
	EmailDispatchSampleTotal int64

	SendSuccessTotal         int64
	SendFailureTotal         int64
	SignerSubmitSuccessTotal int64
	SignerSubmitFailureTotal int64
	FinalizeSuccessTotal     int64
	FinalizeFailureTotal     int64

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

type inMemoryMetrics struct {
	mu sync.Mutex

	adminReadDurationsMS     []float64
	sendDurationsMS          []float64
	signerSubmitDurationsMS  []float64
	finalizeDurationsMS      []float64
	emailDispatchDurationsMS []float64
	sendSuccessTotal         int64
	sendFailureTotal         int64
	signerSubmitSuccessTotal int64
	signerSubmitFailureTotal int64
	finalizeSuccessTotal     int64
	finalizeFailureTotal     int64
	jobSuccessByName         map[string]int64
	jobFailureByName         map[string]int64
	providerSuccessByName    map[string]int64
	providerFailureByName    map[string]int64
	tokenValidationByReason  map[string]int64
	googleImportFailureByKey map[string]int64
	googleAuthChurnByReason  map[string]int64
	googleImportSuccessTotal int64
	adminReadSuccessByPath   map[string]int64
	adminReadFailureByPath   map[string]int64
}

func newInMemoryMetrics() *inMemoryMetrics {
	return &inMemoryMetrics{
		jobSuccessByName:         map[string]int64{},
		jobFailureByName:         map[string]int64{},
		providerSuccessByName:    map[string]int64{},
		providerFailureByName:    map[string]int64{},
		tokenValidationByReason:  map[string]int64{},
		googleImportFailureByKey: map[string]int64{},
		googleAuthChurnByReason:  map[string]int64{},
		adminReadSuccessByPath:   map[string]int64{},
		adminReadFailureByPath:   map[string]int64{},
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

	return MetricsSnapshot{
		AdminReadP95MS:          percentile(m.adminReadDurationsMS, 95),
		SendP95MS:               percentile(m.sendDurationsMS, 95),
		SignerSubmitP95MS:       percentile(m.signerSubmitDurationsMS, 95),
		FinalizeP99MS:           percentile(m.finalizeDurationsMS, 99),
		EmailDispatchStartP99MS: percentile(m.emailDispatchDurationsMS, 99),

		AdminReadSampleTotal:     int64(len(m.adminReadDurationsMS)),
		SendSampleTotal:          int64(len(m.sendDurationsMS)),
		SignerSubmitSampleTotal:  int64(len(m.signerSubmitDurationsMS)),
		FinalizeSampleTotal:      int64(len(m.finalizeDurationsMS)),
		EmailDispatchSampleTotal: int64(len(m.emailDispatchDurationsMS)),

		SendSuccessTotal:         m.sendSuccessTotal,
		SendFailureTotal:         m.sendFailureTotal,
		SignerSubmitSuccessTotal: m.signerSubmitSuccessTotal,
		SignerSubmitFailureTotal: m.signerSubmitFailureTotal,
		FinalizeSuccessTotal:     m.finalizeSuccessTotal,
		FinalizeFailureTotal:     m.finalizeFailureTotal,

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
	}
}

var defaultMetrics Metrics = newInMemoryMetrics()

func SetMetrics(metrics Metrics) {
	if metrics == nil {
		return
	}
	defaultMetrics = metrics
}

func ResetDefaultMetrics() {
	defaultMetrics = newInMemoryMetrics()
}

func Snapshot() MetricsSnapshot {
	if defaultMetrics == nil {
		return MetricsSnapshot{}
	}
	return defaultMetrics.Snapshot()
}

func ObserveAdminRead(ctx context.Context, duration time.Duration, success bool, endpoint string) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveAdminRead(ctx, duration, success, endpoint)
}

func ObserveSend(ctx context.Context, duration time.Duration, success bool) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveSend(ctx, duration, success)
}

func ObserveSignerSubmit(ctx context.Context, duration time.Duration, success bool) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveSignerSubmit(ctx, duration, success)
}

func ObserveFinalize(ctx context.Context, duration time.Duration, success bool) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveFinalize(ctx, duration, success)
}

func ObserveEmailDispatchStart(ctx context.Context, duration time.Duration, success bool) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveEmailDispatchStart(ctx, duration, success)
}

func ObserveJobResult(ctx context.Context, jobName string, success bool) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveJobResult(ctx, jobName, success)
}

func ObserveProviderResult(ctx context.Context, provider string, success bool) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveProviderResult(ctx, provider, success)
}

func ObserveTokenValidationFailure(ctx context.Context, reason string) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveTokenValidationFailure(ctx, reason)
}

func ObserveGoogleImport(ctx context.Context, success bool, reason string) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveGoogleImport(ctx, success, reason)
}

func ObserveGoogleAuthChurn(ctx context.Context, reason string) {
	if defaultMetrics == nil {
		return
	}
	defaultMetrics.ObserveGoogleAuthChurn(ctx, reason)
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

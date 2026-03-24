package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/ledongthuc/pdf"
	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
)

var (
	pdfObjectPattern       = regexp.MustCompile(`(?m)(?:^|[\r\n])\s*\d+\s+\d+\s+obj\b`)
	pdfLengthMarkerPattern = regexp.MustCompile(`(?i)/Length\s+(\d+)`)
)

type pdfReaderFactory func(reader *bytes.Reader, size int64) (*pdf.Reader, error)

var (
	pdfNewReaderMu sync.RWMutex
	pdfNewReader   pdfReaderFactory = func(reader *bytes.Reader, size int64) (*pdf.Reader, error) {
		return pdf.NewReader(reader, size)
	}
)

func currentPDFReaderFactory() pdfReaderFactory {
	pdfNewReaderMu.RLock()
	defer pdfNewReaderMu.RUnlock()
	return pdfNewReader
}

const (
	PDFDefaultPageWidthPt  = 612.0
	PDFDefaultPageHeightPt = 792.0
	PDFPolicyVersion       = "v1"
)

// PDF runtime setting keys.
const (
	SettingPDFMaxSourceBytes         = "esign.policy.pdf.max_source_bytes"
	SettingPDFMaxSourceBytesLegacy   = "esign.policy.max_source_pdf_bytes"
	SettingPDFMaxPages               = "esign.policy.pdf.max_pages"
	SettingPDFMaxObjects             = "esign.policy.pdf.max_objects"
	SettingPDFMaxDecompressedBytes   = "esign.policy.pdf.max_decompressed_bytes"
	SettingPDFParseTimeoutMS         = "esign.policy.pdf.parse_timeout_ms"
	SettingPDFNormalizationTimeoutMS = "esign.policy.pdf.normalization_timeout_ms"
	SettingPDFAllowEncrypted         = "esign.policy.pdf.allow_encrypted"
	SettingPDFAllowJavaScriptActions = "esign.policy.pdf.allow_javascript_actions"
	SettingPDFCompatibilityMode      = "esign.policy.pdf.compatibility_mode"
	SettingPDFPreviewFallbackEnabled = "esign.policy.pdf.preview_fallback_enabled"
	SettingPDFPipelineMode           = "esign.policy.pdf.pipeline_mode"
)

// PDFCompatibilityTier classifies downstream runtime compatibility.
type PDFCompatibilityTier string

const (
	PDFCompatibilityTierFull        PDFCompatibilityTier = "full"
	PDFCompatibilityTierLimited     PDFCompatibilityTier = "limited"
	PDFCompatibilityTierUnsupported PDFCompatibilityTier = "unsupported"
)

// PDFCompatibilityMode controls compatibility tolerance.
type PDFCompatibilityMode string

const (
	PDFCompatibilityModeStrict     PDFCompatibilityMode = "strict"
	PDFCompatibilityModeBalanced   PDFCompatibilityMode = "balanced"
	PDFCompatibilityModePermissive PDFCompatibilityMode = "permissive"
)

// PDFPipelineMode controls staged rollout behavior for ingest and source selection paths.
type PDFPipelineMode string

const (
	PDFPipelineModeAnalyzeOnly      PDFPipelineMode = "analyze_only"
	PDFPipelineModeEnforcePolicy    PDFPipelineMode = "enforce_policy"
	PDFPipelineModePreferNormalized PDFPipelineMode = "prefer_normalized"
)

// PDFReasonCode captures typed failure/rejection reasons.
type PDFReasonCode string

const (
	PDFReasonInvalidInputRequired       PDFReasonCode = "invalid_input.required"
	PDFReasonInvalidInputNotPDF         PDFReasonCode = "invalid_input.not_pdf"
	PDFReasonParseFailed                PDFReasonCode = "parse.failed"
	PDFReasonParseMissingPages          PDFReasonCode = "parse.missing_pages"
	PDFReasonPolicyMaxSourceBytes       PDFReasonCode = "policy.max_source_bytes"
	PDFReasonPolicyMaxPages             PDFReasonCode = "policy.max_pages"
	PDFReasonPolicyMaxObjects           PDFReasonCode = "policy.max_objects"
	PDFReasonPolicyMaxDecompressedBytes PDFReasonCode = "policy.max_decompressed_bytes"
	PDFReasonPolicyEncryptedDisallowed  PDFReasonCode = "policy.encrypted_disallowed"
	PDFReasonPolicyJavaScriptDisallowed PDFReasonCode = "policy.javascript_actions_disallowed"
	PDFReasonImportFailed               PDFReasonCode = "import.failed"
	PDFReasonTimeoutParse               PDFReasonCode = "timeout.parse"
	PDFReasonTimeoutNormalize           PDFReasonCode = "timeout.normalize"
	PDFReasonContextCanceled            PDFReasonCode = "context.canceled"
)

type PDFNormalizationStatus string

const (
	PDFNormalizationStatusNotRequested PDFNormalizationStatus = "not_requested"
	PDFNormalizationStatusPending      PDFNormalizationStatus = "pending"
	PDFNormalizationStatusCompleted    PDFNormalizationStatus = "completed"
	PDFNormalizationStatusFailed       PDFNormalizationStatus = "failed"
)

// PDFError wraps typed pdf operation failures.
type PDFError struct {
	Op     string        `json:"op"`
	Reason PDFReasonCode `json:"reason"`
	Page   int           `json:"page"`
	Box    string        `json:"box"`
	Cause  error         `json:"cause"`
}

func (e *PDFError) Error() string {
	if e == nil {
		return "pdf error"
	}
	parts := []string{"pdf", strings.TrimSpace(e.Op), string(e.Reason)}
	if e.Page > 0 {
		parts = append(parts, fmt.Sprintf("page=%d", e.Page))
	}
	if box := strings.TrimSpace(e.Box); box != "" {
		parts = append(parts, fmt.Sprintf("box=%s", box))
	}
	msg := strings.Join(parts, " ")
	if e.Cause != nil {
		return msg + ": " + e.Cause.Error()
	}
	return msg
}

func (e *PDFError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func pdfErrorf(op string, reason PDFReasonCode, cause error) *PDFError {
	return &PDFError{Op: strings.TrimSpace(op), Reason: reason, Cause: cause}
}

func mapContextPDFError(op string, err error, timeoutReason PDFReasonCode) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, context.Canceled):
		return pdfErrorf(op, PDFReasonContextCanceled, err)
	case errors.Is(err, context.DeadlineExceeded):
		return pdfErrorf(op, timeoutReason, err)
	default:
		return nil
	}
}

// PDFPolicy captures resolved limits/behavior switches.
type PDFPolicy struct {
	MaxSourceBytes         int64                `json:"max_source_bytes"`
	MaxPages               int                  `json:"max_pages"`
	MaxObjects             int                  `json:"max_objects"`
	MaxDecompressedBytes   int64                `json:"max_decompressed_bytes"`
	ParseTimeout           time.Duration        `json:"parse_timeout"`
	NormalizationTimeout   time.Duration        `json:"normalization_timeout"`
	AllowEncrypted         bool                 `json:"allow_encrypted"`
	AllowJavaScriptActions bool                 `json:"allow_java_script_actions"`
	CompatibilityMode      PDFCompatibilityMode `json:"compatibility_mode"`
	PreviewFallbackEnabled bool                 `json:"preview_fallback_enabled"`
	PipelineMode           PDFPipelineMode      `json:"pipeline_mode"`
}

func DefaultPDFPolicy() PDFPolicy {
	return PDFPolicy{
		MaxSourceBytes:         10 * 1024 * 1024,
		MaxPages:               200,
		MaxObjects:             100000,
		MaxDecompressedBytes:   64 * 1024 * 1024,
		ParseTimeout:           2500 * time.Millisecond,
		NormalizationTimeout:   5000 * time.Millisecond,
		AllowEncrypted:         false,
		AllowJavaScriptActions: false,
		CompatibilityMode:      PDFCompatibilityModeBalanced,
		PreviewFallbackEnabled: false,
		PipelineMode:           PDFPipelineModePreferNormalized,
	}
}

func normalizePDFPolicy(policy PDFPolicy) PDFPolicy {
	defaults := DefaultPDFPolicy()
	if policy.MaxSourceBytes <= 0 {
		policy.MaxSourceBytes = defaults.MaxSourceBytes
	}
	if policy.MaxPages <= 0 {
		policy.MaxPages = defaults.MaxPages
	}
	if policy.MaxObjects <= 0 {
		policy.MaxObjects = defaults.MaxObjects
	}
	if policy.MaxDecompressedBytes <= 0 {
		policy.MaxDecompressedBytes = defaults.MaxDecompressedBytes
	}
	if policy.ParseTimeout <= 0 {
		policy.ParseTimeout = defaults.ParseTimeout
	}
	if policy.NormalizationTimeout <= 0 {
		policy.NormalizationTimeout = defaults.NormalizationTimeout
	}
	switch strings.ToLower(strings.TrimSpace(string(policy.CompatibilityMode))) {
	case string(PDFCompatibilityModeStrict):
		policy.CompatibilityMode = PDFCompatibilityModeStrict
	case string(PDFCompatibilityModePermissive):
		policy.CompatibilityMode = PDFCompatibilityModePermissive
	default:
		policy.CompatibilityMode = PDFCompatibilityModeBalanced
	}
	switch strings.ToLower(strings.TrimSpace(string(policy.PipelineMode))) {
	case string(PDFPipelineModeAnalyzeOnly):
		policy.PipelineMode = PDFPipelineModeAnalyzeOnly
	case string(PDFPipelineModeEnforcePolicy):
		policy.PipelineMode = PDFPipelineModeEnforcePolicy
	default:
		policy.PipelineMode = PDFPipelineModePreferNormalized
	}
	return policy
}

// PDFPolicyDiagnostics returns a stable diagnostics payload for effective PDF policy values.
func PDFPolicyDiagnostics(policy PDFPolicy) map[string]any {
	policy = normalizePDFPolicy(policy)
	return map[string]any{
		"max_source_bytes":            policy.MaxSourceBytes,
		"max_pages":                   policy.MaxPages,
		"max_objects":                 policy.MaxObjects,
		"max_decompressed_bytes":      policy.MaxDecompressedBytes,
		"parse_timeout_ms":            policy.ParseTimeout.Milliseconds(),
		"normalization_timeout_ms":    policy.NormalizationTimeout.Milliseconds(),
		"allow_encrypted":             policy.AllowEncrypted,
		"allow_javascript_actions":    policy.AllowJavaScriptActions,
		"compatibility_mode":          strings.TrimSpace(string(policy.CompatibilityMode)),
		"preview_fallback_enabled":    policy.PreviewFallbackEnabled,
		"pipeline_mode":               strings.TrimSpace(string(policy.PipelineMode)),
		"policy_version":              PDFPolicyVersion,
		"diagnostics_payload_version": "v1",
	}
}

// PDFPolicyResolver returns effective policy per operation.
type PDFPolicyResolver interface {
	Resolve(ctx context.Context, scope stores.Scope) PDFPolicy
}

type staticPDFPolicyResolver struct {
	policy PDFPolicy
}

func (r staticPDFPolicyResolver) Resolve(_ context.Context, _ stores.Scope) PDFPolicy {
	return normalizePDFPolicy(r.policy)
}

func NewStaticPDFPolicyResolver(policy PDFPolicy) PDFPolicyResolver {
	return staticPDFPolicyResolver{policy: normalizePDFPolicy(policy)}
}

// RuntimePDFPolicyResolver resolves policy from settings + runtime config + defaults.
type RuntimePDFPolicyResolver struct {
	settings       *coreadmin.SettingsService
	configProvider func() appcfg.Config
	defaults       PDFPolicy
}

type RuntimePDFPolicyResolverOption func(*RuntimePDFPolicyResolver)

func WithRuntimePDFPolicyConfigProvider(provider func() appcfg.Config) RuntimePDFPolicyResolverOption {
	return func(r *RuntimePDFPolicyResolver) {
		if r == nil || provider == nil {
			return
		}
		r.configProvider = provider
	}
}

func WithRuntimePDFPolicyDefaults(policy PDFPolicy) RuntimePDFPolicyResolverOption {
	return func(r *RuntimePDFPolicyResolver) {
		if r == nil {
			return
		}
		r.defaults = normalizePDFPolicy(policy)
	}
}

func NewRuntimePDFPolicyResolver(settings *coreadmin.SettingsService, opts ...RuntimePDFPolicyResolverOption) PDFPolicyResolver {
	resolver := &RuntimePDFPolicyResolver{
		settings: settings,
		configProvider: func() appcfg.Config {
			return appcfg.Active()
		},
		defaults: DefaultPDFPolicy(),
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(resolver)
	}
	resolver.defaults = normalizePDFPolicy(resolver.defaults)
	return resolver
}

func (r *RuntimePDFPolicyResolver) Resolve(_ context.Context, _ stores.Scope) PDFPolicy {
	if r == nil {
		return DefaultPDFPolicy()
	}

	policy := normalizePDFPolicy(r.defaults)
	if r.configProvider != nil {
		cfg := r.configProvider()
		policy = applyConfigPDFPolicy(policy, cfg.Signer.PDF)
	}
	policy = r.applySettings(policy)
	return normalizePDFPolicy(policy)
}

func applyConfigPDFPolicy(base PDFPolicy, cfg appcfg.SignerPDFConfig) PDFPolicy {
	policy := base
	if cfg.MaxSourceBytes > 0 {
		policy.MaxSourceBytes = cfg.MaxSourceBytes
	}
	if cfg.MaxPages > 0 {
		policy.MaxPages = cfg.MaxPages
	}
	if cfg.MaxObjects > 0 {
		policy.MaxObjects = cfg.MaxObjects
	}
	if cfg.MaxDecompressedBytes > 0 {
		policy.MaxDecompressedBytes = cfg.MaxDecompressedBytes
	}
	if cfg.ParseTimeoutMS > 0 {
		policy.ParseTimeout = time.Duration(cfg.ParseTimeoutMS) * time.Millisecond
	}
	if cfg.NormalizationTimeoutMS > 0 {
		policy.NormalizationTimeout = time.Duration(cfg.NormalizationTimeoutMS) * time.Millisecond
	}
	policy.AllowEncrypted = cfg.AllowEncrypted
	policy.AllowJavaScriptActions = cfg.AllowJavaScriptActions
	policy.PreviewFallbackEnabled = cfg.PreviewFallbackEnabled
	if mode := normalizeCompatibilityMode(cfg.CompatibilityMode); mode != "" {
		policy.CompatibilityMode = mode
	}
	if mode := normalizePipelineMode(cfg.PipelineMode); mode != "" {
		policy.PipelineMode = mode
	}
	return policy
}

func (r *RuntimePDFPolicyResolver) applySettings(policy PDFPolicy) PDFPolicy {
	if r == nil || r.settings == nil {
		return policy
	}
	if value, ok := r.resolveSettingInt64(SettingPDFMaxSourceBytes); ok && value > 0 {
		policy.MaxSourceBytes = value
	} else if legacy, ok := r.resolveSettingInt64(SettingPDFMaxSourceBytesLegacy); ok && legacy > 0 {
		policy.MaxSourceBytes = legacy
	}
	if value, ok := r.resolveSettingInt64(SettingPDFMaxPages); ok && value > 0 {
		policy.MaxPages = int(value)
	}
	if value, ok := r.resolveSettingInt64(SettingPDFMaxObjects); ok && value > 0 {
		policy.MaxObjects = int(value)
	}
	if value, ok := r.resolveSettingInt64(SettingPDFMaxDecompressedBytes); ok && value > 0 {
		policy.MaxDecompressedBytes = value
	}
	if value, ok := r.resolveSettingInt64(SettingPDFParseTimeoutMS); ok && value > 0 {
		policy.ParseTimeout = time.Duration(value) * time.Millisecond
	}
	if value, ok := r.resolveSettingInt64(SettingPDFNormalizationTimeoutMS); ok && value > 0 {
		policy.NormalizationTimeout = time.Duration(value) * time.Millisecond
	}
	if value, ok := r.resolveSettingBool(SettingPDFAllowEncrypted); ok {
		policy.AllowEncrypted = value
	}
	if value, ok := r.resolveSettingBool(SettingPDFAllowJavaScriptActions); ok {
		policy.AllowJavaScriptActions = value
	}
	if value, ok := r.resolveSettingBool(SettingPDFPreviewFallbackEnabled); ok {
		policy.PreviewFallbackEnabled = value
	}
	if value, ok := r.resolveSettingString(SettingPDFCompatibilityMode); ok {
		if mode := normalizeCompatibilityMode(value); mode != "" {
			policy.CompatibilityMode = mode
		}
	}
	if value, ok := r.resolveSettingString(SettingPDFPipelineMode); ok {
		if mode := normalizePipelineMode(value); mode != "" {
			policy.PipelineMode = mode
		}
	}
	return policy
}

func (r *RuntimePDFPolicyResolver) resolveSettingInt64(key string) (int64, bool) {
	if r == nil || r.settings == nil {
		return 0, false
	}
	resolved := r.settings.Resolve(strings.TrimSpace(key), "")
	value, ok := parseInt64Any(resolved.Value)
	return value, ok
}

func (r *RuntimePDFPolicyResolver) resolveSettingBool(key string) (bool, bool) {
	if r == nil || r.settings == nil {
		return false, false
	}
	resolved := r.settings.Resolve(strings.TrimSpace(key), "")
	value, ok := parseBoolAny(resolved.Value)
	return value, ok
}

func (r *RuntimePDFPolicyResolver) resolveSettingString(key string) (string, bool) {
	if r == nil || r.settings == nil {
		return "", false
	}
	resolved := r.settings.Resolve(strings.TrimSpace(key), "")
	value := strings.TrimSpace(fmt.Sprint(resolved.Value))
	if value == "" {
		return "", false
	}
	return value, true
}

func parseInt64Any(value any) (int64, bool) {
	switch typed := value.(type) {
	case int:
		return int64(typed), true
	case int8:
		return int64(typed), true
	case int16:
		return int64(typed), true
	case int32:
		return int64(typed), true
	case int64:
		return typed, true
	case uint:
		return primitives.Int64FromUint(typed)
	case uint8:
		return int64(typed), true
	case uint16:
		return int64(typed), true
	case uint32:
		return int64(typed), true
	case uint64:
		return primitives.Int64FromUint64(typed)
	case float32:
		return int64(typed), true
	case float64:
		return int64(typed), true
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0, false
		}
		var parsed int64
		if _, err := fmt.Sscan(trimmed, &parsed); err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func parseBoolAny(value any) (bool, bool) {
	switch typed := value.(type) {
	case bool:
		return typed, true
	case int:
		return typed != 0, true
	case int8:
		return typed != 0, true
	case int16:
		return typed != 0, true
	case int32:
		return typed != 0, true
	case int64:
		return typed != 0, true
	case uint:
		return typed != 0, true
	case uint8:
		return typed != 0, true
	case uint16:
		return typed != 0, true
	case uint32:
		return typed != 0, true
	case uint64:
		return typed != 0, true
	case float32:
		return typed != 0, true
	case float64:
		return typed != 0, true
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "yes", "on":
			return true, true
		case "0", "false", "no", "off":
			return false, true
		default:
			return false, false
		}
	default:
		return false, false
	}
}

func normalizeCompatibilityMode(raw string) PDFCompatibilityMode {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(PDFCompatibilityModeStrict):
		return PDFCompatibilityModeStrict
	case string(PDFCompatibilityModePermissive):
		return PDFCompatibilityModePermissive
	case string(PDFCompatibilityModeBalanced):
		return PDFCompatibilityModeBalanced
	default:
		return ""
	}
}

func normalizePipelineMode(raw string) PDFPipelineMode {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(PDFPipelineModeAnalyzeOnly):
		return PDFPipelineModeAnalyzeOnly
	case string(PDFPipelineModeEnforcePolicy):
		return PDFPipelineModeEnforcePolicy
	case string(PDFPipelineModePreferNormalized):
		return PDFPipelineModePreferNormalized
	default:
		return ""
	}
}

// PDFAnalysis captures canonical source metadata.
type PDFAnalysis struct {
	SHA256              string                 `json:"sha256"`
	SizeBytes           int64                  `json:"size_bytes"`
	PageCount           int                    `json:"page_count"`
	CompatibilityTier   PDFCompatibilityTier   `json:"compatibility_tier"`
	ReasonCode          PDFReasonCode          `json:"reason_code"`
	NormalizationStatus PDFNormalizationStatus `json:"normalization_status"`
}

// PDFPageGeometry captures canonical PDF page dimensions.
type PDFPageGeometry struct {
	Page     int     `json:"page"`
	Width    float64 `json:"width"`
	Height   float64 `json:"height"`
	Rotation int     `json:"rotation"`
}

// PDFNormalized captures a successfully normalized PDF variant.
type PDFNormalized struct {
	Payload   []byte `json:"payload"`
	SHA256    string `json:"sha256"`
	SizeBytes int64  `json:"size_bytes"`
	PageCount int    `json:"page_count"`
}

// PDFService centralizes PDF analysis/import behavior.
type PDFService struct {
	resolver PDFPolicyResolver
}

// PDFServiceOption customizes PDFService.
type PDFServiceOption func(*PDFService)

func WithPDFPolicyResolver(resolver PDFPolicyResolver) PDFServiceOption {
	return func(s *PDFService) {
		if s == nil || resolver == nil {
			return
		}
		s.resolver = resolver
	}
}

func NewPDFService(opts ...PDFServiceOption) PDFService {
	svc := PDFService{resolver: NewRuntimePDFPolicyResolver(nil)}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	if svc.resolver == nil {
		svc.resolver = NewRuntimePDFPolicyResolver(nil)
	}
	return svc
}

func (s PDFService) Policy(ctx context.Context, scope stores.Scope) PDFPolicy {
	policy := DefaultPDFPolicy()
	if s.resolver == nil {
		logResolvedPDFPolicy(ctx, scope, policy)
		return policy
	}
	policy = normalizePDFPolicy(s.resolver.Resolve(ctx, scope))
	logResolvedPDFPolicy(ctx, scope, policy)
	return policy
}

func (s PDFService) Analyze(ctx context.Context, scope stores.Scope, raw []byte) (PDFAnalysis, error) {
	policy := s.Policy(ctx, scope)
	payload := append([]byte{}, raw...)
	if len(bytes.TrimSpace(payload)) == 0 {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonInvalidInputRequired, nil)
	}
	if policy.MaxSourceBytes > 0 && int64(len(payload)) > policy.MaxSourceBytes {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonPolicyMaxSourceBytes, nil)
	}
	if !bytes.HasPrefix(payload, []byte("%PDF-")) {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonInvalidInputNotPDF, nil)
	}
	if !policy.AllowEncrypted && hasPDFEncryptedMarker(payload) {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonPolicyEncryptedDisallowed, nil)
	}
	if !policy.AllowJavaScriptActions && hasPDFJavaScriptMarker(payload) {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonPolicyJavaScriptDisallowed, nil)
	}
	if policy.MaxObjects > 0 {
		objectCount := estimatePDFObjectCount(payload)
		if objectCount > policy.MaxObjects {
			return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonPolicyMaxObjects, nil)
		}
	}
	if policy.MaxDecompressedBytes > 0 {
		estimated := estimatePDFDecompressedBytes(payload)
		if estimated > policy.MaxDecompressedBytes {
			return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonPolicyMaxDecompressedBytes, nil)
		}
	}

	opCtx, cancel := context.WithTimeout(ctx, policy.ParseTimeout)
	defer cancel()

	pageCount, err := analyzePDFPageCount(opCtx, payload)
	if err != nil {
		if mapped := mapContextPDFError("analyze", err, PDFReasonTimeoutParse); mapped != nil {
			return PDFAnalysis{}, mapped
		}
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonParseFailed, err)
	}
	if pageCount <= 0 {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonParseMissingPages, nil)
	}
	if policy.MaxPages > 0 && pageCount > policy.MaxPages {
		return PDFAnalysis{}, pdfErrorf("analyze", PDFReasonPolicyMaxPages, nil)
	}

	sum := sha256.Sum256(payload)
	return PDFAnalysis{
		SHA256:              hex.EncodeToString(sum[:]),
		SizeBytes:           int64(len(payload)),
		PageCount:           pageCount,
		CompatibilityTier:   PDFCompatibilityTierFull,
		ReasonCode:          "",
		NormalizationStatus: PDFNormalizationStatusNotRequested,
	}, nil
}

// Normalize attempts to generate a safer/portable PDF variant from source bytes.
func (s PDFService) Normalize(ctx context.Context, scope stores.Scope, raw []byte) (PDFNormalized, error) {
	analysis, err := s.Analyze(ctx, scope, raw)
	if err != nil {
		return PDFNormalized{}, err
	}

	policy := s.Policy(ctx, scope)
	opCtx, cancel := context.WithTimeout(ctx, policy.NormalizationTimeout)
	defer cancel()

	source := append([]byte{}, raw...)
	outDoc := gofpdf.New("P", "pt", "Letter", "")
	outDoc.SetCompression(false)
	if err := s.RenderSourcePages(opCtx, scope, outDoc, source, analysis.PageCount, nil); err != nil {
		if mapped := mapContextPDFError("normalize", opCtx.Err(), PDFReasonTimeoutNormalize); mapped != nil {
			return PDFNormalized{}, mapped
		}
		var pdfErr *PDFError
		if errors.As(err, &pdfErr) {
			return PDFNormalized{}, &PDFError{
				Op:     "normalize",
				Reason: pdfErr.Reason,
				Page:   pdfErr.Page,
				Box:    pdfErr.Box,
				Cause:  err,
			}
		}
		return PDFNormalized{}, pdfErrorf("normalize", PDFReasonImportFailed, err)
	}
	if mapped := mapContextPDFError("normalize", opCtx.Err(), PDFReasonTimeoutNormalize); mapped != nil {
		return PDFNormalized{}, mapped
	}

	var out bytes.Buffer
	if err := outDoc.Output(&out); err != nil {
		return PDFNormalized{}, pdfErrorf("normalize", PDFReasonImportFailed, err)
	}
	normalized := out.Bytes()
	if len(normalized) == 0 || !bytes.HasPrefix(normalized, []byte("%PDF-")) {
		return PDFNormalized{}, pdfErrorf("normalize", PDFReasonParseFailed, nil)
	}

	normalizedAnalysis, err := s.Analyze(opCtx, scope, normalized)
	if err != nil {
		if mapped := mapContextPDFError("normalize", opCtx.Err(), PDFReasonTimeoutNormalize); mapped != nil {
			return PDFNormalized{}, mapped
		}
		return PDFNormalized{}, &PDFError{
			Op:     "normalize",
			Reason: PDFReasonParseFailed,
			Cause:  err,
		}
	}

	return PDFNormalized{
		Payload:   normalized,
		SHA256:    normalizedAnalysis.SHA256,
		SizeBytes: normalizedAnalysis.SizeBytes,
		PageCount: normalizedAnalysis.PageCount,
	}, nil
}

func hasPDFEncryptedMarker(payload []byte) bool {
	return hasPDFNameToken(payload, "Encrypt")
}

func hasPDFJavaScriptMarker(payload []byte) bool {
	return hasPDFNameToken(payload, "JavaScript") || hasPDFNameToken(payload, "JS")
}

func estimatePDFObjectCount(payload []byte) int {
	if len(payload) == 0 {
		return 0
	}
	return len(pdfObjectPattern.FindAll(payload, -1))
}

func estimatePDFDecompressedBytes(payload []byte) int64 {
	if len(payload) == 0 {
		return 0
	}
	matches := pdfLengthMarkerPattern.FindAllSubmatch(payload, -1)
	total := int64(0)
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		parsed, err := strconv.ParseInt(strings.TrimSpace(string(match[1])), 10, 64)
		if err != nil || parsed <= 0 {
			continue
		}
		total += parsed
	}
	return total
}

func policyAllowsOriginalFallback(policy PDFPolicy) bool {
	switch policy.CompatibilityMode {
	case PDFCompatibilityModeStrict:
		return false
	default:
		return true
	}
}

func policyAllowsAnalyzeOnlyUpload(policy PDFPolicy) bool {
	return normalizePDFPolicy(policy).PipelineMode == PDFPipelineModeAnalyzeOnly
}

func policyPrefersNormalizedSource(policy PDFPolicy) bool {
	return normalizePDFPolicy(policy).PipelineMode == PDFPipelineModePreferNormalized
}

func (s PDFService) PageGeometry(ctx context.Context, scope stores.Scope, raw []byte, requestedPages int) ([]PDFPageGeometry, error) {
	analysis, err := s.Analyze(ctx, scope, raw)
	if err != nil {
		return nil, err
	}

	payload := append([]byte{}, raw...)
	pageCount := requestedPages
	if pageCount <= 0 || pageCount > analysis.PageCount {
		pageCount = analysis.PageCount
	}
	if pageCount <= 0 {
		return nil, pdfErrorf("page_geometry", PDFReasonInvalidInputRequired, nil)
	}

	policy := s.Policy(ctx, scope)
	opCtx, cancel := context.WithTimeout(ctx, policy.ParseTimeout)
	defer cancel()

	pdfDoc := gofpdf.New("P", "pt", "Letter", "")
	importer := gofpdi.NewImporter()
	geometry := make([]PDFPageGeometry, 0, pageCount)
	for page := 1; page <= pageCount; page++ {
		if mapped := mapContextPDFError("page_geometry", opCtx.Err(), PDFReasonTimeoutParse); mapped != nil {
			return nil, mapped
		}
		_, box, importErr := safeImportPageWithBoxesWithContext(opCtx, importer, pdfDoc, payload, page, "/CropBox", "/MediaBox")
		if importErr != nil {
			if mapped := mapContextPDFError("page_geometry", importErr, PDFReasonTimeoutParse); mapped != nil {
				return nil, mapped
			}
			return nil, &PDFError{
				Op:     "page_geometry",
				Reason: PDFReasonImportFailed,
				Page:   page,
				Box:    strings.TrimSpace(box),
				Cause:  importErr,
			}
		}
		width, height := importedPageSize(importer.GetPageSizes(), page)
		if width <= 0 {
			width = PDFDefaultPageWidthPt
		}
		if height <= 0 {
			height = PDFDefaultPageHeightPt
		}
		geometry = append(geometry, PDFPageGeometry{
			Page:     page,
			Width:    width,
			Height:   height,
			Rotation: 0,
		})
	}
	if mapped := mapContextPDFError("page_geometry", opCtx.Err(), PDFReasonTimeoutParse); mapped != nil {
		return nil, mapped
	}
	return geometry, nil
}

func (s PDFService) RenderSourcePages(
	ctx context.Context,
	scope stores.Scope,
	pdfDoc *gofpdf.Fpdf,
	sourcePDF []byte,
	requestedPages int,
	onPage func(page int, width, height float64) error,
) error {
	if pdfDoc == nil {
		return pdfErrorf("render_source_pages", PDFReasonInvalidInputRequired, nil)
	}
	analysis, err := s.Analyze(ctx, scope, sourcePDF)
	if err != nil {
		return err
	}

	pageCount := requestedPages
	if pageCount <= 0 || pageCount > analysis.PageCount {
		pageCount = analysis.PageCount
	}
	if pageCount <= 0 {
		return pdfErrorf("render_source_pages", PDFReasonInvalidInputRequired, nil)
	}

	policy := s.Policy(ctx, scope)
	opCtx, cancel := context.WithTimeout(ctx, policy.ParseTimeout)
	defer cancel()

	importer := gofpdi.NewImporter()
	for page := 1; page <= pageCount; page++ {
		if mapped := mapContextPDFError("render_source_pages", opCtx.Err(), PDFReasonTimeoutParse); mapped != nil {
			return mapped
		}
		// Import /MediaBox first to avoid zero-sized /CropBox transformations.
		tplID, box, importErr := safeImportPageWithBoxesWithContext(opCtx, importer, pdfDoc, sourcePDF, page, "/MediaBox", "/CropBox")
		if importErr != nil {
			if mapped := mapContextPDFError("render_source_pages", importErr, PDFReasonTimeoutParse); mapped != nil {
				return mapped
			}
			return &PDFError{
				Op:     "render_source_pages",
				Reason: PDFReasonImportFailed,
				Page:   page,
				Box:    strings.TrimSpace(box),
				Cause:  importErr,
			}
		}
		width, height := importedPageSize(importer.GetPageSizes(), page)
		if width <= 0 {
			width = PDFDefaultPageWidthPt
		}
		if height <= 0 {
			height = PDFDefaultPageHeightPt
		}
		orientation := "P"
		if width > height {
			orientation = "L"
		}
		pdfDoc.AddPageFormat(orientation, gofpdf.SizeType{Wd: width, Ht: height})
		if useErr := safeUseImportedTemplateWithContext(opCtx, importer, pdfDoc, tplID, 0, 0, width, height); useErr != nil {
			if mapped := mapContextPDFError("render_source_pages", useErr, PDFReasonTimeoutParse); mapped != nil {
				return mapped
			}
			return &PDFError{
				Op:     "render_source_pages",
				Reason: PDFReasonImportFailed,
				Page:   page,
				Box:    strings.TrimSpace(box),
				Cause:  useErr,
			}
		}
		if onPage != nil {
			if err := onPage(page, width, height); err != nil {
				return err
			}
		}
	}
	if mapped := mapContextPDFError("render_source_pages", opCtx.Err(), PDFReasonTimeoutParse); mapped != nil {
		return mapped
	}
	return nil
}

func importedPageSize(pageSizes map[int]map[string]map[string]float64, page int) (float64, float64) {
	if pageSizes == nil {
		return PDFDefaultPageWidthPt, PDFDefaultPageHeightPt
	}
	boxes, ok := pageSizes[page]
	if !ok {
		return PDFDefaultPageWidthPt, PDFDefaultPageHeightPt
	}
	for _, box := range []string{"/CropBox", "/MediaBox", "/TrimBox", "/BleedBox", "/ArtBox"} {
		if dimensions, found := boxes[box]; found {
			if width := dimensions["w"]; width > 0 {
				if height := dimensions["h"]; height > 0 {
					return width, height
				}
			}
		}
	}
	for _, dimensions := range boxes {
		if width := dimensions["w"]; width > 0 {
			if height := dimensions["h"]; height > 0 {
				return width, height
			}
		}
	}
	return PDFDefaultPageWidthPt, PDFDefaultPageHeightPt
}

type pdfAnalyzeResult struct {
	pageCount int
}

func analyzePDFPageCount(ctx context.Context, payload []byte) (int, error) {
	readerFactory := currentPDFReaderFactory()
	result, err := runPDFOperation(ctx, func() (pdfAnalyzeResult, error) {
		reader, err := readerFactory(bytes.NewReader(payload), int64(len(payload)))
		if err != nil {
			return pdfAnalyzeResult{}, err
		}
		return pdfAnalyzeResult{pageCount: reader.NumPage()}, nil
	})
	if err != nil {
		return 0, err
	}
	return result.pageCount, nil
}

func safeImportPageWithBoxesWithContext(ctx context.Context, importer *gofpdi.Importer, pdfDoc *gofpdf.Fpdf, sourcePDF []byte, page int, boxes ...string) (int, string, error) {
	type importResult struct {
		tplID int
		box   string
	}
	result, err := runPDFOperation(ctx, func() (importResult, error) {
		tplID, box, importErr := safeImportPageWithBoxes(importer, pdfDoc, sourcePDF, page, boxes...)
		if importErr != nil {
			return importResult{}, importErr
		}
		return importResult{tplID: tplID, box: box}, nil
	})
	if err != nil {
		return 0, "", err
	}
	return result.tplID, result.box, nil
}

func safeUseImportedTemplateWithContext(ctx context.Context, importer *gofpdi.Importer, pdfDoc *gofpdf.Fpdf, tplID int, x, y, width, height float64) error {
	_, err := runPDFOperation(ctx, func() (struct{}, error) {
		return struct{}{}, safeUseImportedTemplate(importer, pdfDoc, tplID, x, y, width, height)
	})
	return err
}

func runPDFOperation[T any](ctx context.Context, fn func() (T, error)) (T, error) {
	var zero T
	if fn == nil {
		return zero, fmt.Errorf("pdf operation missing function")
	}
	if err := ctx.Err(); err != nil {
		return zero, err
	}
	type result struct {
		value T
		err   error
	}
	done := make(chan result, 1)
	go func() {
		defer func() {
			if recovered := recover(); recovered != nil {
				done <- result{err: fmt.Errorf("pdf operation panic recovered: %v", recovered)}
			}
		}()
		value, err := fn()
		done <- result{value: value, err: err}
	}()
	select {
	case <-ctx.Done():
		return zero, ctx.Err()
	case out := <-done:
		return out.value, out.err
	}
}

func logResolvedPDFPolicy(ctx context.Context, scope stores.Scope, policy PDFPolicy) {
	fields := PDFPolicyDiagnostics(policy)
	if tenantID := strings.TrimSpace(scope.TenantID); tenantID != "" {
		fields["tenant_id"] = tenantID
	}
	if orgID := strings.TrimSpace(scope.OrgID); orgID != "" {
		fields["org_id"] = orgID
	}
	observability.LogOperation(ctx, slog.LevelDebug, "pdf", "policy_resolved", "success", "", 0, nil, fields)
}

func hasPDFNameToken(payload []byte, token string) bool {
	if len(payload) == 0 {
		return false
	}
	target := strings.ToLower(strings.TrimSpace(token))
	if target == "" {
		return false
	}
	for idx := 0; idx < len(payload); idx++ {
		if payload[idx] != '/' {
			continue
		}
		parsed, next := parsePDFName(payload, idx+1)
		idx = next - 1
		if strings.EqualFold(parsed, target) {
			return true
		}
	}
	return false
}

func parsePDFName(payload []byte, start int) (string, int) {
	if start < 0 || start >= len(payload) {
		return "", start
	}
	builder := strings.Builder{}
	index := start
	for index < len(payload) {
		ch := payload[index]
		if isPDFNameTerminator(ch) {
			break
		}
		if ch == '#' && index+2 < len(payload) && isHexDigit(payload[index+1]) && isHexDigit(payload[index+2]) {
			hexPair := string([]byte{payload[index+1], payload[index+2]})
			decoded, err := strconv.ParseUint(hexPair, 16, 8)
			if err == nil {
				builder.WriteByte(byte(decoded))
				index += 3
				continue
			}
		}
		builder.WriteByte(ch)
		index++
	}
	return builder.String(), index
}

func isPDFNameTerminator(ch byte) bool {
	switch ch {
	case 0x00, 0x09, 0x0A, 0x0C, 0x0D, 0x20, '(', ')', '<', '>', '[', ']', '{', '}', '/', '%':
		return true
	default:
		return false
	}
}

func isHexDigit(ch byte) bool {
	return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')
}

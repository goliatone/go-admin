package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadAppliesAPPPrefixOverrides(t *testing.T) {
	t.Setenv("APP_ADMIN__TITLE", "E-Sign Test")
	t.Setenv("APP_FEATURES__ESIGN_GOOGLE", "true")
	t.Setenv("APP_RUNTIME__PROFILE", "staging")
	t.Setenv("APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__MAX_REQUESTS", "240")
	t.Setenv("APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__WINDOW_SECONDS", "30")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "E-Sign Test" {
		t.Fatalf("expected APP_ADMIN__TITLE override, got %q", cfg.Admin.Title)
	}
	if !cfg.Features.ESignGoogle {
		t.Fatalf("expected APP_FEATURES__ESIGN_GOOGLE override=true")
	}
	if cfg.Runtime.Profile != "staging" {
		t.Fatalf("expected APP_RUNTIME__PROFILE override, got %q", cfg.Runtime.Profile)
	}
	if cfg.Network.RateLimit.SignerWrite.MaxRequests != 240 {
		t.Fatalf("expected APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__MAX_REQUESTS override, got %d", cfg.Network.RateLimit.SignerWrite.MaxRequests)
	}
	if cfg.Network.RateLimit.SignerWrite.WindowSeconds != 30 {
		t.Fatalf("expected APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__WINDOW_SECONDS override, got %d", cfg.Network.RateLimit.SignerWrite.WindowSeconds)
	}
}

func TestLoadIgnoresLegacyEnvAliases(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "development")
	t.Setenv("APP_SERVER__ADDRESS", ":9090")
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("PORT", "9090")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.Profile != "development" {
		t.Fatalf("expected APP_RUNTIME__PROFILE value, got %q", cfg.Runtime.Profile)
	}
	if cfg.Server.Address != ":9090" {
		t.Fatalf("expected APP_SERVER__ADDRESS override -> :9090, got %q", cfg.Server.Address)
	}
}

func TestDefaultsIncludeLoopbackTrustedProxyCIDRs(t *testing.T) {
	cfg := Defaults()
	if len(cfg.Network.TrustedProxyCIDRs) != 2 {
		t.Fatalf("expected 2 default trusted proxy cidrs, got %d", len(cfg.Network.TrustedProxyCIDRs))
	}
}

func TestValidateRejectsInvalidTrustedProxyCIDR(t *testing.T) {
	cfg := Defaults()
	cfg.Network.TrustedProxyCIDRs = []string{"invalid-cidr"}
	if err := cfg.Validate(); err == nil {
		t.Fatalf("expected validate error for invalid trusted proxy cidr")
	}
}

func TestLoadDefaultsRepositoryDialectToSQLiteForDevelopment(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "runtime": {
    "profile": "development",
    "repository_dialect": ""
  },
  "persistence": {
    "sqlite": {
      "dsn": ""
    },
    "postgres": {
      "dsn": ""
    }
  }
}`)

	cfg, err := Load(basePath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.RepositoryDialect != RepositoryDialectSQLite {
		t.Fatalf("expected %q repository dialect for development, got %q", RepositoryDialectSQLite, cfg.Runtime.RepositoryDialect)
	}
	if strings.TrimSpace(cfg.Persistence.SQLite.DSN) == "" {
		t.Fatalf("expected persistence.sqlite.dsn to be resolved for development")
	}
}

func TestLoadDefaultsRepositoryDialectToPostgresForProduction(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "runtime": {
    "profile": "production",
    "repository_dialect": ""
  },
  "persistence": {
    "postgres": {
      "dsn": "postgres://user:pass@localhost:5432/esign?sslmode=disable"
    }
  }
}`)

	cfg, err := Load(basePath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.RepositoryDialect != RepositoryDialectPostgres {
		t.Fatalf("expected %q repository dialect for production, got %q", RepositoryDialectPostgres, cfg.Runtime.RepositoryDialect)
	}
}

func TestLoadIgnoresLegacyTopLevelPostgresDSNForPostgresDialect(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "runtime": {
    "profile": "production",
    "repository_dialect": "postgres"
  },
  "persistence": {
    "postgres": {
      "dsn": ""
    }
  }
}`)
	t.Setenv("APP_POSTGRES__DSN", "postgres://legacy:legacy@localhost:5432/esign?sslmode=disable")

	_, err := Load(basePath)
	if err == nil {
		t.Fatalf("expected load error when persistence.postgres.dsn is unset even when legacy top-level key is provided")
	}
	if !strings.Contains(err.Error(), "persistence.postgres.dsn is required") {
		t.Fatalf("expected persistence.postgres.dsn required validation error, got %v", err)
	}
}

func TestLoadIgnoresLegacyTopLevelSQLiteDSNForSQLiteDialect(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "development")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "sqlite")
	t.Setenv("APP_PERSISTENCE__SQLITE__DSN", "file:/tmp/esign-primary.sqlite?_busy_timeout=5000&_foreign_keys=on")
	t.Setenv("APP_SQLITE__DSN", "file:/tmp/esign-legacy.sqlite?_busy_timeout=5000&_foreign_keys=on")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if got := strings.TrimSpace(cfg.Persistence.SQLite.DSN); !strings.Contains(got, "esign-primary.sqlite") {
		t.Fatalf("expected persistence.sqlite.dsn to ignore legacy top-level sqlite.dsn, got %q", got)
	}
}

func TestLoadRejectsUnsupportedRepositoryDialect(t *testing.T) {
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "mongo")
	_, err := Load()
	if err == nil {
		t.Fatalf("expected load error for unsupported repository dialect")
	}
	if !strings.Contains(err.Error(), "runtime.repository_dialect") {
		t.Fatalf("expected repository_dialect validation error, got %v", err)
	}
}

func TestLoadRequiresPostgresDSNWhenPostgresDialectSelected(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "runtime": {
    "profile": "production",
    "repository_dialect": "postgres"
  },
  "persistence": {
    "postgres": {
      "dsn": ""
    }
  }
}`)

	_, err := Load(basePath)
	if err == nil {
		t.Fatalf("expected load error when postgres dialect selected without dsn")
	}
	if !strings.Contains(err.Error(), "persistence.postgres.dsn is required") {
		t.Fatalf("expected persistence.postgres.dsn required validation error, got %v", err)
	}
}

func TestLoadDefaultsUseStableSQLiteDSNForDevelopment(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "runtime": {
    "profile": "development",
    "repository_dialect": ""
  },
  "persistence": {
    "sqlite": {
      "dsn": ""
    }
  }
}`)

	cfg, err := Load(basePath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.RepositoryDialect != RepositoryDialectSQLite {
		t.Fatalf("expected %q repository dialect for development, got %q", RepositoryDialectSQLite, cfg.Runtime.RepositoryDialect)
	}
	if strings.TrimSpace(cfg.Persistence.SQLite.DSN) == "" || !strings.Contains(cfg.Persistence.SQLite.DSN, "go-admin-esign.sqlite") {
		t.Fatalf("expected stable persistence.sqlite.dsn containing go-admin-esign.sqlite, got %q", cfg.Persistence.SQLite.DSN)
	}
}

func TestLoadSupportsMigrationsConfigOverrides(t *testing.T) {
	t.Setenv("APP_PERSISTENCE__MIGRATIONS__LOCAL_DIR", "tmp/migrations")
	t.Setenv("APP_PERSISTENCE__MIGRATIONS__LOCAL_ONLY", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Persistence.Migrations.LocalDir != "tmp/migrations" {
		t.Fatalf("expected persistence.migrations.local_dir override, got %q", cfg.Persistence.Migrations.LocalDir)
	}
	if !cfg.Persistence.Migrations.LocalOnly {
		t.Fatalf("expected persistence.migrations.local_only override=true")
	}
}

func TestLoadSupportsSignerPDFOverrides(t *testing.T) {
	t.Setenv("APP_SIGNER__PDF__MAX_SOURCE_BYTES", "2097152")
	t.Setenv("APP_SIGNER__PDF__MAX_PAGES", "25")
	t.Setenv("APP_SIGNER__PDF__PARSE_TIMEOUT_MS", "1800")
	t.Setenv("APP_SIGNER__PDF__COMPATIBILITY_MODE", "strict")
	t.Setenv("APP_SIGNER__PDF__PIPELINE_MODE", "analyze_only")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Signer.PDF.MaxSourceBytes != 2097152 {
		t.Fatalf("expected signer.pdf.max_source_bytes override, got %d", cfg.Signer.PDF.MaxSourceBytes)
	}
	if cfg.Signer.PDF.MaxPages != 25 {
		t.Fatalf("expected signer.pdf.max_pages override, got %d", cfg.Signer.PDF.MaxPages)
	}
	if cfg.Signer.PDF.ParseTimeoutMS != 1800 {
		t.Fatalf("expected signer.pdf.parse_timeout_ms override, got %d", cfg.Signer.PDF.ParseTimeoutMS)
	}
	if cfg.Signer.PDF.CompatibilityMode != "strict" {
		t.Fatalf("expected signer.pdf.compatibility_mode override strict, got %q", cfg.Signer.PDF.CompatibilityMode)
	}
	if cfg.Signer.PDF.PipelineMode != "analyze_only" {
		t.Fatalf("expected signer.pdf.pipeline_mode override analyze_only, got %q", cfg.Signer.PDF.PipelineMode)
	}
}

func TestLoadSanitizesInvalidSignerPDFValues(t *testing.T) {
	t.Setenv("APP_SIGNER__PDF__MAX_SOURCE_BYTES", "-1")
	t.Setenv("APP_SIGNER__PDF__MAX_PAGES", "0")
	t.Setenv("APP_SIGNER__PDF__PARSE_TIMEOUT_MS", "-2")
	t.Setenv("APP_SIGNER__PDF__NORMALIZATION_TIMEOUT_MS", "0")
	t.Setenv("APP_SIGNER__PDF__COMPATIBILITY_MODE", "unknown")
	t.Setenv("APP_SIGNER__PDF__PIPELINE_MODE", "invalid")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	defaults := Defaults().Signer.PDF
	if cfg.Signer.PDF.MaxSourceBytes != defaults.MaxSourceBytes {
		t.Fatalf("expected signer.pdf.max_source_bytes fallback %d, got %d", defaults.MaxSourceBytes, cfg.Signer.PDF.MaxSourceBytes)
	}
	if cfg.Signer.PDF.MaxPages != defaults.MaxPages {
		t.Fatalf("expected signer.pdf.max_pages fallback %d, got %d", defaults.MaxPages, cfg.Signer.PDF.MaxPages)
	}
	if cfg.Signer.PDF.ParseTimeoutMS != defaults.ParseTimeoutMS {
		t.Fatalf("expected signer.pdf.parse_timeout_ms fallback %d, got %d", defaults.ParseTimeoutMS, cfg.Signer.PDF.ParseTimeoutMS)
	}
	if cfg.Signer.PDF.NormalizationTimeoutMS != defaults.NormalizationTimeoutMS {
		t.Fatalf("expected signer.pdf.normalization_timeout_ms fallback %d, got %d", defaults.NormalizationTimeoutMS, cfg.Signer.PDF.NormalizationTimeoutMS)
	}
	if cfg.Signer.PDF.CompatibilityMode != defaults.CompatibilityMode {
		t.Fatalf("expected signer.pdf.compatibility_mode fallback %q, got %q", defaults.CompatibilityMode, cfg.Signer.PDF.CompatibilityMode)
	}
	if cfg.Signer.PDF.PipelineMode != defaults.PipelineMode {
		t.Fatalf("expected signer.pdf.pipeline_mode fallback %q, got %q", defaults.PipelineMode, cfg.Signer.PDF.PipelineMode)
	}
}

func TestLoadSupportsSignerPDFRemediationOverrides(t *testing.T) {
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__ENABLED", "true")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__EXECUTION_MODE", "queued")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__LEASE_TTL_MS", "45000")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__BIN", "gs")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__TIMEOUT_MS", "18000")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__MAX_PDF_BYTES", "20971520")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__MAX_LOG_BYTES", "1024")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.Signer.PDF.Remediation.Enabled {
		t.Fatalf("expected remediation.enabled true")
	}
	if cfg.Signer.PDF.Remediation.ExecutionMode != "queued" {
		t.Fatalf("expected remediation.execution_mode queued, got %q", cfg.Signer.PDF.Remediation.ExecutionMode)
	}
	if cfg.Signer.PDF.Remediation.LeaseTTLMS != 45000 {
		t.Fatalf("expected remediation.lease_ttl_ms 45000, got %d", cfg.Signer.PDF.Remediation.LeaseTTLMS)
	}
	if cfg.Signer.PDF.Remediation.Command.TimeoutMS != 18000 {
		t.Fatalf("expected remediation.command.timeout_ms 18000, got %d", cfg.Signer.PDF.Remediation.Command.TimeoutMS)
	}
	if cfg.Signer.PDF.Remediation.Command.MaxPdfBytes != 20971520 {
		t.Fatalf("expected remediation.command.max_pdf_bytes 20971520, got %d", cfg.Signer.PDF.Remediation.Command.MaxPdfBytes)
	}
	if cfg.Signer.PDF.Remediation.Command.MaxLogBytes != 1024 {
		t.Fatalf("expected remediation.command.max_log_bytes 1024, got %d", cfg.Signer.PDF.Remediation.Command.MaxLogBytes)
	}
}

func TestLoadBundledConfigEnablesPDFRemediationForPreviewFallback(t *testing.T) {
	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.Signer.PDF.Remediation.Enabled {
		t.Fatalf("expected bundled config to enable remediation")
	}
	if cfg.Signer.PDF.Remediation.ExecutionMode != "inline" {
		t.Fatalf("expected bundled remediation.execution_mode inline, got %q", cfg.Signer.PDF.Remediation.ExecutionMode)
	}
	found := false
	for _, candidate := range cfg.Signer.PDF.Remediation.CandidateReasons {
		if strings.TrimSpace(candidate) == "preview_fallback.disabled" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected bundled config to include preview_fallback.disabled candidate reason, got %#v", cfg.Signer.PDF.Remediation.CandidateReasons)
	}
}

func TestLoadSanitizesInvalidSignerPDFRemediationValues(t *testing.T) {
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__EXECUTION_MODE", "invalid")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__LEASE_TTL_MS", "0")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__BIN", "")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__TIMEOUT_MS", "0")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__MAX_PDF_BYTES", "-1")
	t.Setenv("APP_SIGNER__PDF__REMEDIATION__COMMAND__MAX_LOG_BYTES", "0")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	defaults := Defaults().Signer.PDF.Remediation
	if cfg.Signer.PDF.Remediation.ExecutionMode != defaults.ExecutionMode {
		t.Fatalf("expected remediation.execution_mode fallback %q, got %q", defaults.ExecutionMode, cfg.Signer.PDF.Remediation.ExecutionMode)
	}
	if cfg.Signer.PDF.Remediation.LeaseTTLMS != defaults.LeaseTTLMS {
		t.Fatalf("expected remediation.lease_ttl_ms fallback %d, got %d", defaults.LeaseTTLMS, cfg.Signer.PDF.Remediation.LeaseTTLMS)
	}
	if cfg.Signer.PDF.Remediation.Command.Bin != defaults.Command.Bin {
		t.Fatalf("expected remediation.command.bin fallback %q, got %q", defaults.Command.Bin, cfg.Signer.PDF.Remediation.Command.Bin)
	}
	if cfg.Signer.PDF.Remediation.Command.TimeoutMS != defaults.Command.TimeoutMS {
		t.Fatalf("expected remediation.command.timeout_ms fallback %d, got %d", defaults.Command.TimeoutMS, cfg.Signer.PDF.Remediation.Command.TimeoutMS)
	}
	if cfg.Signer.PDF.Remediation.Command.MaxPdfBytes != defaults.Command.MaxPdfBytes {
		t.Fatalf("expected remediation.command.max_pdf_bytes fallback %d, got %d", defaults.Command.MaxPdfBytes, cfg.Signer.PDF.Remediation.Command.MaxPdfBytes)
	}
	if cfg.Signer.PDF.Remediation.Command.MaxLogBytes != defaults.Command.MaxLogBytes {
		t.Fatalf("expected remediation.command.max_log_bytes fallback %d, got %d", defaults.Command.MaxLogBytes, cfg.Signer.PDF.Remediation.Command.MaxLogBytes)
	}
}

func TestLoadSupportsReminderOverrides(t *testing.T) {
	t.Setenv("APP_REMINDERS__ENABLED", "true")
	t.Setenv("APP_SERVICES__ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")
	t.Setenv("APP_REMINDERS__SWEEP_CRON", "0 */1 * * *")
	t.Setenv("APP_REMINDERS__BATCH_SIZE", "50")
	t.Setenv("APP_REMINDERS__CLAIM_LEASE_SECONDS", "180")
	t.Setenv("APP_REMINDERS__INITIAL_DELAY_MINUTES", "30")
	t.Setenv("APP_REMINDERS__INTERVAL_MINUTES", "60")
	t.Setenv("APP_REMINDERS__MAX_REMINDERS", "4")
	t.Setenv("APP_REMINDERS__JITTER_PERCENT", "20")
	t.Setenv("APP_REMINDERS__RECENT_VIEW_GRACE_MINUTES", "45")
	t.Setenv("APP_REMINDERS__MANUAL_RESEND_COOLDOWN_MINUTES", "90")
	t.Setenv("APP_REMINDERS__ROTATE_TOKEN", "false")
	t.Setenv("APP_REMINDERS__ALLOW_OUT_OF_ORDER", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.Reminders.Enabled {
		t.Fatalf("expected reminders.enabled override=true")
	}
	if cfg.Reminders.SweepCron != "0 */1 * * *" {
		t.Fatalf("expected reminders.sweep_cron override, got %q", cfg.Reminders.SweepCron)
	}
	if cfg.Reminders.BatchSize != 50 {
		t.Fatalf("expected reminders.batch_size override, got %d", cfg.Reminders.BatchSize)
	}
	if cfg.Reminders.ClaimLeaseSeconds != 180 {
		t.Fatalf("expected reminders.claim_lease_seconds override, got %d", cfg.Reminders.ClaimLeaseSeconds)
	}
	if cfg.Reminders.InitialDelayMinutes != 30 {
		t.Fatalf("expected reminders.initial_delay_minutes override, got %d", cfg.Reminders.InitialDelayMinutes)
	}
	if cfg.Reminders.IntervalMinutes != 60 {
		t.Fatalf("expected reminders.interval_minutes override, got %d", cfg.Reminders.IntervalMinutes)
	}
	if cfg.Reminders.MaxReminders != 4 {
		t.Fatalf("expected reminders.max_reminders override, got %d", cfg.Reminders.MaxReminders)
	}
	if cfg.Reminders.JitterPercent != 20 {
		t.Fatalf("expected reminders.jitter_percent override, got %d", cfg.Reminders.JitterPercent)
	}
	if cfg.Reminders.RecentViewGraceMinutes != 45 {
		t.Fatalf("expected reminders.recent_view_grace_minutes override, got %d", cfg.Reminders.RecentViewGraceMinutes)
	}
	if cfg.Reminders.ManualResendCooldownMinutes != 90 {
		t.Fatalf("expected reminders.manual_resend_cooldown_minutes override, got %d", cfg.Reminders.ManualResendCooldownMinutes)
	}
	if cfg.Reminders.RotateToken {
		t.Fatalf("expected reminders.rotate_token override=false")
	}
	if !cfg.Reminders.AllowOutOfOrder {
		t.Fatalf("expected reminders.allow_out_of_order override=true")
	}
}

func TestValidateReminderEnabledRequiresEncryptionKey(t *testing.T) {
	cfg := Defaults()
	cfg.Reminders.Enabled = true
	cfg.Services.EncryptionKey = ""

	err := cfg.Validate()
	if err == nil {
		t.Fatalf("expected validate error when reminders.enabled=true and services.encryption_key is empty")
	}
	if !strings.Contains(err.Error(), "services.encryption_key is required") {
		t.Fatalf("expected missing encryption_key validation error, got %v", err)
	}
}

func TestValidateReminderEnabledRejectsInsecureLegacyEncryptionKey(t *testing.T) {
	cfg := Defaults()
	cfg.Reminders.Enabled = true
	cfg.Services.EncryptionKey = InsecureReminderInternalErrorEncryptionKey

	err := cfg.Validate()
	if err == nil {
		t.Fatalf("expected validate error when reminders.enabled=true and legacy encryption key is used")
	}
	if !strings.Contains(err.Error(), "legacy insecure default") {
		t.Fatalf("expected insecure default validation error, got %v", err)
	}
}

func TestValidateReminderEnabledRejectsShortEncryptionKey(t *testing.T) {
	cfg := Defaults()
	cfg.Reminders.Enabled = true
	cfg.Services.EncryptionKey = "too-short-key"

	err := cfg.Validate()
	if err == nil {
		t.Fatalf("expected validate error when reminders.enabled=true and encryption key is too short")
	}
	if !strings.Contains(err.Error(), "at least") {
		t.Fatalf("expected minimum length validation error, got %v", err)
	}
}

func TestValidateReminderEnabledAllowsStrongEncryptionKey(t *testing.T) {
	cfg := Defaults()
	cfg.Reminders.Enabled = true
	cfg.Services.EncryptionKey = "0123456789abcdef0123456789abcdef"

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected strong encryption key to pass validation, got %v", err)
	}
}

func TestLoadReminderZeroValuesFallbackToDefaults(t *testing.T) {
	t.Setenv("APP_REMINDERS__INITIAL_DELAY_MINUTES", "0")
	t.Setenv("APP_REMINDERS__INTERVAL_MINUTES", "0")
	t.Setenv("APP_REMINDERS__MAX_REMINDERS", "0")
	t.Setenv("APP_REMINDERS__JITTER_PERCENT", "0")
	t.Setenv("APP_REMINDERS__RECENT_VIEW_GRACE_MINUTES", "0")
	t.Setenv("APP_REMINDERS__MANUAL_RESEND_COOLDOWN_MINUTES", "0")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	defaults := Defaults().Reminders
	if cfg.Reminders.InitialDelayMinutes != defaults.InitialDelayMinutes {
		t.Fatalf("expected reminders.initial_delay_minutes fallback %d, got %d", defaults.InitialDelayMinutes, cfg.Reminders.InitialDelayMinutes)
	}
	if cfg.Reminders.IntervalMinutes != defaults.IntervalMinutes {
		t.Fatalf("expected reminders.interval_minutes fallback %d, got %d", defaults.IntervalMinutes, cfg.Reminders.IntervalMinutes)
	}
	if cfg.Reminders.MaxReminders != defaults.MaxReminders {
		t.Fatalf("expected reminders.max_reminders fallback %d, got %d", defaults.MaxReminders, cfg.Reminders.MaxReminders)
	}
	if cfg.Reminders.JitterPercent != defaults.JitterPercent {
		t.Fatalf("expected reminders.jitter_percent fallback %d, got %d", defaults.JitterPercent, cfg.Reminders.JitterPercent)
	}
	if cfg.Reminders.RecentViewGraceMinutes != defaults.RecentViewGraceMinutes {
		t.Fatalf("expected reminders.recent_view_grace_minutes fallback %d, got %d", defaults.RecentViewGraceMinutes, cfg.Reminders.RecentViewGraceMinutes)
	}
	if cfg.Reminders.ManualResendCooldownMinutes != defaults.ManualResendCooldownMinutes {
		t.Fatalf("expected reminders.manual_resend_cooldown_minutes fallback %d, got %d", defaults.ManualResendCooldownMinutes, cfg.Reminders.ManualResendCooldownMinutes)
	}
}

func TestResolveReminderPolicyCompatibilityMatrix(t *testing.T) {
	resolution, err := ResolveReminderPolicy(ReminderConfig{
		Enabled:                     true,
		SweepCron:                   "",
		BatchSize:                   25,
		ClaimLeaseSeconds:           180,
		InitialDelayMinutes:         0,
		IntervalMinutes:             60,
		MaxReminders:                0,
		JitterPercent:               0,
		RecentViewGraceMinutes:      30,
		ManualResendCooldownMinutes: 0,
		RotateToken:                 true,
		AllowOutOfOrder:             false,
	})
	if err != nil {
		t.Fatalf("ResolveReminderPolicy: %v", err)
	}
	if resolution.PolicyVersion != ReminderPolicyVersion {
		t.Fatalf("expected policy version %q, got %q", ReminderPolicyVersion, resolution.PolicyVersion)
	}
	matrix := resolution.CompatibilityMatrix()
	if len(matrix[ReminderCompatibilityRejected]) != 0 {
		t.Fatalf("expected no rejected fields, got %+v", matrix[ReminderCompatibilityRejected])
	}
	if !containsString(matrix[ReminderCompatibilityAllowed], "batch_size") {
		t.Fatalf("expected batch_size to be allowed, got %+v", matrix[ReminderCompatibilityAllowed])
	}
	if !containsString(matrix[ReminderCompatibilityDefaulted], "initial_delay_minutes") {
		t.Fatalf("expected initial_delay_minutes to be defaulted, got %+v", matrix[ReminderCompatibilityDefaulted])
	}
	if !containsString(matrix[ReminderCompatibilityDefaulted], "max_reminders") {
		t.Fatalf("expected max_reminders to be defaulted, got %+v", matrix[ReminderCompatibilityDefaulted])
	}
}

func TestResolveReminderPolicyRejectsInvalidValues(t *testing.T) {
	_, err := ResolveReminderPolicy(ReminderConfig{
		SweepCron:                   "*/15 * * * *",
		BatchSize:                   100,
		ClaimLeaseSeconds:           120,
		InitialDelayMinutes:         30,
		IntervalMinutes:             60,
		MaxReminders:                5,
		JitterPercent:               95,
		RecentViewGraceMinutes:      120,
		ManualResendCooldownMinutes: 240,
	})
	if err == nil {
		t.Fatalf("expected invalid jitter percent to be rejected")
	}
	if !strings.Contains(err.Error(), "jitter_percent") {
		t.Fatalf("expected jitter_percent in error message, got %v", err)
	}
}

func TestLoadPrecedenceDefaultsThenConfigThenOverridesThenEnv(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "admin": {
    "title": "From App Config",
    "api_prefix": "base-api"
  },
  "reminders": {
    "batch_size": 41
  }
}`)
	overlayPath := writeTempFile(t, "overrides.yml", `
admin:
  title: "From Overrides"
reminders:
  batch_size: 83
`)
	t.Setenv("APP_ADMIN__TITLE", "From Env")
	t.Setenv("APP_REMINDERS__BATCH_SIZE", "127")

	cfg, err := Load(basePath, overlayPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From Env" {
		t.Fatalf("expected env precedence for admin.title, got %q", cfg.Admin.Title)
	}
	if cfg.Reminders.BatchSize != 127 {
		t.Fatalf("expected env precedence for reminders.batch_size, got %d", cfg.Reminders.BatchSize)
	}
	if cfg.Admin.APIPrefix != "base-api" {
		t.Fatalf("expected app.json value to remain for admin.api_prefix, got %q", cfg.Admin.APIPrefix)
	}
}

func TestLoadWithMissingOptionalOverlayIsNonFatal(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "admin": {
    "title": "Overlay Optional"
  }
}`)
	missingOverlay := filepath.Join(t.TempDir(), "missing-overrides.yml")

	cfg, err := Load(basePath, missingOverlay)
	if err != nil {
		t.Fatalf("load config with missing optional overlay should succeed: %v", err)
	}
	if cfg.Admin.Title != "Overlay Optional" {
		t.Fatalf("expected admin.title from base config, got %q", cfg.Admin.Title)
	}
}

func TestLoadUsesAPPConfigSelectorsWhenNoPathsProvided(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "admin": {
    "title": "From APP_CONFIG"
  }
}`)
	overlayPath := writeTempFile(t, "overrides.yml", `
admin:
  title: "From APP_CONFIG_OVERRIDES"
`)
	t.Setenv("APP_CONFIG", basePath)
	t.Setenv("APP_CONFIG_OVERRIDES", overlayPath)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From APP_CONFIG_OVERRIDES" {
		t.Fatalf("expected APP_CONFIG_OVERRIDES to override APP_CONFIG, got %q", cfg.Admin.Title)
	}
}

func TestLoadExplicitPathsTakePrecedenceOverAPPConfigSelectors(t *testing.T) {
	envBase := writeTempFile(t, "env-app.json", `{
  "admin": {
    "title": "From Env Base"
  }
}`)
	envOverlay := writeTempFile(t, "env-overrides.yml", `
admin:
  title: "From Env Overlay"
`)
	explicitBase := writeTempFile(t, "explicit-app.json", `{
  "admin": {
    "title": "From Explicit Base"
  }
}`)
	explicitOverlay := writeTempFile(t, "explicit-overrides.yml", `
admin:
  title: "From Explicit Overlay"
`)
	t.Setenv("APP_CONFIG", envBase)
	t.Setenv("APP_CONFIG_OVERRIDES", envOverlay)

	cfg, err := Load(explicitBase, explicitOverlay)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From Explicit Overlay" {
		t.Fatalf("expected explicit paths to be used over APP_CONFIG selectors, got %q", cfg.Admin.Title)
	}
}

func writeTempFile(t *testing.T, name string, contents string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("write temp file %s: %v", name, err)
	}
	return path
}

func containsString(items []string, expected string) bool {
	for _, item := range items {
		if strings.TrimSpace(item) == strings.TrimSpace(expected) {
			return true
		}
	}
	return false
}

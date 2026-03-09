package config

import (
	"context"
	"strings"
	"testing"
)

func TestLoadAppliesAPPPrefixOverrides(t *testing.T) {
	t.Setenv("APP_ADMIN__TITLE", "E-Sign Test")
	t.Setenv("APP_FEATURES__ESIGN_GOOGLE", "true")
	t.Setenv("APP_RUNTIME__PROFILE", "staging")
	t.Setenv("APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__MAX_REQUESTS", "240")
	t.Setenv("APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__WINDOW_SECONDS", "30")

	cfg, _, err := Load(context.Background())
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

	cfg, _, err := Load(context.Background())
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
	if cfg == nil {
		t.Fatal("expected defaults config")
	}
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
	t.Setenv("APP_RUNTIME__PROFILE", "development")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.RepositoryDialect != RepositoryDialectSQLite {
		t.Fatalf("expected %q repository dialect for development, got %q", RepositoryDialectSQLite, cfg.Runtime.RepositoryDialect)
	}
	if strings.TrimSpace(cfg.SQLite.DSN) == "" {
		t.Fatalf("expected sqlite.dsn to be resolved for development")
	}
}

func TestLoadDefaultsRepositoryDialectToPostgresForProduction(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "production")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "")
	t.Setenv("APP_POSTGRES__DSN", "postgres://user:pass@localhost:5432/esign?sslmode=disable")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.RepositoryDialect != RepositoryDialectPostgres {
		t.Fatalf("expected %q repository dialect for production, got %q", RepositoryDialectPostgres, cfg.Runtime.RepositoryDialect)
	}
}

func TestLoadIgnoresLegacyDatabaseDSNForPostgresDialect(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "production")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "postgres")
	t.Setenv("APP_POSTGRES__DSN", "")
	t.Setenv("APP_DATABASES__ESIGN_DSN", "postgres://legacy:legacy@localhost:5432/esign?sslmode=disable")

	_, _, err := Load(context.Background())
	if err == nil {
		t.Fatalf("expected load error when postgres.dsn is unset even when legacy alias is provided")
	}
	if !strings.Contains(err.Error(), "postgres.dsn is required") {
		t.Fatalf("expected postgres.dsn required validation error, got %v", err)
	}
}

func TestLoadIgnoresLegacyDatabaseDSNForSQLiteDialect(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "development")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "sqlite")
	t.Setenv("APP_SQLITE__DSN", "file:/tmp/esign-primary.sqlite?_busy_timeout=5000&_foreign_keys=on")
	t.Setenv("APP_DATABASES__ESIGN_DSN", "file:/tmp/esign-legacy.sqlite?_busy_timeout=5000&_foreign_keys=on")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if got := strings.TrimSpace(cfg.SQLite.DSN); !strings.Contains(got, "esign-primary.sqlite") {
		t.Fatalf("expected sqlite.dsn to ignore databases.esign_dsn, got %q", got)
	}
}

func TestLoadRejectsUnsupportedRepositoryDialect(t *testing.T) {
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "mongo")
	_, _, err := Load(context.Background())
	if err == nil {
		t.Fatalf("expected load error for unsupported repository dialect")
	}
	if !strings.Contains(err.Error(), "runtime.repository_dialect") {
		t.Fatalf("expected repository_dialect validation error, got %v", err)
	}
}

func TestLoadRequiresPostgresDSNWhenPostgresDialectSelected(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "production")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "postgres")
	t.Setenv("APP_POSTGRES__DSN", "")

	_, _, err := Load(context.Background())
	if err == nil {
		t.Fatalf("expected load error when postgres dialect selected without dsn")
	}
	if !strings.Contains(err.Error(), "postgres.dsn is required") {
		t.Fatalf("expected postgres.dsn required validation error, got %v", err)
	}
}

func TestLoadDefaultsUseStableSQLiteDSNForDevelopment(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "development")
	t.Setenv("APP_RUNTIME__REPOSITORY_DIALECT", "")
	t.Setenv("APP_SQLITE__DSN", "")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.RepositoryDialect != RepositoryDialectSQLite {
		t.Fatalf("expected %q repository dialect for development, got %q", RepositoryDialectSQLite, cfg.Runtime.RepositoryDialect)
	}
	if strings.TrimSpace(cfg.SQLite.DSN) == "" || !strings.Contains(cfg.SQLite.DSN, "go-admin-esign.sqlite") {
		t.Fatalf("expected stable sqlite dsn containing go-admin-esign.sqlite, got %q", cfg.SQLite.DSN)
	}
}

func TestLoadSupportsMigrationsConfigOverrides(t *testing.T) {
	t.Setenv("APP_MIGRATIONS__LOCAL_DIR", "tmp/migrations")
	t.Setenv("APP_MIGRATIONS__LOCAL_ONLY", "true")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Migrations.LocalDir != "tmp/migrations" {
		t.Fatalf("expected migrations.local_dir override, got %q", cfg.Migrations.LocalDir)
	}
	if !cfg.Migrations.LocalOnly {
		t.Fatalf("expected migrations.local_only override=true")
	}
}

func TestLoadSupportsSignerPDFOverrides(t *testing.T) {
	t.Setenv("APP_SIGNER__PDF__MAX_SOURCE_BYTES", "2097152")
	t.Setenv("APP_SIGNER__PDF__MAX_PAGES", "25")
	t.Setenv("APP_SIGNER__PDF__PARSE_TIMEOUT_MS", "1800")
	t.Setenv("APP_SIGNER__PDF__COMPATIBILITY_MODE", "strict")
	t.Setenv("APP_SIGNER__PDF__PIPELINE_MODE", "analyze_only")

	cfg, _, err := Load(context.Background())
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

	cfg, _, err := Load(context.Background())
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

func TestLoadSupportsReminderOverrides(t *testing.T) {
	t.Setenv("APP_REMINDERS__ENABLED", "true")
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

	cfg, _, err := Load(context.Background())
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

func TestLoadReminderZeroValuesFallbackToDefaults(t *testing.T) {
	t.Setenv("APP_REMINDERS__INITIAL_DELAY_MINUTES", "0")
	t.Setenv("APP_REMINDERS__INTERVAL_MINUTES", "0")
	t.Setenv("APP_REMINDERS__MAX_REMINDERS", "0")
	t.Setenv("APP_REMINDERS__JITTER_PERCENT", "0")
	t.Setenv("APP_REMINDERS__RECENT_VIEW_GRACE_MINUTES", "0")
	t.Setenv("APP_REMINDERS__MANUAL_RESEND_COOLDOWN_MINUTES", "0")

	cfg, _, err := Load(context.Background())
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

func containsString(items []string, expected string) bool {
	for _, item := range items {
		if strings.TrimSpace(item) == strings.TrimSpace(expected) {
			return true
		}
	}
	return false
}

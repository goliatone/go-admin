package config

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	goconfig "github.com/goliatone/go-config/config"
	"github.com/goliatone/go-uploader"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"

	RepositoryDialectSQLite   = "sqlite"
	RepositoryDialectPostgres = "postgres"

	defaultMigrationsLocalDir = "data/sql/migrations"
	defaultSQLiteDSN          = "file:data/go-admin-esign.sqlite?_busy_timeout=5000&_foreign_keys=on"

	defaultPDFRemediationLeaseTTL           = 60 * time.Second
	defaultPDFRemediationCommandTimeout     = 15 * time.Second
	defaultPDFRemediationCommandMaxPDFBytes = int64(100 * 1024 * 1024)
	defaultPDFRemediationCommandMaxLogBytes = 256 * 1024
)

// Backward-compatible config aliases. Keep these in the tracked source so
// package builds do not depend on generated or auxiliary alias files.
type AppConfig = App
type ServerConfig = Server
type AdminConfig = Admin
type AdminDebugConfig = Debug
type AuthConfig = Auth
type FeatureConfig = Features
type RuntimeConfig = Runtime
type ReminderConfig = Reminders
type StorageConfig = Storage
type StorageFSConfig = Fs
type StorageS3Config = S3
type EmailConfig = Email
type EmailSMTPConfig = SMTP
type SignerConfig = Signer
type SenderViewerConfig = SenderViewer
type SenderViewerAssetPermissionsConfig = AssetPermissions
type SignerPDFConfig = Pdf
type SignerPDFRemediationConfig = Remediation
type SignerPDFRemediationCommandConfig = Command
type ServicesConfig = Services
type GoogleConfig = Google
type PublicConfig = Public
type PersistenceConfig = Persistence
type SQLiteConfig = Sqlite
type PostgresConfig = Postgres
type MigrationsConfig = Migrations
type NetworkConfig = Network
type NetworkRateLimitConfig = RateLimit
type RateLimitBucketConfig = SignerSession

const (
	ReminderPolicyVersion = "r1"

	ReminderCompatibilityAllowed   = "allowed"
	ReminderCompatibilityDefaulted = "defaulted"
	ReminderCompatibilityRejected  = "rejected"

	InsecureReminderInternalErrorEncryptionKey = "go-admin-esign-services-app-key"
	minReminderInternalErrorEncryptionKeyChars = 32
)

// ReminderPolicyResolution captures normalized reminder policy values and compatibility status.
type ReminderPolicyResolution struct {
	Config        ReminderConfig    `json:"config"`
	PolicyVersion string            `json:"policy_version"`
	Statuses      map[string]string `json:"statuses"`
}

func (r ReminderPolicyResolution) CompatibilityMatrix() map[string][]string {
	matrix := map[string][]string{
		ReminderCompatibilityAllowed:   {},
		ReminderCompatibilityDefaulted: {},
		ReminderCompatibilityRejected:  {},
	}
	for field, status := range r.Statuses {
		status = strings.TrimSpace(status)
		if status == "" {
			continue
		}
		matrix[status] = append(matrix[status], field)
	}
	for key := range matrix {
		sort.Strings(matrix[key])
	}
	return matrix
}

func ResolveReminderPolicy(input ReminderConfig) (ReminderPolicyResolution, error) {
	defaults := Defaults().Reminders
	out := input
	statuses := map[string]string{}
	rejected := map[string]string{}

	setInt := func(field string, value *int, defaultValue int, min int, max int) {
		switch {
		case *value == 0:
			*value = defaultValue
			statuses[field] = ReminderCompatibilityDefaulted
		case *value < min:
			rejected[field] = fmt.Sprintf("must be >= %d", min)
			statuses[field] = ReminderCompatibilityRejected
		case max > 0 && *value > max:
			rejected[field] = fmt.Sprintf("must be <= %d", max)
			statuses[field] = ReminderCompatibilityRejected
		default:
			statuses[field] = ReminderCompatibilityAllowed
		}
	}

	out.SweepCron = strings.TrimSpace(out.SweepCron)
	if out.SweepCron == "" {
		out.SweepCron = defaults.SweepCron
		statuses["sweep_cron"] = ReminderCompatibilityDefaulted
	} else {
		statuses["sweep_cron"] = ReminderCompatibilityAllowed
	}
	setInt("batch_size", &out.BatchSize, defaults.BatchSize, 1, 0)
	setInt("claim_lease_seconds", &out.ClaimLeaseSeconds, defaults.ClaimLeaseSeconds, 1, 0)
	setInt("initial_delay_minutes", &out.InitialDelayMinutes, defaults.InitialDelayMinutes, 1, 0)
	setInt("interval_minutes", &out.IntervalMinutes, defaults.IntervalMinutes, 1, 0)
	setInt("max_reminders", &out.MaxReminders, defaults.MaxReminders, 1, 0)
	setInt("jitter_percent", &out.JitterPercent, defaults.JitterPercent, 1, 90)
	setInt("recent_view_grace_minutes", &out.RecentViewGraceMinutes, defaults.RecentViewGraceMinutes, 1, 0)
	setInt("manual_resend_cooldown_minutes", &out.ManualResendCooldownMinutes, defaults.ManualResendCooldownMinutes, 1, 0)
	statuses["enabled"] = ReminderCompatibilityAllowed
	statuses["rotate_token"] = ReminderCompatibilityAllowed
	statuses["allow_out_of_order"] = ReminderCompatibilityAllowed

	if len(rejected) > 0 {
		keys := make([]string, 0, len(rejected))
		for key := range rejected {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		parts := make([]string, 0, len(keys))
		for _, key := range keys {
			parts = append(parts, fmt.Sprintf("%s %s", key, rejected[key]))
		}
		return ReminderPolicyResolution{
			Config:        out,
			PolicyVersion: ReminderPolicyVersion,
			Statuses:      statuses,
		}, fmt.Errorf("invalid reminders policy: %s", strings.Join(parts, "; "))
	}

	return ReminderPolicyResolution{
		Config:        out,
		PolicyVersion: ReminderPolicyVersion,
		Statuses:      statuses,
	}, nil
}

func ValidateReminderInternalErrorEncryptionKey(key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("services.encryption_key is required when reminders.enabled=true")
	}
	if strings.EqualFold(key, InsecureReminderInternalErrorEncryptionKey) {
		return fmt.Errorf("services.encryption_key must not use the legacy insecure default when reminders.enabled=true")
	}
	if len(key) < minReminderInternalErrorEncryptionKeyChars {
		return fmt.Errorf("services.encryption_key must be at least %d characters when reminders.enabled=true", minReminderInternalErrorEncryptionKeyChars)
	}
	return nil
}

var activeConfig struct {
	mu  sync.RWMutex
	cfg *Config
}

func Defaults() Config {
	return Config{
		App: AppConfig{
			Name: "go-admin e-sign",
			Env:  "development",
		},
		Server: ServerConfig{
			Address: ":8082",
		},
		Admin: AdminConfig{
			BasePath:      "/admin",
			Title:         "E-Sign Admin",
			DefaultLocale: "en",
			PublicAPI:     true,
			APIPrefix:     "api",
			APIVersion:    "v1",
			Debug: AdminDebugConfig{
				EnableSlog: true,
			},
		},
		Auth: AuthConfig{
			AdminID:       "",
			AdminEmail:    "",
			AdminRole:     "",
			AdminPassword: "",
			SigningKey:    "",
			ContextKey:    "",
			SeedFile:      resolveDefaultAuthSeedPath(),
		},
		Features: FeatureConfig{
			ESign:       true,
			ESignGoogle: false,
			Activity:    true,
		},
		Runtime: RuntimeConfig{
			Profile:       "development",
			StartupPolicy: "enforce",
			StrictStartup: false,
		},
		Reminders: ReminderConfig{
			Enabled:                     false,
			SweepCron:                   "*/15 * * * *",
			BatchSize:                   100,
			ClaimLeaseSeconds:           120,
			InitialDelayMinutes:         1440,
			IntervalMinutes:             1440,
			MaxReminders:                5,
			JitterPercent:               15,
			RecentViewGraceMinutes:      120,
			ManualResendCooldownMinutes: 240,
			RotateToken:                 true,
			AllowOutOfOrder:             false,
		},
		Storage: StorageConfig{
			Backend:             "fs",
			EncryptionAlgorithm: "aws:kms",
			KmsKeyID:            "",
			Fs: Fs{
				BasePath: "",
			},
			S3: S3{
				AccessKeyID:     "",
				BasePath:        "",
				Bucket:          "",
				DisableSsl:      false,
				EndpointURL:     "",
				Profile:         "",
				Region:          "",
				SecretAccessKey: "",
				SessionToken:    "",
				UsePathStyle:    false,
			},
		},
		Email: EmailConfig{
			Transport: "deterministic",
			SMTP: EmailSMTPConfig{
				Host:            "localhost",
				Port:            1025,
				FromName:        "E-Sign",
				FromAddress:     "no-reply@example.test",
				TimeoutSeconds:  10,
				DisableSTARTTLS: false,
				InsecureTLS:     false,
			},
		},
		Signer: SignerConfig{
			UploadTTLSeconds:             300,
			ProfileTTLDays:               90,
			ProfilePersistDrawnSignature: true,
			ProfileMode:                  "hybrid",
			SavedSignaturesLimitPerType:  10,
			SenderViewer: SenderViewerConfig{
				PagePermissionsAll:    []string{"admin.esign.view"},
				CommentPermissionsAll: []string{"admin.esign.edit", "admin.esign.view"},
				AssetPermissions: SenderViewerAssetPermissionsConfig{
					Preview:     []string{"admin.esign.view"},
					Source:      []string{"admin.esign.view"},
					Executed:    []string{"admin.esign.download"},
					Certificate: []string{"admin.esign.download"},
				},
				ShowInProgressFieldValues: false,
			},
			PDF: SignerPDFConfig{
				MaxSourceBytes:         10 * 1024 * 1024,
				MaxPages:               200,
				MaxObjects:             100000,
				MaxDecompressedBytes:   64 * 1024 * 1024,
				ParseTimeoutMS:         2500,
				NormalizationTimeoutMS: 5000,
				AllowEncrypted:         false,
				AllowJavaScriptActions: false,
				CompatibilityMode:      "balanced",
				PreviewFallbackEnabled: false,
				PipelineMode:           "prefer_normalized",
				Remediation: SignerPDFRemediationConfig{
					Enabled:          false,
					ExecutionMode:    "inline",
					AutoOnUpload:     false,
					CandidateReasons: []string{"import.failed", "parse.failed"},
					LeaseTTLMS:       int(defaultPDFRemediationLeaseTTL.Milliseconds()),
					Command: SignerPDFRemediationCommandConfig{
						Bin:         "gs",
						Args:        defaultPDFRemediationCommandArgs(),
						TimeoutMS:   int(defaultPDFRemediationCommandTimeout.Milliseconds()),
						MaxPdfBytes: defaultPDFRemediationCommandMaxPDFBytes,
						MaxLogBytes: defaultPDFRemediationCommandMaxLogBytes,
					},
				},
			},
		},
		Services: ServicesConfig{
			ModuleEnabled: true,
			EncryptionKey: "",
		},
		Google: GoogleConfig{
			ProviderMode:          "real",
			TokenEndpoint:         "https://oauth2.googleapis.com/token",
			RevokeEndpoint:        "https://oauth2.googleapis.com/revoke",
			DriveBaseURL:          "https://www.googleapis.com/drive/v3",
			UserInfoEndpoint:      "https://www.googleapis.com/oauth2/v2/userinfo",
			HealthEndpoint:        "https://www.googleapis.com/generate_204",
			HTTPTimeoutSeconds:    10,
			CredentialActiveKeyID: "v1",
			// #nosec G101 -- deterministic development default, replaced by environment-specific keys in deployed environments.
			CredentialActiveKey: "go-admin-esign-google",
			CredentialKeysJSON:  "",
		},
		Public: PublicConfig{
			BaseURL: "http://localhost:8082",
		},
		Persistence: PersistenceConfig{
			SQLite: SQLiteConfig{
				DSN: defaultSQLiteDSN,
			},
			Postgres: PostgresConfig{
				DSN: "",
			},
			Migrations: MigrationsConfig{
				LocalDir:  defaultMigrationsLocalDir,
				LocalOnly: false,
			},
		},
		Network: NetworkConfig{
			RateLimitTrustProxyHeaders: false,
			TrustedProxyCIDRs: []string{
				"127.0.0.1/32",
				"::1/128",
			},
			RateLimit: NetworkRateLimitConfig{
				SignerSession: RateLimitBucketConfig{MaxRequests: 60, WindowSeconds: 60},
				SignerConsent: RateLimitBucketConfig{MaxRequests: 30, WindowSeconds: 60},
				SignerWrite:   RateLimitBucketConfig{MaxRequests: 120, WindowSeconds: 60},
				SignerSubmit:  RateLimitBucketConfig{MaxRequests: 12, WindowSeconds: 60},
				AdminResend:   RateLimitBucketConfig{MaxRequests: 12, WindowSeconds: 60},
			},
		},
	}
}

func (c Config) Validate() error {
	normalized := c
	for _, normalize := range configNormalizers() {
		if normalize == nil {
			continue
		}
		if err := normalize(&normalized); err != nil {
			return err
		}
	}
	for _, validate := range configValidators() {
		if validate == nil {
			continue
		}
		if err := validate(&normalized); err != nil {
			return err
		}
	}
	return nil
}

func configNormalizers() []goconfig.Normalizer[*Config] {
	return []goconfig.Normalizer[*Config]{
		func(c *Config) error {
			c.applyPersistenceDefaults()
			return nil
		},
		func(c *Config) error {
			c.applySenderViewerDefaults()
			return nil
		},
		func(c *Config) error {
			c.applySignerPDFDefaults()
			return nil
		},
		func(c *Config) error {
			resolution, err := ResolveReminderPolicy(c.Reminders)
			if err != nil {
				return err
			}
			c.Reminders = resolution.Config
			return nil
		},
	}
}

func configValidators() []goconfig.Validator[*Config] {
	return []goconfig.Validator[*Config]{
		validateCoreRequiredFields,
		validateRateLimits,
		validateReminderConfig,
		validateReminderEncryption,
		validatePDFRemediationConfig,
		validateStorageConfig,
		validateTrustedProxyCIDRs,
		validateRepositoryDialect,
	}
}

func validateCoreRequiredFields(c *Config) error {
	if strings.TrimSpace(c.Admin.BasePath) == "" {
		return fmt.Errorf("admin.base_path is required")
	}
	if strings.TrimSpace(c.Admin.Title) == "" {
		return fmt.Errorf("admin.title is required")
	}
	if strings.TrimSpace(c.Admin.DefaultLocale) == "" {
		return fmt.Errorf("admin.default_locale is required")
	}
	if strings.TrimSpace(c.Server.Address) == "" {
		return fmt.Errorf("server.address is required")
	}
	if c.Signer.UploadTTLSeconds <= 0 {
		return fmt.Errorf("signer.upload_ttl_seconds must be greater than zero")
	}
	if c.Signer.ProfileTTLDays <= 0 {
		return fmt.Errorf("signer.profile_ttl_days must be greater than zero")
	}
	if c.Signer.SavedSignaturesLimitPerType <= 0 {
		return fmt.Errorf("signer.saved_signatures_limit_per_type must be greater than zero")
	}
	if c.Email.SMTP.TimeoutSeconds <= 0 {
		return fmt.Errorf("email.smtp.timeout_seconds must be greater than zero")
	}
	return nil
}

func validateRateLimits(c *Config) error {
	if c.Network.RateLimit.SignerSession.MaxRequests <= 0 || c.Network.RateLimit.SignerSession.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_session max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerConsent.MaxRequests <= 0 || c.Network.RateLimit.SignerConsent.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_consent max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerWrite.MaxRequests <= 0 || c.Network.RateLimit.SignerWrite.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_write max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerSubmit.MaxRequests <= 0 || c.Network.RateLimit.SignerSubmit.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_submit max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.AdminResend.MaxRequests <= 0 || c.Network.RateLimit.AdminResend.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.admin_resend max_requests and window_seconds must be greater than zero")
	}
	return nil
}

func validateReminderConfig(c *Config) error {
	if strings.TrimSpace(c.Reminders.SweepCron) == "" {
		return fmt.Errorf("reminders.sweep_cron is required")
	}
	if c.Reminders.BatchSize <= 0 {
		return fmt.Errorf("reminders.batch_size must be greater than zero")
	}
	if c.Reminders.ClaimLeaseSeconds <= 0 {
		return fmt.Errorf("reminders.claim_lease_seconds must be greater than zero")
	}
	if c.Reminders.InitialDelayMinutes <= 0 {
		return fmt.Errorf("reminders.initial_delay_minutes must be greater than zero")
	}
	if c.Reminders.IntervalMinutes <= 0 {
		return fmt.Errorf("reminders.interval_minutes must be greater than zero")
	}
	if c.Reminders.MaxReminders <= 0 {
		return fmt.Errorf("reminders.max_reminders must be greater than zero")
	}
	if c.Reminders.JitterPercent <= 0 || c.Reminders.JitterPercent > 90 {
		return fmt.Errorf("reminders.jitter_percent must be between 1 and 90")
	}
	if c.Reminders.RecentViewGraceMinutes <= 0 {
		return fmt.Errorf("reminders.recent_view_grace_minutes must be greater than zero")
	}
	if c.Reminders.ManualResendCooldownMinutes <= 0 {
		return fmt.Errorf("reminders.manual_resend_cooldown_minutes must be greater than zero")
	}
	return nil
}

func validateReminderEncryption(c *Config) error {
	if c.Reminders.Enabled {
		if err := ValidateReminderInternalErrorEncryptionKey(c.Services.EncryptionKey); err != nil {
			return err
		}
	}
	return nil
}

func validatePDFRemediationConfig(c *Config) error {
	remediation := c.Signer.PDF.Remediation
	command := remediation.Command
	if remediation.LeaseTTLMS <= 0 {
		return fmt.Errorf("signer.pdf.remediation.lease_ttl_ms must be greater than zero")
	}
	if strings.TrimSpace(command.Bin) == "" {
		return fmt.Errorf("signer.pdf.remediation.command.bin is required")
	}
	if len(command.Args) == 0 {
		return fmt.Errorf("signer.pdf.remediation.command.args is required")
	}
	if command.TimeoutMS <= 0 {
		return fmt.Errorf("signer.pdf.remediation.command.timeout_ms must be greater than zero")
	}
	if command.MaxPdfBytes <= 0 {
		return fmt.Errorf("signer.pdf.remediation.command.max_pdf_bytes must be greater than zero")
	}
	if command.MaxLogBytes <= 0 {
		return fmt.Errorf("signer.pdf.remediation.command.max_log_bytes must be greater than zero")
	}
	return nil
}

func validateStorageConfig(c *Config) error {
	if _, err := uploader.ParseBackend(uploader.Backend(strings.TrimSpace(c.Storage.Backend))); err != nil {
		return err
	}
	if _, err := uploader.NormalizeServerSideEncryption(strings.TrimSpace(c.Storage.EncryptionAlgorithm)); err != nil {
		return err
	}
	return nil
}

func validateTrustedProxyCIDRs(c *Config) error {
	for _, raw := range c.Network.TrustedProxyCIDRs {
		cidr := strings.TrimSpace(raw)
		if cidr == "" {
			continue
		}
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			return fmt.Errorf("network.trusted_proxy_cidrs contains invalid cidr %q: %w", cidr, err)
		}
	}
	return nil
}

func validateRepositoryDialect(c *Config) error {
	switch c.Runtime.RepositoryDialect {
	case RepositoryDialectSQLite, RepositoryDialectPostgres:
	default:
		return fmt.Errorf("runtime.repository_dialect must be one of %s|%s", RepositoryDialectSQLite, RepositoryDialectPostgres)
	}
	switch c.Runtime.RepositoryDialect {
	case RepositoryDialectSQLite:
		if strings.TrimSpace(c.Persistence.SQLite.DSN) == "" {
			return fmt.Errorf("persistence.sqlite.dsn is required when runtime.repository_dialect=%s", RepositoryDialectSQLite)
		}
	case RepositoryDialectPostgres:
		if strings.TrimSpace(c.Persistence.Postgres.DSN) == "" {
			return fmt.Errorf("persistence.postgres.dsn is required when runtime.repository_dialect=%s", RepositoryDialectPostgres)
		}
	}
	return nil
}

// Load resolves config from defaults, optional files, and environment overrides.
func Load(paths ...string) (Config, error) {
	resolvedPaths, err := resolveConfigPaths(paths...)
	if err != nil {
		return Config{}, err
	}

	preview := Defaults()
	previewContainer := newContainer(&preview, resolvedPaths, goconfig.ValidationNone, false)
	if err := previewContainer.Load(context.Background()); err != nil {
		return Config{}, err
	}
	previewLoaded := previewContainer.Raw()
	if previewLoaded == nil {
		return Config{}, fmt.Errorf("preview config is nil")
	}

	failFast := shouldFailFast(previewLoaded.Runtime.Profile)

	cfg := Defaults()
	container := newContainer(&cfg, resolvedPaths, goconfig.ValidationSemantic, failFast)
	if err := container.Load(context.Background()); err != nil {
		return Config{}, err
	}

	loaded := container.Raw()
	if loaded == nil {
		return Config{}, fmt.Errorf("loaded config is nil")
	}
	if len(resolvedPaths) > 0 {
		loaded.ConfigPath = strings.TrimSpace(resolvedPaths[0])
	}
	SetActive(*loaded)
	return *loaded, nil
}

func newContainer(
	cfg *Config,
	files []string,
	mode goconfig.ValidationMode,
	failFast bool,
) *goconfig.Container[*Config] {
	container := goconfig.New(cfg).
		WithValidationMode(mode).
		WithBaseValidate(false).
		WithFailFast(failFast).
		WithConfigPath("").
		WithSolverPasses(2).
		WithStringTransformerForKey("runtime.profile", goconfig.ToLower).
		WithStringTransformerForKey("runtime.repository_dialect", goconfig.ToLower).
		WithNormalizer(configNormalizers()...).
		WithValidator(configValidators()...)

	providers := make([]goconfig.ProviderBuilder[*Config], 0, len(files)+2)
	providers = append(providers, goconfig.StructProvider[*Config](cfg))
	for i, path := range files {
		providers = append(providers, goconfig.OptionalProvider(
			goconfig.FileProvider[*Config](path, int(goconfig.PriorityConfig.WithOffset(i))),
		))
	}
	providers = append(providers, goconfig.EnvProvider[*Config](DefaultEnvPrefix, DefaultEnvDelimiter))
	container.WithProvider(providers...)

	return container
}

func shouldFailFast(_ string) bool {
	return true
}

func GetEnvString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func resolveConfigPaths(paths ...string) ([]string, error) {
	if len(paths) == 0 {
		paths = []string{
			GetEnvString("APP_CONFIG", resolveDefaultConfigPath()),
			GetEnvString("APP_CONFIG_OVERRIDES", resolveDefaultOverridesPath()),
		}
	}

	files := make([]string, 0, len(paths))
	for _, path := range paths {
		path = filepath.FromSlash(strings.TrimSpace(path))
		if path == "" {
			continue
		}

		matches, err := filepath.Glob(path)
		if err != nil {
			return nil, err
		}

		if len(matches) == 0 {
			if hasGlob(path) {
				continue
			}
			files = append(files, path)
			continue
		}

		slices.Sort(matches)
		files = append(files, matches...)
	}

	return uniquePaths(files), nil
}

func hasGlob(path string) bool {
	return strings.ContainsAny(path, "*?[")
}

func uniquePaths(paths []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(paths))
	for _, path := range paths {
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	return out
}

func resolveDefaultConfigPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/esign/config/app.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "app.json"))
}

func resolveDefaultOverridesPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/esign/config/overrides.yml"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "overrides.yml"))
}

func resolveDefaultAuthSeedPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/esign/config/dev_seed.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "dev_seed.json"))
}

// SetActive stores runtime config for cross-package access during app bootstrap.
func SetActive(cfg Config) {
	activeConfig.mu.Lock()
	defer activeConfig.mu.Unlock()
	clone := cfg
	activeConfig.cfg = &clone
}

// ResetActive clears the globally active runtime config.
func ResetActive() {
	activeConfig.mu.Lock()
	activeConfig.cfg = nil
	activeConfig.mu.Unlock()
}

// Active returns the currently active runtime config, or defaults when unset.
func Active() Config {
	activeConfig.mu.RLock()
	defer activeConfig.mu.RUnlock()
	if activeConfig.cfg == nil {
		return Defaults()
	}
	clone := *activeConfig.cfg
	return clone
}

func (c *Config) applyPersistenceDefaults() {
	if c == nil {
		return
	}

	c.Runtime.Profile = strings.ToLower(strings.TrimSpace(c.Runtime.Profile))
	if c.Runtime.Profile == "" {
		c.Runtime.Profile = "development"
	}
	c.Runtime.RepositoryDialect = strings.ToLower(strings.TrimSpace(c.Runtime.RepositoryDialect))
	if c.Runtime.RepositoryDialect == "" {
		if isProductionLikeProfile(c.Runtime.Profile) {
			c.Runtime.RepositoryDialect = RepositoryDialectPostgres
		} else {
			c.Runtime.RepositoryDialect = RepositoryDialectSQLite
		}
	}

	c.Persistence.SQLite.DSN = strings.TrimSpace(c.Persistence.SQLite.DSN)
	c.Persistence.Postgres.DSN = strings.TrimSpace(c.Persistence.Postgres.DSN)
	c.Persistence.Migrations.LocalDir = strings.TrimSpace(c.Persistence.Migrations.LocalDir)
	if c.Persistence.Migrations.LocalDir == "" {
		c.Persistence.Migrations.LocalDir = defaultMigrationsLocalDir
	}

	if c.Persistence.SQLite.DSN == "" {
		c.Persistence.SQLite.DSN = defaultSQLiteDSN
	}
}

func (c *Config) applySignerPDFDefaults() {
	if c == nil {
		return
	}
	defaults := Defaults().Signer.PDF

	if c.Signer.PDF.MaxSourceBytes <= 0 {
		c.Signer.PDF.MaxSourceBytes = defaults.MaxSourceBytes
	}
	if c.Signer.PDF.MaxPages <= 0 {
		c.Signer.PDF.MaxPages = defaults.MaxPages
	}
	if c.Signer.PDF.MaxObjects <= 0 {
		c.Signer.PDF.MaxObjects = defaults.MaxObjects
	}
	if c.Signer.PDF.MaxDecompressedBytes <= 0 {
		c.Signer.PDF.MaxDecompressedBytes = defaults.MaxDecompressedBytes
	}
	if c.Signer.PDF.ParseTimeoutMS <= 0 {
		c.Signer.PDF.ParseTimeoutMS = defaults.ParseTimeoutMS
	}
	if c.Signer.PDF.NormalizationTimeoutMS <= 0 {
		c.Signer.PDF.NormalizationTimeoutMS = defaults.NormalizationTimeoutMS
	}
	mode := strings.ToLower(strings.TrimSpace(c.Signer.PDF.CompatibilityMode))
	switch mode {
	case "strict", "balanced", "permissive":
		c.Signer.PDF.CompatibilityMode = mode
	default:
		c.Signer.PDF.CompatibilityMode = defaults.CompatibilityMode
	}
	switch strings.ToLower(strings.TrimSpace(c.Signer.PDF.PipelineMode)) {
	case "analyze_only", "enforce_policy", "prefer_normalized":
		c.Signer.PDF.PipelineMode = strings.ToLower(strings.TrimSpace(c.Signer.PDF.PipelineMode))
	default:
		c.Signer.PDF.PipelineMode = defaults.PipelineMode
	}

	remediationDefaults := defaults.Remediation
	mode = strings.ToLower(strings.TrimSpace(c.Signer.PDF.Remediation.ExecutionMode))
	switch mode {
	case "inline", "queued":
		c.Signer.PDF.Remediation.ExecutionMode = mode
	default:
		c.Signer.PDF.Remediation.ExecutionMode = remediationDefaults.ExecutionMode
	}
	if c.Signer.PDF.Remediation.LeaseTTLMS <= 0 {
		c.Signer.PDF.Remediation.LeaseTTLMS = remediationDefaults.LeaseTTLMS
	}
	if len(c.Signer.PDF.Remediation.CandidateReasons) == 0 {
		c.Signer.PDF.Remediation.CandidateReasons = append([]string{}, remediationDefaults.CandidateReasons...)
	} else {
		c.Signer.PDF.Remediation.CandidateReasons = normalizeRemediationReasons(c.Signer.PDF.Remediation.CandidateReasons)
		if len(c.Signer.PDF.Remediation.CandidateReasons) == 0 {
			c.Signer.PDF.Remediation.CandidateReasons = append([]string{}, remediationDefaults.CandidateReasons...)
		}
	}
	c.Signer.PDF.Remediation.Command.Bin = strings.TrimSpace(c.Signer.PDF.Remediation.Command.Bin)
	if c.Signer.PDF.Remediation.Command.Bin == "" {
		c.Signer.PDF.Remediation.Command.Bin = remediationDefaults.Command.Bin
	}
	if len(c.Signer.PDF.Remediation.Command.Args) == 0 {
		c.Signer.PDF.Remediation.Command.Args = append([]string{}, remediationDefaults.Command.Args...)
	} else {
		c.Signer.PDF.Remediation.Command.Args = normalizeRemediationArgs(c.Signer.PDF.Remediation.Command.Args)
		if len(c.Signer.PDF.Remediation.Command.Args) == 0 {
			c.Signer.PDF.Remediation.Command.Args = append([]string{}, remediationDefaults.Command.Args...)
		}
	}
	if c.Signer.PDF.Remediation.Command.TimeoutMS <= 0 {
		c.Signer.PDF.Remediation.Command.TimeoutMS = remediationDefaults.Command.TimeoutMS
	}
	if c.Signer.PDF.Remediation.Command.MaxPdfBytes <= 0 {
		c.Signer.PDF.Remediation.Command.MaxPdfBytes = remediationDefaults.Command.MaxPdfBytes
	}
	if c.Signer.PDF.Remediation.Command.MaxLogBytes <= 0 {
		c.Signer.PDF.Remediation.Command.MaxLogBytes = remediationDefaults.Command.MaxLogBytes
	}
}

func (c *Config) applySenderViewerDefaults() {
	if c == nil {
		return
	}
	defaults := Defaults().Signer.SenderViewer
	c.Signer.SenderViewer.PagePermissionsAll = normalizePermissionListWithDefault(c.Signer.SenderViewer.PagePermissionsAll, defaults.PagePermissionsAll)
	c.Signer.SenderViewer.CommentPermissionsAll = normalizePermissionListWithDefault(c.Signer.SenderViewer.CommentPermissionsAll, defaults.CommentPermissionsAll)
	c.Signer.SenderViewer.AssetPermissions.Preview = normalizePermissionListWithDefault(c.Signer.SenderViewer.AssetPermissions.Preview, defaults.AssetPermissions.Preview)
	c.Signer.SenderViewer.AssetPermissions.Source = normalizePermissionListWithDefault(c.Signer.SenderViewer.AssetPermissions.Source, defaults.AssetPermissions.Source)
	c.Signer.SenderViewer.AssetPermissions.Executed = normalizePermissionListWithDefault(c.Signer.SenderViewer.AssetPermissions.Executed, defaults.AssetPermissions.Executed)
	c.Signer.SenderViewer.AssetPermissions.Certificate = normalizePermissionListWithDefault(c.Signer.SenderViewer.AssetPermissions.Certificate, defaults.AssetPermissions.Certificate)
}

func normalizePermissionListWithDefault(raw []string, defaults []string) []string {
	seen := map[string]struct{}{}
	normalized := make([]string, 0, len(raw))
	for _, permission := range raw {
		permission = strings.TrimSpace(permission)
		if permission == "" {
			continue
		}
		if _, ok := seen[permission]; ok {
			continue
		}
		seen[permission] = struct{}{}
		normalized = append(normalized, permission)
	}
	if len(normalized) > 0 {
		return normalized
	}
	fallback := make([]string, 0, len(defaults))
	for _, permission := range defaults {
		permission = strings.TrimSpace(permission)
		if permission == "" {
			continue
		}
		if _, ok := seen[permission]; ok {
			continue
		}
		seen[permission] = struct{}{}
		fallback = append(fallback, permission)
	}
	return fallback
}

func normalizeRemediationReasons(raw []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(raw))
	for _, reason := range raw {
		normalized := strings.ToLower(strings.TrimSpace(reason))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	return out
}

func normalizeRemediationArgs(raw []string) []string {
	out := make([]string, 0, len(raw))
	for _, arg := range raw {
		trimmed := strings.TrimSpace(arg)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func defaultPDFRemediationCommandArgs() []string {
	return []string{
		"-dBATCH",
		"-dNOPAUSE",
		"-sDEVICE=pdfwrite",
		"-dCompatibilityLevel=1.6",
		"-sOutputFile={out}",
		"{in}",
	}
}

func isProductionLikeProfile(profile string) bool {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "production", "prod":
		return true
	default:
		return false
	}
}

package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
)

func main() {
	cfg := quickstart.NewAdminConfig(
		"/admin",
		"E-Sign Admin",
		"en",
		quickstart.WithDebugFromEnv(),
		quickstart.WithErrorsFromEnv(),
		quickstart.WithScopeFromEnv(),
	)
	applyESignRuntimeDefaults(&cfg)
	applyESignEmailTransportDefault()

	// Explicit namespaces for admin and public signer API surfaces.
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true
	debugEnabled := cfg.Debug.Enabled
	isDev := strings.EqualFold(os.Getenv("GO_ENV"), "development") ||
		strings.EqualFold(os.Getenv("ENV"), "development")

	featureDefaults := map[string]bool{
		"esign":                       envBool("ESIGN_FEATURE_ENABLED", true),
		"esign_google":                envBool("ESIGN_GOOGLE_FEATURE_ENABLED", false),
		string(admin.FeatureActivity): envBool("ESIGN_ACTIVITY_FEATURE_ENABLED", true),
	}
	adminDeps, err := newESignActivityDependencies()
	if err != nil {
		log.Fatalf("init activity sqlite dependencies: %v", err)
	}
	if err := validateRuntimeSecurityBaseline(); err != nil {
		log.Fatalf("runtime security baseline: %v", err)
	}
	if err := validateRuntimeProviderConfiguration(); err != nil {
		log.Fatalf("runtime provider configuration: %v", err)
	}

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(adminDeps),
		quickstart.WithFeatureDefaults(featureDefaults),
	)
	if err != nil {
		log.Fatalf("new admin: %v", err)
	}
	observability.ConfigureLogging(
		observability.WithLogger(adm.NamedLogger("esign.observability")),
	)

	if debugEnabled {
		if err := adm.RegisterModule(admin.NewDebugModule(cfg.Debug)); err != nil {
			log.Fatalf("register debug module: %v", err)
		}
	}

	servicesModule, servicesCleanup, err := setupESignServicesModule(adm)
	if err != nil {
		log.Fatalf("setup services module: %v", err)
	}
	if servicesCleanup != nil {
		defer servicesCleanup()
	}

	esignModule := modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).
		WithUploadDir(resolveESignDiskAssetsDir()).
		WithServicesModule(servicesModule)
	if err := adm.RegisterModule(esignModule); err != nil {
		log.Fatalf("register module: %v", err)
	}

	authn, auther, authCookieName, err := configureESignAuth(adm, cfg)
	if err != nil {
		log.Fatalf("configure auth: %v", err)
	}

	viewEngine, err := newESignViewEngine(cfg, adm)
	if err != nil {
		log.Fatalf("initialize view engine: %v", err)
	}

	server, r := quickstart.NewFiberServer(viewEngine, cfg, adm, isDev)
	quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithDiskAssetsDir(resolveESignDiskAssetsDir()))

	if debugEnabled {
		quickstart.AttachDebugMiddleware(r, cfg, adm)
	}

	if err := adm.Initialize(r); err != nil {
		log.Fatalf("initialize admin: %v", err)
	}
	routes := handlers.BuildRouteSet(adm.URLs(), adm.BasePath(), adm.AdminAPIGroup())
	if err := registerESignWebRoutes(r, cfg, adm, authn, auther, authCookieName, routes, esignModule); err != nil {
		log.Fatalf("register web routes: %v", err)
	}
	if debugEnabled {
		enableSlog := !strings.EqualFold(os.Getenv("ADMIN_DEBUG_SLOG"), "false") &&
			strings.TrimSpace(os.Getenv("ADMIN_DEBUG_SLOG")) != "0"
		if enableSlog {
			quickstart.AttachDebugLogHandler(cfg, adm)
		}
	}

	addr := listenAddr()
	startupURL := "http://localhost" + addr + adm.BasePath()
	adm.NamedLogger("esign.bootstrap").Info("e-sign admin ready", "url", startupURL)
	if err := server.Serve(addr); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func listenAddr() string {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		return ":8082"
	}
	if _, err := strconv.Atoi(strings.TrimPrefix(port, ":")); err != nil {
		return ":8082"
	}
	if strings.HasPrefix(port, ":") {
		return port
	}
	return ":" + port
}

func envBool(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func applyESignEmailTransportDefault() {
	transport := strings.ToLower(strings.TrimSpace(os.Getenv(jobs.EnvEmailTransport)))
	if transport == "" {
		_ = os.Setenv(jobs.EnvEmailTransport, "deterministic")
		return
	}

	if transport == "mailpit" && strings.TrimSpace(os.Getenv(jobs.EnvEmailSMTPDisableSTARTTLS)) == "" {
		_ = os.Setenv(jobs.EnvEmailSMTPDisableSTARTTLS, "true")
	}
}

func validateRuntimeSecurityBaseline() error {
	policy := stores.DefaultObjectStorageSecurityPolicy()
	algorithm := strings.TrimSpace(os.Getenv("ESIGN_STORAGE_ENCRYPTION_ALGORITHM"))
	if algorithm == "" {
		algorithm = "aws:kms"
	}
	keys := []string{
		"tenant/bootstrap/org/bootstrap/docs/source.pdf",
		"tenant/bootstrap/org/bootstrap/agreements/agreement-1/executed.pdf",
		"tenant/bootstrap/org/bootstrap/agreements/agreement-1/sig/artifact-1.png",
	}
	for _, key := range keys {
		if err := policy.ValidateObjectWrite(key, algorithm); err != nil {
			return err
		}
	}
	return nil
}

func validateRuntimeProviderConfiguration() error {
	profile := strings.ToLower(strings.TrimSpace(os.Getenv("ESIGN_RUNTIME_PROFILE")))
	if isProductionLikeRuntimeProfile(profile) {
		if err := validatePublicBaseURLForRuntimeProfile(profile); err != nil {
			return err
		}
	}
	if profile != "production" && profile != "prod" {
		return nil
	}

	transport := strings.ToLower(strings.TrimSpace(os.Getenv(jobs.EnvEmailTransport)))
	switch transport {
	case "", "deterministic", "mock":
		return fmt.Errorf("production profile requires ESIGN_EMAIL_TRANSPORT to use a non-deterministic provider")
	}
	if strings.TrimSpace(os.Getenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY")) == "" {
		return fmt.Errorf("production profile requires ESIGN_SIGNER_UPLOAD_SIGNING_KEY for signer upload contract signing")
	}
	uploadTTLSeconds := envInt("ESIGN_SIGNER_UPLOAD_TTL_SECONDS", 300)
	if uploadTTLSeconds < 60 || uploadTTLSeconds > 900 {
		return fmt.Errorf("production profile requires ESIGN_SIGNER_UPLOAD_TTL_SECONDS between 60 and 900 seconds")
	}

	if envBool("ESIGN_GOOGLE_FEATURE_ENABLED", false) {
		if !envBool("ESIGN_SERVICES_MODULE_ENABLED", true) {
			return fmt.Errorf("production profile requires ESIGN_SERVICES_MODULE_ENABLED=true when ESIGN_GOOGLE_FEATURE_ENABLED=true")
		}
		if strings.TrimSpace(os.Getenv(services.EnvGoogleClientID)) == "" {
			return fmt.Errorf("production profile requires %s when ESIGN_GOOGLE_FEATURE_ENABLED=true", services.EnvGoogleClientID)
		}
		if strings.TrimSpace(os.Getenv(services.EnvGoogleClientSecret)) == "" {
			return fmt.Errorf("production profile requires %s when ESIGN_GOOGLE_FEATURE_ENABLED=true", services.EnvGoogleClientSecret)
		}
		if strings.TrimSpace(os.Getenv("ESIGN_SERVICES_ENCRYPTION_KEY")) == "" {
			return fmt.Errorf("production profile requires ESIGN_SERVICES_ENCRYPTION_KEY when ESIGN_GOOGLE_FEATURE_ENABLED=true")
		}
	}
	return nil
}

func isProductionLikeRuntimeProfile(profile string) bool {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "production", "prod", "staging":
		return true
	default:
		return false
	}
}

func validatePublicBaseURLForRuntimeProfile(profile string) error {
	base := strings.TrimSpace(os.Getenv(jobs.EnvPublicBaseURL))
	if base == "" {
		return fmt.Errorf("%s profile requires %s", strings.TrimSpace(profile), jobs.EnvPublicBaseURL)
	}
	parsed, err := url.Parse(base)
	if err != nil || strings.TrimSpace(parsed.Scheme) == "" || strings.TrimSpace(parsed.Host) == "" {
		return fmt.Errorf("%s must be a valid absolute URL", jobs.EnvPublicBaseURL)
	}
	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("%s must use http or https", jobs.EnvPublicBaseURL)
	}
	host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	switch host {
	case "", "localhost", "127.0.0.1", "::1", "0.0.0.0":
		return fmt.Errorf("%s must not point to localhost in %s profile", jobs.EnvPublicBaseURL, strings.TrimSpace(profile))
	}
	return nil
}

func resolveESignDiskAssetsDir() string {
	return quickstart.ResolveDiskAssetsDir(
		"output.css",
		"assets",
		"pkg/client/assets",
		"../pkg/client/assets",
		"../../pkg/client/assets",
	)
}

package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
)

func main() {
	runtimeConfig, _, err := appcfg.Load(context.Background())
	if err != nil {
		log.Fatalf("load runtime config: %v", err)
	}

	cfg := quickstart.NewAdminConfig(
		runtimeConfig.Admin.BasePath,
		runtimeConfig.Admin.Title,
		runtimeConfig.Admin.DefaultLocale,
	)
	applyESignRuntimeDefaults(&cfg)

	// Explicit namespaces for admin and public signer API surfaces.
	cfg.URLs.Admin.APIPrefix = strings.TrimSpace(runtimeConfig.Admin.APIPrefix)
	if cfg.URLs.Admin.APIPrefix == "" {
		cfg.URLs.Admin.APIPrefix = "api"
	}
	cfg.URLs.Admin.APIVersion = strings.TrimSpace(runtimeConfig.Admin.APIVersion)
	if cfg.URLs.Admin.APIVersion == "" {
		cfg.URLs.Admin.APIVersion = "v1"
	}
	cfg.URLs.Public.APIPrefix = cfg.URLs.Admin.APIPrefix
	cfg.URLs.Public.APIVersion = cfg.URLs.Admin.APIVersion
	cfg.EnablePublicAPI = runtimeConfig.Admin.PublicAPI
	debugEnabled := cfg.Debug.Enabled
	isDev := isDevelopmentEnv(runtimeConfig.App.Env)

	featureDefaults := map[string]bool{
		"esign":                       runtimeConfig.Features.ESign,
		"esign_google":                runtimeConfig.Features.ESignGoogle,
		string(admin.FeatureActivity): runtimeConfig.Features.Activity,
	}
	adminDeps, err := newESignActivityDependencies()
	if err != nil {
		log.Fatalf("init activity sqlite dependencies: %v", err)
	}
	if err := validateRuntimeSecurityBaseline(*runtimeConfig); err != nil {
		log.Fatalf("runtime security baseline: %v", err)
	}
	if err := validateRuntimeProviderConfiguration(*runtimeConfig); err != nil {
		log.Fatalf("runtime provider configuration: %v", err)
	}

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(adminDeps),
		quickstart.WithFeatureDefaults(featureDefaults),
		quickstart.WithStartupPolicy(resolveESignStartupPolicy(runtimeConfig.Runtime.StartupPolicy)),
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
	if err := configureESignDashboardRenderer(adm, viewEngine, cfg); err != nil {
		log.Fatalf("configure dashboard renderer: %v", err)
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
		if runtimeConfig.Admin.Debug.EnableSlog {
			quickstart.AttachDebugLogHandler(cfg, adm)
		}
	}

	addr := listenAddr(runtimeConfig.Server.Address)
	startupURL := "http://localhost" + addr + adm.BasePath()
	adm.NamedLogger("esign.bootstrap").Info("e-sign admin ready", "url", startupURL)
	if err := server.Serve(addr); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func listenAddr(configured string) string {
	port := strings.TrimSpace(configured)
	if port == "" {
		return ":8082"
	}
	if strings.HasPrefix(port, ":") {
		if _, err := strconv.Atoi(strings.TrimPrefix(port, ":")); err != nil {
			return ":8082"
		}
		return port
	}
	if strings.Contains(port, ":") {
		return port
	}
	if _, err := strconv.Atoi(port); err != nil {
		return ":8082"
	}
	return ":" + port
}

func resolveESignStartupPolicy(raw string) quickstart.StartupPolicy {
	policy := strings.ToLower(strings.TrimSpace(raw))
	switch policy {
	case "warn", "warning":
		return quickstart.StartupPolicyWarn
	default:
		return quickstart.StartupPolicyEnforce
	}
}

func validateRuntimeSecurityBaseline(cfg appcfg.Config) error {
	policy := stores.DefaultObjectStorageSecurityPolicy()
	algorithm := strings.TrimSpace(cfg.Storage.EncryptionAlgorithm)
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

func validateRuntimeProviderConfiguration(cfg appcfg.Config) error {
	profile := strings.ToLower(strings.TrimSpace(cfg.Runtime.Profile))
	if isProductionLikeRuntimeProfile(profile) {
		if err := validatePublicBaseURLForRuntimeProfile(profile, cfg.Public.BaseURL); err != nil {
			return err
		}
	}
	if profile != "production" && profile != "prod" {
		return nil
	}

	transport := strings.ToLower(strings.TrimSpace(cfg.Email.Transport))
	switch transport {
	case "", "deterministic", "mock":
		return fmt.Errorf("production profile requires APP_EMAIL__TRANSPORT to use a non-deterministic provider")
	}
	if strings.TrimSpace(cfg.Signer.UploadSigningKey) == "" {
		return fmt.Errorf("production profile requires APP_SIGNER__UPLOAD_SIGNING_KEY for signer upload contract signing")
	}
	uploadTTLSeconds := cfg.Signer.UploadTTLSeconds
	if uploadTTLSeconds <= 0 {
		uploadTTLSeconds = 300
	}
	if uploadTTLSeconds < 60 || uploadTTLSeconds > 900 {
		return fmt.Errorf("production profile requires APP_SIGNER__UPLOAD_TTL_SECONDS between 60 and 900 seconds")
	}

	if cfg.Features.ESignGoogle {
		if !cfg.Services.ModuleEnabled {
			return fmt.Errorf("production profile requires APP_SERVICES__MODULE_ENABLED=true when APP_FEATURES__ESIGN_GOOGLE=true")
		}
		if strings.TrimSpace(cfg.Google.ClientID) == "" {
			return fmt.Errorf("production profile requires APP_GOOGLE__CLIENT_ID when APP_FEATURES__ESIGN_GOOGLE=true")
		}
		if strings.TrimSpace(cfg.Google.ClientSecret) == "" {
			return fmt.Errorf("production profile requires APP_GOOGLE__CLIENT_SECRET when APP_FEATURES__ESIGN_GOOGLE=true")
		}
		if strings.TrimSpace(cfg.Services.EncryptionKey) == "" {
			return fmt.Errorf("production profile requires APP_SERVICES__ENCRYPTION_KEY when APP_FEATURES__ESIGN_GOOGLE=true")
		}
		if err := validateGoogleOAuthRedirectURI(cfg.Google.OAuthRedirectURI); err != nil {
			return err
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

func validatePublicBaseURLForRuntimeProfile(profile string, publicBaseURL string) error {
	base := strings.TrimSpace(publicBaseURL)
	if base == "" {
		return fmt.Errorf("%s profile requires %s", strings.TrimSpace(profile), jobs.ConfigPublicBaseURLKey)
	}
	parsed, err := url.Parse(base)
	if err != nil || strings.TrimSpace(parsed.Scheme) == "" || strings.TrimSpace(parsed.Host) == "" {
		return fmt.Errorf("%s must be a valid absolute URL", jobs.ConfigPublicBaseURLKey)
	}
	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("%s must use http or https", jobs.ConfigPublicBaseURLKey)
	}
	host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	switch host {
	case "", "localhost", "127.0.0.1", "::1", "0.0.0.0":
		return fmt.Errorf("%s must not point to localhost in %s profile", jobs.ConfigPublicBaseURLKey, strings.TrimSpace(profile))
	}
	return nil
}

func validateGoogleOAuthRedirectURI(rawRedirectURI string) error {
	redirectURI := strings.TrimSpace(rawRedirectURI)
	if redirectURI == "" {
		return fmt.Errorf("production profile requires APP_GOOGLE__OAUTH_REDIRECT_URI when APP_FEATURES__ESIGN_GOOGLE=true")
	}
	parsed, err := url.Parse(redirectURI)
	if err != nil || strings.TrimSpace(parsed.Scheme) == "" || strings.TrimSpace(parsed.Host) == "" {
		return fmt.Errorf("%s must be a valid absolute URL", "APP_GOOGLE__OAUTH_REDIRECT_URI")
	}
	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("%s must use http or https", "APP_GOOGLE__OAUTH_REDIRECT_URI")
	}
	return nil
}

func isDevelopmentEnv(raw string) bool {
	value := strings.ToLower(strings.TrimSpace(raw))
	return value == "development" || value == "dev" || value == "local"
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

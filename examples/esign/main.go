package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/commands"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignevents "github.com/goliatone/go-admin/examples/esign/events"
	"github.com/goliatone/go-admin/examples/esign/fixtures"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	glog "github.com/goliatone/go-logger/glog"
	"github.com/goliatone/go-router"
	"github.com/goliatone/go-router/eventstream"
	"github.com/goliatone/go-uploader"
)

func main() {
	rootLogger := glog.NewLogger(
		glog.WithName("esign"),
		glog.WithLoggerTypeConsole(),
	)
	logger := rootLogger.GetLogger("esign.bootstrap")

	runtimeState, err := loadESignRuntimeState()
	if err != nil {
		logger.Fatal("initialize runtime state failed", "error", err)
	}
	runtimeState.adminDeps.LoggerProvider = rootLogger
	runtimeState.adminDeps.Logger = rootLogger

	if validateErr := validateESignRuntimeState(runtimeState.runtimeConfig); validateErr != nil {
		logger.Fatal("validate runtime state failed", "error", validateErr)
	}

	bootstrapResult, store, storeCleanup, agreementStream, agreementPublisher, err := bootstrapESignPersistence(runtimeState.runtimeConfig)
	if err != nil {
		logger.Fatal("bootstrap persistence failed", "error", err)
	}
	defer closeESignPersistenceBootstrap(logger, bootstrapResult)
	defer closeESignRuntimeStore(logger, storeCleanup)

	adm, err := newESignAdminApp(runtimeState.cfg, runtimeState.adminDeps, runtimeState.featureDefaults, runtimeState.runtimeConfig)
	if err != nil {
		logger.Fatal("new admin failed", "error", err)
	}
	observability.ConfigureLogging(
		observability.WithLoggerProvider(adm.LoggerProvider()),
		observability.WithLogger(adm.NamedLogger("esign.observability")),
	)

	if registerErr := registerOptionalESignDebugModule(adm, runtimeState.cfg, runtimeState.debugEnabled); registerErr != nil {
		logger.Fatal("register debug module failed", "error", registerErr)
	}

	esignModule, err := setupRegisteredESignModule(adm, runtimeState.cfg, runtimeState.runtimeConfig, bootstrapResult, store, agreementPublisher)
	if err != nil {
		logger.Fatal("setup e-sign module failed", "error", err)
	}
	if seedErr := seedRegisteredESignFixtures(runtimeState.cfg, adm, esignModule, bootstrapResult); seedErr != nil {
		logger.Fatal("seed e-sign runtime fixtures failed", "error", seedErr)
	}

	server, err := initializeESignServer(
		runtimeState.cfg,
		adm,
		runtimeState.runtimeConfig,
		runtimeState.authBundle,
		runtimeState.isDev,
		runtimeState.debugEnabled,
		esignModule,
		agreementStream,
	)
	if err != nil {
		logger.Fatal("initialize e-sign server failed", "error", err)
	}

	addr := listenAddr(runtimeState.runtimeConfig.Server.Address)
	startupURL := "http://localhost" + addr + adm.BasePath()
	adm.NamedLogger("esign.bootstrap").Info("e-sign admin ready", "url", startupURL)
	if err := server.Serve(addr); err != nil {
		logger.Fatal("server stopped", "error", err)
	}
}

type eSignRuntimeState struct {
	runtimeConfig   appcfg.Config
	cfg             admin.Config
	debugEnabled    bool
	isDev           bool
	featureDefaults map[string]bool
	adminDeps       admin.Dependencies
	authBundle      eSignAuthBundle
}

func loadESignRuntimeState() (eSignRuntimeState, error) {
	runtimeConfig, err := appcfg.Load()
	if err != nil {
		return eSignRuntimeState{}, err
	}
	cfg, debugEnabled, isDev := buildESignAdminConfig(runtimeConfig)
	adminDeps, authBundle, err := buildESignAdminDependencies(cfg)
	if err != nil {
		return eSignRuntimeState{}, err
	}
	return eSignRuntimeState{
		runtimeConfig:   runtimeConfig,
		cfg:             cfg,
		debugEnabled:    debugEnabled,
		isDev:           isDev,
		featureDefaults: buildESignFeatureDefaults(runtimeConfig),
		adminDeps:       adminDeps,
		authBundle:      authBundle,
	}, nil
}

func buildESignAdminConfig(runtimeConfig appcfg.Config) (admin.Config, bool, bool) {
	cfg := quickstart.NewAdminConfig(
		runtimeConfig.Admin.BasePath,
		runtimeConfig.Admin.Title,
		runtimeConfig.Admin.DefaultLocale,
	)
	applyESignRuntimeDefaults(&cfg)
	cfg.URLs.Admin.APIPrefix = firstNonEmptyString(strings.TrimSpace(runtimeConfig.Admin.APIPrefix), "api")
	cfg.URLs.Admin.APIVersion = firstNonEmptyString(strings.TrimSpace(runtimeConfig.Admin.APIVersion), "v1")
	cfg.URLs.Public.APIPrefix = cfg.URLs.Admin.APIPrefix
	cfg.URLs.Public.APIVersion = cfg.URLs.Admin.APIVersion
	cfg.EnablePublicAPI = runtimeConfig.Admin.PublicAPI
	return cfg, cfg.Debug.Enabled, isDevelopmentEnv(runtimeConfig.App.Env)
}

func buildESignFeatureDefaults(runtimeConfig appcfg.Config) map[string]bool {
	return map[string]bool{
		"esign":                       runtimeConfig.Features.ESign,
		"esign_google":                runtimeConfig.Features.ESignGoogle,
		string(admin.FeatureActivity): runtimeConfig.Features.Activity,
	}
}

func buildESignAdminDependencies(cfg admin.Config) (admin.Dependencies, eSignAuthBundle, error) {
	adminDeps, err := newESignActivityDependencies()
	if err != nil {
		return admin.Dependencies{}, eSignAuthBundle{}, err
	}
	authBundle, err := newESignAuthBundle(cfg)
	if err != nil {
		return admin.Dependencies{}, eSignAuthBundle{}, err
	}
	adminDeps.Authenticator = authBundle.Authenticator
	adminDeps.Authorizer = authBundle.Authorizer
	return adminDeps, authBundle, nil
}

func validateESignRuntimeState(runtimeConfig appcfg.Config) error {
	if err := validateRuntimeSecurityBaseline(runtimeConfig); err != nil {
		return fmt.Errorf("runtime security baseline failed: %w", err)
	}
	if err := validateRuntimeProviderConfiguration(runtimeConfig); err != nil {
		return fmt.Errorf("runtime provider configuration failed: %w", err)
	}
	return nil
}

func bootstrapESignPersistence(
	runtimeConfig appcfg.Config,
) (*esignpersistence.BootstrapResult, stores.Store, func() error, eventstream.Stream, *esignevents.AgreementEventPublisher, error) {
	bootstrapResult, err := esignpersistence.Bootstrap(context.Background(), runtimeConfig)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	store, storeCleanup, err := newESignRuntimeStore(bootstrapResult)
	if err != nil {
		_ = bootstrapResult.Close()
		return nil, nil, nil, nil, nil, err
	}
	agreementStream := eventstream.New(eventstream.WithMatcher(eventstream.SubsetMatch))
	agreementPublisher := esignevents.NewAgreementEventPublisher(agreementStream)
	return bootstrapResult, store, storeCleanup, agreementStream, agreementPublisher, nil
}

func closeESignPersistenceBootstrap(logger admin.Logger, bootstrapResult *esignpersistence.BootstrapResult) {
	if bootstrapResult == nil {
		return
	}
	if cerr := bootstrapResult.Close(); cerr != nil {
		logger.Warn("close persistence bootstrap failed", "error", cerr)
	}
}

func closeESignRuntimeStore(logger admin.Logger, cleanup func() error) {
	if cleanup == nil {
		return
	}
	if cerr := cleanup(); cerr != nil {
		logger.Warn("close e-sign runtime store failed", "error", cerr)
	}
}

func newESignAdminApp(
	cfg admin.Config,
	adminDeps admin.Dependencies,
	featureDefaults map[string]bool,
	runtimeConfig appcfg.Config,
) (*admin.Admin, error) {
	var adminApp *admin.Admin
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(adminDeps),
		quickstart.WithFeatureDefaults(featureDefaults),
		quickstart.WithStartupPolicy(resolveESignStartupPolicy(runtimeConfig.Runtime.StartupPolicy)),
		quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
			Enabled:      true,
			CommandRules: esignReviewRPCCommandRules(),
			Authorize: func(ctx context.Context, input admin.RPCCommandPolicyInput) error {
				return authorizeESignRPCCommand(adminApp, ctx, input)
			},
		}),
	)
	if err != nil {
		return nil, err
	}
	adminApp = adm
	return adm, nil
}

func authorizeESignRPCCommand(adm *admin.Admin, ctx context.Context, input admin.RPCCommandPolicyInput) error {
	extraPermissions := esignReviewRPCExtraPermissions(input.CommandName)
	if len(extraPermissions) == 0 {
		return nil
	}
	resource := strings.TrimSpace(input.Rule.Resource)
	if resource == "" {
		resource = "commands"
	}
	for _, permission := range extraPermissions {
		if admin.CanAll(adm.Authorizer(), ctx, resource, permission) {
			continue
		}
		return admin.PermissionDeniedError{
			Permission: permission,
			Resource:   resource,
			Hint:       "Grant the missing permission to the current role and reload the page.",
		}
	}
	return nil
}

func registerOptionalESignDebugModule(adm *admin.Admin, cfg admin.Config, debugEnabled bool) error {
	if !debugEnabled {
		return nil
	}
	return adm.RegisterModule(admin.NewDebugModule(cfg.Debug))
}

func setupRegisteredESignModule(
	adm *admin.Admin,
	cfg admin.Config,
	runtimeConfig appcfg.Config,
	bootstrapResult *esignpersistence.BootstrapResult,
	store stores.Store,
	agreementPublisher *esignevents.AgreementEventPublisher,
) (*modules.ESignModule, error) {
	servicesModule, err := setupESignServicesModule(adm, bootstrapResult)
	if err != nil {
		return nil, err
	}
	storageBundle, err := newESignStorageBundle(adm.NamedLogger("esign.storage"), runtimeConfig)
	if err != nil {
		return nil, err
	}
	esignModule := modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).
		WithPlacements(quickstart.DefaultPlacements(admin.Config{NavMenuCode: cfg.NavMenuCode})).
		WithUploadManager(storageBundle.Manager).
		WithServicesModule(servicesModule).
		WithAgreementEventPublisher(agreementPublisher).
		WithStore(store)
	if err := adm.RegisterModule(esignModule); err != nil {
		return nil, err
	}
	return esignModule, nil
}

func seedRegisteredESignFixtures(
	cfg admin.Config,
	adm *admin.Admin,
	esignModule *modules.ESignModule,
	bootstrapResult *esignpersistence.BootstrapResult,
) error {
	if !shouldSeedESignRuntimeFixtures() {
		return nil
	}
	fixtureSet, urls, err := seedESignRuntimeFixtures(context.Background(), cfg.BasePath, esignModule, bootstrapResult)
	if err != nil {
		return err
	}
	adm.NamedLogger("esign.bootstrap").Info(
		"seeded e-sign lineage qa fixtures",
		"upload_only_document_id", fixtureSet.UploadOnlyDocumentID,
		"imported_document_id", fixtureSet.ImportedDocumentID,
		"repeated_import_document_id", fixtureSet.RepeatedImportDocumentID,
		"imported_agreement_id", fixtureSet.ImportedAgreementID,
		"upload_only_document_url", urls.UploadOnlyDocumentURL,
		"imported_document_url", urls.ImportedDocumentURL,
		"repeated_import_document_url", urls.RepeatedImportDocumentURL,
		"imported_agreement_url", urls.ImportedAgreementURL,
	)
	return nil
}

func initializeESignServer(
	cfg admin.Config,
	adm *admin.Admin,
	runtimeConfig appcfg.Config,
	authBundle eSignAuthBundle,
	isDev bool,
	debugEnabled bool,
	esignModule *modules.ESignModule,
	agreementStream eventstream.Stream,
) (router.Server[*fiber.App], error) {
	if err := authBundle.Apply(adm); err != nil {
		return nil, err
	}
	viewEngine, err := newESignViewEngine(cfg, adm)
	if err != nil {
		return nil, err
	}
	server, r := quickstart.NewFiberServer(viewEngine, cfg, adm, isDev)
	quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithDiskAssetsDir(resolveESignDiskAssetsDir()))
	if debugEnabled {
		quickstart.AttachDebugMiddleware(r, cfg, adm)
	}
	if err := adm.Initialize(r); err != nil {
		return nil, err
	}
	routes := handlers.BuildRouteSet(adm.URLs(), adm.BasePath(), adm.AdminAPIGroup())
	if err := registerESignWebRoutes(
		r,
		cfg,
		adm,
		authBundle.Authenticator,
		authBundle.RouteAuthenticator,
		authBundle.Auther,
		authBundle.CookieName,
		routes,
		esignModule,
	); err != nil {
		return nil, err
	}
	if err := registerESignAgreementEventsRoute(r, adm, authBundle.Authenticator, esignModule, agreementStream); err != nil {
		return nil, err
	}
	if debugEnabled && runtimeConfig.Admin.Debug.EnableSlog {
		quickstart.AttachDebugLogHandler(cfg, adm)
	}
	return server, nil
}

func listenAddr(configured string) string {
	port := strings.TrimSpace(configured)
	if port == "" {
		return ":8082"
	}
	if after, ok := strings.CutPrefix(port, ":"); ok {
		if _, err := strconv.Atoi(after); err != nil {
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
	if err := validateProductionAuthConfiguration(cfg); err != nil {
		return err
	}
	if err := validateProductionEmailConfiguration(cfg); err != nil {
		return err
	}
	if err := validateProductionSignerUploadConfiguration(cfg); err != nil {
		return err
	}
	return validateProductionGoogleConfiguration(cfg)
}

func validateProductionAuthConfiguration(cfg appcfg.Config) error {
	if strings.TrimSpace(cfg.Auth.SeedFile) != "" {
		return fmt.Errorf("production profile must not use APP_AUTH__SEED_FILE; configure auth credentials via environment or secure config")
	}
	if strings.TrimSpace(cfg.Auth.AdminID) == "" {
		return fmt.Errorf("production profile requires APP_AUTH__ADMIN_ID")
	}
	if strings.TrimSpace(cfg.Auth.AdminEmail) == "" {
		return fmt.Errorf("production profile requires APP_AUTH__ADMIN_EMAIL")
	}
	if strings.TrimSpace(cfg.Auth.AdminPassword) == "" {
		return fmt.Errorf("production profile requires APP_AUTH__ADMIN_PASSWORD")
	}
	if strings.TrimSpace(cfg.Auth.SigningKey) == "" {
		return fmt.Errorf("production profile requires APP_AUTH__SIGNING_KEY")
	}
	if strings.TrimSpace(cfg.Auth.ContextKey) == "" {
		return fmt.Errorf("production profile requires APP_AUTH__CONTEXT_KEY")
	}
	if strings.TrimSpace(cfg.Auth.SigningKey) == defaultESignAuthSigningKey {
		return fmt.Errorf("production profile must override demo APP_AUTH__SIGNING_KEY")
	}
	if strings.EqualFold(strings.TrimSpace(cfg.Auth.AdminEmail), defaultESignDemoAdminEmail) {
		return fmt.Errorf("production profile must override demo APP_AUTH__ADMIN_EMAIL")
	}
	if strings.TrimSpace(cfg.Auth.AdminPassword) == defaultESignDemoAdminPassword {
		return fmt.Errorf("production profile must override demo APP_AUTH__ADMIN_PASSWORD")
	}
	return nil
}

func validateProductionEmailConfiguration(cfg appcfg.Config) error {
	switch strings.ToLower(strings.TrimSpace(cfg.Email.Transport)) {
	case "", "deterministic", "mock":
		return fmt.Errorf("production profile requires APP_EMAIL__TRANSPORT to use a non-deterministic provider")
	default:
		return nil
	}
}

func validateProductionSignerUploadConfiguration(cfg appcfg.Config) error {
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
	return nil
}

func validateProductionGoogleConfiguration(cfg appcfg.Config) error {
	if !cfg.Features.ESignGoogle {
		return nil
	}
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
	return validateGoogleOAuthRedirectURI(cfg.Google.OAuthRedirectURI)
}

func shouldSeedESignRuntimeFixtures() bool {
	raw := strings.TrimSpace(os.Getenv("ADMIN_SEEDS"))
	if raw == "" {
		return false
	}
	switch strings.ToLower(raw) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func seedESignRuntimeFixtures(
	ctx context.Context,
	basePath string,
	module *modules.ESignModule,
	bootstrap *esignpersistence.BootstrapResult,
) (stores.LineageFixtureSet, fixtures.LineageFixtureURLSet, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if module == nil {
		return stores.LineageFixtureSet{}, fixtures.LineageFixtureURLSet{}, fmt.Errorf("e-sign module is required")
	}
	if bootstrap == nil || bootstrap.BunDB == nil {
		return stores.LineageFixtureSet{}, fixtures.LineageFixtureURLSet{}, fmt.Errorf("persistence bootstrap is required")
	}

	fixtureSet, err := fixtures.EnsureLineageQAFixtures(ctx, bootstrap.BunDB, module.UploadManager(), module.DefaultScope())
	if err != nil {
		return stores.LineageFixtureSet{}, fixtures.LineageFixtureURLSet{}, err
	}
	urls, err := fixtures.BuildLineageFixtureURLs(strings.TrimSpace(basePath), module.DefaultScope(), fixtureSet)
	if err != nil {
		return stores.LineageFixtureSet{}, fixtures.LineageFixtureURLSet{}, err
	}
	return fixtureSet, urls, nil
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

func newESignStorageBundle(logger uploader.Logger, runtimeConfig appcfg.Config) (*quickstart.StorageBundle, error) {
	providerCfg := uploader.ProviderConfig{
		Backend: uploader.Backend(strings.TrimSpace(runtimeConfig.Storage.Backend)),
		FS: uploader.FSConfig{
			BasePath: firstNonEmptyString(
				strings.TrimSpace(runtimeConfig.Storage.Fs.BasePath),
				resolveESignDiskAssetsDir(),
			),
			URLPrefix: resolveESignAssetsURLPrefix(runtimeConfig.Admin.BasePath),
		},
		S3: uploader.S3Config{
			Bucket:               strings.TrimSpace(runtimeConfig.Storage.S3.Bucket),
			Region:               strings.TrimSpace(runtimeConfig.Storage.S3.Region),
			BasePath:             strings.TrimSpace(runtimeConfig.Storage.S3.BasePath),
			EndpointURL:          strings.TrimSpace(runtimeConfig.Storage.S3.EndpointURL),
			Profile:              strings.TrimSpace(runtimeConfig.Storage.S3.Profile),
			AccessKeyID:          strings.TrimSpace(runtimeConfig.Storage.S3.AccessKeyID),
			SecretAccessKey:      strings.TrimSpace(runtimeConfig.Storage.S3.SecretAccessKey),
			SessionToken:         strings.TrimSpace(runtimeConfig.Storage.S3.SessionToken),
			UsePathStyle:         runtimeConfig.Storage.S3.UsePathStyle,
			DisableSSL:           runtimeConfig.Storage.S3.DisableSsl,
			ServerSideEncryption: strings.TrimSpace(runtimeConfig.Storage.EncryptionAlgorithm),
			KMSKeyID:             strings.TrimSpace(runtimeConfig.Storage.KmsKeyID),
		},
	}
	validator := uploader.NewValidator(
		uploader.WithUploadMaxFileSize(runtimeConfig.Signer.PDF.MaxSourceBytes),
		uploader.WithAllowedMimeTypes(map[string]bool{
			"application/pdf": true,
		}),
		uploader.WithAllowedImageFormats(map[string]bool{
			".pdf": true,
		}),
	)
	return quickstart.NewStorageBundle(context.Background(), quickstart.StorageBundleConfig{
		Provider:         providerCfg,
		ValidateProvider: runtimeConfig.Runtime.StrictStartup,
		Validator:        validator,
		Logger:           logger,
	})
}

func resolveESignAssetsURLPrefix(basePath string) string {
	return path.Join("/", strings.TrimSpace(basePath), "assets")
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func newESignRuntimeStore(bootstrap *esignpersistence.BootstrapResult) (stores.Store, func() error, error) {
	adapter, cleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		return nil, nil, err
	}
	return adapter, cleanup, nil
}

func esignReviewRPCCommandRules() map[string]admin.RPCCommandRule {
	return map[string]admin.RPCCommandRule{
		commands.CommandAgreementRequestReview: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementReopenReview: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementNotifyReviewers: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementReviewReminderPause: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementReviewReminderResume: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementReviewReminderSendNow: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementCloseReview: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementForceApproveReview: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementApproveReviewOnBehalf: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementCreateCommentThread: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementReplyCommentThread: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementResolveCommentThread: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementReopenCommentThread: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandAgreementResend: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
		commands.CommandTokenRotate: {
			Permission: permissions.AdminESignEdit,
			Resource:   "commands",
		},
	}
}

func esignReviewRPCExtraPermissions(commandName string) []string {
	switch strings.TrimSpace(commandName) {
	case commands.CommandAgreementRequestReview,
		commands.CommandAgreementReopenReview,
		commands.CommandAgreementNotifyReviewers,
		commands.CommandAgreementReviewReminderPause,
		commands.CommandAgreementReviewReminderResume,
		commands.CommandAgreementReviewReminderSendNow,
		commands.CommandAgreementCloseReview,
		commands.CommandAgreementForceApproveReview,
		commands.CommandAgreementApproveReviewOnBehalf,
		commands.CommandAgreementResend,
		commands.CommandTokenRotate:
		return []string{permissions.AdminESignSend}
	case commands.CommandAgreementCreateCommentThread,
		commands.CommandAgreementReplyCommentThread,
		commands.CommandAgreementResolveCommentThread,
		commands.CommandAgreementReopenCommentThread:
		return []string{permissions.AdminESignView}
	default:
		return nil
	}
}

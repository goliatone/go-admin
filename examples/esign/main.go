package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"

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
	"github.com/goliatone/go-router/eventstream"
	"github.com/goliatone/go-uploader"
)

func main() {
	runtimeConfig, err := appcfg.Load()
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
	authBundle, err := newESignAuthBundle(cfg)
	if err != nil {
		log.Fatalf("build auth bundle: %v", err)
	}
	adminDeps.Authenticator = authBundle.Authenticator
	adminDeps.Authorizer = authBundle.Authorizer
	if err := validateRuntimeSecurityBaseline(runtimeConfig); err != nil {
		log.Fatalf("runtime security baseline: %v", err)
	}
	if err := validateRuntimeProviderConfiguration(runtimeConfig); err != nil {
		log.Fatalf("runtime provider configuration: %v", err)
	}
	bootstrapResult, err := esignpersistence.Bootstrap(context.Background(), runtimeConfig)
	if err != nil {
		log.Fatalf("bootstrap persistence: %v", err)
	}
	defer func() {
		if cerr := bootstrapResult.Close(); cerr != nil {
			log.Printf("close persistence bootstrap: %v", cerr)
		}
	}()

	store, storeCleanup, err := newESignRuntimeStore(bootstrapResult)
	if err != nil {
		log.Fatalf("initialize e-sign runtime store: %v", err)
	}
	if storeCleanup != nil {
		defer func() {
			if cerr := storeCleanup(); cerr != nil {
				log.Printf("close e-sign runtime store: %v", cerr)
			}
		}()
	}
	agreementStream := eventstream.New(
		eventstream.WithMatcher(eventstream.SubsetMatch),
	)
	agreementPublisher := esignevents.NewAgreementEventPublisher(agreementStream)

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
				extraPermissions := esignReviewRPCExtraPermissions(input.CommandName)
				if len(extraPermissions) == 0 {
					return nil
				}
				resource := strings.TrimSpace(input.Rule.Resource)
				if resource == "" {
					resource = "commands"
				}
				authorizer := adminApp.Authorizer()
				for _, permission := range extraPermissions {
					if admin.CanAll(authorizer, ctx, resource, permission) {
						continue
					}
					return admin.PermissionDeniedError{
						Permission: permission,
						Resource:   resource,
						Hint:       "Grant the missing permission to the current role and reload the page.",
					}
				}
				return nil
			},
		}),
	)
	if err != nil {
		log.Fatalf("new admin: %v", err)
	}
	adminApp = adm
	observability.ConfigureLogging(
		observability.WithLogger(adm.NamedLogger("esign.observability")),
	)

	if debugEnabled {
		if err := adm.RegisterModule(admin.NewDebugModule(cfg.Debug)); err != nil {
			log.Fatalf("register debug module: %v", err)
		}
	}

	servicesModule, err := setupESignServicesModule(adm, bootstrapResult)
	if err != nil {
		log.Fatalf("setup services module: %v", err)
	}
	storageBundle, err := newESignStorageBundle(adm.NamedLogger("esign.storage"), runtimeConfig)
	if err != nil {
		log.Fatalf("setup e-sign storage: %v", err)
	}

	esignModule := modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).
		WithPlacements(quickstart.DefaultPlacements(admin.Config{NavMenuCode: cfg.NavMenuCode})).
		WithUploadManager(storageBundle.Manager).
		WithServicesModule(servicesModule).
		WithAgreementEventPublisher(agreementPublisher).
		WithStore(store)
	if err := adm.RegisterModule(esignModule); err != nil {
		log.Fatalf("register module: %v", err)
	}
	if shouldSeedESignRuntimeFixtures() {
		fixtureSet, urls, seedErr := seedESignRuntimeFixtures(context.Background(), cfg.BasePath, esignModule, bootstrapResult)
		if seedErr != nil {
			log.Fatalf("seed e-sign runtime fixtures: %v", seedErr)
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
	}

	if err := authBundle.Apply(adm); err != nil {
		log.Fatalf("apply auth bundle: %v", err)
	}
	authn := authBundle.Authenticator
	auther := authBundle.Auther
	authCookieName := authBundle.CookieName

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
	if err := registerESignAgreementEventsRoute(r, adm, authn, esignModule, agreementStream); err != nil {
		log.Fatalf("register agreement events route: %v", err)
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

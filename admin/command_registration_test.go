package admin

import (
	"context"
	"errors"
	"strings"
	"testing"

	commandregistry "github.com/goliatone/go-command/registry"
)

type failingDashboardWidgetService struct {
	*InMemoryWidgetService
	registerDefinitionErr error
}

func (s *failingDashboardWidgetService) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	if s.registerDefinitionErr != nil {
		return s.registerDefinitionErr
	}
	if s.InMemoryWidgetService != nil {
		return s.InMemoryWidgetService.RegisterDefinition(ctx, def)
	}
	return nil
}

func TestUserManagementModuleRegisterFailsWhenCommandRegistrationFails(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureUsers, FeatureCommands),
	})

	if err := commandregistry.Start(context.Background()); err != nil {
		t.Fatalf("force registry initialized state: %v", err)
	}
	t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

	err := adm.Initialize(nilRouter{})
	if err == nil {
		t.Fatalf("expected initialize to fail when user command registration runs after registry initialization")
	}
	if !strings.Contains(err.Error(), userActivateCommandName) || !strings.Contains(err.Error(), "initialized") {
		t.Fatalf("expected registration error to mention %q and initialized registry, got %v", userActivateCommandName, err)
	}
}

func TestContentTypeBuilderModuleRegisterFailsWhenFactoryRegistrationFails(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureCommands),
	})
	adm.UseCMS(NewNoopCMSContainer())
	if err := adm.RegisterModule(NewContentTypeBuilderModule()); err != nil {
		t.Fatalf("register content type builder module: %v", err)
	}

	if err := RegisterMessageFactory(adm.Commands(), contentTypeCreateCommandName, buildContentTypeCreateMsg); err != nil {
		t.Fatalf("pre-register duplicate content type factory: %v", err)
	}

	err := adm.Initialize(nilRouter{})
	if err == nil {
		t.Fatalf("expected initialize to fail when content type command factory registration collides")
	}
	if !strings.Contains(err.Error(), contentTypeCreateCommandName) {
		t.Fatalf("expected duplicate factory error to mention %q, got %v", contentTypeCreateCommandName, err)
	}
}

func TestDashboardRegisterProviderLogsWidgetDefinitionRegistrationFailure(t *testing.T) {
	logger := &captureAdminLogger{}
	adm := mustNewAdmin(t, Config{}, Dependencies{Logger: logger})
	adm.Dashboard().WithWidgetService(&failingDashboardWidgetService{
		InMemoryWidgetService: NewInMemoryWidgetService(),
		registerDefinitionErr: errors.New("widget definitions unavailable"),
	})

	adm.Dashboard().RegisterProvider(DashboardProviderSpec{
		Code: "warn.widget",
		Name: "Warn Widget",
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(map[string]any{"ok": true}), nil
		},
	})

	if got := logger.count("warn", "failed to register dashboard widget definition"); got != 1 {
		t.Fatalf("expected one widget definition registration warning, got %d", got)
	}
}

func TestDashboardRegisterProviderLogsProviderCommandRegistrationFailure(t *testing.T) {
	logger := &captureAdminLogger{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		Logger:      logger,
		FeatureGate: featureGateFromKeys(FeatureCommands),
	})

	if err := commandregistry.Start(context.Background()); err != nil {
		t.Fatalf("force registry initialized state: %v", err)
	}
	t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

	adm.Dashboard().RegisterProvider(DashboardProviderSpec{
		Code:        "warn.provider.command",
		Name:        "Warn Provider Command",
		CommandName: "dashboard.warn.provider.command",
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(map[string]any{"ok": true}), nil
		},
	})

	if got := logger.count("warn", "failed to register dashboard provider command"); got != 1 {
		t.Fatalf("expected one dashboard provider command registration warning, got %d", got)
	}
	if adm.Dashboard().providerCmdReady {
		t.Fatalf("expected provider command bootstrap to remain disabled after registration failure")
	}
	if code := adm.Dashboard().providerCommands["dashboard.warn.provider.command"]; code != "" {
		t.Fatalf("expected provider command mapping to remain unset after failure, got %q", code)
	}
}

package admin

import (
	"context"
	"errors"
	"testing"
)

type stubAdminLogger struct{}

func (stubAdminLogger) Trace(string, ...any) {}
func (stubAdminLogger) Debug(string, ...any) {}
func (stubAdminLogger) Info(string, ...any)  {}
func (stubAdminLogger) Warn(string, ...any)  {}
func (stubAdminLogger) Error(string, ...any) {}
func (stubAdminLogger) Fatal(string, ...any) {}
func (l stubAdminLogger) WithContext(context.Context) Logger {
	return l
}

type stubAdminLoggerProvider struct {
	logger Logger
}

func (p stubAdminLoggerProvider) GetLogger(string) Logger {
	return p.logger
}

func TestNewValidatesUserAndRoleRepositories(t *testing.T) {
	store := NewInMemoryUserStore()
	_, err := New(Config{}, Dependencies{
		UserRepository: &inMemoryUserRepoAdapter{store: store},
	})
	if err == nil {
		t.Fatalf("expected error")
	}
	var depErr InvalidDependenciesError
	if !errors.As(err, &depErr) {
		t.Fatalf("expected InvalidDependenciesError, got %T", err)
	}

	_, err = New(Config{}, Dependencies{
		UserRepository: &inMemoryUserRepoAdapter{store: store},
		RoleRepository: &inMemoryRoleRepoAdapter{store: store},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNewAppliesDependencyDefaults(t *testing.T) {
	adm, err := New(Config{}, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm.registry == nil {
		t.Fatalf("expected registry default")
	}
	if adm.cms == nil || adm.widgetSvc == nil || adm.menuSvc == nil || adm.contentSvc == nil {
		t.Fatalf("expected CMS defaults")
	}
	if adm.preferences == nil || adm.profile == nil || adm.users == nil || adm.tenants == nil || adm.organizations == nil {
		t.Fatalf("expected service defaults")
	}
	if adm.activity == nil {
		t.Fatalf("expected activity sink default")
	}
	res, _ := adm.translator.Translate("en", "key")
	if adm.translator == nil || res != "key" {
		t.Fatalf("expected noop translator default")
	}
	if adm.logger == nil {
		t.Fatalf("expected logger default")
	}
	if adm.loggerProvider == nil {
		t.Fatalf("expected logger provider default")
	}
	if got := adm.loggerProvider.GetLogger("admin.test"); got == nil {
		t.Fatalf("expected provider logger default")
	}
}

func TestNewResolvesLoggerProviderOnly(t *testing.T) {
	providerLogger := &stubAdminLogger{}
	adm, err := New(Config{}, Dependencies{
		LoggerProvider: stubAdminLoggerProvider{logger: providerLogger},
	})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm.logger != providerLogger {
		t.Fatalf("expected provider logger to be selected")
	}
	if adm.loggerProvider == nil {
		t.Fatalf("expected logger provider")
	}
	if got := adm.loggerProvider.GetLogger("admin.any"); got != providerLogger {
		t.Fatalf("expected provider logger for named logger")
	}
}

func TestNewResolvesLoggerOnly(t *testing.T) {
	logger := &stubAdminLogger{}
	adm, err := New(Config{}, Dependencies{
		Logger: logger,
	})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm.logger != logger {
		t.Fatalf("expected logger to be selected")
	}
	if adm.loggerProvider == nil {
		t.Fatalf("expected logger provider")
	}
	if got := adm.loggerProvider.GetLogger("admin.any"); got != logger {
		t.Fatalf("expected static provider to reuse injected logger")
	}
}

func TestNewResolvesProviderAndLoggerPrefersProvider(t *testing.T) {
	providerLogger := &stubAdminLogger{}
	fallbackLogger := &stubAdminLogger{}
	adm, err := New(Config{}, Dependencies{
		Logger:         fallbackLogger,
		LoggerProvider: stubAdminLoggerProvider{logger: providerLogger},
	})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm.logger != providerLogger {
		t.Fatalf("expected provider logger to take precedence when both provided")
	}
	if adm.loggerProvider == nil {
		t.Fatalf("expected logger provider")
	}
	if got := adm.loggerProvider.GetLogger("admin.any"); got != providerLogger {
		t.Fatalf("expected provider to serve named loggers when both provided")
	}
}

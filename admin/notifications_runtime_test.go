package admin

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-notifications/pkg/events"
	"github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/goliatone/go-notifications/pkg/storage"
)

type legacyNotificationServiceStub struct{}

func (legacyNotificationServiceStub) List(context.Context) ([]Notification, error) { return nil, nil }
func (legacyNotificationServiceStub) Add(_ context.Context, n Notification) (Notification, error) {
	return n, nil
}
func (legacyNotificationServiceStub) Mark(context.Context, []string, bool) error { return nil }

var _ NotificationService = legacyNotificationServiceStub{}

func TestLegacyNotificationRuntimeDistinguishesUnavailableCapabilities(t *testing.T) {
	runtime := legacyNotificationRuntime(legacyNotificationServiceStub{})
	if runtime.inbox == nil {
		t.Fatal("expected legacy inbox service")
	}
	_, err := runtime.receipts.LookupReceipt(context.Background(), events.ReceiptLookup{})
	var unavailable NotificationCapabilityUnavailableError
	if !errors.As(err, &unavailable) {
		t.Fatalf("expected unavailable capability error, got %T %v", err, err)
	}
	if unavailable.Capability != "receipts" {
		t.Fatalf("unexpected unavailable capability %q", unavailable.Capability)
	}
}

func TestDisabledNotificationRuntimeReturnsFeatureDisabled(t *testing.T) {
	runtime := disabledNotificationRuntime()
	_, err := runtime.receipts.LookupReceipt(context.Background(), events.ReceiptLookup{})
	var disabled FeatureDisabledError
	if !errors.As(err, &disabled) {
		t.Fatalf("expected feature disabled error, got %T %v", err, err)
	}
}

func TestValidateNotificationProvidersAcceptsCompleteMemoryGraph(t *testing.T) {
	if err := validateNotificationProviders(storage.NewMemoryProviders()); err != nil {
		t.Fatalf("validate memory providers: %v", err)
	}
}

func TestValidateNotificationProvidersRejectsEachMissingProvider(t *testing.T) {
	tests := map[string]func(*storage.Providers){
		"definitions":         func(p *storage.Providers) { p.Definitions = nil },
		"templates":           func(p *storage.Providers) { p.Templates = nil },
		"events":              func(p *storage.Providers) { p.Events = nil },
		"messages":            func(p *storage.Providers) { p.Messages = nil },
		"attempts":            func(p *storage.Providers) { p.DeliveryAttempts = nil },
		"publications":        func(p *storage.Providers) { p.Publications = nil },
		"retry_operations":    func(p *storage.Providers) { p.RetryOperations = nil },
		"preferences":         func(p *storage.Providers) { p.Preferences = nil },
		"subscription_groups": func(p *storage.Providers) { p.SubscriptionGroups = nil },
		"inbox":               func(p *storage.Providers) { p.Inbox = nil },
		"retention":           func(p *storage.Providers) { p.Retention = nil },
		"delivery_queries":    func(p *storage.Providers) { p.DeliveryQueries = nil },
		"transaction":         func(p *storage.Providers) { p.Transaction = nil },
	}
	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			providers := storage.NewMemoryProviders()
			mutate(&providers)
			var invalid InvalidDependenciesError
			if err := validateNotificationProviders(providers); !errors.As(err, &invalid) {
				t.Fatalf("expected InvalidDependenciesError, got %T %v", err, err)
			}
		})
	}
}

func TestValidateNotificationProvidersRejectsTypedNil(t *testing.T) {
	providers := storage.NewMemoryProviders()
	var transaction *store.NopTransactionManager
	providers.Transaction = transaction
	var invalid InvalidDependenciesError
	if err := validateNotificationProviders(providers); !errors.As(err, &invalid) {
		t.Fatalf("expected typed nil to fail validation, got %T %v", err, err)
	}
}

func TestNotificationRuntimeNormalizesTypedNilOptionalMetrics(t *testing.T) {
	providers := storage.NewMemoryProviders()
	var metrics *typedNilNotificationMetrics
	providers.Metrics = metrics
	service, err := newGoNotificationsServiceWithProviders("en", nil, nil, providers)
	if err != nil {
		t.Fatalf("construct runtime with typed-nil optional metrics: %v", err)
	}
	if service.notificationMetrics() != nil {
		t.Fatal("expected typed-nil metrics to normalize to nil")
	}
	if runtime := legacyNotificationRuntime(service); runtime.metrics != nil {
		t.Fatal("expected runtime to keep normalized nil metrics")
	}
}

type typedNilNotificationMetrics struct{}

func (*typedNilNotificationMetrics) Record(string, map[string]string) {
	panic("typed-nil metrics must never be invoked")
}

func TestValidateNotificationRuntimeSelection(t *testing.T) {
	tests := []struct {
		name    string
		enabled bool
		deps    Dependencies
		wantErr bool
	}{
		{name: "enabled default", enabled: true},
		{name: "enabled legacy", enabled: true, deps: Dependencies{NotificationService: legacyNotificationServiceStub{}}},
		{name: "enabled runtime", enabled: true, deps: Dependencies{NotificationRuntime: &NotificationRuntimeOptions{}}},
		{name: "enabled conflict", enabled: true, deps: Dependencies{NotificationService: legacyNotificationServiceStub{}, NotificationRuntime: &NotificationRuntimeOptions{}}, wantErr: true},
		{name: "disabled ignores configured integrations", deps: Dependencies{NotificationService: legacyNotificationServiceStub{}, NotificationRuntime: &NotificationRuntimeOptions{}}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateNotificationRuntimeSelection(test.enabled, test.deps)
			if test.wantErr && err == nil {
				t.Fatal("expected selection error")
			}
			if !test.wantErr && err != nil {
				t.Fatalf("unexpected selection error: %v", err)
			}
		})
	}
}

package admin

import (
	"context"
	"fmt"
	"reflect"

	"github.com/goliatone/go-notifications/pkg/deliveries"
	"github.com/goliatone/go-notifications/pkg/events"
	notifstore "github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/goliatone/go-notifications/pkg/notifier"
	"github.com/goliatone/go-notifications/pkg/retention"
	notifstorage "github.com/goliatone/go-notifications/pkg/storage"
)

// NotificationEventService exposes typed event intake and recovery without
// expanding the legacy inbox-only NotificationService contract.
type NotificationEventService interface {
	DispatchWithReceipt(context.Context, notifier.Event) (events.DispatchReceipt, error)
	RetryWithReceipt(context.Context, events.RetryRequest) (events.DispatchReceipt, error)
	RecoverPending(context.Context, int) error
}

// NotificationReceiptService recovers an existing idempotent receipt without
// dispatching or otherwise mutating notification state.
type NotificationReceiptService interface {
	LookupReceipt(context.Context, events.ReceiptLookup) (events.DispatchReceipt, error)
}

// NotificationDeliveryInspector exposes privacy-safe, scope-bound delivery
// projections from go-notifications.
type NotificationDeliveryInspector interface {
	GetDelivery(context.Context, deliveries.GetQuery) (deliveries.View, error)
	ListDeliveries(context.Context, deliveries.ListQuery) (deliveries.Page, error)
}

// NotificationRetentionService performs one bounded retention pass.
type NotificationRetentionService interface {
	Purge(context.Context, retention.Request) (retention.Result, error)
}

type notificationRuntime struct {
	inbox      NotificationService
	events     NotificationEventService
	receipts   NotificationReceiptService
	deliveries NotificationDeliveryInspector
	retention  NotificationRetentionService
	metrics    notifstorage.MetricsCollector
}

// NotificationCapabilityUnavailableError distinguishes an enabled feature
// whose legacy integration does not expose an optional capability.
type NotificationCapabilityUnavailableError struct {
	Capability string `json:"capability"`
}

func (e NotificationCapabilityUnavailableError) Error() string {
	if e.Capability == "" {
		return "notification capability unavailable"
	}
	return fmt.Sprintf("notification capability unavailable: %s", e.Capability)
}

type unavailableNotificationEvents struct{}

func (unavailableNotificationEvents) DispatchWithReceipt(context.Context, notifier.Event) (events.DispatchReceipt, error) {
	return events.DispatchReceipt{}, NotificationCapabilityUnavailableError{Capability: "events"}
}
func (unavailableNotificationEvents) RetryWithReceipt(context.Context, events.RetryRequest) (events.DispatchReceipt, error) {
	return events.DispatchReceipt{}, NotificationCapabilityUnavailableError{Capability: "events"}
}
func (unavailableNotificationEvents) RecoverPending(context.Context, int) error {
	return NotificationCapabilityUnavailableError{Capability: "events"}
}

type unavailableNotificationReceipts struct{}

func (unavailableNotificationReceipts) LookupReceipt(context.Context, events.ReceiptLookup) (events.DispatchReceipt, error) {
	return events.DispatchReceipt{}, NotificationCapabilityUnavailableError{Capability: "receipts"}
}

type unavailableNotificationDeliveries struct{}

func (unavailableNotificationDeliveries) GetDelivery(context.Context, deliveries.GetQuery) (deliveries.View, error) {
	return deliveries.View{}, NotificationCapabilityUnavailableError{Capability: "delivery_inspection"}
}
func (unavailableNotificationDeliveries) ListDeliveries(context.Context, deliveries.ListQuery) (deliveries.Page, error) {
	return deliveries.Page{}, NotificationCapabilityUnavailableError{Capability: "delivery_inspection"}
}

type unavailableNotificationRetention struct{}

func (unavailableNotificationRetention) Purge(context.Context, retention.Request) (retention.Result, error) {
	return retention.Result{}, NotificationCapabilityUnavailableError{Capability: "retention"}
}

type disabledNotificationEvents struct{}

func (disabledNotificationEvents) DispatchWithReceipt(context.Context, notifier.Event) (events.DispatchReceipt, error) {
	return events.DispatchReceipt{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}
func (disabledNotificationEvents) RetryWithReceipt(context.Context, events.RetryRequest) (events.DispatchReceipt, error) {
	return events.DispatchReceipt{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}
func (disabledNotificationEvents) RecoverPending(context.Context, int) error {
	return FeatureDisabledError{Feature: string(FeatureNotifications)}
}

type disabledNotificationReceipts struct{}

func (disabledNotificationReceipts) LookupReceipt(context.Context, events.ReceiptLookup) (events.DispatchReceipt, error) {
	return events.DispatchReceipt{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}

type disabledNotificationDeliveries struct{}

func (disabledNotificationDeliveries) GetDelivery(context.Context, deliveries.GetQuery) (deliveries.View, error) {
	return deliveries.View{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}
func (disabledNotificationDeliveries) ListDeliveries(context.Context, deliveries.ListQuery) (deliveries.Page, error) {
	return deliveries.Page{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}

type disabledNotificationRetention struct{}

func (disabledNotificationRetention) Purge(context.Context, retention.Request) (retention.Result, error) {
	return retention.Result{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}

func disabledNotificationRuntime() notificationRuntime {
	return notificationRuntime{
		inbox: DisabledNotificationService{}, events: disabledNotificationEvents{},
		receipts: disabledNotificationReceipts{}, deliveries: disabledNotificationDeliveries{},
		retention: disabledNotificationRetention{},
	}
}

func legacyNotificationRuntime(service NotificationService) notificationRuntime {
	runtime := notificationRuntime{
		inbox: service, events: unavailableNotificationEvents{},
		receipts: unavailableNotificationReceipts{}, deliveries: unavailableNotificationDeliveries{},
		retention: unavailableNotificationRetention{},
	}
	if capability, ok := service.(NotificationEventService); ok && !isNilNotificationDependency(capability) {
		runtime.events = capability
	}
	if capability, ok := service.(NotificationReceiptService); ok && !isNilNotificationDependency(capability) {
		runtime.receipts = capability
	}
	if capability, ok := service.(NotificationDeliveryInspector); ok && !isNilNotificationDependency(capability) {
		runtime.deliveries = capability
	}
	if capability, ok := service.(NotificationRetentionService); ok && !isNilNotificationDependency(capability) {
		runtime.retention = capability
	}
	if provider, ok := service.(interface {
		notificationMetrics() notifstorage.MetricsCollector
	}); ok {
		runtime.metrics = normalizeNotificationMetrics(provider.notificationMetrics())
	}
	return runtime
}

func normalizeNotificationMetrics(metrics notifstorage.MetricsCollector) notifstorage.MetricsCollector {
	if isNilNotificationDependency(metrics) {
		return nil
	}
	return metrics
}

func applyNotificationProviderOverrides(options NotificationRuntimeOptions) notifstorage.Providers {
	providers := options.Storage
	if !isNilNotificationDependency(options.Retention) {
		providers.Retention = options.Retention
	}
	if !isNilNotificationDependency(options.DeliveryQueries) {
		providers.DeliveryQueries = options.DeliveryQueries
	}
	return providers
}

func validateNotificationRuntimeSelection(enabled bool, dependencies Dependencies) error {
	if !enabled {
		return nil
	}
	legacyConfigured := !isNilNotificationDependency(dependencies.NotificationService)
	runtimeConfigured := dependencies.NotificationRuntime != nil
	if legacyConfigured && runtimeConfigured {
		return InvalidDependenciesError{Issues: []error{dependencyIssue{
			Field:  "NotificationService/NotificationRuntime",
			Reason: "legacy notification service and runtime options are mutually exclusive",
		}}}
	}
	return nil
}

func validateNotificationProviders(providers notifstorage.Providers) error {
	required := []struct {
		name  string
		value any
	}{
		{"Definitions", providers.Definitions}, {"Templates", providers.Templates},
		{"Events", providers.Events}, {"Messages", providers.Messages},
		{"DeliveryAttempts", providers.DeliveryAttempts}, {"Publications", providers.Publications},
		{"RetryOperations", providers.RetryOperations}, {"Preferences", providers.Preferences},
		{"SubscriptionGroups", providers.SubscriptionGroups}, {"Inbox", providers.Inbox},
		{"Retention", providers.Retention}, {"DeliveryQueries", providers.DeliveryQueries},
		{"Transaction", providers.Transaction},
	}
	issues := make([]error, 0)
	for _, dependency := range required {
		if isNilNotificationDependency(dependency.value) {
			issues = append(issues, dependencyIssue{
				Field:  "NotificationRuntime.Storage." + dependency.name,
				Reason: "is required and must not be typed nil",
			})
		}
	}
	if len(issues) > 0 {
		return InvalidDependenciesError{Issues: issues}
	}
	return nil
}

func isNilNotificationDependency(value any) bool {
	if value == nil {
		return true
	}
	reflected := reflect.ValueOf(value)
	switch reflected.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return reflected.IsNil()
	default:
		return false
	}
}

func notificationCapabilityAvailable(value any) bool {
	if isNilNotificationDependency(value) {
		return false
	}
	switch value.(type) {
	case unavailableNotificationEvents, unavailableNotificationReceipts,
		unavailableNotificationDeliveries, unavailableNotificationRetention,
		disabledNotificationEvents, disabledNotificationReceipts,
		disabledNotificationDeliveries, disabledNotificationRetention:
		return false
	default:
		return true
	}
}

var (
	_ NotificationEventService      = unavailableNotificationEvents{}
	_ NotificationReceiptService    = unavailableNotificationReceipts{}
	_ NotificationDeliveryInspector = unavailableNotificationDeliveries{}
	_ NotificationRetentionService  = unavailableNotificationRetention{}
	_ notifstore.TransactionManager = (*notifstore.NopTransactionManager)(nil)
	_ NotificationService           = (*goNotificationsService)(nil)
	_ NotificationEventService      = (*goNotificationsService)(nil)
	_ NotificationReceiptService    = (*goNotificationsService)(nil)
	_ NotificationDeliveryInspector = (*goNotificationsService)(nil)
	_ NotificationRetentionService  = (*goNotificationsService)(nil)
)

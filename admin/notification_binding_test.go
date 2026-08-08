package admin

import (
	"context"
	"testing"

	auth "github.com/goliatone/go-auth"
	gocommand "github.com/goliatone/go-command"
	"github.com/goliatone/go-notifications/pkg/deliveries"
	"github.com/goliatone/go-notifications/pkg/events"
	"github.com/goliatone/go-notifications/pkg/retention"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type notificationBindingAuthorizer map[string]bool

func (a notificationBindingAuthorizer) Can(_ context.Context, permission, _ string) bool {
	return a[permission]
}

type notificationDeliveryBindingSpy struct {
	listCalls int
	getCalls  int
	list      deliveries.ListQuery
	get       deliveries.GetQuery
}

func (s *notificationDeliveryBindingSpy) ListDeliveries(_ context.Context, query deliveries.ListQuery) (deliveries.Page, error) {
	s.listCalls++
	s.list = query
	return deliveries.Page{}, nil
}

func (s *notificationDeliveryBindingSpy) GetDelivery(_ context.Context, query deliveries.GetQuery) (deliveries.View, error) {
	s.getCalls++
	s.get = query
	return deliveries.View{}, nil
}

type notificationReceiptBindingSpy struct {
	calls  int
	lookup events.ReceiptLookup
}

func (s *notificationReceiptBindingSpy) LookupReceipt(_ context.Context, lookup events.ReceiptLookup) (events.DispatchReceipt, error) {
	s.calls++
	s.lookup = lookup
	return events.DispatchReceipt{}, nil
}

func TestNotificationBindingDerivesReadScopeAndAuthorizesBeforeService(t *testing.T) {
	deliveriesSpy := &notificationDeliveryBindingSpy{}
	receiptsSpy := &notificationReceiptBindingSpy{}
	cfg := applyConfigDefaults(Config{DefaultLocale: "en"})
	adm := &Admin{
		config: cfg, authorizer: notificationBindingAuthorizer{
			cfg.NotificationsInspectPermission: true,
			cfg.NotificationsReceiptPermission: true,
		},
		notificationDeliveries: deliveriesSpy,
		notificationReceipts:   receiptsSpy,
	}
	binding := &notificationsBinding{admin: adm}
	tenantCtx := notificationBindingContext(t, "GET", &auth.ActorContext{ActorID: "actor-1", TenantID: "tenant-1"})
	tenantCtx.QueriesM["limit"] = "25"
	if _, err := binding.ListDeliveries(tenantCtx); err != nil {
		t.Fatalf("list deliveries: %v", err)
	}
	if deliveriesSpy.listCalls != 1 || deliveriesSpy.list.Scope != "tenant:tenant-1" || deliveriesSpy.list.Limit != 25 {
		t.Fatalf("unexpected scoped list delegation: %+v calls=%d", deliveriesSpy.list, deliveriesSpy.listCalls)
	}

	systemCtx := notificationBindingContext(t, "POST", &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})
	if _, err := binding.LookupReceipt(systemCtx, map[string]any{"definition_code": "order.ready", "idempotency_key": "idem-1"}); err != nil {
		t.Fatalf("lookup receipt: %v", err)
	}
	if receiptsSpy.calls != 1 || receiptsSpy.lookup.IdempotencyScope != "system" {
		t.Fatalf("unexpected scoped receipt lookup: %+v calls=%d", receiptsSpy.lookup, receiptsSpy.calls)
	}

	adm.authorizer = notificationBindingAuthorizer{}
	if _, err := binding.ListDeliveries(tenantCtx); err == nil || deliveriesSpy.listCalls != 1 {
		t.Fatalf("expected permission denial before service, err=%v calls=%d", err, deliveriesSpy.listCalls)
	}
	adm.authorizer = notificationBindingAuthorizer{cfg.NotificationsInspectPermission: true}
	tenantCtx.QueriesM["scope"] = "system"
	if _, err := binding.ListDeliveries(tenantCtx); err == nil || deliveriesSpy.listCalls != 1 {
		t.Fatalf("expected query authority rejection, err=%v calls=%d", err, deliveriesSpy.listCalls)
	}
}

func TestNotificationBindingRejectsAuthorityFieldsAndCookiePostsWithoutCSRF(t *testing.T) {
	spy := &notificationReceiptBindingSpy{}
	cfg := applyConfigDefaults(Config{DefaultLocale: "en"})
	adm := &Admin{config: cfg, authorizer: notificationBindingAuthorizer{cfg.NotificationsReceiptPermission: true}, notificationReceipts: spy}
	binding := &notificationsBinding{admin: adm}
	ctx := notificationBindingContext(t, "POST", &auth.ActorContext{ActorID: "system-admin"})
	if _, err := binding.LookupReceipt(ctx, map[string]any{"definition_code": "x", "idempotency_key": "y", "scope": "system"}); err == nil || spy.calls != 0 {
		t.Fatalf("expected authority field rejection, err=%v calls=%d", err, spy.calls)
	}
	ctx.HeadersM["Cookie"] = "admin_session=value"
	if _, err := binding.LookupReceipt(ctx, map[string]any{"definition_code": "x", "idempotency_key": "y"}); err == nil || spy.calls != 0 {
		t.Fatalf("expected CSRF rejection before lookup, err=%v calls=%d", err, spy.calls)
	}
}

func TestNotificationBindingRetentionIsSystemOnlyInlineAndRequiresTypedResult(t *testing.T) {
	cfg := applyConfigDefaults(Config{
		DefaultLocale: "en", ScopeMode: string(ScopePolicySingle), DefaultTenantID: "default-tenant",
	})
	service := &retentionServiceSpy{result: retention.Result{EventsDeleted: 2, HasMore: true}}
	bus := NewCommandBus(true)
	if _, err := registerNotificationRetentionCommand(bus, service, nil, nil, nil); err != nil {
		t.Fatalf("register retention: %v", err)
	}
	adm := &Admin{
		config: cfg, authorizer: notificationBindingAuthorizer{cfg.NotificationsRetentionPurgePermission: true},
		commandBus: bus,
	}
	binding := &notificationsBinding{admin: adm}
	purgePayload := retentionPayload(validNotificationRetentionPurgeMsg())
	delete(purgePayload, "scope")
	tenantCtx := notificationBindingContext(t, "POST", &auth.ActorContext{ActorID: "tenant-admin", TenantID: "tenant-1"})
	if _, err := binding.PurgeRetention(tenantCtx, purgePayload); err == nil || service.calls != 0 {
		t.Fatalf("expected tenant denial before dispatch, err=%v calls=%d", err, service.calls)
	}
	systemCtx := notificationBindingContext(t, "POST", &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})
	value, err := binding.PurgeRetention(systemCtx, purgePayload)
	if err != nil {
		t.Fatalf("system purge: %v", err)
	}
	result, ok := value.(retention.Result)
	if !ok || result.EventsDeleted != 2 || !result.HasMore || service.calls != 1 {
		t.Fatalf("unexpected purge result: %#v calls=%d", value, service.calls)
	}

	missingBus := NewCommandBus(true)
	missingBus.resultDispatchers[NotificationRetentionPurgeCommandName] = func(context.Context, map[string]any, []string, gocommand.DispatchOptions) (gocommand.DispatchReceipt, any, error) {
		return gocommand.DispatchReceipt{Accepted: true, Mode: gocommand.ExecutionModeInline}, nil, nil
	}
	adm.commandBus = missingBus
	if _, err := binding.PurgeRetention(systemCtx, purgePayload); err == nil {
		t.Fatal("expected missing typed result failure")
	}
}

func notificationBindingContext(t *testing.T, method string, actor *auth.ActorContext) *router.MockContext {
	t.Helper()
	c := router.NewMockContext()
	c.On("Context").Return(auth.WithActorContext(context.Background(), actor))
	c.On("IP").Return("").Maybe()
	c.On("Method").Return(method).Maybe()
	c.On("SetContext", mock.Anything).Return().Maybe()
	return c
}

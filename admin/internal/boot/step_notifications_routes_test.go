package boot

import (
	"testing"

	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/stretchr/testify/require"
)

type notificationBindingStub struct {
	capabilities NotificationCapabilities
	eventID      *string
	messageID    *string
}

func (s notificationBindingStub) Capabilities() NotificationCapabilities    { return s.capabilities }
func (notificationBindingStub) List(router.Context) (map[string]any, error) { return nil, nil }
func (notificationBindingStub) Mark(router.Context, map[string]any) error   { return nil }
func (notificationBindingStub) ListDeliveries(router.Context) (any, error)  { return nil, nil }
func (s notificationBindingStub) GetDeliveryEvent(_ router.Context, id string) (any, error) {
	if s.eventID != nil {
		*s.eventID = id
	}
	return nil, nil
}
func (s notificationBindingStub) GetDeliveryMessage(_ router.Context, id string) (any, error) {
	if s.messageID != nil {
		*s.messageID = id
	}
	return nil, nil
}
func (notificationBindingStub) LookupReceipt(router.Context, map[string]any) (any, error) {
	return nil, nil
}
func (notificationBindingStub) PurgeRetention(router.Context, map[string]any) (any, error) {
	return nil, nil
}

func TestNotificationsRouteStepUsesNamedCustomPathsAndMethods(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{Groups: []urlkit.GroupConfig{{
		Name: "admin", Groups: []urlkit.GroupConfig{{Name: "api", Path: "/control-api", Routes: map[string]string{
			"notifications": "/inbox", "notifications.read": "/inbox/mark",
			"notifications.deliveries":         "/ops/deliveries",
			"notifications.deliveries.event":   "/ops/events/:event_id",
			"notifications.deliveries.message": "/ops/messages/:message_id",
			"notifications.receipts.lookup":    "/ops/receipts",
			"notifications.retention.purge":    "/ops/purge",
		}}},
	}}})
	require.NoError(t, err)
	routes := &recordRouter{}
	ctx := &stubCtx{
		router: routes, responder: &stubResponder{}, urls: manager,
		notifications: notificationBindingStub{capabilities: NotificationCapabilities{Deliveries: true, Receipts: true, Retention: true}},
	}
	require.NoError(t, NotificationsRouteStep(ctx))
	require.Len(t, routes.calls, 7)
	want := map[string]bool{
		"GET /control-api/inbox": true, "POST /control-api/inbox/mark": true,
		"GET /control-api/ops/deliveries": true, "GET /control-api/ops/events/:event_id": true, "GET /control-api/ops/messages/:message_id": true,
		"POST /control-api/ops/receipts": true, "POST /control-api/ops/purge": true,
	}
	for _, call := range routes.calls {
		delete(want, call.method+" "+call.path)
	}
	require.Empty(t, want)
}

func TestNotificationsDeliveryHandlersReadSemanticRouteParameters(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{Groups: []urlkit.GroupConfig{{
		Name: "admin", Groups: []urlkit.GroupConfig{{Name: "api", Path: "/api", Routes: map[string]string{
			"notifications": "/notifications", "notifications.read": "/notifications/read",
			"notifications.deliveries":         "/notifications/deliveries",
			"notifications.deliveries.event":   "/notifications/events/:event_id",
			"notifications.deliveries.message": "/notifications/messages/:message_id",
		}}},
	}}})
	require.NoError(t, err)
	routes := &recordRouter{}
	var eventID, messageID string
	ctx := &stubCtx{
		router: routes, responder: &stubResponder{}, urls: manager,
		notifications: notificationBindingStub{
			capabilities: NotificationCapabilities{Deliveries: true}, eventID: &eventID, messageID: &messageID,
		},
	}
	require.NoError(t, NotificationsRouteStep(ctx))
	eventCtx := router.NewMockContext()
	eventCtx.ParamsM["event_id"] = "event-1"
	messageCtx := router.NewMockContext()
	messageCtx.ParamsM["message_id"] = "message-1"
	require.NoError(t, routes.calls[3].handler(eventCtx))
	require.NoError(t, routes.calls[4].handler(messageCtx))
	require.Equal(t, "event-1", eventID)
	require.Equal(t, "message-1", messageID)
}

func TestNotificationsRouteStepOmitsUnavailableCapabilities(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{Groups: []urlkit.GroupConfig{{
		Name: "admin", Groups: []urlkit.GroupConfig{{Name: "api", Path: "/api", Routes: map[string]string{
			"notifications": "/notifications", "notifications.read": "/notifications/read",
			"notifications.deliveries":         "/notifications/deliveries",
			"notifications.deliveries.event":   "/notifications/events/:event_id",
			"notifications.deliveries.message": "/notifications/messages/:message_id",
			"notifications.receipts.lookup":    "/notifications/receipts",
			"notifications.retention.purge":    "/notifications/purge",
		}}},
	}}})
	require.NoError(t, err)
	routes := &recordRouter{}
	ctx := &stubCtx{router: routes, responder: &stubResponder{}, urls: manager, notifications: notificationBindingStub{}}
	require.NoError(t, NotificationsRouteStep(ctx))
	require.Len(t, routes.calls, 2)
}

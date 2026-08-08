package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/goliatone/go-notifications/pkg/deliveries"
	"github.com/goliatone/go-notifications/pkg/domain"
	"github.com/goliatone/go-notifications/pkg/events"
	"github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/goliatone/go-notifications/pkg/notifier"
	"github.com/goliatone/go-notifications/pkg/privacy"
	"github.com/goliatone/go-notifications/pkg/retention"
	"github.com/goliatone/go-notifications/pkg/storage"
	"github.com/google/uuid"
)

func TestGoNotificationsModuleRuntimeSharesReceiptInspectionAndRetentionGraph(t *testing.T) {
	providers := storage.NewMemoryProviders()
	activity := NewActivityFeed()
	service, err := newGoNotificationsServiceWithProviders("en", nil, activity, providers)
	if err != nil {
		t.Fatalf("construct notification runtime: %v", err)
	}

	const dispatches = 8
	receipts := make(chan events.DispatchReceipt, dispatches)
	errorsCh := make(chan error, dispatches)
	var wait sync.WaitGroup
	for range dispatches {
		wait.Go(func() {
			receipt, dispatchErr := service.DispatchWithReceipt(context.Background(), notifier.Event{
				DefinitionCode: defaultNotificationDefinition,
				Recipients:     []string{"recipient-1"}, Context: map[string]any{"title": "Hello", "body": "World"},
				Channels: []string{"inbox"}, IdempotencyScope: "system", IdempotencyKey: "same-request",
			})
			if dispatchErr != nil {
				errorsCh <- dispatchErr
				return
			}
			receipts <- receipt
		})
	}
	wait.Wait()
	close(receipts)
	close(errorsCh)
	for dispatchErr := range errorsCh {
		t.Fatalf("concurrent dispatch: %v", dispatchErr)
	}
	var eventID uuid.UUID
	for receipt := range receipts {
		if eventID == uuid.Nil {
			eventID = receipt.EventID
		}
		if receipt.EventID != eventID {
			t.Fatalf("expected one idempotent event, got %s and %s", eventID, receipt.EventID)
		}
	}
	if eventID == uuid.Nil {
		t.Fatal("expected dispatch receipt event ID")
	}

	eventsBeforeLookup, _ := providers.Events.List(context.Background(), store.ListOptions{})
	messagesBeforeLookup, _ := providers.Messages.List(context.Background(), store.ListOptions{})
	attemptsBeforeLookup, _ := providers.DeliveryAttempts.List(context.Background(), store.ListOptions{})
	activityBeforeLookup, _ := activity.List(context.Background(), 100)
	recovered, err := service.LookupReceipt(context.Background(), events.ReceiptLookup{
		DefinitionCode: defaultNotificationDefinition, IdempotencyScope: "system", IdempotencyKey: "same-request",
	})
	if err != nil {
		t.Fatalf("lookup receipt: %v", err)
	}
	if recovered.EventID != eventID || !recovered.Replay {
		t.Fatalf("unexpected recovered receipt: %+v", recovered)
	}
	eventsAfterLookup, _ := providers.Events.List(context.Background(), store.ListOptions{})
	messagesAfterLookup, _ := providers.Messages.List(context.Background(), store.ListOptions{})
	attemptsAfterLookup, _ := providers.DeliveryAttempts.List(context.Background(), store.ListOptions{})
	activityAfterLookup, _ := activity.List(context.Background(), 100)
	if eventsAfterLookup.Total != eventsBeforeLookup.Total || messagesAfterLookup.Total != messagesBeforeLookup.Total ||
		attemptsAfterLookup.Total != attemptsBeforeLookup.Total || len(activityAfterLookup) != len(activityBeforeLookup) {
		t.Fatalf("receipt lookup caused side effects: events %d/%d messages %d/%d attempts %d/%d activity %d/%d",
			eventsBeforeLookup.Total, eventsAfterLookup.Total, messagesBeforeLookup.Total, messagesAfterLookup.Total,
			attemptsBeforeLookup.Total, attemptsAfterLookup.Total, len(activityBeforeLookup), len(activityAfterLookup))
	}

	view, err := service.GetDelivery(context.Background(), deliveries.GetQuery{Scope: "system", EventID: eventID})
	if err != nil {
		t.Fatalf("inspect event: %v", err)
	}
	if view.EventID != eventID || view.Definition != defaultNotificationDefinition {
		t.Fatalf("unexpected delivery view: %+v", view)
	}

	inbox, err := providers.Inbox.ListByUser(context.Background(), "recipient-1", store.ListOptions{})
	if err != nil || len(inbox.Items) != 1 {
		t.Fatalf("list inbox before purge: total=%d err=%v", len(inbox.Items), err)
	}
	if err := providers.Inbox.Dismiss(context.Background(), inbox.Items[0].ID); err != nil {
		t.Fatalf("dismiss inbox before purge: %v", err)
	}
	if err := providers.Events.UpdateStatus(context.Background(), eventID, domain.EventStatusProcessed); err != nil {
		t.Fatalf("mark event terminal before purge: %v", err)
	}
	time.Sleep(time.Millisecond)
	cutoff := time.Now().UTC()
	result, err := service.Purge(context.Background(), retention.Request{
		EventsBefore: cutoff, MessagesBefore: cutoff, AttemptsBefore: cutoff,
		InboxBefore: cutoff, PublicationsBefore: cutoff, RetryOperationsBefore: cutoff, BatchSize: 100,
	})
	if err != nil {
		t.Fatalf("purge terminal graph: %v", err)
	}
	if result.EventsDeleted != 1 {
		t.Fatalf("expected one event deletion, got %+v", result)
	}
	if _, err := service.GetDelivery(context.Background(), deliveries.GetQuery{Scope: "system", EventID: eventID}); err == nil {
		t.Fatal("expected purged event to be absent from inspection")
	}
}

func TestGoNotificationsReceiptLookupRejectsMalformedIdentitySafely(t *testing.T) {
	service, err := newGoNotificationsService("en", nil, nil)
	if err != nil {
		t.Fatalf("construct notification runtime: %v", err)
	}
	for name, lookup := range map[string]events.ReceiptLookup{
		"missing definition": {IdempotencyScope: "system", IdempotencyKey: "key"},
		"missing scope":      {DefinitionCode: defaultNotificationDefinition, IdempotencyKey: "key"},
		"missing key":        {DefinitionCode: defaultNotificationDefinition, IdempotencyScope: "system"},
	} {
		t.Run(name, func(t *testing.T) {
			_, lookupErr := service.LookupReceipt(context.Background(), lookup)
			var safe privacy.SafeError
			if !errors.As(lookupErr, &safe) || safe.Category != "validation" {
				t.Fatalf("expected safe validation error, got %T %v", lookupErr, lookupErr)
			}
		})
	}
}

func TestGoNotificationsDeliveryInspectionPreservesScopeFiltersPaginationAndPrivacy(t *testing.T) {
	service, err := newGoNotificationsService("en", nil, nil)
	if err != nil {
		t.Fatalf("construct notification runtime: %v", err)
	}
	eventIDs := make([]uuid.UUID, 0, 3)
	for index := range 3 {
		receipt, dispatchErr := service.DispatchWithReceipt(context.Background(), notifier.Event{
			DefinitionCode: defaultNotificationDefinition, Recipients: []string{"recipient"},
			Context:  map[string]any{"title": "Private title", "body": "Private body", "secret": "never serialize"},
			Channels: []string{"inbox"}, TenantID: "tenant-a",
			IdempotencyScope: "tenant:tenant-a", IdempotencyKey: "delivery-page-" + string(rune('a'+index)),
		})
		if dispatchErr != nil {
			t.Fatalf("dispatch %d: %v", index, dispatchErr)
		}
		eventIDs = append(eventIDs, receipt.EventID)
		time.Sleep(time.Millisecond)
	}

	first, err := service.ListDeliveries(context.Background(), deliveries.ListQuery{
		Scope: "tenant:tenant-a", DefinitionCode: defaultNotificationDefinition, Channel: "inbox", Limit: 2,
	})
	if err != nil {
		t.Fatalf("first delivery page: %v", err)
	}
	if len(first.Items) != 2 || !first.HasMore || first.NextCursor == "" {
		t.Fatalf("unexpected first page: %+v", first)
	}
	second, err := service.ListDeliveries(context.Background(), deliveries.ListQuery{
		Scope: "tenant:tenant-a", DefinitionCode: defaultNotificationDefinition, Channel: "inbox",
		Limit: 2, Cursor: first.NextCursor,
	})
	if err != nil || len(second.Items) != 1 || second.HasMore {
		t.Fatalf("unexpected second page: %+v err=%v", second, err)
	}

	messageID := first.Items[0].MessageID
	if messageID == uuid.Nil {
		t.Fatal("expected message identity in list projection")
	}
	messageView, err := service.GetDelivery(context.Background(), deliveries.GetQuery{Scope: "tenant:tenant-a", MessageID: messageID})
	if err != nil || messageView.MessageID != messageID {
		t.Fatalf("message inspection: %+v err=%v", messageView, err)
	}
	if _, err := service.GetDelivery(context.Background(), deliveries.GetQuery{Scope: "system", EventID: eventIDs[0]}); err == nil {
		t.Fatal("expected cross-scope event lookup to fail safely")
	}

	payload, err := json.Marshal(first)
	if err != nil {
		t.Fatalf("marshal delivery page: %v", err)
	}
	serialized := string(payload)
	for _, forbidden := range []string{"Private title", "Private body", "never serialize", "recipient"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("delivery projection leaked %q: %s", forbidden, serialized)
		}
	}
}

func TestGoNotificationsModuleRuntimeDerivesTrustedTenantAndKeepsRecipientSeparate(t *testing.T) {
	providers := storage.NewMemoryProviders()
	service, err := newGoNotificationsServiceWithProviders("en", nil, nil, providers)
	if err != nil {
		t.Fatalf("construct notification runtime: %v", err)
	}
	ctx := context.WithValue(context.Background(), tenantIDContextKey, "tenant-1")
	if _, err := service.Add(ctx, Notification{Title: "Hello", Message: "World", UserID: "recipient-9"}); err != nil {
		t.Fatalf("add tenant notification: %v", err)
	}
	eventsResult, err := providers.Events.List(context.Background(), store.ListOptions{})
	if err != nil || len(eventsResult.Items) != 1 {
		t.Fatalf("list events: total=%d err=%v", len(eventsResult.Items), err)
	}
	got := eventsResult.Items[0]
	if got.TenantID != "tenant-1" {
		t.Fatalf("expected trusted tenant, got %q", got.TenantID)
	}
	if len(got.Recipients) != 1 || got.Recipients[0] != "recipient-9" {
		t.Fatalf("expected recipient to remain separate, got %v", got.Recipients)
	}

	if _, err := service.Add(context.Background(), Notification{Title: "System", Message: "World", UserID: "tenant-looking-recipient"}); err != nil {
		t.Fatalf("add system notification: %v", err)
	}
	eventsResult, err = providers.Events.List(context.Background(), store.ListOptions{})
	if err != nil || len(eventsResult.Items) != 2 {
		t.Fatalf("list system events: total=%d err=%v", len(eventsResult.Items), err)
	}
	for _, event := range eventsResult.Items {
		if event.Recipients[0] == "tenant-looking-recipient" && event.TenantID != "" {
			t.Fatalf("recipient expanded authority: %+v", event)
		}
	}
}

func TestGoNotificationsAddReturnsItsExactInboxItemUnderConcurrency(t *testing.T) {
	service, err := newGoNotificationsService("en", nil, nil)
	if err != nil {
		t.Fatalf("construct notification runtime: %v", err)
	}

	const count = 32
	errorsCh := make(chan error, count)
	var wait sync.WaitGroup
	for index := range count {
		wait.Go(func() {
			title := "title-" + string(rune('a'+index))
			body := "body-" + string(rune('a'+index))
			got, addErr := service.Add(context.Background(), Notification{
				Title: title, Message: body, UserID: "concurrent-recipient",
			})
			if addErr != nil {
				errorsCh <- addErr
				return
			}
			if got.ID == "" || got.Title != title || got.Message != body || got.UserID != "concurrent-recipient" {
				errorsCh <- errors.New("Add returned an inbox item created by a different dispatch")
			}
		})
	}
	wait.Wait()
	close(errorsCh)
	for addErr := range errorsCh {
		t.Fatal(addErr)
	}
}

func TestNotificationInboxMessageIDRejectsMissingExactOutcome(t *testing.T) {
	receipt := events.DispatchReceipt{Outcomes: []events.DeliveryOutcome{{
		MessageID: uuid.New(), SubjectID: "different-recipient", Channel: "inbox",
	}}}
	if _, err := notificationInboxMessageID(receipt, "recipient", "inbox"); err == nil {
		t.Fatal("expected a deterministic error for a receipt without the recipient's inbox outcome")
	}
}

func TestNotificationInboxLookupIgnoresNewerSystemItemsAndFailsWhenExactItemIsMissing(t *testing.T) {
	service, err := newGoNotificationsService("en", nil, nil)
	if err != nil {
		t.Fatalf("construct notification runtime: %v", err)
	}
	targetReceipt, err := service.DispatchWithReceipt(context.Background(), notifier.Event{
		DefinitionCode: defaultNotificationDefinition, Recipients: []string{"recipient"},
		Context: map[string]any{"title": "Target", "body": "Exact"}, Channels: []string{"inbox"},
	})
	if err != nil {
		t.Fatalf("dispatch target: %v", err)
	}
	targetMessageID, err := notificationInboxMessageID(targetReceipt, "recipient", "inbox")
	if err != nil {
		t.Fatalf("resolve target message: %v", err)
	}
	if _, err := service.DispatchWithReceipt(context.Background(), notifier.Event{
		DefinitionCode: defaultNotificationDefinition, Recipients: []string{"system"},
		Context: map[string]any{"title": "Newer system item", "body": "Other"}, Channels: []string{"inbox"},
	}); err != nil {
		t.Fatalf("dispatch newer system item: %v", err)
	}
	got, err := service.notificationForInboxMessage(context.Background(), "recipient", targetMessageID)
	if err != nil || got.Title != "Target" || got.Message != "Exact" {
		t.Fatalf("exact inbox lookup: got=%+v err=%v", got, err)
	}
	if _, err := service.notificationForInboxMessage(context.Background(), "recipient", uuid.New()); err == nil {
		t.Fatal("expected deterministic error when the exact created item is unavailable")
	}
}

func TestGoNotificationsModuleRuntimeSeedsIdempotentlyAndPropagatesSeedErrors(t *testing.T) {
	providers := storage.NewMemoryProviders()
	if _, err := newGoNotificationsServiceWithProviders("en", nil, nil, providers); err != nil {
		t.Fatalf("first runtime: %v", err)
	}
	if _, err := newGoNotificationsServiceWithProviders("en", nil, nil, providers); err != nil {
		t.Fatalf("second runtime: %v", err)
	}
	definitions, err := providers.Definitions.List(context.Background(), store.ListOptions{})
	if err != nil || definitions.Total != 1 {
		t.Fatalf("definitions after repeated seed: total=%d err=%v", definitions.Total, err)
	}
	templates, err := providers.Templates.List(context.Background(), store.ListOptions{})
	if err != nil || templates.Total != 1 {
		t.Fatalf("templates after repeated seed: total=%d err=%v", templates.Total, err)
	}

	seedErr := errors.New("seed read failed")
	failing := storage.NewMemoryProviders()
	failing.Definitions = failingDefinitionRepository{
		NotificationDefinitionRepository: failing.Definitions,
		err:                              seedErr,
	}
	if _, err := newGoNotificationsServiceWithProviders("en", nil, nil, failing); !errors.Is(err, seedErr) {
		t.Fatalf("expected seed error propagation, got %v", err)
	}

	createErr := errors.New("seed create failed")
	createFailing := storage.NewMemoryProviders()
	createFailing.Definitions = failingCreateDefinitionRepository{
		NotificationDefinitionRepository: createFailing.Definitions,
		err:                              createErr,
	}
	if _, err := newGoNotificationsServiceWithProviders("en", nil, nil, createFailing); !errors.Is(err, createErr) {
		t.Fatalf("expected genuine create error propagation, got %v", err)
	}
}

func TestAdminNotificationRuntimeResolutionAndAccessors(t *testing.T) {
	t.Run("disabled ignores invalid explicit runtime", func(t *testing.T) {
		adm, err := New(Config{}, Dependencies{NotificationRuntime: &NotificationRuntimeOptions{}})
		if err != nil {
			t.Fatalf("construct disabled admin: %v", err)
		}
		_, err = adm.NotificationReceipts().LookupReceipt(context.Background(), events.ReceiptLookup{})
		var disabled FeatureDisabledError
		if !errors.As(err, &disabled) {
			t.Fatalf("expected disabled receipt service, got %T %v", err, err)
		}
	})

	t.Run("default memory exposes all capabilities", func(t *testing.T) {
		adm, err := New(Config{DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureNotifications)})
		if err != nil {
			t.Fatalf("construct default runtime: %v", err)
		}
		for capability, available := range map[string]bool{
			"events":     notificationCapabilityAvailable(adm.NotificationEvents()),
			"receipts":   notificationCapabilityAvailable(adm.NotificationReceipts()),
			"deliveries": notificationCapabilityAvailable(adm.NotificationDeliveries()),
			"retention":  notificationCapabilityAvailable(adm.NotificationRetention()),
		} {
			if !available {
				t.Fatalf("expected %s capability", capability)
			}
		}
	})

	t.Run("legacy service leaves optional capabilities unavailable", func(t *testing.T) {
		adm, err := New(Config{}, Dependencies{
			FeatureGate: featureGateFromKeys(FeatureNotifications), NotificationService: legacyNotificationServiceStub{},
		})
		if err != nil {
			t.Fatalf("construct legacy runtime: %v", err)
		}
		_, err = adm.NotificationRetention().Purge(context.Background(), retention.Request{})
		var unavailable NotificationCapabilityUnavailableError
		if !errors.As(err, &unavailable) {
			t.Fatalf("expected unavailable retention, got %T %v", err, err)
		}
	})

	t.Run("legacy and runtime conflict", func(t *testing.T) {
		_, err := New(Config{}, Dependencies{
			FeatureGate:         featureGateFromKeys(FeatureNotifications),
			NotificationService: legacyNotificationServiceStub{}, NotificationRuntime: &NotificationRuntimeOptions{},
		})
		var invalid InvalidDependenciesError
		if !errors.As(err, &invalid) {
			t.Fatalf("expected invalid dependency conflict, got %T %v", err, err)
		}
	})

	t.Run("custom retention override is selected", func(t *testing.T) {
		providers := storage.NewMemoryProviders()
		custom := &retentionRepositorySpy{}
		adm, err := New(Config{}, Dependencies{
			FeatureGate:         featureGateFromKeys(FeatureNotifications),
			NotificationRuntime: &NotificationRuntimeOptions{Storage: providers, Retention: custom},
		})
		if err != nil {
			t.Fatalf("construct custom retention runtime: %v", err)
		}
		cutoff := time.Now().Add(-time.Hour)
		_, err = adm.NotificationRetention().Purge(context.Background(), retention.Request{
			EventsBefore: cutoff, MessagesBefore: cutoff, AttemptsBefore: cutoff,
			InboxBefore: cutoff, PublicationsBefore: cutoff, RetryOperationsBefore: cutoff, BatchSize: 10,
		})
		if err != nil {
			t.Fatalf("purge custom retention: %v", err)
		}
		if custom.calls != 1 {
			t.Fatalf("expected custom retention call, got %d", custom.calls)
		}
	})

	t.Run("partial runtime and seed failures fail construction", func(t *testing.T) {
		_, err := New(Config{}, Dependencies{
			FeatureGate: featureGateFromKeys(FeatureNotifications), NotificationRuntime: &NotificationRuntimeOptions{},
		})
		var invalid InvalidDependenciesError
		if !errors.As(err, &invalid) {
			t.Fatalf("expected partial provider error, got %T %v", err, err)
		}

		seedErr := errors.New("persistent seed unavailable")
		providers := storage.NewMemoryProviders()
		providers.Definitions = failingDefinitionRepository{NotificationDefinitionRepository: providers.Definitions, err: seedErr}
		_, err = New(Config{}, Dependencies{
			FeatureGate:         featureGateFromKeys(FeatureNotifications),
			NotificationRuntime: &NotificationRuntimeOptions{Storage: providers},
		})
		if !errors.Is(err, seedErr) {
			t.Fatalf("expected seed failure, got %v", err)
		}
	})
}

type failingDefinitionRepository struct {
	store.NotificationDefinitionRepository
	err error
}

func (r failingDefinitionRepository) GetByCode(context.Context, string) (*domain.NotificationDefinition, error) {
	return nil, r.err
}

type failingCreateDefinitionRepository struct {
	store.NotificationDefinitionRepository
	err error
}

func (r failingCreateDefinitionRepository) GetByCode(context.Context, string) (*domain.NotificationDefinition, error) {
	return nil, store.ErrNotFound
}

func (r failingCreateDefinitionRepository) Create(context.Context, *domain.NotificationDefinition) error {
	return r.err
}

type retentionRepositorySpy struct{ calls int }

func (r *retentionRepositorySpy) PurgeTerminal(context.Context, store.RetentionCutoffs, int) (store.RetentionCounts, bool, error) {
	r.calls++
	return store.RetentionCounts{}, false, nil
}

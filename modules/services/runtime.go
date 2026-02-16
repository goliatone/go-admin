package services

import (
	"context"
	"encoding/base64"
	"fmt"
	"sort"
	"strconv"
	"strings"

	goadmin "github.com/goliatone/go-admin/admin"
	goadaptergojob "github.com/goliatone/go-services/adapters/gojob"
	gocore "github.com/goliatone/go-services/core"
	goservicesinbound "github.com/goliatone/go-services/inbound"
	sqlstore "github.com/goliatone/go-services/store/sql"
	servicesync "github.com/goliatone/go-services/sync"
	goserviceswebhooks "github.com/goliatone/go-services/webhooks"
	"github.com/uptrace/bun"
)

const (
	jobIDWebhookProcess       = "services.webhook.process"
	jobIDActivityRetentionRun = "services.activity.retention.run"
)

type WorkerRuntime struct {
	service          *gocore.Service
	enqueuer         JobEnqueuer
	syncOrchestrator *servicesync.Orchestrator
	outboxDispatcher gocore.LifecycleDispatcher
	webhookProcessor *goserviceswebhooks.Processor
	activityRuntime  *activityRuntime
}

func (w *WorkerRuntime) HasEnqueuer() bool {
	return w != nil && w.enqueuer != nil
}

func (w *WorkerRuntime) EnqueueRefresh(ctx context.Context, req gocore.RefreshRequest, idempotencyKey string) error {
	if w == nil || w.enqueuer == nil {
		return fmt.Errorf("modules/services: worker enqueuer is not configured")
	}
	return w.enqueuer.Enqueue(ctx, &gocore.JobExecutionMessage{
		JobID:          goadaptergojob.JobIDRefresh,
		IdempotencyKey: strings.TrimSpace(idempotencyKey),
		Parameters: map[string]any{
			"provider_id":   strings.TrimSpace(req.ProviderID),
			"connection_id": strings.TrimSpace(req.ConnectionID),
		},
	})
}

func (w *WorkerRuntime) EnqueueWebhook(ctx context.Context, req gocore.InboundRequest) error {
	if w == nil || w.enqueuer == nil {
		return fmt.Errorf("modules/services: worker enqueuer is not configured")
	}
	return w.enqueuer.Enqueue(ctx, &gocore.JobExecutionMessage{
		JobID:      jobIDWebhookProcess,
		Parameters: inboundRequestToParams(req),
	})
}

func (w *WorkerRuntime) EnqueueSubscriptionRenew(ctx context.Context, subscriptionID string, metadata map[string]any, idempotencyKey string) error {
	if w == nil || w.enqueuer == nil {
		return fmt.Errorf("modules/services: worker enqueuer is not configured")
	}
	return w.enqueuer.Enqueue(ctx, &gocore.JobExecutionMessage{
		JobID:          goadaptergojob.JobIDSubscriptionRenew,
		IdempotencyKey: strings.TrimSpace(idempotencyKey),
		Parameters: map[string]any{
			"subscription_id": strings.TrimSpace(subscriptionID),
			"metadata":        copyAnyMap(metadata),
		},
	})
}

func (w *WorkerRuntime) EnqueueSyncRun(
	ctx context.Context,
	connectionID string,
	providerID string,
	resourceType string,
	resourceID string,
	metadata map[string]any,
	idempotencyKey string,
) error {
	if w == nil || w.enqueuer == nil {
		return fmt.Errorf("modules/services: worker enqueuer is not configured")
	}
	return w.enqueuer.Enqueue(ctx, &gocore.JobExecutionMessage{
		JobID:          goadaptergojob.JobIDSyncIncremental,
		IdempotencyKey: strings.TrimSpace(idempotencyKey),
		Parameters: map[string]any{
			"connection_id": strings.TrimSpace(connectionID),
			"provider_id":   strings.TrimSpace(providerID),
			"resource_type": strings.TrimSpace(resourceType),
			"resource_id":   strings.TrimSpace(resourceID),
			"metadata":      copyAnyMap(metadata),
		},
	})
}

func (w *WorkerRuntime) EnqueueOutboxDispatch(ctx context.Context, batchSize int, idempotencyKey string) error {
	if w == nil || w.enqueuer == nil {
		return fmt.Errorf("modules/services: worker enqueuer is not configured")
	}
	if batchSize <= 0 {
		batchSize = 0
	}
	return w.enqueuer.Enqueue(ctx, &gocore.JobExecutionMessage{
		JobID:          goadaptergojob.JobIDOutboxDispatch,
		IdempotencyKey: strings.TrimSpace(idempotencyKey),
		Parameters: map[string]any{
			"batch_size": batchSize,
		},
	})
}

func (w *WorkerRuntime) EnqueueActivityRetentionRun(ctx context.Context, idempotencyKey string) error {
	if w == nil || w.enqueuer == nil {
		return fmt.Errorf("modules/services: worker enqueuer is not configured")
	}
	return w.enqueuer.Enqueue(ctx, &gocore.JobExecutionMessage{
		JobID:          jobIDActivityRetentionRun,
		IdempotencyKey: strings.TrimSpace(idempotencyKey),
		Parameters:     map[string]any{},
	})
}

func (w *WorkerRuntime) HandleExecutionMessage(ctx context.Context, msg *gocore.JobExecutionMessage) error {
	if w == nil {
		return fmt.Errorf("modules/services: worker runtime is nil")
	}
	if msg == nil {
		return fmt.Errorf("modules/services: execution message is required")
	}

	params := msg.Parameters
	switch strings.TrimSpace(msg.JobID) {
	case goadaptergojob.JobIDRefresh:
		if w.service == nil {
			return fmt.Errorf("modules/services: services runtime is not configured")
		}
		_, err := w.service.Refresh(ctx, gocore.RefreshRequest{
			ProviderID:   toString(params["provider_id"]),
			ConnectionID: toString(params["connection_id"]),
		})
		return err
	case goadaptergojob.JobIDSubscriptionRenew:
		if w.service == nil {
			return fmt.Errorf("modules/services: services runtime is not configured")
		}
		_, err := w.service.RenewSubscription(ctx, gocore.RenewSubscriptionRequest{
			SubscriptionID: toString(params["subscription_id"]),
			Metadata:       toStringAnyMap(params["metadata"]),
		})
		return err
	case goadaptergojob.JobIDSyncIncremental:
		if w.syncOrchestrator == nil {
			return fmt.Errorf("modules/services: sync orchestrator is not configured")
		}
		_, err := w.syncOrchestrator.StartIncremental(
			ctx,
			toString(params["connection_id"]),
			toString(params["provider_id"]),
			toString(params["resource_type"]),
			toString(params["resource_id"]),
			toStringAnyMap(params["metadata"]),
		)
		return err
	case goadaptergojob.JobIDOutboxDispatch:
		if w.outboxDispatcher == nil {
			return fmt.Errorf("modules/services: outbox dispatcher is not configured")
		}
		_, err := w.outboxDispatcher.DispatchPending(ctx, toInt(params["batch_size"], 0))
		if err != nil {
			return err
		}
		if w.activityRuntime != nil {
			_, _ = w.activityRuntime.EnforceRetention(ctx)
		}
		return nil
	case jobIDActivityRetentionRun:
		if w.activityRuntime == nil {
			return nil
		}
		_, err := w.activityRuntime.EnforceRetention(ctx)
		return err
	case jobIDWebhookProcess:
		if w.webhookProcessor == nil {
			return fmt.Errorf("modules/services: webhook processor is not configured")
		}
		req, err := inboundRequestFromParams(params)
		if err != nil {
			return err
		}
		req.Surface = goservicesinbound.SurfaceWebhook
		_, err = w.webhookProcessor.Process(ctx, req)
		return err
	default:
		return fmt.Errorf("modules/services: unsupported job id %q", strings.TrimSpace(msg.JobID))
	}
}

func (m *Module) initializeRuntime() error {
	if m == nil {
		return nil
	}

	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)

	var inboundDispatcher *goservicesinbound.Dispatcher
	if m.config.Inbound.Enabled {
		claimStore := m.config.InboundClaimStore
		if claimStore == nil {
			claimStore = goservicesinbound.NewInMemoryClaimStore()
		}
		inboundDispatcher = goservicesinbound.NewDispatcher(m.config.InboundVerifier, claimStore)
		inboundDispatcher.KeyTTL = m.config.Inbound.KeyTTL
		registerInboundHandlers(inboundDispatcher, m.config.InboundHandlers)
	}

	var webhookProcessor *goserviceswebhooks.Processor
	if m.config.Webhook.Enabled {
		ledger := m.config.WebhookDeliveryLedger
		if ledger == nil && db != nil {
			deliveryStore, err := sqlstore.NewWebhookDeliveryStore(db)
			if err != nil {
				return fmt.Errorf("modules/services: build webhook delivery ledger: %w", err)
			}
			ledger = deliveryStore
		}
		if ledger != nil {
			handler := m.config.WebhookHandler
			if handler == nil {
				handler = webhookDispatchHandler{dispatcher: inboundDispatcher}
			}
			webhookProcessor = goserviceswebhooks.NewProcessor(
				m.config.WebhookVerifier,
				ledger,
				handler,
			)
			webhookProcessor.ClaimLease = m.config.Webhook.ClaimLease
			webhookProcessor.MaxAttempts = m.config.Webhook.MaxAttempts
		}
	}

	syncOrchestrator := buildSyncOrchestrator(m.repositoryFactory, m.service)
	activityRuntime, err := buildActivityRuntime(m.config, m.repositoryFactory)
	if err != nil {
		return err
	}
	outboxDispatcher, err := buildOutboxDispatcher(m.config, m.repositoryFactory, m.admin, activityRuntime)
	if err != nil {
		return err
	}

	m.worker = &WorkerRuntime{
		service:          m.service,
		enqueuer:         m.config.JobEnqueuer,
		syncOrchestrator: syncOrchestrator,
		outboxDispatcher: outboxDispatcher,
		webhookProcessor: webhookProcessor,
		activityRuntime:  activityRuntime,
	}
	if webhookProcessor != nil && m.config.WebhookHandler == nil && m.config.Worker.Enabled && m.worker.HasEnqueuer() {
		webhookProcessor.Handler = webhookEnqueueHandler{worker: m.worker}
	}
	m.webhookProcessor = webhookProcessor
	m.inboundDispatcher = inboundDispatcher
	m.syncOrchestrator = syncOrchestrator
	m.outboxDispatcher = outboxDispatcher
	m.activityRuntime = activityRuntime
	m.idempotencyStore = newIdempotencyStore(m.config.API.IdempotencyTTL)

	if m.config.API.Enabled {
		m.admin.AddInitHook(func(_ goadmin.AdminRouter) error {
			return m.registerAPIRoutes()
		})
	}

	return nil
}

func buildSyncOrchestrator(repositoryFactory any, service *gocore.Service) *servicesync.Orchestrator {
	if repositoryFactory == nil || service == nil {
		return nil
	}
	provider, ok := repositoryFactory.(interface {
		SyncJobStore() *sqlstore.SyncJobStore
	})
	if !ok {
		return nil
	}
	deps := service.Dependencies()
	if deps.SyncCursorStore == nil {
		return nil
	}
	jobs := provider.SyncJobStore()
	if jobs == nil {
		return nil
	}
	return servicesync.NewOrchestrator(jobs, deps.SyncCursorStore)
}

func buildOutboxDispatcher(
	cfg Config,
	repositoryFactory any,
	adminApp *goadmin.Admin,
	activityRuntime *activityRuntime,
) (gocore.LifecycleDispatcher, error) {
	if !cfg.Lifecycle.Dispatcher.Enabled || repositoryFactory == nil {
		return nil, nil
	}
	provider, ok := repositoryFactory.(interface {
		OutboxStore() *sqlstore.OutboxStore
		NotificationDispatchStore() *sqlstore.NotificationDispatchStore
		DB() *bun.DB
	})
	if !ok {
		return nil, nil
	}
	outboxStore := provider.OutboxStore()
	if outboxStore == nil {
		return nil, nil
	}

	registry := gocore.NewLifecycleProjectorRegistry()
	if cfg.Lifecycle.Projectors.Activity.Enabled {
		if activityRuntime != nil && activityRuntime.Sink() != nil {
			registry.Register("activity", gocore.NewLifecycleActivityProjector(activityRuntime.Sink(), nil))
		}
	}
	if cfg.Lifecycle.Projectors.Notifications.Enabled {
		notificationsProjector := buildNotificationsProjector(
			cfg.Lifecycle.Projectors.Notifications,
			provider.NotificationDispatchStore(),
			provider.DB(),
			adminApp,
		)
		if notificationsProjector != nil {
			registry.Register("go-notifications", notificationsProjector)
		}
	}
	for _, subscriber := range cfg.Lifecycle.Projectors.Subscribers {
		if subscriber.Handler == nil {
			continue
		}
		name := strings.TrimSpace(subscriber.Name)
		if name == "" {
			continue
		}
		registry.Register(name, subscriber.Handler)
	}

	dispatcher, err := gocore.NewOutboxDispatcher(
		outboxStore,
		registry,
		gocore.OutboxDispatcherConfig{
			BatchSize:      cfg.Lifecycle.Dispatcher.BatchSize,
			MaxAttempts:    cfg.Lifecycle.Dispatcher.MaxAttempts,
			InitialBackoff: cfg.Lifecycle.Dispatcher.InitialBackoff,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("modules/services: build outbox dispatcher: %w", err)
	}
	return dispatcher, nil
}

func registerInboundHandlers(dispatcher *goservicesinbound.Dispatcher, handlers []InboundHandler) {
	if dispatcher == nil {
		return
	}
	registered := map[string]bool{}
	for _, handler := range handlers {
		if handler == nil {
			continue
		}
		surface := strings.TrimSpace(strings.ToLower(handler.Surface()))
		if surface == "" {
			continue
		}
		if err := dispatcher.Register(handler); err == nil {
			registered[surface] = true
		}
	}

	fallback := []string{
		goservicesinbound.SurfaceWebhook,
		goservicesinbound.SurfaceCommand,
		goservicesinbound.SurfaceInteraction,
		goservicesinbound.SurfaceEventCallback,
	}
	sort.Strings(fallback)
	for _, surface := range fallback {
		if registered[surface] {
			continue
		}
		_ = dispatcher.Register(noopInboundHandler{surface: surface})
	}
}

type webhookDispatchHandler struct {
	dispatcher *goservicesinbound.Dispatcher
}

func (h webhookDispatchHandler) Handle(ctx context.Context, req gocore.InboundRequest) (gocore.InboundResult, error) {
	if h.dispatcher == nil {
		return gocore.InboundResult{
			Accepted:   true,
			StatusCode: 202,
			Metadata: map[string]any{
				"queued": false,
			},
		}, nil
	}
	req.Surface = goservicesinbound.SurfaceWebhook
	return h.dispatcher.Dispatch(ctx, req)
}

type webhookEnqueueHandler struct {
	worker *WorkerRuntime
}

func (h webhookEnqueueHandler) Handle(ctx context.Context, req gocore.InboundRequest) (gocore.InboundResult, error) {
	if h.worker == nil {
		return gocore.InboundResult{}, fmt.Errorf("modules/services: worker runtime is not configured")
	}
	if err := h.worker.EnqueueWebhook(ctx, req); err != nil {
		return gocore.InboundResult{}, err
	}
	return gocore.InboundResult{
		Accepted:   true,
		StatusCode: 202,
		Metadata: map[string]any{
			"queued": true,
			"job_id": jobIDWebhookProcess,
		},
	}, nil
}

type noopInboundHandler struct {
	surface string
}

func (h noopInboundHandler) Surface() string {
	return strings.TrimSpace(strings.ToLower(h.surface))
}

func (h noopInboundHandler) Handle(context.Context, gocore.InboundRequest) (gocore.InboundResult, error) {
	return gocore.InboundResult{
		Accepted:   true,
		StatusCode: 202,
		Metadata: map[string]any{
			"surface": h.Surface(),
			"handled": false,
		},
	}, nil
}

func resolveBunDB(persistenceClient any, repositoryFactory any) *bun.DB {
	if provider, ok := persistenceClient.(interface{ DB() *bun.DB }); ok {
		if db := provider.DB(); db != nil {
			return db
		}
	}
	if provider, ok := repositoryFactory.(interface{ DB() *bun.DB }); ok {
		if db := provider.DB(); db != nil {
			return db
		}
	}
	return nil
}

func inboundRequestToParams(req gocore.InboundRequest) map[string]any {
	return map[string]any{
		"provider_id": strings.TrimSpace(req.ProviderID),
		"surface":     strings.TrimSpace(req.Surface),
		"headers":     copyStringMap(req.Headers),
		"metadata":    copyAnyMap(req.Metadata),
		"body":        base64.StdEncoding.EncodeToString(append([]byte(nil), req.Body...)),
	}
}

func inboundRequestFromParams(params map[string]any) (gocore.InboundRequest, error) {
	bodyEncoded := strings.TrimSpace(toString(params["body"]))
	body := []byte{}
	if bodyEncoded != "" {
		decoded, err := base64.StdEncoding.DecodeString(bodyEncoded)
		if err != nil {
			return gocore.InboundRequest{}, fmt.Errorf("modules/services: decode inbound body: %w", err)
		}
		body = decoded
	}
	return gocore.InboundRequest{
		ProviderID: strings.TrimSpace(toString(params["provider_id"])),
		Surface:    strings.TrimSpace(toString(params["surface"])),
		Headers:    toStringMap(params["headers"]),
		Metadata:   toStringAnyMap(params["metadata"]),
		Body:       body,
	}, nil
}

func copyStringMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func toStringMap(value any) map[string]string {
	if value == nil {
		return map[string]string{}
	}
	if typed, ok := value.(map[string]string); ok {
		return copyStringMap(typed)
	}
	if typed, ok := value.(map[string]any); ok {
		out := make(map[string]string, len(typed))
		for key, raw := range typed {
			out[key] = toString(raw)
		}
		return out
	}
	return map[string]string{}
}

func toStringAnyMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	if typed, ok := value.(map[string]any); ok {
		return copyAnyMap(typed)
	}
	return map[string]any{}
}

func copyAnyMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func toInt(value any, fallback int) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int8:
		return int(typed)
	case int16:
		return int(typed)
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return fallback
		}
		parsed, err := strconv.Atoi(trimmed)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

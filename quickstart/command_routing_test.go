package quickstart

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	gocommand "github.com/goliatone/go-command"
	job "github.com/goliatone/go-job"
	jobqueue "github.com/goliatone/go-job/queue"
)

const quickstartQueuedCommandName = "quickstart.command_routing.dispatch"

type quickstartQueuedMessage struct {
	Value string `json:"value"`
}

func (quickstartQueuedMessage) Type() string { return quickstartQueuedCommandName }

type quickstartQueuedInlineCommand struct {
	calls int
	last  quickstartQueuedMessage
}

func (c *quickstartQueuedInlineCommand) Execute(_ context.Context, msg quickstartQueuedMessage) error {
	c.calls++
	c.last = msg
	return nil
}

func TestWithCommandExecutionPolicyInjectsPolicy(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Test", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
		DefaultMode: gocommand.ExecutionModeQueued,
		PerCommand: map[string]gocommand.ExecutionMode{
			"docs.remediate": gocommand.ExecutionModeInline,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	policy := adm.Commands().ExecutionPolicy()
	if policy.DefaultMode != gocommand.ExecutionModeQueued {
		t.Fatalf("expected queued default mode, got %q", policy.DefaultMode)
	}
	if mode, ok := policy.Resolve("docs.remediate"); !ok || mode != gocommand.ExecutionModeInline {
		t.Fatalf("expected docs.remediate inline override, got mode=%q ok=%v", mode, ok)
	}
}

func TestNewAdminWithCommandQueueRoutingDispatchesQueuedByPolicy(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Test", "en")
	enqueuer := &quickstartQueueReceiptEnqueuer{}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
			PerCommand: map[string]gocommand.ExecutionMode{
				quickstartQueuedCommandName: gocommand.ExecutionModeQueued,
			},
		}),
		WithCommandQueueRouting(CommandQueueRoutingConfig{
			Enabled:  true,
			Enqueuer: enqueuer,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	inline := &quickstartQueuedInlineCommand{}
	if _, err = admin.RegisterCommand(adm.Commands(), inline); err != nil {
		t.Fatalf("RegisterCommand: %v", err)
	}
	if err = admin.RegisterMessageFactory(adm.Commands(), quickstartQueuedCommandName, func(payload map[string]any, _ []string) (quickstartQueuedMessage, error) {
		return quickstartQueuedMessage{Value: toString(payload["value"])}, nil
	}); err != nil {
		t.Fatalf("RegisterMessageFactory: %v", err)
	}

	receipt, err := adm.Commands().DispatchByNameWithOptions(context.Background(), quickstartQueuedCommandName, map[string]any{
		"value": "queued",
	}, nil, gocommand.DispatchOptions{
		CorrelationID: "corr-command-routing",
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
		},
	})
	if err != nil {
		t.Fatalf("DispatchByNameWithOptions: %v", err)
	}

	if receipt.Mode != gocommand.ExecutionModeQueued {
		t.Fatalf("expected queued mode, got %q", receipt.Mode)
	}
	if receipt.DispatchID == "" || receipt.EnqueuedAt == nil {
		t.Fatalf("expected queued receipt metadata, got %+v", receipt)
	}
	if inline.calls != 0 {
		t.Fatalf("expected queued routing to skip inline execution, got %d inline calls", inline.calls)
	}
	if enqueuer.last == nil {
		t.Fatalf("expected enqueuer message capture")
	}
	if enqueuer.last.JobID != quickstartQueuedCommandName {
		t.Fatalf("expected queued job id %q, got %q", quickstartQueuedCommandName, enqueuer.last.JobID)
	}
	if enqueuer.last.ExecutionID != "corr-command-routing" {
		t.Fatalf("expected correlation id corr-command-routing, got %q", enqueuer.last.ExecutionID)
	}
}

func TestNewAdminWithCommandQueueRoutingRequiresEnqueuer(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Test", "en")
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithCommandQueueRouting(CommandQueueRoutingConfig{
		Enabled: true,
	}))
	if err == nil {
		t.Fatalf("expected error for missing enqueuer")
	}
	if !errors.Is(err, ErrCommandQueueRoutingConfig) {
		t.Fatalf("expected ErrCommandQueueRoutingConfig, got %v", err)
	}
}

func TestCommandQueueRoutingFallbackReceiptWhenAdapterDoesNotExposeDispatchMetadata(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Test", "en")
	enqueuer := &quickstartQueueLegacyEnqueuer{}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
			PerCommand: map[string]gocommand.ExecutionMode{
				quickstartQueuedCommandName: gocommand.ExecutionModeQueued,
			},
		}),
		WithCommandQueueRouting(CommandQueueRoutingConfig{
			Enabled:  true,
			Enqueuer: enqueuer,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	if err = admin.RegisterMessageFactory(adm.Commands(), quickstartQueuedCommandName, func(payload map[string]any, _ []string) (quickstartQueuedMessage, error) {
		return quickstartQueuedMessage{Value: toString(payload["value"])}, nil
	}); err != nil {
		t.Fatalf("RegisterMessageFactory: %v", err)
	}

	receipt, err := adm.Commands().DispatchByNameWithOptions(context.Background(), quickstartQueuedCommandName, map[string]any{
		"value": "queued",
	}, nil, gocommand.DispatchOptions{})
	if err != nil {
		t.Fatalf("DispatchByNameWithOptions: %v", err)
	}
	if receipt.DispatchID == "" || receipt.EnqueuedAt == nil {
		t.Fatalf("expected fallback dispatch metadata, got %+v", receipt)
	}
}

func TestTranslationCommandExecutionModeAppliesPolicyOverrides(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Test", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationExchangeConfig(TranslationExchangeConfig{
			Enabled:              true,
			Store:                &stubQuickstartTranslationExchangeStore{},
			CommandExecutionMode: gocommand.ExecutionModeQueued,
		}),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:              true,
			Repository:           newQuickstartTranslationQueueRepo(),
			SupportedLocales:     []string{"en"},
			CommandExecutionMode: gocommand.ExecutionModeQueued,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	policy := adm.Commands().ExecutionPolicy()
	if mode, ok := policy.Resolve((admin.TranslationImportApplyInput{}).Type()); !ok || mode != gocommand.ExecutionModeQueued {
		t.Fatalf("expected queued exchange command policy override, got mode=%q ok=%v", mode, ok)
	}
	if mode, ok := policy.Resolve((admin.TranslationQueueClaimInput{}).Type()); !ok || mode != gocommand.ExecutionModeQueued {
		t.Fatalf("expected queued queue command policy override, got mode=%q ok=%v", mode, ok)
	}
}

func TestTranslationCommandExecutionModeDoesNotOverrideExplicitPolicy(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Test", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
			PerCommand: map[string]gocommand.ExecutionMode{
				(admin.TranslationQueueClaimInput{}).Type(): gocommand.ExecutionModeInline,
			},
		}),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:              true,
			Repository:           newQuickstartTranslationQueueRepo(),
			SupportedLocales:     []string{"en"},
			CommandExecutionMode: gocommand.ExecutionModeQueued,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	policy := adm.Commands().ExecutionPolicy()
	if mode, ok := policy.Resolve((admin.TranslationQueueClaimInput{}).Type()); !ok || mode != gocommand.ExecutionModeInline {
		t.Fatalf("expected explicit inline policy to win, got mode=%q ok=%v", mode, ok)
	}
}

type quickstartQueueReceiptEnqueuer struct {
	last    *job.ExecutionMessage
	counter int
}

func (e *quickstartQueueReceiptEnqueuer) Enqueue(_ context.Context, msg *job.ExecutionMessage) (jobqueue.EnqueueReceipt, error) {
	e.counter++
	e.last = cloneExecutionMessageForRouting(msg)
	return jobqueue.EnqueueReceipt{
		DispatchID: "dispatch-queue-receipt",
		EnqueuedAt: time.Unix(int64(e.counter), 0).UTC(),
	}, nil
}

type quickstartQueueLegacyEnqueuer struct {
	last *job.ExecutionMessage
}

func (e *quickstartQueueLegacyEnqueuer) Enqueue(_ context.Context, msg *job.ExecutionMessage) (jobqueue.EnqueueReceipt, error) {
	e.last = cloneExecutionMessageForRouting(msg)
	return jobqueue.EnqueueReceipt{}, nil
}

func cloneExecutionMessageForRouting(msg *job.ExecutionMessage) *job.ExecutionMessage {
	if msg == nil {
		return nil
	}
	cp := *msg
	cp.Parameters = cloneAnyMap(msg.Parameters)
	return &cp
}

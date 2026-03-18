package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	gocommand "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	job "github.com/goliatone/go-job"
	jobqueue "github.com/goliatone/go-job/queue"
	queuecommand "github.com/goliatone/go-job/queue/command"
	qidempotency "github.com/goliatone/go-job/queue/idempotency"
	"github.com/google/uuid"
)

// ErrCommandQueueRoutingConfig indicates invalid quickstart command queue routing wiring.
var ErrCommandQueueRoutingConfig = errors.New("command queue routing config invalid")

// CommandQueueRoutingConfig configures optional quickstart queued command dispatch wiring.
type CommandQueueRoutingConfig struct {
	Enabled bool `json:"enabled,omitempty"`

	Enqueuer jobqueue.Enqueuer      `json:"-"`
	Registry *queuecommand.Registry `json:"-"`

	// IdempotencyStore enables durable deduplication for drop|merge|replace policies.
	IdempotencyStore qidempotency.Store `json:"-"`
	// IdempotencyTTL controls dedup record expiration when IdempotencyStore is configured.
	IdempotencyTTL time.Duration `json:"idempotency_ttl,omitempty"`
}

type commandQueueRoutingConfigError struct {
	Missing []string `json:"missing"`
	Reason  string   `json:"reason"`
}

func (e commandQueueRoutingConfigError) Error() string {
	if len(e.Missing) > 0 {
		return fmt.Sprintf("%s (missing: %s)", ErrCommandQueueRoutingConfig.Error(), strings.Join(e.Missing, ", "))
	}
	if strings.TrimSpace(e.Reason) != "" {
		return fmt.Sprintf("%s (%s)", ErrCommandQueueRoutingConfig.Error(), strings.TrimSpace(e.Reason))
	}
	return ErrCommandQueueRoutingConfig.Error()
}

func (e commandQueueRoutingConfigError) Unwrap() error {
	return ErrCommandQueueRoutingConfig
}

// WithCommandExecutionPolicy overrides command execution policy used by quickstart NewAdmin bootstrap.
func WithCommandExecutionPolicy(policy admin.CommandExecutionPolicy) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.commandExecutionPolicy = cloneCommandExecutionPolicy(policy)
		opts.commandExecutionPolicySet = true
	}
}

// WithCommandQueueRouting configures queued command dispatch wiring for quickstart NewAdmin bootstrap.
func WithCommandQueueRouting(cfg CommandQueueRoutingConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		normalized, err := normalizeCommandQueueRoutingConfig(cfg)
		if err != nil {
			opts.addError(err)
			return
		}
		opts.commandQueueRouting = normalized
		opts.commandQueueRoutingSet = true
	}
}

// TranslationExchangeCommandIDs returns command ids registered by exchange quickstart wiring.
func TranslationExchangeCommandIDs() []string {
	return []string{
		(admin.TranslationExportInput{}).Type(),
		(admin.TranslationImportValidateInput{}).Type(),
		(admin.TranslationImportApplyInput{}).Type(),
		(admin.TranslationImportRunInput{}).Type(),
		(admin.TranslationImportRunTriggerInput{}).Type(),
	}
}

// TranslationQueueCommandIDs returns command ids registered by translation queue quickstart wiring.
func TranslationQueueCommandIDs() []string {
	return []string{
		(admin.TranslationQueueClaimInput{}).Type(),
		(admin.TranslationQueueAssignInput{}).Type(),
		(admin.TranslationQueueReleaseInput{}).Type(),
		(admin.TranslationQueueSubmitInput{}).Type(),
		(admin.TranslationQueueApproveInput{}).Type(),
		(admin.TranslationQueueRejectInput{}).Type(),
		(admin.TranslationQueueArchiveInput{}).Type(),
		(admin.TranslationQueueBulkAssignInput{}).Type(),
		(admin.TranslationQueueBulkReleaseInput{}).Type(),
		(admin.TranslationQueueBulkPriorityInput{}).Type(),
		(admin.TranslationQueueBulkArchiveInput{}).Type(),
	}
}

func applyCommandExecutionRoutingConfig(cfg *admin.Config, opts adminOptions) {
	if cfg == nil {
		return
	}

	if opts.commandExecutionPolicySet {
		cfg.Commands.Execution = cloneCommandExecutionPolicy(opts.commandExecutionPolicy)
	}

	perCommand := cfg.Commands.Execution.PerCommand
	if perCommand == nil {
		perCommand = map[string]gocommand.ExecutionMode{}
	}

	setPerCommandModeIfUnset(perCommand, TranslationExchangeCommandIDs(), opts.translationExchangeConfig.CommandExecutionMode)
	setPerCommandModeIfUnset(perCommand, TranslationQueueCommandIDs(), opts.translationQueueConfig.CommandExecutionMode)
	cfg.Commands.Execution.PerCommand = perCommand
}

func setPerCommandModeIfUnset(target map[string]gocommand.ExecutionMode, commandIDs []string, mode gocommand.ExecutionMode) {
	mode = gocommand.NormalizeExecutionMode(mode)
	if mode == "" || target == nil || len(commandIDs) == 0 {
		return
	}
	for _, commandID := range commandIDs {
		commandID = strings.TrimSpace(commandID)
		if commandID == "" {
			continue
		}
		if existing, ok := target[commandID]; ok && gocommand.NormalizeExecutionMode(existing) != "" {
			continue
		}
		target[commandID] = mode
	}
}

func configureCommandQueueRouting(opts adminOptions) error {
	if !opts.commandQueueRoutingSet || !opts.commandQueueRouting.Enabled {
		return nil
	}
	cfg, err := normalizeCommandQueueRoutingConfig(opts.commandQueueRouting)
	if err != nil {
		return err
	}
	executor := &quickstartCommandQueueExecutor{
		enqueuer:         cfg.Enqueuer,
		registry:         cfg.Registry,
		idempotencyStore: cfg.IdempotencyStore,
		idempotencyTTL:   cfg.IdempotencyTTL,
		now: func() time.Time {
			return time.Now().UTC()
		},
		dispatchID: func() string {
			return "dispatch-" + uuid.NewString()
		},
	}
	return dispatcher.RegisterExecutor(gocommand.ExecutionModeQueued, executor)
}

func normalizeCommandQueueRoutingConfig(cfg CommandQueueRoutingConfig) (CommandQueueRoutingConfig, error) {
	if !cfg.Enabled {
		return cfg, nil
	}
	missing := []string{}
	if cfg.Enqueuer == nil {
		missing = append(missing, "enqueuer")
	}
	if len(missing) > 0 {
		return CommandQueueRoutingConfig{}, commandQueueRoutingConfigError{Missing: missing}
	}
	if cfg.IdempotencyTTL < 0 {
		return CommandQueueRoutingConfig{}, commandQueueRoutingConfigError{
			Reason: "idempotency_ttl must be >= 0",
		}
	}
	return cfg, nil
}

type quickstartCommandQueueExecutor struct {
	enqueuer         jobqueue.Enqueuer
	registry         *queuecommand.Registry
	idempotencyStore qidempotency.Store
	idempotencyTTL   time.Duration
	now              func() time.Time
	dispatchID       func() string
}

func (e *quickstartCommandQueueExecutor) Execute(ctx context.Context, msg any, commandID string, opts gocommand.DispatchOptions) (gocommand.DispatchReceipt, error) {
	if e == nil || e.enqueuer == nil {
		return gocommand.DispatchReceipt{}, commandQueueRoutingConfigError{Missing: []string{"enqueuer"}}
	}

	params, err := queuecommand.ParametersFromPayload(msg)
	if err != nil {
		return gocommand.DispatchReceipt{}, err
	}

	receipt, err := queuecommand.EnqueueWithOptions(
		ctx,
		e.enqueuer,
		e.registry,
		strings.TrimSpace(commandID),
		params,
		queuecommand.EnqueueOptions{
			Delay:            opts.Delay,
			RunAt:            cloneTimeValue(opts.RunAt),
			IdempotencyKey:   strings.TrimSpace(opts.IdempotencyKey),
			DedupPolicy:      job.DeduplicationPolicy(gocommand.NormalizeDedupPolicy(opts.DedupPolicy)),
			CorrelationID:    strings.TrimSpace(opts.CorrelationID),
			Metadata:         cloneAnyMap(opts.Metadata),
			IdempotencyStore: e.idempotencyStore,
			IdempotencyTTL:   e.idempotencyTTL,
		},
	)
	if err != nil {
		return gocommand.DispatchReceipt{}, err
	}

	dispatchID := strings.TrimSpace(receipt.DispatchID)
	if dispatchID == "" && e.dispatchID != nil {
		dispatchID = strings.TrimSpace(e.dispatchID())
	}
	enqueuedAt := receipt.EnqueuedAt
	if enqueuedAt.IsZero() {
		if e.now != nil {
			enqueuedAt = e.now()
		} else {
			enqueuedAt = time.Now().UTC()
		}
	}

	return gocommand.DispatchReceipt{
		Accepted:      true,
		Mode:          gocommand.ExecutionModeQueued,
		CommandID:     strings.TrimSpace(commandID),
		DispatchID:    dispatchID,
		EnqueuedAt:    &enqueuedAt,
		CorrelationID: strings.TrimSpace(opts.CorrelationID),
	}, nil
}

func cloneCommandExecutionPolicy(policy admin.CommandExecutionPolicy) admin.CommandExecutionPolicy {
	cloned := admin.CommandExecutionPolicy{
		DefaultMode: gocommand.NormalizeExecutionMode(policy.DefaultMode),
		PerCommand:  map[string]gocommand.ExecutionMode{},
	}
	for rawKey, rawMode := range policy.PerCommand {
		key := strings.TrimSpace(rawKey)
		if key == "" {
			continue
		}
		cloned.PerCommand[key] = gocommand.NormalizeExecutionMode(rawMode)
	}
	return cloned
}

func cloneTimeValue(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	cp := value.UTC()
	return &cp
}

package admin

import (
	"context"
	"crypto/sha256"
	stderrors "errors"
	"fmt"
	"reflect"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	goerrors "github.com/goliatone/go-errors"
)

// CommandRunObserverConfig configures lifecycle mapping and bounded publication.
type CommandRunObserverConfig struct {
	Publisher      CommandRunPublisher
	PublishTimeout time.Duration
	RevisionLimit  int
	ContractLimits CommandRunContractLimits
	ApplicationID  string
	EnvironmentID  string
	ScopeResolver  CommandRunScopeResolver
	OnError        func(error)
}

// CommandRunObserverBridge maps go-command lifecycle events into the canonical
// go-admin contract and owns only its dispatcher observer registration.
type CommandRunObserverBridge struct {
	mu sync.Mutex

	config        CommandRunObserverConfig
	subscription  dispatcher.Subscription
	revisions     map[string]uint64
	revisionOrder []string
}

func NewCommandRunObserverBridge(config CommandRunObserverConfig) (*CommandRunObserverBridge, error) {
	if config.Publisher == nil {
		return nil, errorsNewCommandRunObserver("publisher is required")
	}
	if config.PublishTimeout <= 0 {
		config.PublishTimeout = defaultCommandRunPublishTimeout
	}
	if config.RevisionLimit <= 0 {
		config.RevisionLimit = defaultCommandRunDedupeLimit
	}
	config.ContractLimits = config.ContractLimits.normalized()
	config.ApplicationID = strings.TrimSpace(config.ApplicationID)
	config.EnvironmentID = strings.TrimSpace(config.EnvironmentID)
	return &CommandRunObserverBridge{
		config:    config,
		revisions: make(map[string]uint64, config.RevisionLimit),
	}, nil
}

// Start registers the bridge only for roles that publish command lifecycle.
// Repeated starts do not duplicate the package-global observer.
func (b *CommandRunObserverBridge) Start(role CommandRunProcessRole) error {
	if b == nil {
		return errorsNewCommandRunObserver("bridge is nil")
	}
	if !role.Valid() {
		return errorsNewCommandRunObserver("role %d is invalid", role)
	}
	if !role.Has(CommandRunRolePublisher) {
		return nil
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.subscription != nil {
		return nil
	}
	b.subscription = dispatcher.AddCommandRunObserver(b)
	return nil
}

// Close unregisters the package-global observer. It is idempotent and the
// bridge may be started again without retaining duplicate callbacks.
func (b *CommandRunObserverBridge) Close() {
	if b == nil {
		return
	}
	b.mu.Lock()
	subscription := b.subscription
	b.subscription = nil
	b.mu.Unlock()
	if subscription != nil {
		subscription.Unsubscribe()
	}
}

// OnCommandRunEvent implements command.CommandRunObserver. Dispatcher treats
// returned errors as diagnostics and never changes command execution results.
func (b *CommandRunObserverBridge) OnCommandRunEvent(ctx context.Context, event command.CommandRunEvent) error {
	if b == nil {
		return errorsNewCommandRunObserver("bridge is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	baseCtx := context.WithoutCancel(ctx)
	update, droppedMetadata, err := b.mapEvent(baseCtx, event)
	if droppedMetadata != nil {
		b.reportError(droppedMetadata)
	}
	if err != nil {
		b.reportError(err)
		return err
	}
	publishCtx, cancel := context.WithTimeout(baseCtx, b.config.PublishTimeout)
	defer cancel()
	if err := b.config.Publisher.PublishCommandRun(publishCtx, update); err != nil {
		wrapped := safeCommandRunPublishError(err)
		b.reportError(wrapped)
		return wrapped
	}
	return nil
}

func (b *CommandRunObserverBridge) mapEvent(ctx context.Context, event command.CommandRunEvent) (CommandRunUpdate, error, error) {
	phase, err := mapCommandRunPhase(event.Phase)
	if err != nil {
		return CommandRunUpdate{}, nil, err
	}
	runID := strings.TrimSpace(event.RunID)
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}
	revision := commandRunUpstreamRevision(event)
	if revision == 0 {
		revision = commandRunCompatibilityRevision(phase, event.OccurredAt)
	}
	b.observeRevision(runID, revision)
	update := CommandRunUpdate{
		SchemaVersion: CommandRunSchemaVersion,
		EventID:       commandRunEventID(runID, revision, phase, event.OccurredAt),
		RunID:         runID,
		Revision:      revision,
		CommandID:     strings.TrimSpace(event.CommandID),
		DispatchID:    strings.TrimSpace(event.DispatchID),
		CorrelationID: strings.TrimSpace(event.CorrelationID),
		Phase:         phase,
		OccurredAt:    event.OccurredAt,
		Mode:          truncateCommandRunText(string(event.ExecutionMode), b.config.ContractLimits.MaxTextLength),
		Checkpoint:    truncateCommandRunText(event.Checkpoint, b.config.ContractLimits.MaxTextLength),
		Message:       truncateCommandRunText(event.Message, b.config.ContractLimits.MaxTextLength),
		Attempt:       event.Attempt,
		MaxAttempts:   event.MaxAttempts,
		Scope: CommandRunScope{
			ApplicationID: b.config.ApplicationID,
			EnvironmentID: b.config.EnvironmentID,
		},
		Metadata: command.CloneCommandRunMetadata(event.Metadata),
	}
	if !event.StartedAt.IsZero() {
		started := event.StartedAt
		update.StartedAt = &started
	}
	if event.Duration >= 0 && (event.Duration > 0 || phase.Terminal()) {
		duration := event.Duration.Milliseconds()
		update.DurationMS = &duration
	}
	if phase == CommandRunPhaseCheckpoint || phase == CommandRunPhaseProgress {
		current, total := event.Current, event.Total
		update.Current, update.Total = &current, &total
	}
	update.Failure = safeCommandRunFailure(event)
	if update.Failure != nil {
		update.Failure.Category = truncateCommandRunText(update.Failure.Category, b.config.ContractLimits.MaxIDLength)
		update.Failure.Code = truncateCommandRunText(update.Failure.Code, b.config.ContractLimits.MaxIDLength)
	}

	scope, err := b.resolveScope(ctx, update)
	if err != nil {
		return CommandRunUpdate{}, nil, err
	}
	update.Scope = scope
	normalized, err := NormalizeCommandRunUpdate(update, b.config.ContractLimits)
	if err == nil {
		return normalized, nil, nil
	}
	if len(update.Metadata) == 0 {
		return CommandRunUpdate{}, nil, err
	}
	metadataErr := fmt.Errorf("%w: command-run observer dropped unsafe metadata", ErrCommandRunDeliveryDropped)
	update.Metadata = nil
	normalized, err = NormalizeCommandRunUpdate(update, b.config.ContractLimits)
	if err != nil {
		return CommandRunUpdate{}, metadataErr, err
	}
	return normalized, metadataErr, nil
}

// commandRunUpstreamRevision keeps go-admin source-compatible with the current
// released go-command contract while recognizing the durable Revision field in
// the next additive release. The reflection path can be removed after the
// minimum go-command version is advanced.
func commandRunUpstreamRevision(event command.CommandRunEvent) uint64 {
	value := reflect.ValueOf(event)
	field := value.FieldByName("Revision")
	if !field.IsValid() || field.Kind() != reflect.Uint64 {
		return 0
	}
	return field.Uint()
}

func commandRunCompatibilityRevision(phase CommandRunPhase, occurredAt time.Time) uint64 {
	// Legacy go-command releases do not carry a persisted revision. Partition
	// revisions into lifecycle bands so acceptance, execution, progress, and
	// terminal events remain ordered across processes without shared memory. The
	// lower bits retain occurrence time for ordering within a band.
	const timeMask = uint64(1<<61) - 1
	var band uint64
	switch {
	case phase == CommandRunPhaseStarted:
		band = 1
	case phase == CommandRunPhaseCheckpoint || phase == CommandRunPhaseProgress:
		band = 2
	case phase.Terminal():
		band = 3
	}
	nanos := occurredAt.UTC().UnixNano()
	if nanos < 0 {
		nanos = 0
	}
	revision := band<<61 | uint64(nanos)&timeMask
	if revision == 0 {
		return 1
	}
	return revision
}

func (b *CommandRunObserverBridge) resolveScope(ctx context.Context, update CommandRunUpdate) (CommandRunScope, error) {
	base := update.Scope.Normalize()
	if b.config.ScopeResolver == nil {
		return base, nil
	}
	resolved, err := b.config.ScopeResolver.ResolveCommandRunScope(ctx, update.Clone())
	if err != nil {
		return CommandRunScope{}, fmt.Errorf("%w: scope resolution failed", ErrCommandRunScopeRejected)
	}
	resolved = resolved.Normalize()
	if base.ApplicationID != "" && resolved.ApplicationID != "" && resolved.ApplicationID != base.ApplicationID {
		return CommandRunScope{}, fmt.Errorf("%w: application identity mismatch", ErrCommandRunScopeRejected)
	}
	if base.EnvironmentID != "" && resolved.EnvironmentID != "" && resolved.EnvironmentID != base.EnvironmentID {
		return CommandRunScope{}, fmt.Errorf("%w: environment identity mismatch", ErrCommandRunScopeRejected)
	}
	if resolved.ApplicationID == "" {
		resolved.ApplicationID = base.ApplicationID
	}
	if resolved.EnvironmentID == "" {
		resolved.EnvironmentID = base.EnvironmentID
	}
	return resolved, nil
}

func (b *CommandRunObserverBridge) nextRevision(runID string) uint64 {
	return b.nextRevisionAfter(runID, 0)
}

func (b *CommandRunObserverBridge) nextRevisionAfter(runID string, minimum uint64) uint64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	revision := b.revisions[runID] + 1
	if revision <= minimum {
		revision = minimum + 1
	}
	b.revisions[runID] = revision
	b.touchRevisionLocked(runID)
	return revision
}

func (b *CommandRunObserverBridge) observeRevision(runID string, revision uint64) {
	if revision == 0 {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if revision > b.revisions[runID] {
		b.revisions[runID] = revision
	}
	b.touchRevisionLocked(runID)
}

func (b *CommandRunObserverBridge) touchRevisionLocked(runID string) {
	for i, existing := range b.revisionOrder {
		if existing == runID {
			copy(b.revisionOrder[i:], b.revisionOrder[i+1:])
			b.revisionOrder = b.revisionOrder[:len(b.revisionOrder)-1]
			break
		}
	}
	b.revisionOrder = append(b.revisionOrder, runID)
	for len(b.revisionOrder) > b.config.RevisionLimit {
		oldest := b.revisionOrder[0]
		b.revisionOrder[0] = ""
		b.revisionOrder = b.revisionOrder[1:]
		delete(b.revisions, oldest)
	}
}

func (b *CommandRunObserverBridge) reportError(err error) {
	if err != nil && b.config.OnError != nil {
		b.config.OnError(err)
	}
}

func safeCommandRunPublishError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case stderrors.Is(err, ErrCommandRunDeliveryDropped), stderrors.Is(err, ErrCommandRunTransportBackpressure):
		return ErrCommandRunDeliveryDropped
	case stderrors.Is(err, ErrCommandRunPublishFailed):
		return ErrCommandRunPublishFailed
	case stderrors.Is(err, context.Canceled), stderrors.Is(err, context.DeadlineExceeded), stderrors.Is(err, ErrCommandRunTransportClosed):
		return fmt.Errorf("%w: %w", ErrCommandRunPublishFailed, err)
	default:
		return ErrCommandRunPublishFailed
	}
}

func mapCommandRunPhase(phase command.CommandRunPhase) (CommandRunPhase, error) {
	mapped := CommandRunPhase(strings.ToLower(strings.TrimSpace(string(phase))))
	if !mapped.Valid() {
		return "", errorsNewCommandRunObserver("unsupported phase %q", phase)
	}
	return mapped, nil
}

func safeCommandRunFailure(event command.CommandRunEvent) *CommandRunFailure {
	category := strings.TrimSpace(event.FailureCategory)
	code := ""
	var structured *goerrors.Error
	if event.Error != nil && stderrors.As(event.Error, &structured) && structured != nil {
		if category == "" {
			category = strings.TrimSpace(structured.Category.String())
		}
		code = strings.TrimSpace(structured.TextCode)
	}
	if category == "" && code == "" {
		return nil
	}
	return &CommandRunFailure{Category: category, Code: code}
}

func commandRunEventID(runID string, revision uint64, phase CommandRunPhase, occurredAt time.Time) string {
	value := fmt.Sprintf("%s\x00%d\x00%s\x00%d", runID, revision, phase, occurredAt.UnixNano())
	sum := sha256.Sum256([]byte(value))
	return fmt.Sprintf("cru-%x", sum[:16])
}

func truncateCommandRunText(value string, limit int) string {
	value = strings.TrimSpace(value)
	if limit <= 0 || utf8.RuneCountInString(value) <= limit {
		return value
	}
	runes := []rune(value)
	return string(runes[:limit])
}

func errorsNewCommandRunObserver(format string, args ...any) error {
	return fmt.Errorf("command-run observer: %s", fmt.Sprintf(format, args...))
}

var _ command.CommandRunObserver = (*CommandRunObserverBridge)(nil)

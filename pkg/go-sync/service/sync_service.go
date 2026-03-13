package service

import (
	"context"
	"log/slog"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
	"github.com/goliatone/go-admin/pkg/go-sync/observability"
	"github.com/goliatone/go-admin/pkg/go-sync/store"
)

const defaultIdempotencyTTL = 24 * time.Hour

// Option customizes SyncService behavior.
type Option func(*SyncService)

// WithMetrics overrides the metrics sink used by SyncService.
func WithMetrics(metrics observability.Metrics) Option {
	return func(s *SyncService) {
		if metrics != nil {
			s.metrics = metrics
		}
	}
}

// WithLogger overrides the structured logger used by SyncService.
func WithLogger(logger observability.Logger) Option {
	return func(s *SyncService) {
		if logger != nil {
			s.logger = logger
		}
	}
}

// WithIdempotencyTTL overrides the default replay window.
func WithIdempotencyTTL(ttl time.Duration) Option {
	return func(s *SyncService) {
		if ttl > 0 {
			s.idempotencyTTL = ttl
		}
	}
}

// SyncService orchestrates revision-safe reads, writes, and idempotent replay.
type SyncService struct {
	resources      store.ResourceStore
	idempotency    store.ReservingIdempotencyStore
	metrics        observability.Metrics
	logger         observability.Logger
	idempotencyTTL time.Duration
}

var _ core.SyncService = (*SyncService)(nil)

// NewSyncService builds a sync orchestration service around store contracts.
func NewSyncService(resources store.ResourceStore, idempotency store.ReservingIdempotencyStore, opts ...Option) (*SyncService, error) {
	if resources == nil {
		return nil, core.NewError(core.CodeTemporaryFailure, "resource store is required", nil)
	}

	svc := &SyncService{
		resources:      resources,
		idempotency:    idempotency,
		metrics:        observability.NopMetrics{},
		logger:         observability.NopLogger{},
		idempotencyTTL: defaultIdempotencyTTL,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc, nil
}

// Get loads the authoritative snapshot for a resource.
func (s *SyncService) Get(ctx context.Context, ref core.ResourceRef) (core.Snapshot, error) {
	if err := validateResourceRef(ref); err != nil {
		return core.Snapshot{}, err
	}

	startedAt := time.Now()
	snapshot, err := s.resources.Get(ctx, ref)
	if err != nil {
		mapped := s.mapError(err, "load resource")
		s.metrics.ObserveRead(ctx, time.Since(startedAt), false, readAttrs(ref, mapped))
		s.logGet(ctx, slog.LevelWarn, ref, mapped)
		return core.Snapshot{}, mapped
	}

	s.metrics.ObserveRead(ctx, time.Since(startedAt), true, readAttrs(ref, nil))
	s.logGet(ctx, slog.LevelInfo, ref, nil)
	return snapshot, nil
}

// Mutate applies a compare-and-swap mutation and replays previous results when possible.
func (s *SyncService) Mutate(ctx context.Context, input core.MutationInput) (core.MutationResult, error) {
	if err := validateMutationInput(input); err != nil {
		return core.MutationResult{}, err
	}

	startedAt := time.Now()
	scopedKey, err := ScopeIdempotencyKey(input)
	if err != nil {
		return core.MutationResult{}, err
	}
	var (
		reservation *store.IdempotencyReservation
	)
	if scopedKey != "" {
		var (
			replayed *core.MutationResult
			pending  bool
		)
		reservation, replayed, pending, err = s.reserveReplayKey(ctx, input, scopedKey)
		if err != nil {
			mapped := s.mapError(err, "reserve idempotency key")
			s.metrics.IncrementRetry(ctx, mutationAttrs(input, mapped))
			s.metrics.ObserveMutation(ctx, time.Since(startedAt), false, mutationAttrs(input, mapped))
			s.logMutation(ctx, slog.LevelWarn, input, mapped, map[string]any{
				"scoped_idempotency_key": scopedKey,
			})
			return core.MutationResult{}, mapped
		}
		if replayed != nil {
			s.metrics.IncrementReplay(ctx, mutationAttrs(input, nil))
			s.metrics.ObserveMutation(ctx, time.Since(startedAt), true, mutationAttrs(input, nil))
			s.logMutation(ctx, slog.LevelInfo, input, nil, map[string]any{
				"replay":                 true,
				"scoped_idempotency_key": scopedKey,
				"revision":               replayed.Snapshot.Revision,
			})
			return *replayed, nil
		}
		if pending {
			mapped := core.NewError(core.CodeTemporaryFailure, "mutation with the same idempotency key is already in progress", map[string]any{
				core.DetailIdempotencyKey: strings.TrimSpace(input.IdempotencyKey),
			})
			s.metrics.IncrementRetry(ctx, mutationAttrs(input, mapped))
			s.metrics.ObserveMutation(ctx, time.Since(startedAt), false, mutationAttrs(input, mapped))
			s.logMutation(ctx, slog.LevelWarn, input, mapped, map[string]any{
				"scoped_idempotency_key": scopedKey,
				"pending":                true,
			})
			return core.MutationResult{}, mapped
		}
	}

	snapshot, err := s.resources.Mutate(ctx, input)
	if err != nil {
		s.releaseReplayKey(ctx, input, reservation, scopedKey)
		if core.HasCode(err, core.CodeStaleRevision) {
			enriched := s.enrichStaleRevision(ctx, input.ResourceRef, err)
			s.metrics.IncrementConflict(ctx, mutationAttrs(input, enriched))
			s.metrics.ObserveMutation(ctx, time.Since(startedAt), false, mutationAttrs(input, enriched))
			s.logMutation(ctx, slog.LevelWarn, input, enriched, nil)
			return core.MutationResult{}, enriched
		}

		mapped := s.mapError(err, "mutate resource")
		if core.HasCode(mapped, core.CodeTemporaryFailure) {
			s.metrics.IncrementRetry(ctx, mutationAttrs(input, mapped))
		}
		s.metrics.ObserveMutation(ctx, time.Since(startedAt), false, mutationAttrs(input, mapped))
		s.logMutation(ctx, slog.LevelWarn, input, mapped, nil)
		return core.MutationResult{}, mapped
	}

	result := core.MutationResult{
		Snapshot: snapshot,
		Applied:  true,
		Replay:   false,
	}
	if reservation != nil && s.idempotency != nil {
		if err := s.idempotency.Commit(ctx, *reservation, result, s.idempotencyTTL); err != nil {
			mapped := s.retryableError("persist idempotency result", err)
			s.metrics.IncrementRetry(ctx, mutationAttrs(input, mapped))
			s.metrics.ObserveMutation(ctx, time.Since(startedAt), false, mutationAttrs(input, mapped))
			s.logMutation(ctx, slog.LevelError, input, mapped, map[string]any{
				"scoped_idempotency_key": scopedKey,
				"stored":                 false,
			})
			return core.MutationResult{}, mapped
		}
	}

	s.metrics.ObserveMutation(ctx, time.Since(startedAt), true, mutationAttrs(input, nil))
	s.logMutation(ctx, slog.LevelInfo, input, nil, map[string]any{
		"applied":  true,
		"revision": result.Snapshot.Revision,
	})
	return result, nil
}

func (s *SyncService) reserveReplayKey(
	ctx context.Context,
	input core.MutationInput,
	scopedKey string,
) (*store.IdempotencyReservation, *core.MutationResult, bool, error) {
	if strings.TrimSpace(scopedKey) == "" {
		return nil, nil, false, nil
	}
	if s.idempotency == nil {
		return nil, nil, false, core.NewError(core.CodeTemporaryFailure, "idempotency store is required for idempotent mutations", map[string]any{
			core.DetailIdempotencyKey: strings.TrimSpace(input.IdempotencyKey),
		})
	}

	outcome, err := s.idempotency.Reserve(ctx, scopedKey, s.idempotencyTTL)
	if err != nil {
		return nil, nil, false, s.retryableError("reserve idempotency key", err)
	}
	if outcome.Result != nil {
		replayed := cloneMutationResult(*outcome.Result)
		replayed.Replay = true
		return nil, &replayed, false, nil
	}
	return outcome.Reservation, nil, outcome.Pending, nil
}

func (s *SyncService) releaseReplayKey(
	ctx context.Context,
	input core.MutationInput,
	reservation *store.IdempotencyReservation,
	scopedKey string,
) {
	if s.idempotency == nil || reservation == nil {
		return
	}
	if err := s.idempotency.Release(ctx, *reservation); err != nil {
		mapped := s.retryableError("release idempotency reservation", err)
		s.metrics.IncrementRetry(ctx, mutationAttrs(input, mapped))
		s.logMutation(ctx, slog.LevelWarn, input, mapped, map[string]any{
			"scoped_idempotency_key": scopedKey,
			"released":               false,
		})
	}
}

// ScopeIdempotencyKey defines the canonical replay key scope for a mutation.
func ScopeIdempotencyKey(input core.MutationInput) (string, error) {
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		return "", nil
	}
	if strings.TrimSpace(input.ActorID) == "" {
		return "", core.NewError(core.CodeInvalidMutation, "actor id is required when idempotency key is set", map[string]any{
			"field": "actor_id",
		})
	}

	scopeParts := make([]string, 0, len(input.ResourceRef.Scope))
	for key, value := range input.ResourceRef.Scope {
		scopeParts = append(scopeParts, url.QueryEscape(strings.TrimSpace(key))+"="+url.QueryEscape(strings.TrimSpace(value)))
	}
	sort.Strings(scopeParts)

	parts := []string{
		"v1",
		kindPart(input.ResourceRef.Kind),
		kindPart(input.ResourceRef.ID),
		kindPart(input.Operation),
		"actor=" + url.QueryEscape(strings.TrimSpace(input.ActorID)),
		"scope=" + strings.Join(scopeParts, ","),
		"key=" + url.QueryEscape(idempotencyKey),
	}
	return strings.Join(parts, "|"), nil
}

func validateResourceRef(ref core.ResourceRef) error {
	if strings.TrimSpace(ref.Kind) == "" {
		return core.NewError(core.CodeInvalidMutation, "resource kind is required", map[string]any{
			"field": "resource_ref.kind",
		})
	}
	if strings.TrimSpace(ref.ID) == "" {
		return core.NewError(core.CodeInvalidMutation, "resource id is required", map[string]any{
			"field": "resource_ref.id",
		})
	}
	return nil
}

func validateMutationInput(input core.MutationInput) error {
	if err := validateResourceRef(input.ResourceRef); err != nil {
		return err
	}
	if strings.TrimSpace(input.Operation) == "" {
		return core.NewError(core.CodeInvalidMutation, "operation is required", map[string]any{
			"field": "operation",
		})
	}
	if strings.TrimSpace(input.IdempotencyKey) != "" && strings.TrimSpace(input.ActorID) == "" {
		return core.NewError(core.CodeInvalidMutation, "actor id is required when idempotency key is set", map[string]any{
			"field": "actor_id",
		})
	}
	if input.ExpectedRevision < 0 {
		return core.NewError(core.CodeInvalidMutation, "expected revision must be non-negative", map[string]any{
			"field": "expected_revision",
		})
	}
	return nil
}

func (s *SyncService) enrichStaleRevision(ctx context.Context, ref core.ResourceRef, err error) error {
	currentRevision, latest, _ := core.StaleRevisionDetails(err)
	if latest == nil {
		current, loadErr := s.resources.Get(ctx, ref)
		if loadErr == nil {
			latest = &current
		}
	}
	if currentRevision == 0 && latest != nil {
		currentRevision = latest.Revision
	}
	if currentRevision == 0 {
		return core.NewError(core.CodeStaleRevision, "resource has a newer revision", nil)
	}
	return core.NewStaleRevisionError(currentRevision, latest)
}

func (s *SyncService) mapError(err error, action string) error {
	if err == nil {
		return nil
	}
	if _, ok := core.ErrorCodeOf(err); ok {
		return err
	}
	return s.retryableError(action, err)
}

func (s *SyncService) retryableError(action string, err error) error {
	return core.NewWrappedError(core.CodeTemporaryFailure, action+" failed", nil, err)
}

func (s *SyncService) logGet(ctx context.Context, level slog.Level, ref core.ResourceRef, err error) {
	args := []any{
		"event", "go_sync.read",
		"resource_kind", strings.TrimSpace(ref.Kind),
		"resource_id", strings.TrimSpace(ref.ID),
		"scope", scopeLogValue(ref.Scope),
	}
	if code, ok := core.ErrorCodeOf(err); ok {
		args = append(args, "error_code", string(code))
		args = append(args, "error", err.Error())
	}
	s.logger.Log(ctx, level, "go-sync read", args...)
}

func (s *SyncService) logMutation(ctx context.Context, level slog.Level, input core.MutationInput, err error, extra map[string]any) {
	args := []any{
		"event", "go_sync.mutation",
		"resource_kind", strings.TrimSpace(input.ResourceRef.Kind),
		"resource_id", strings.TrimSpace(input.ResourceRef.ID),
		"operation", strings.TrimSpace(input.Operation),
		"expected_revision", input.ExpectedRevision,
		"actor_id", strings.TrimSpace(input.ActorID),
		"client_id", strings.TrimSpace(input.ClientID),
		"correlation_id", strings.TrimSpace(input.CorrelationID),
		"idempotency_key", strings.TrimSpace(input.IdempotencyKey),
		"scope", scopeLogValue(input.ResourceRef.Scope),
	}
	if code, ok := core.ErrorCodeOf(err); ok {
		args = append(args, "error_code", string(code))
		args = append(args, "error", err.Error())
	}
	for key, value := range extra {
		args = append(args, key, value)
	}
	s.logger.Log(ctx, level, "go-sync mutation", args...)
}

func readAttrs(ref core.ResourceRef, err error) map[string]string {
	attrs := map[string]string{
		"kind": strings.TrimSpace(ref.Kind),
	}
	if code, ok := core.ErrorCodeOf(err); ok {
		attrs["code"] = string(code)
	}
	return attrs
}

func mutationAttrs(input core.MutationInput, err error) map[string]string {
	attrs := map[string]string{
		"kind":      strings.TrimSpace(input.ResourceRef.Kind),
		"operation": strings.TrimSpace(input.Operation),
	}
	if code, ok := core.ErrorCodeOf(err); ok {
		attrs["code"] = string(code)
	}
	return attrs
}

func kindPart(value string) string {
	return url.QueryEscape(strings.TrimSpace(value))
}

func scopeLogValue(scope map[string]string) []string {
	if len(scope) == 0 {
		return nil
	}
	values := make([]string, 0, len(scope))
	for key, value := range scope {
		values = append(values, strings.TrimSpace(key)+"="+strings.TrimSpace(value))
	}
	sort.Strings(values)
	return values
}

func cloneMutationResult(result core.MutationResult) core.MutationResult {
	return core.MutationResult{
		Snapshot: result.Snapshot,
		Applied:  result.Applied,
		Replay:   result.Replay,
	}
}

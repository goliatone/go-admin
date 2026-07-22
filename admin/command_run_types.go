package admin

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	// CommandRunSchemaVersion is the current cross-process JSON contract version.
	CommandRunSchemaVersion = 1

	defaultCommandRunMaxIDLength       = 256
	defaultCommandRunMaxTextLength     = 2048
	defaultCommandRunMaxMetadataKeys   = 32
	defaultCommandRunMaxMetadataDepth  = 4
	defaultCommandRunMaxMetadataBytes  = 16 * 1024
	defaultCommandRunMaxMetadataString = 4096
)

var (
	// ErrInvalidCommandRunUpdate identifies updates that do not satisfy the
	// canonical command-run contract.
	ErrInvalidCommandRunUpdate = errors.New("invalid command-run update")
	// ErrInvalidCommandRunSelector identifies ambiguous or malformed selectors.
	ErrInvalidCommandRunSelector = errors.New("invalid command-run selector")
)

// CommandRunPhase identifies one canonical command lifecycle transition.
type CommandRunPhase string

const (
	CommandRunPhaseSubmitted  CommandRunPhase = "submitted"
	CommandRunPhaseStarted    CommandRunPhase = "started"
	CommandRunPhaseCheckpoint CommandRunPhase = "checkpoint"
	CommandRunPhaseProgress   CommandRunPhase = "progress"
	CommandRunPhaseSucceeded  CommandRunPhase = "succeeded"
	CommandRunPhaseFailed     CommandRunPhase = "failed"
	CommandRunPhaseCanceled   CommandRunPhase = "canceled"
	CommandRunPhaseRejected   CommandRunPhase = "rejected"
)

// Valid reports whether the phase is part of the current schema.
func (p CommandRunPhase) Valid() bool {
	switch p {
	case CommandRunPhaseSubmitted,
		CommandRunPhaseStarted,
		CommandRunPhaseCheckpoint,
		CommandRunPhaseProgress,
		CommandRunPhaseSucceeded,
		CommandRunPhaseFailed,
		CommandRunPhaseCanceled,
		CommandRunPhaseRejected:
		return true
	default:
		return false
	}
}

// Terminal reports whether later non-terminal updates must not regress this phase.
func (p CommandRunPhase) Terminal() bool {
	switch p {
	case CommandRunPhaseSucceeded, CommandRunPhaseFailed, CommandRunPhaseCanceled, CommandRunPhaseRejected:
		return true
	default:
		return false
	}
}

// CommandRunScope carries trusted isolation identifiers. Values are opaque and
// case-sensitive; normalization only trims surrounding whitespace.
type CommandRunScope struct {
	ApplicationID  string `json:"application_id,omitempty"`
	EnvironmentID  string `json:"environment_id,omitempty"`
	TenantID       string `json:"tenant_id,omitempty"`
	OrganizationID string `json:"organization_id,omitempty"`
}

// Normalize returns a scope with whitespace removed from its opaque identifiers.
func (s CommandRunScope) Normalize() CommandRunScope {
	s.ApplicationID = strings.TrimSpace(s.ApplicationID)
	s.EnvironmentID = strings.TrimSpace(s.EnvironmentID)
	s.TenantID = strings.TrimSpace(s.TenantID)
	s.OrganizationID = strings.TrimSpace(s.OrganizationID)
	return s
}

// Empty reports whether no scope dimension is configured.
func (s CommandRunScope) Empty() bool {
	s = s.Normalize()
	return s.ApplicationID == "" && s.EnvironmentID == "" && s.TenantID == "" && s.OrganizationID == ""
}

// CommandRunSelector limits records and live updates to an authorized scope.
// Global must be granted explicitly; an empty selector matches only unscoped data.
type CommandRunSelector struct {
	Scope  CommandRunScope `json:"scope"`
	Global bool            `json:"global,omitempty"`
}

// Normalize returns a selector with a normalized scope.
func (s CommandRunSelector) Normalize() CommandRunSelector {
	s.Scope = s.Scope.Normalize()
	return s
}

// Validate rejects global selectors combined with narrower filters.
func (s CommandRunSelector) Validate() error {
	s = s.Normalize()
	if s.Global && !s.Scope.Empty() {
		return fmt.Errorf("%w: global selector cannot include scope filters", ErrInvalidCommandRunSelector)
	}
	return validateCommandRunScopeLengths(s.Scope, defaultCommandRunMaxIDLength, ErrInvalidCommandRunSelector)
}

// Matches reports whether a trusted scope is visible through this selector.
// A missing selector dimension never grants access to data scoped by that dimension.
func (s CommandRunSelector) Matches(scope CommandRunScope) bool {
	s = s.Normalize()
	scope = scope.Normalize()
	if s.Global {
		return s.Scope.Empty()
	}
	if scope.ApplicationID != "" && s.Scope.ApplicationID == "" {
		return false
	}
	if scope.EnvironmentID != "" && s.Scope.EnvironmentID == "" {
		return false
	}
	if s.Scope.ApplicationID != "" && s.Scope.ApplicationID != scope.ApplicationID {
		return false
	}
	if s.Scope.EnvironmentID != "" && s.Scope.EnvironmentID != scope.EnvironmentID {
		return false
	}
	if scope.TenantID != "" && s.Scope.TenantID == "" {
		return false
	}
	if scope.OrganizationID != "" && s.Scope.OrganizationID == "" {
		return false
	}
	if s.Scope.TenantID != "" && s.Scope.TenantID != scope.TenantID {
		return false
	}
	if s.Scope.OrganizationID != "" && s.Scope.OrganizationID != scope.OrganizationID {
		return false
	}
	return true
}

// CommandRunFailure is a bounded, operator-safe failure classification. It must
// not contain a raw error, stack trace, payload, or provider cause.
type CommandRunFailure struct {
	Category string `json:"category,omitempty"`
	Code     string `json:"code,omitempty"`
}

// CommandRunContractLimits bounds normalization at trust and transport boundaries.
type CommandRunContractLimits struct {
	MaxIDLength       int
	MaxTextLength     int
	MaxMetadataKeys   int
	MaxMetadataDepth  int
	MaxMetadataBytes  int
	MaxMetadataString int
}

// DefaultCommandRunContractLimits returns conservative contract limits.
func DefaultCommandRunContractLimits() CommandRunContractLimits {
	return CommandRunContractLimits{
		MaxIDLength:       defaultCommandRunMaxIDLength,
		MaxTextLength:     defaultCommandRunMaxTextLength,
		MaxMetadataKeys:   defaultCommandRunMaxMetadataKeys,
		MaxMetadataDepth:  defaultCommandRunMaxMetadataDepth,
		MaxMetadataBytes:  defaultCommandRunMaxMetadataBytes,
		MaxMetadataString: defaultCommandRunMaxMetadataString,
	}
}

func (l CommandRunContractLimits) normalized() CommandRunContractLimits {
	defaults := DefaultCommandRunContractLimits()
	if l.MaxIDLength <= 0 {
		l.MaxIDLength = defaults.MaxIDLength
	}
	if l.MaxTextLength <= 0 {
		l.MaxTextLength = defaults.MaxTextLength
	}
	if l.MaxMetadataKeys <= 0 {
		l.MaxMetadataKeys = defaults.MaxMetadataKeys
	}
	if l.MaxMetadataDepth <= 0 {
		l.MaxMetadataDepth = defaults.MaxMetadataDepth
	}
	if l.MaxMetadataBytes <= 0 {
		l.MaxMetadataBytes = defaults.MaxMetadataBytes
	}
	if l.MaxMetadataString <= 0 {
		l.MaxMetadataString = defaults.MaxMetadataString
	}
	return l
}

// CommandRunUpdate is the transport-independent versioned lifecycle delta.
type CommandRunUpdate struct {
	SchemaVersion int                `json:"schema_version"`
	EventID       string             `json:"event_id"`
	RunID         string             `json:"run_id"`
	Revision      uint64             `json:"revision"`
	CommandID     string             `json:"command_id"`
	DispatchID    string             `json:"dispatch_id,omitempty"`
	CorrelationID string             `json:"correlation_id,omitempty"`
	Phase         CommandRunPhase    `json:"phase"`
	OccurredAt    time.Time          `json:"occurred_at"`
	StartedAt     *time.Time         `json:"started_at,omitempty"`
	DurationMS    *int64             `json:"duration_ms,omitempty"`
	Mode          string             `json:"mode,omitempty"`
	Checkpoint    string             `json:"checkpoint,omitempty"`
	Message       string             `json:"message,omitempty"`
	Current       *int64             `json:"current,omitempty"`
	Total         *int64             `json:"total,omitempty"`
	Attempt       int                `json:"attempt,omitempty"`
	MaxAttempts   int                `json:"max_attempts,omitempty"`
	Failure       *CommandRunFailure `json:"failure,omitempty"`
	Scope         CommandRunScope    `json:"scope"`
	Metadata      map[string]any     `json:"metadata,omitempty"`
}

// Clone returns a deep copy across ownership boundaries.
func (u CommandRunUpdate) Clone() CommandRunUpdate {
	u.StartedAt = cloneCommandRunTime(u.StartedAt)
	u.DurationMS = cloneCommandRunInt64(u.DurationMS)
	u.Current = cloneCommandRunInt64(u.Current)
	u.Total = cloneCommandRunInt64(u.Total)
	if u.Failure != nil {
		failure := *u.Failure
		u.Failure = &failure
	}
	u.Metadata = cloneCommandRunMetadata(u.Metadata)
	return u
}

// NormalizeCommandRunUpdate validates and normalizes a command-run update.
func NormalizeCommandRunUpdate(update CommandRunUpdate, limits CommandRunContractLimits) (CommandRunUpdate, error) {
	limits = limits.normalized()
	update = update.Clone()
	update.EventID = strings.TrimSpace(update.EventID)
	update.RunID = strings.TrimSpace(update.RunID)
	update.CommandID = strings.TrimSpace(update.CommandID)
	update.DispatchID = strings.TrimSpace(update.DispatchID)
	update.CorrelationID = strings.TrimSpace(update.CorrelationID)
	update.Phase = CommandRunPhase(strings.ToLower(strings.TrimSpace(string(update.Phase))))
	update.Mode = strings.TrimSpace(update.Mode)
	update.Checkpoint = strings.TrimSpace(update.Checkpoint)
	update.Message = strings.TrimSpace(update.Message)
	if update.Failure != nil {
		update.Failure.Category = strings.TrimSpace(update.Failure.Category)
		update.Failure.Code = strings.TrimSpace(update.Failure.Code)
		if update.Failure.Category == "" && update.Failure.Code == "" {
			update.Failure = nil
		}
	}
	update.Scope = update.Scope.Normalize()

	if update.SchemaVersion != CommandRunSchemaVersion {
		return CommandRunUpdate{}, commandRunUpdateError("schema_version", "must be %d", CommandRunSchemaVersion)
	}
	for field, value := range map[string]string{
		"event_id":   update.EventID,
		"run_id":     update.RunID,
		"command_id": update.CommandID,
	} {
		if value == "" {
			return CommandRunUpdate{}, commandRunUpdateError(field, "is required")
		}
	}
	if update.Revision == 0 {
		return CommandRunUpdate{}, commandRunUpdateError("revision", "must be greater than zero")
	}
	if !update.Phase.Valid() {
		return CommandRunUpdate{}, commandRunUpdateError("phase", "is unsupported")
	}
	if update.OccurredAt.IsZero() {
		return CommandRunUpdate{}, commandRunUpdateError("occurred_at", "is required")
	}
	update.OccurredAt = update.OccurredAt.UTC()
	if update.StartedAt != nil {
		started := update.StartedAt.UTC()
		update.StartedAt = &started
	}
	if update.DurationMS != nil && *update.DurationMS < 0 {
		return CommandRunUpdate{}, commandRunUpdateError("duration_ms", "must not be negative")
	}
	if update.Current != nil && *update.Current < 0 {
		return CommandRunUpdate{}, commandRunUpdateError("current", "must not be negative")
	}
	if update.Total != nil && *update.Total < 0 {
		return CommandRunUpdate{}, commandRunUpdateError("total", "must not be negative")
	}
	if update.Current != nil && update.Total != nil && *update.Total > 0 && *update.Current > *update.Total {
		return CommandRunUpdate{}, commandRunUpdateError("current", "must not exceed total")
	}
	if update.Attempt < 0 || update.MaxAttempts < 0 {
		return CommandRunUpdate{}, commandRunUpdateError("attempt", "values must not be negative")
	}
	if update.MaxAttempts > 0 && update.Attempt > update.MaxAttempts {
		return CommandRunUpdate{}, commandRunUpdateError("attempt", "must not exceed max_attempts")
	}
	if err := validateCommandRunTextLengths(update, limits); err != nil {
		return CommandRunUpdate{}, err
	}
	if err := validateCommandRunScopeLengths(update.Scope, limits.MaxIDLength, ErrInvalidCommandRunUpdate); err != nil {
		return CommandRunUpdate{}, err
	}

	metadata, err := normalizeCommandRunMetadata(update.Metadata, limits)
	if err != nil {
		return CommandRunUpdate{}, err
	}
	update.Metadata = metadata
	return update, nil
}

// ValidateCommandRunUpdate validates an update without exposing a normalized copy.
func ValidateCommandRunUpdate(update CommandRunUpdate, limits CommandRunContractLimits) error {
	_, err := NormalizeCommandRunUpdate(update, limits)
	return err
}

// CommandRunRecord is the complete current projection for one run. The embedded
// update is the latest accepted lifecycle state and marshals as a flat JSON row.
type CommandRunRecord struct {
	CommandRunUpdate
	FirstOccurredAt time.Time `json:"first_occurred_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Clone returns an isolated snapshot row.
func (r CommandRunRecord) Clone() CommandRunRecord {
	r.CommandRunUpdate = r.CommandRunUpdate.Clone()
	return r
}

func validateCommandRunTextLengths(update CommandRunUpdate, limits CommandRunContractLimits) error {
	ids := map[string]string{
		"event_id": update.EventID, "run_id": update.RunID, "command_id": update.CommandID,
		"dispatch_id": update.DispatchID, "correlation_id": update.CorrelationID,
	}
	if update.Failure != nil {
		ids["failure.category"] = update.Failure.Category
		ids["failure.code"] = update.Failure.Code
	}
	for field, value := range ids {
		if utf8.RuneCountInString(value) > limits.MaxIDLength {
			return commandRunUpdateError(field, "exceeds %d characters", limits.MaxIDLength)
		}
	}
	for field, value := range map[string]string{
		"mode": update.Mode, "checkpoint": update.Checkpoint, "message": update.Message,
	} {
		if utf8.RuneCountInString(value) > limits.MaxTextLength {
			return commandRunUpdateError(field, "exceeds %d characters", limits.MaxTextLength)
		}
	}
	return nil
}

func validateCommandRunScopeLengths(scope CommandRunScope, maxLength int, sentinel error) error {
	for field, value := range map[string]string{
		"scope.application_id":  scope.ApplicationID,
		"scope.environment_id":  scope.EnvironmentID,
		"scope.tenant_id":       scope.TenantID,
		"scope.organization_id": scope.OrganizationID,
	} {
		if utf8.RuneCountInString(value) > maxLength {
			return fmt.Errorf("%w: %s exceeds %d characters", sentinel, field, maxLength)
		}
	}
	return nil
}

func normalizeCommandRunMetadata(metadata map[string]any, limits CommandRunContractLimits) (map[string]any, error) {
	if len(metadata) == 0 {
		return nil, nil
	}
	keyCount := 0
	value, err := normalizeCommandRunMetadataValue(metadata, 1, &keyCount, limits)
	if err != nil {
		return nil, fmt.Errorf("%w: metadata: %v", ErrInvalidCommandRunUpdate, err)
	}
	normalized := value.(map[string]any)
	encoded, err := json.Marshal(normalized)
	if err != nil {
		return nil, fmt.Errorf("%w: metadata is not JSON-safe: %v", ErrInvalidCommandRunUpdate, err)
	}
	if len(encoded) > limits.MaxMetadataBytes {
		return nil, commandRunUpdateError("metadata", "exceeds %d bytes", limits.MaxMetadataBytes)
	}
	return normalized, nil
}

func normalizeCommandRunMetadataValue(value any, depth int, keyCount *int, limits CommandRunContractLimits) (any, error) {
	if depth > limits.MaxMetadataDepth {
		return nil, fmt.Errorf("exceeds maximum depth %d", limits.MaxMetadataDepth)
	}
	switch typed := value.(type) {
	case nil, bool, string, json.Number,
		int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64:
		if text, ok := typed.(string); ok && utf8.RuneCountInString(text) > limits.MaxMetadataString {
			return nil, fmt.Errorf("string exceeds %d characters", limits.MaxMetadataString)
		}
		return typed, nil
	case float32:
		if math.IsNaN(float64(typed)) || math.IsInf(float64(typed), 0) {
			return nil, errors.New("contains a non-finite number")
		}
		return typed, nil
	case float64:
		if math.IsNaN(typed) || math.IsInf(typed, 0) {
			return nil, errors.New("contains a non-finite number")
		}
		return typed, nil
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				return nil, errors.New("contains an empty key")
			}
			if _, duplicate := out[key]; duplicate {
				return nil, fmt.Errorf("contains duplicate normalized key %q", key)
			}
			*keyCount++
			if *keyCount > limits.MaxMetadataKeys {
				return nil, fmt.Errorf("exceeds %d keys", limits.MaxMetadataKeys)
			}
			normalized, err := normalizeCommandRunMetadataValue(item, depth+1, keyCount, limits)
			if err != nil {
				return nil, fmt.Errorf("key %q: %w", key, err)
			}
			out[key] = normalized
		}
		return out, nil
	case []any:
		out := make([]any, len(typed))
		for i, item := range typed {
			normalized, err := normalizeCommandRunMetadataValue(item, depth+1, keyCount, limits)
			if err != nil {
				return nil, fmt.Errorf("index %d: %w", i, err)
			}
			out[i] = normalized
		}
		return out, nil
	default:
		return nil, fmt.Errorf("contains unsupported value type %T", value)
	}
}

func cloneCommandRunMetadata(metadata map[string]any) map[string]any {
	if len(metadata) == 0 {
		return nil
	}
	out := make(map[string]any, len(metadata))
	for key, value := range metadata {
		out[key] = cloneCommandRunMetadataValue(value)
	}
	return out
}

func cloneCommandRunMetadataValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneCommandRunMetadata(typed)
	case []any:
		out := make([]any, len(typed))
		for i, item := range typed {
			out[i] = cloneCommandRunMetadataValue(item)
		}
		return out
	default:
		return typed
	}
}

func cloneCommandRunTime(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}

func cloneCommandRunInt64(value *int64) *int64 {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}

func commandRunUpdateError(field, format string, args ...any) error {
	return fmt.Errorf("%w: %s %s", ErrInvalidCommandRunUpdate, field, fmt.Sprintf(format, args...))
}

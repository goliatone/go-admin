package admin

import (
	"context"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

const (
	DebugPanelActions = "actions"

	actionDiagnosticKindDisablement     = "disablement"
	actionDiagnosticKindAvailabilityErr = "availability_error"
	actionDiagnosticKindExecutionErr    = "execution_failure"
)

type actionDiagnosticsContextKey string

const actionDiagnosticsSinkContextKey actionDiagnosticsContextKey = "admin.action_diagnostics_sink"

// ActionDiagnosticEntry captures server-authored action availability or
// execution diagnostics for development and QA surfaces.
type ActionDiagnosticEntry struct {
	Timestamp   time.Time      `json:"timestamp"`
	Kind        string         `json:"kind"`
	Panel       string         `json:"panel,omitempty"`
	Action      string         `json:"action,omitempty"`
	ActionNames []string       `json:"action_names,omitempty"`
	Scope       string         `json:"scope,omitempty"`
	Stage       string         `json:"stage,omitempty"`
	RecordID    string         `json:"record_id,omitempty"`
	RecordIDs   []string       `json:"record_ids,omitempty"`
	Permission  string         `json:"permission,omitempty"`
	ReasonCode  string         `json:"reason_code,omitempty"`
	Reason      string         `json:"reason,omitempty"`
	ErrorText   string         `json:"error_text,omitempty"`
	StatusCode  int            `json:"status_code,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// ActionDiagnosticSink records action diagnostics.
type ActionDiagnosticSink interface {
	CaptureActionDiagnostic(entry ActionDiagnosticEntry)
}

// ActionDiagnosticsStore keeps a bounded history of recent action diagnostics.
type ActionDiagnosticsStore struct {
	entries *RingBuffer[ActionDiagnosticEntry]
}

func NewActionDiagnosticsStore(capacity int) *ActionDiagnosticsStore {
	if capacity <= 0 {
		capacity = debugDefaultMaxLogEntries
	}
	return &ActionDiagnosticsStore{
		entries: NewRingBuffer[ActionDiagnosticEntry](capacity),
	}
}

func (s *ActionDiagnosticsStore) Capture(entry ActionDiagnosticEntry) {
	if s == nil || s.entries == nil {
		return
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now().UTC()
	}
	entry.ActionNames = normalizeActionDiagnosticNames(entry.ActionNames)
	entry.RecordIDs = normalizeActionDiagnosticNames(entry.RecordIDs)
	entry.Panel = strings.TrimSpace(entry.Panel)
	entry.Action = strings.TrimSpace(entry.Action)
	entry.Scope = strings.TrimSpace(entry.Scope)
	entry.Stage = strings.TrimSpace(entry.Stage)
	entry.RecordID = strings.TrimSpace(entry.RecordID)
	entry.Permission = strings.TrimSpace(entry.Permission)
	entry.ReasonCode = strings.TrimSpace(entry.ReasonCode)
	entry.Reason = strings.TrimSpace(entry.Reason)
	entry.ErrorText = strings.TrimSpace(entry.ErrorText)
	entry.Metadata = primitives.CloneAnyMap(entry.Metadata)
	s.entries.Add(entry)
}

func (s *ActionDiagnosticsStore) Entries() []ActionDiagnosticEntry {
	if s == nil || s.entries == nil {
		return nil
	}
	return s.entries.Values()
}

type adminActionDiagnosticSink struct {
	store  *ActionDiagnosticsStore
	logger Logger
}

func newAdminActionDiagnosticSink(admin *Admin) ActionDiagnosticSink {
	if admin == nil || admin.actionDiagnostics == nil {
		return nil
	}
	return adminActionDiagnosticSink{
		store:  admin.actionDiagnostics,
		logger: admin.loggerFor("admin.actions"),
	}
}

func (s adminActionDiagnosticSink) CaptureActionDiagnostic(entry ActionDiagnosticEntry) {
	if s.store == nil {
		return
	}
	s.store.Capture(entry)

	logger := ensureLogger(s.logger)
	fields := []any{
		"kind", strings.TrimSpace(entry.Kind),
		"panel", strings.TrimSpace(entry.Panel),
		"scope", strings.TrimSpace(entry.Scope),
	}
	if action := strings.TrimSpace(entry.Action); action != "" {
		fields = append(fields, "action", action)
	}
	if len(entry.ActionNames) > 0 {
		fields = append(fields, "action_names", append([]string{}, entry.ActionNames...))
	}
	if stage := strings.TrimSpace(entry.Stage); stage != "" {
		fields = append(fields, "stage", stage)
	}
	if recordID := strings.TrimSpace(entry.RecordID); recordID != "" {
		fields = append(fields, "record_id", recordID)
	}
	if len(entry.RecordIDs) > 0 {
		fields = append(fields, "record_ids", append([]string{}, entry.RecordIDs...))
	}
	if code := strings.TrimSpace(entry.ReasonCode); code != "" {
		fields = append(fields, "reason_code", code)
	}
	if reason := strings.TrimSpace(entry.Reason); reason != "" {
		fields = append(fields, "reason", reason)
	}
	if errText := strings.TrimSpace(entry.ErrorText); errText != "" {
		fields = append(fields, "error", errText)
	}
	if entry.StatusCode > 0 {
		fields = append(fields, "status_code", entry.StatusCode)
	}
	if permission := strings.TrimSpace(entry.Permission); permission != "" {
		fields = append(fields, "permission", permission)
	}
	if len(entry.Metadata) > 0 {
		fields = append(fields, "metadata", primitives.CloneAnyMap(entry.Metadata))
	}

	switch strings.TrimSpace(entry.Kind) {
	case actionDiagnosticKindAvailabilityErr, actionDiagnosticKindExecutionErr:
		logger.Warn("action diagnostics event", fields...)
	default:
		logger.Debug("action diagnostics event", fields...)
	}
}

func ContextWithActionDiagnostics(ctx context.Context, sink ActionDiagnosticSink) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if sink == nil {
		return ctx
	}
	return context.WithValue(ctx, actionDiagnosticsSinkContextKey, sink)
}

func actionDiagnosticsSinkFromContext(ctx context.Context) ActionDiagnosticSink {
	if ctx == nil {
		return nil
	}
	sink, _ := ctx.Value(actionDiagnosticsSinkContextKey).(ActionDiagnosticSink)
	return sink
}

func captureActionDiagnostic(ctx context.Context, entry ActionDiagnosticEntry) {
	if sink := actionDiagnosticsSinkFromContext(ctx); sink != nil {
		sink.CaptureActionDiagnostic(entry)
	}
}

func captureActionDisablementDiagnostic(
	ctx context.Context,
	panel string,
	action Action,
	scope ActionScope,
	recordID string,
	stage string,
	state ActionState,
) {
	if state.Enabled {
		return
	}
	captureActionDiagnostic(ctx, ActionDiagnosticEntry{
		Kind:       actionDiagnosticKindDisablement,
		Panel:      strings.TrimSpace(panel),
		Action:     strings.TrimSpace(action.Name),
		Scope:      strings.TrimSpace(string(scope)),
		Stage:      strings.TrimSpace(stage),
		RecordID:   strings.TrimSpace(recordID),
		Permission: strings.TrimSpace(primitives.FirstNonEmptyRaw(state.Permission, action.Permission)),
		ReasonCode: strings.TrimSpace(state.ReasonCode),
		Reason:     strings.TrimSpace(state.Reason),
		Metadata:   primitives.CloneAnyMap(state.Metadata),
	})
}

func captureActionResolverErrorDiagnostic(
	ctx context.Context,
	panel string,
	scope ActionScope,
	actions []Action,
	recordIDs []string,
	err error,
) {
	mapped, status := mapToGoError(err, nil)
	actionNames := make([]string, 0, len(actions))
	for _, action := range actions {
		if name := strings.TrimSpace(action.Name); name != "" {
			actionNames = append(actionNames, name)
		}
	}
	captureActionDiagnostic(ctx, ActionDiagnosticEntry{
		Kind:        actionDiagnosticKindAvailabilityErr,
		Panel:       strings.TrimSpace(panel),
		ActionNames: actionNames,
		Scope:       strings.TrimSpace(string(scope)),
		Stage:       "resolver",
		RecordIDs:   normalizeActionDiagnosticNames(recordIDs),
		ReasonCode:  strings.TrimSpace(mapped.TextCode),
		Reason:      strings.TrimSpace(mapped.Message),
		ErrorText:   strings.TrimSpace(err.Error()),
		StatusCode:  status,
		Metadata:    primitives.CloneAnyMap(mapped.Metadata),
	})
}

func captureActionExecutionFailureDiagnostic(
	ctx context.Context,
	panel string,
	action string,
	scope ActionScope,
	stage string,
	recordID string,
	recordIDs []string,
	err error,
) {
	mapped, status := mapToGoError(err, nil)
	captureActionDiagnostic(ctx, ActionDiagnosticEntry{
		Kind:       actionDiagnosticKindExecutionErr,
		Panel:      strings.TrimSpace(panel),
		Action:     strings.TrimSpace(action),
		Scope:      strings.TrimSpace(string(scope)),
		Stage:      strings.TrimSpace(stage),
		RecordID:   strings.TrimSpace(recordID),
		RecordIDs:  normalizeActionDiagnosticNames(recordIDs),
		ReasonCode: strings.TrimSpace(mapped.TextCode),
		Reason:     strings.TrimSpace(mapped.Message),
		ErrorText:  strings.TrimSpace(err.Error()),
		StatusCode: statusOrInternal(status),
		Metadata:   primitives.CloneAnyMap(mapped.Metadata),
	})
}

func normalizeActionDiagnosticNames(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, value)
	}
	slices.Sort(out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func statusOrInternal(status int) int {
	if status >= 100 && status <= 999 {
		return status
	}
	return http.StatusInternalServerError
}

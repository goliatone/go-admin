package admin

import (
	"context"
	"testing"
)

type capturedAdminLogEntry struct {
	level string
	msg   string
	args  []any
}

type captureAdminLogger struct {
	entries []capturedAdminLogEntry
}

func (l *captureAdminLogger) Trace(msg string, args ...any) { l.record("trace", msg, args...) }
func (l *captureAdminLogger) Debug(msg string, args ...any) { l.record("debug", msg, args...) }
func (l *captureAdminLogger) Info(msg string, args ...any)  { l.record("info", msg, args...) }
func (l *captureAdminLogger) Warn(msg string, args ...any)  { l.record("warn", msg, args...) }
func (l *captureAdminLogger) Error(msg string, args ...any) { l.record("error", msg, args...) }
func (l *captureAdminLogger) Fatal(msg string, args ...any) { l.record("fatal", msg, args...) }

func (l *captureAdminLogger) WithContext(context.Context) Logger {
	return l
}

func (l *captureAdminLogger) record(level, msg string, args ...any) {
	if l == nil {
		return
	}
	entry := capturedAdminLogEntry{level: level, msg: msg}
	if len(args) > 0 {
		entry.args = append([]any(nil), args...)
	}
	l.entries = append(l.entries, entry)
}

func (l *captureAdminLogger) count(level, msg string) int {
	if l == nil {
		return 0
	}
	count := 0
	for _, entry := range l.entries {
		if entry.level == level && entry.msg == msg {
			count++
		}
	}
	return count
}

func TestAdminRegisterPanelTabCollisionLogsViaInjectedLogger(t *testing.T) {
	logger := &captureAdminLogger{}
	adm := mustNewAdmin(t, Config{}, Dependencies{Logger: logger})

	if err := adm.RegisterPanelTab("users", PanelTab{
		ID:     "dup",
		Label:  "First",
		Target: PanelTabTarget{Type: "panel", Panel: "first"},
	}); err != nil {
		t.Fatalf("register first tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", PanelTab{
		ID:     "dup",
		Label:  "Second",
		Target: PanelTabTarget{Type: "panel", Panel: "second"},
	}); err != nil {
		t.Fatalf("register duplicate tab: %v", err)
	}

	if got := logger.count("warn", "panel tab collision"); got == 0 {
		t.Fatalf("expected panel tab collision to be logged via injected logger")
	}
}

func TestDashboardLateProviderRegistrationLogsWarningViaInjectedLogger(t *testing.T) {
	logger := &captureAdminLogger{}
	adm := mustNewAdmin(t, Config{}, Dependencies{Logger: logger})

	if _, err := adm.Dashboard().Resolve(AdminContext{Context: context.Background(), Locale: "en"}); err != nil {
		t.Fatalf("initial dashboard resolve: %v", err)
	}

	adm.Dashboard().RegisterProvider(DashboardProviderSpec{
		Code:        "late.widget",
		Name:        "Late",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(struct {
				OK bool `json:"ok"`
			}{OK: true}), nil
		},
	})

	if got := logger.count("warn", "dashboard provider registered after initialization; updating live registry"); got == 0 {
		t.Fatalf("expected late provider registration warning to be logged via injected logger")
	}
}

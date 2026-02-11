package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type captureQuickstartLogEntry struct {
	level string
	msg   string
	args  []any
}

type captureQuickstartLogger struct {
	entries []captureQuickstartLogEntry
}

func (l *captureQuickstartLogger) record(level, msg string, args ...any) {
	if l == nil {
		return
	}
	l.entries = append(l.entries, captureQuickstartLogEntry{
		level: level,
		msg:   msg,
		args:  append([]any(nil), args...),
	})
}

func (l *captureQuickstartLogger) Trace(msg string, args ...any) { l.record("trace", msg, args...) }
func (l *captureQuickstartLogger) Debug(msg string, args ...any) { l.record("debug", msg, args...) }
func (l *captureQuickstartLogger) Info(msg string, args ...any)  { l.record("info", msg, args...) }
func (l *captureQuickstartLogger) Warn(msg string, args ...any)  { l.record("warn", msg, args...) }
func (l *captureQuickstartLogger) Error(msg string, args ...any) { l.record("error", msg, args...) }
func (l *captureQuickstartLogger) Fatal(msg string, args ...any) { l.record("fatal", msg, args...) }
func (l *captureQuickstartLogger) WithContext(ctx context.Context) admin.Logger {
	_ = ctx
	return l
}

func (l *captureQuickstartLogger) count(level, msg string) int {
	count := 0
	for _, entry := range l.entries {
		if entry.level == level && entry.msg == msg {
			count++
		}
	}
	return count
}

func TestNewAdminLogsAdapterFailuresViaDependencyLogger(t *testing.T) {
	t.Setenv("USE_PERSISTENT_CMS", "true")

	logger := &captureQuickstartLogger{}
	cfg := NewAdminConfig("", "", "")
	hooks := AdapterHooks{
		PersistentCMS: func(ctx context.Context, defaultLocale string) (admin.CMSOptions, string, error) {
			_, _ = ctx, defaultLocale
			return admin.CMSOptions{}, "", errors.New("cms setup failed")
		},
	}

	_, _, err := NewAdmin(cfg, hooks, WithAdminDependencies(admin.Dependencies{
		Logger: logger,
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if got := logger.count("warn", "persistent CMS requested but setup failed"); got == 0 {
		t.Fatalf("expected persistent CMS warning logged via injected logger")
	}
}

func TestNewModuleRegistrarLogsDisabledFeaturesViaAdminLogger(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	logger := &captureQuickstartLogger{}
	adm, err := admin.New(cfg, admin.Dependencies{Logger: logger})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}

	mod := stubModule{id: "alpha", featureFlags: []string{"feature.alpha"}}
	gates := stubFeatureGate{flags: map[string]bool{}}

	err = NewModuleRegistrar(
		adm,
		cfg,
		[]admin.Module{mod},
		false,
		WithSeedNavigation(false),
		WithModuleFeatureGates(gates),
	)
	if err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}
	if got := logger.count("warn", "module skipped: feature disabled"); got == 0 {
		t.Fatalf("expected feature-disabled module warning logged via injected logger")
	}
}

func TestBuildNavItemsLogsDebugPayloadViaAdminLogger(t *testing.T) {
	t.Setenv("NAV_DEBUG_LOG", "true")

	cfg := admin.Config{DefaultLocale: "en"}
	logger := &captureQuickstartLogger{}
	adm, err := admin.New(cfg, admin.Dependencies{Logger: logger})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	nav := adm.Navigation()
	nav.UseCMS(false)
	nav.AddFallback(admin.NavigationItem{Label: "Home", Position: intPtr(1)})

	_ = BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), "sidebar", context.Background(), "")

	if got := logger.count("debug", "nav payload"); got == 0 {
		t.Fatalf("expected nav payload to be logged via injected logger")
	}
}

func TestContentTypeIDMismatchLogsViaAdminLogger(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	logger := &captureQuickstartLogger{}
	adm, err := admin.New(cfg, admin.Dependencies{Logger: logger})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}

	h := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")
	h.logContentTypeIDMismatch("publish", "request-id", "", "record", map[string]any{
		"id":              "record-id",
		"content_type_id": "type-id",
		"slug":            "post",
	})

	if got := logger.count("warn", "content type id mismatch"); got == 0 {
		t.Fatalf("expected content type mismatch warning logged via injected logger")
	}
}

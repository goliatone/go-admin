package admin

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-command/registry"
)

type recordingSink struct {
	entries []ActivityEntry
}

func (s *recordingSink) Record(_ context.Context, entry ActivityEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

func (s *recordingSink) List(_ context.Context, limit int, _ ...ActivityFilter) ([]ActivityEntry, error) {
	if limit <= 0 || limit > len(s.entries) {
		limit = len(s.entries)
	}
	out := make([]ActivityEntry, limit)
	copy(out, s.entries[:limit])
	return out, nil
}

type fakeActivityLogger struct {
	records []ActivityRecord
}

func (f *fakeActivityLogger) Log(_ context.Context, record ActivityRecord) error {
	f.records = append(f.records, record)
	return nil
}

func TestActivitySinkAdapterBridgesGoUsersLogger(t *testing.T) {
	logger := &fakeActivityLogger{}
	adapter := NewActivitySinkAdapter(logger, nil)
	now := time.Now()
	entry := ActivityEntry{
		Actor:     "user-42",
		Action:    "panel.create",
		Object:    "panel:posts",
		Metadata:  map[string]any{"id": "1"},
		CreatedAt: now,
	}
	if err := adapter.Record(context.Background(), entry); err != nil {
		t.Fatalf("record: %v", err)
	}
	entries, err := adapter.List(context.Background(), 5)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(entries) != 1 || entries[0].Action != "panel.create" || entries[0].Actor != "user-42" {
		t.Fatalf("unexpected entries: %+v", entries)
	}
	if len(logger.records) != 1 {
		t.Fatalf("expected logger to receive one record, got %d", len(logger.records))
	}
	record := logger.records[0]
	if record.Verb != entry.Action || record.ObjectType != "panel" || record.ObjectID != "posts" {
		t.Fatalf("unexpected record mapping: %+v", record)
	}
}

func TestSettingsApplyEmitsActivity(t *testing.T) {
	sink := &recordingSink{}
	svc := NewSettingsService()
	svc.WithActivitySink(sink)
	svc.RegisterDefinition(SettingDefinition{Key: "site.name", Type: "string"})

	bundle := SettingsBundle{
		Scope:  SettingsScopeSite,
		UserID: "admin-1",
		Values: map[string]any{"site.name": "Demo"},
	}
	if err := svc.Apply(context.Background(), bundle); err != nil {
		t.Fatalf("apply: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one activity entry, got %d", len(sink.entries))
	}
	entry := sink.entries[0]
	if entry.Action != "settings.update" || entry.Object != "settings" {
		t.Fatalf("unexpected activity entry: %+v", entry)
	}
	if entry.Actor != "admin-1" {
		t.Fatalf("expected actor propagated, got %s", entry.Actor)
	}
	if scope, ok := entry.Metadata["scope"]; !ok || scope != SettingsScopeSite {
		t.Fatalf("expected scope metadata, got %+v", entry.Metadata)
	}
}

func TestNotificationServiceEmitsActivity(t *testing.T) {
	sink := &recordingSink{}
	svc := NewInMemoryNotificationService()
	svc.WithActivitySink(sink)
	ctx := context.Background()
	created, err := svc.Add(ctx, Notification{Title: "Hello", Message: "world"})
	if err != nil {
		t.Fatalf("add: %v", err)
	}
	if err := svc.Mark(ctx, []string{created.ID}, true); err != nil {
		t.Fatalf("mark: %v", err)
	}
	if len(sink.entries) < 2 {
		t.Fatalf("expected activity entries for add and mark, got %d", len(sink.entries))
	}
	if sink.entries[0].Action != "notification.create" || sink.entries[1].Action != "notification.mark" {
		t.Fatalf("unexpected notification activity sequence: %+v", sink.entries)
	}
}

func TestCMSContentServiceEmitsActivity(t *testing.T) {
	sink := &recordingSink{}
	content := NewInMemoryContentService()
	content.WithActivitySink(sink)
	ctx := context.Background()
	page, err := content.CreatePage(ctx, CMSPage{Title: "Home", Slug: "home", Locale: "en"})
	if err != nil {
		t.Fatalf("create page: %v", err)
	}
	if len(sink.entries) == 0 {
		t.Fatalf("expected activity entry for page create")
	}
	entry := sink.entries[0]
	if entry.Action != "cms.page.create" || entry.Object != "page:"+page.ID {
		t.Fatalf("unexpected CMS activity entry: %+v", entry)
	}
}

func TestDashboardLayoutActivity(t *testing.T) {
	sink := &recordingSink{}
	dash := NewDashboard()
	dash.WithActivitySink(sink)
	ctx := AdminContext{Context: context.Background(), UserID: "dash-user"}
	dash.SetUserLayoutWithContext(ctx, []DashboardWidgetInstance{
		{DefinitionCode: "admin.widget.activity_feed", AreaCode: "admin.dashboard.main"},
	})
	if len(sink.entries) != 1 {
		t.Fatalf("expected dashboard activity entry, got %d", len(sink.entries))
	}
	if sink.entries[0].Action != "dashboard.layout.save" || sink.entries[0].Actor != "dash-user" {
		t.Fatalf("unexpected dashboard activity entry: %+v", sink.entries[0])
	}
}

func TestJobRegistryEmitsActivity(t *testing.T) {
	registry.WithTestRegistry(func() {
		cmdReg := NewCommandBus(true)
		defer cmdReg.Reset()
		cmd := &cronCommand{}
		if _, err := RegisterCommand(cmdReg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(cmdReg, "jobs.cleanup", func(payload map[string]any, ids []string) (cronCommandMsg, error) {
			return cronCommandMsg{}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}
		reg := NewJobRegistry()
		reg.WithGoJob(nil, &stubGoJobScheduler{})
		sink := &recordingSink{}
		reg.WithActivitySink(sink)
		if err := reg.Sync(context.Background()); err != nil {
			t.Fatalf("sync: %v", err)
		}
		if err := reg.Trigger(AdminContext{Context: context.Background(), UserID: "jobs-user"}, "jobs.cleanup"); err != nil {
			t.Fatalf("trigger: %v", err)
		}
		if len(sink.entries) == 0 {
			t.Fatalf("expected job activity entry")
		}
		entry := sink.entries[0]
		if entry.Action != "job.trigger" || entry.Object != "jobs.cleanup" {
			t.Fatalf("unexpected job activity entry: %+v", entry)
		}
		if status, ok := entry.Metadata["status"]; !ok || status != "ok" {
			t.Fatalf("expected status metadata, got %+v", entry.Metadata)
		}
	})
}

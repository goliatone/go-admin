package admin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command/registry"
	usersactivity "github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
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

type staticUsersEnricher struct {
	actorDisplay  string
	objectDisplay string
	version       string
}

func (e staticUsersEnricher) Enrich(_ context.Context, record userstypes.ActivityRecord) (userstypes.ActivityRecord, error) {
	data := primitives.CloneAnyMap(record.Data)
	if data == nil {
		data = map[string]any{}
	}
	if e.actorDisplay != "" {
		if _, ok := data[usersactivity.DataKeyActorDisplay]; !ok {
			data[usersactivity.DataKeyActorDisplay] = e.actorDisplay
		}
	}
	if e.objectDisplay != "" {
		if _, ok := data[usersactivity.DataKeyObjectDisplay]; !ok {
			data[usersactivity.DataKeyObjectDisplay] = e.objectDisplay
		}
	}
	record.Data = data
	version := e.version
	if version == "" {
		version = "test"
	}
	return usersactivity.StampEnrichment(record, time.Now().UTC(), version), nil
}

type failingUsersEnricher struct {
	actorDisplay string
	err          error
}

func (e failingUsersEnricher) Enrich(_ context.Context, record userstypes.ActivityRecord) (userstypes.ActivityRecord, error) {
	data := primitives.CloneAnyMap(record.Data)
	if data == nil {
		data = map[string]any{}
	}
	if e.actorDisplay != "" {
		data[usersactivity.DataKeyActorDisplay] = e.actorDisplay
	}
	record.Data = data
	err := e.err
	if err == nil {
		err = errors.New("enricher failed")
	}
	return record, err
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

func TestEnrichedActivitySinkAddsMetadata(t *testing.T) {
	actorID := uuid.New()
	objectID := uuid.NewString()
	sink := &recordingSink{}
	enricher := staticUsersEnricher{
		actorDisplay:  "Ada Lovelace",
		objectDisplay: "User: " + objectID,
		version:       "test-v1",
	}
	activitySink := newEnrichedActivitySink(sink, enricher, nil, nil, "")

	entry := ActivityEntry{
		Actor:  actorID.String(),
		Action: "user.invite",
		Object: "user:" + objectID,
	}
	if err := activitySink.Record(context.Background(), entry); err != nil {
		t.Fatalf("record: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one enriched entry, got %d", len(sink.entries))
	}
	meta := sink.entries[0].Metadata
	if meta[usersactivity.DataKeyActorDisplay] != "Ada Lovelace" {
		t.Fatalf("expected actor_display metadata, got %+v", meta[usersactivity.DataKeyActorDisplay])
	}
	if meta[usersactivity.DataKeyObjectDisplay] != "User: "+objectID {
		t.Fatalf("expected object_display metadata, got %+v", meta[usersactivity.DataKeyObjectDisplay])
	}
	enrichedAt, ok := meta[usersactivity.DataKeyEnrichedAt].(string)
	if !ok || strings.TrimSpace(enrichedAt) == "" {
		t.Fatalf("expected enriched_at metadata, got %+v", meta[usersactivity.DataKeyEnrichedAt])
	}
	if meta[usersactivity.DataKeyEnricherVersion] != "test-v1" {
		t.Fatalf("expected enricher_version test-v1, got %+v", meta[usersactivity.DataKeyEnricherVersion])
	}
}

func TestEnrichedActivitySinkAttachesSessionIDFromJWT(t *testing.T) {
	sessionID := "session-123"
	claims := &auth.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{ID: sessionID},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	sink := &recordingSink{}
	activitySink := newEnrichedActivitySink(sink, nil, nil, defaultSessionIDProvider(), "")

	entry := ActivityEntry{
		Actor:  uuid.NewString(),
		Action: "settings.update",
		Object: "settings",
	}
	if err := activitySink.Record(ctx, entry); err != nil {
		t.Fatalf("record: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one entry, got %d", len(sink.entries))
	}
	meta := sink.entries[0].Metadata
	if meta[usersactivity.DataKeySessionID] != sessionID {
		t.Fatalf("expected session_id %q, got %+v", sessionID, meta[usersactivity.DataKeySessionID])
	}
}

func TestEnrichedActivitySinkUsesErrorHandler(t *testing.T) {
	sink := &recordingSink{}
	errBoom := errors.New("boom")
	enricher := failingUsersEnricher{
		actorDisplay: "Ada Lovelace",
		err:          errBoom,
	}
	handled := false
	handler := func(_ context.Context, err error, _ usersactivity.ActivityEnricher, current userstypes.ActivityRecord, _ userstypes.ActivityRecord) (userstypes.ActivityRecord, error) {
		handled = true
		if !errors.Is(err, errBoom) {
			t.Fatalf("expected handler error %v, got %v", errBoom, err)
		}
		return current, nil
	}
	activitySink := newEnrichedActivitySink(sink, enricher, handler, nil, "")

	entry := ActivityEntry{
		Actor:  uuid.NewString(),
		Action: "user.invite",
		Object: "user:" + uuid.NewString(),
	}
	if err := activitySink.Record(context.Background(), entry); err != nil {
		t.Fatalf("record: %v", err)
	}
	if !handled {
		t.Fatalf("expected enrichment error handler to run")
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one entry, got %d", len(sink.entries))
	}
	if sink.entries[0].Metadata[usersactivity.DataKeyActorDisplay] != "Ada Lovelace" {
		t.Fatalf("expected handler to allow enriched metadata")
	}
}

func TestEnrichedActivitySinkUsesSessionIDKeyOverride(t *testing.T) {
	sessionID := "session-999"
	sink := &recordingSink{}
	provider := usersactivity.SessionIDProviderFunc(func(context.Context) (string, bool) {
		return sessionID, true
	})
	activitySink := newEnrichedActivitySink(sink, nil, nil, provider, " sid ")

	entry := ActivityEntry{
		Actor:  uuid.NewString(),
		Action: "settings.update",
		Object: "settings",
	}
	if err := activitySink.Record(context.Background(), entry); err != nil {
		t.Fatalf("record: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one entry, got %d", len(sink.entries))
	}
	meta := sink.entries[0].Metadata
	if meta["sid"] != sessionID {
		t.Fatalf("expected session id under sid, got %+v", meta["sid"])
	}
	if _, ok := meta[usersactivity.DataKeySessionID]; ok {
		t.Fatalf("expected session_id to remain unset when using override")
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
		{DefinitionCode: WidgetActivityFeed, AreaCode: "admin.dashboard.main"},
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

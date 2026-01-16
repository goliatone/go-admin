package admin

import (
	"context"
	"errors"
	"os"
	"testing"

	auth "github.com/goliatone/go-auth"
)

func TestRecordDebugREPLActivitySystemActor(t *testing.T) {
	feed := NewActivityFeed()
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{ActivitySink: feed})

	recordDebugREPLActivity(adm, context.Background(), debugREPLActivityActionOpen, debugREPLActivityObject("session-1"), map[string]any{
		"session_id": "session-1",
	})

	entries, err := feed.List(context.Background(), 1)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected activity entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.Actor != ActivityActorTypeSystem {
		t.Fatalf("expected system actor, got %q", entry.Actor)
	}
	if entry.Metadata[ActivityActorTypeKey] != ActivityActorTypeSystem {
		t.Fatalf("expected actor type metadata, got %#v", entry.Metadata)
	}
}

func TestHandleDebugREPLShellCommandRecordsEval(t *testing.T) {
	feed := NewActivityFeed()
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{ActivitySink: feed})
	actor := &auth.ActorContext{ActorID: "user-1"}
	ctx := auth.WithActorContext(context.Background(), actor)
	session := DebugREPLSession{
		ID:        "session-1",
		Kind:      DebugREPLKindShell,
		ReadOnly:  false,
		IP:        "127.0.0.1",
		UserAgent: "tester",
	}

	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	defer reader.Close()
	defer writer.Close()

	cfg := DebugREPLConfig{ReadOnly: BoolPtr(false)}
	cmd := debugREPLShellCommand{Type: debugREPLShellCommandInput, Data: "ls\n"}
	if err := handleDebugREPLShellCommand(adm, ctx, cfg, session, writer, cmd); err != nil {
		t.Fatalf("handle shell command: %v", err)
	}

	entries, err := feed.List(context.Background(), 1)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected activity entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.Action != debugREPLActivityActionEval {
		t.Fatalf("expected eval action, got %q", entry.Action)
	}
	if entry.Actor != "user-1" {
		t.Fatalf("expected actor user-1, got %q", entry.Actor)
	}
	if entry.Metadata["input"] != "ls\n" {
		t.Fatalf("expected input metadata, got %#v", entry.Metadata)
	}
}

func TestHandleDebugREPLShellCommandSkipsReadOnly(t *testing.T) {
	feed := NewActivityFeed()
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{ActivitySink: feed})

	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	defer reader.Close()
	defer writer.Close()

	cfg := DebugREPLConfig{ReadOnly: BoolPtr(true)}
	cmd := debugREPLShellCommand{Type: debugREPLShellCommandInput, Data: "whoami\n"}
	if err := handleDebugREPLShellCommand(adm, context.Background(), cfg, DebugREPLSession{}, writer, cmd); err != nil {
		t.Fatalf("handle shell command: %v", err)
	}

	entries, err := feed.List(context.Background(), 1)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected no activity entries, got %d", len(entries))
	}
}

func TestDebugREPLAppRecordEval(t *testing.T) {
	feed := NewActivityFeed()
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{ActivitySink: feed})
	actor := &auth.ActorContext{ActorID: "user-2"}
	ctx := auth.WithActorContext(context.Background(), actor)
	session := DebugREPLSession{
		ID:        "session-2",
		Kind:      DebugREPLKindApp,
		ReadOnly:  true,
		IP:        "127.0.0.1",
		UserAgent: "tester",
	}

	debugREPLAppRecordEval(adm, ctx, session, "adm.Config()", "\"/admin\"", nil)
	entries, err := feed.List(context.Background(), 1)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected activity entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.Metadata["input"] != "adm.Config()" || entry.Metadata["output"] != "\"/admin\"" {
		t.Fatalf("unexpected eval metadata: %#v", entry.Metadata)
	}

	debugREPLAppRecordEval(adm, ctx, session, "adm.Break()", "", errors.New("boom"))
	entries, err = feed.List(context.Background(), 1)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	entry = entries[0]
	if entry.Metadata["error"] != "boom" {
		t.Fatalf("expected error metadata, got %#v", entry.Metadata)
	}
}

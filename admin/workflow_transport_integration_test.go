package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-command/flow"
	router "github.com/goliatone/go-router"
)

func TestWorkflowTransportApplyEventPersistsStateProjectsActivityAndReturnsEnvelope(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	activityFeed := NewActivityFeed()
	workflow := NewFSMWorkflowEngine()
	if err := workflow.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published"},
		},
	}); err != nil {
		t.Fatalf("register workflow: %v", err)
	}

	adm := mustNewAdmin(t, cfg, Dependencies{
		Workflow:     workflow,
		ActivitySink: activityFeed,
	})
	adm.WithAuthorizer(allowAll{})

	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		WithWorkflow(workflow).
		ListFields(Field{Name: "title", Label: "Title", Type: "text"}, Field{Name: "status", Label: "Status", Type: "text"}).
		FormFields(Field{Name: "title", Label: "Title", Type: "text"}, Field{Name: "status", Label: "Status", Type: "text"}).
		Actions(Action{Name: "publish"})
	if _, err := adm.RegisterPanel("pages", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	created, err := repo.Create(context.Background(), map[string]any{
		"title":  "Draft page",
		"status": "draft",
		"locale": "en",
	})
	if err != nil {
		t.Fatalf("seed page: %v", err)
	}
	id := strings.TrimSpace(toString(created["id"]))
	if id == "" {
		t.Fatalf("expected seeded id")
	}

	actionPath := adminAPIPath(adm, cfg, "panel.action", map[string]string{
		"panel":  "pages",
		"action": "publish",
	}, nil)
	req := httptest.NewRequest("POST", actionPath, strings.NewReader(`{"id":"`+id+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "editor-42")
	req.Header.Set("X-Request-ID", "req-24")
	req.Header.Set("X-Correlation-ID", "corr-24")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("publish action status: %d body=%s", rr.Code, rr.Body.String())
	}

	var payload map[string]any
	if decodeErr := json.Unmarshal(rr.Body.Bytes(), &payload); decodeErr != nil {
		t.Fatalf("decode action payload: %v", decodeErr)
	}
	if payload["status"] != "ok" {
		t.Fatalf("expected status=ok, got %+v", payload)
	}
	data, _ := payload["data"].(map[string]any)
	if data == nil {
		t.Fatalf("expected response data envelope, got %+v", payload)
	}
	workflowEnvelope, _ := data["workflow"].(map[string]any)
	if workflowEnvelope == nil {
		t.Fatalf("expected workflow envelope in response data, got %+v", data)
	}
	transition, _ := workflowEnvelope["transition"].(map[string]any)
	if transition == nil {
		transition, _ = workflowEnvelope["Transition"].(map[string]any)
	}
	currentState := strings.TrimSpace(toString(transition["current_state"]))
	if currentState == "" {
		currentState = strings.TrimSpace(toString(transition["CurrentState"]))
	}
	if transition == nil || currentState != "published" {
		t.Fatalf("expected transition current_state=published, got %+v", workflowEnvelope)
	}

	persisted, err := repo.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("load persisted page: %v", err)
	}
	if got := strings.TrimSpace(toString(persisted["status"])); got != "published" {
		t.Fatalf("expected persisted status published, got %q", got)
	}

	entries, err := activityFeed.List(context.Background(), 50)
	if err != nil {
		t.Fatalf("list activity entries: %v", err)
	}
	foundCommitted := false
	for _, entry := range entries {
		if !strings.EqualFold(strings.TrimSpace(entry.Action), flow.LifecycleActivityVerbPrefix+"committed") {
			continue
		}
		if got := toString(entry.Metadata["request_id"]); got != "req-24" {
			t.Fatalf("expected request_id req-24 in lifecycle activity, got %q metadata=%+v", got, entry.Metadata)
		}
		if got := toString(entry.Metadata["correlation_id"]); got != "corr-24" {
			t.Fatalf("expected correlation_id corr-24 in lifecycle activity, got %q metadata=%+v", got, entry.Metadata)
		}
		foundCommitted = true
		break
	}
	if !foundCommitted {
		t.Fatalf("expected committed workflow lifecycle activity entry, got %+v", entries)
	}
}

func TestWorkflowTransportDetailIncludesSnapshotDiagnostics(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	workflow := NewFSMWorkflowEngine()
	if err := workflow.RegisterGuard("deny_publish", func(context.Context, WorkflowMessage, WorkflowExecutionContext) error {
		return errors.New("publish blocked")
	}); err != nil {
		t.Fatalf("register guard: %v", err)
	}
	if err := workflow.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published", Guard: "deny_publish"},
		},
	}); err != nil {
		t.Fatalf("register workflow: %v", err)
	}

	adm := mustNewAdmin(t, cfg, Dependencies{Workflow: workflow})
	adm.WithAuthorizer(allowAll{})
	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		WithWorkflow(workflow).
		ListFields(Field{Name: "title", Label: "Title", Type: "text"}, Field{Name: "status", Label: "Status", Type: "text"}).
		FormFields(Field{Name: "title", Label: "Title", Type: "text"}, Field{Name: "status", Label: "Status", Type: "text"}).
		Actions(Action{Name: "publish"})
	if _, err := adm.RegisterPanel("pages", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	created, err := repo.Create(context.Background(), map[string]any{
		"title":  "Draft page",
		"status": "draft",
		"locale": "en",
	})
	if err != nil {
		t.Fatalf("seed page: %v", err)
	}
	id := strings.TrimSpace(toString(created["id"]))
	if id == "" {
		t.Fatalf("expected seeded id")
	}

	detailPath := adminAPIPath(adm, cfg, "panel.id", map[string]string{
		"panel": "pages",
		"id":    id,
	}, nil)
	req := httptest.NewRequest("GET", detailPath, nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("detail status: %d body=%s", rr.Code, rr.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode detail payload: %v", err)
	}
	workflowEnvelope, _ := payload["workflow"].(map[string]any)
	if workflowEnvelope == nil {
		t.Fatalf("expected workflow envelope, got %+v", payload)
	}
	transitions := workflowTransitionsFromEnvelope(workflowEnvelope)
	publish, ok := workflowTransitionByEvent(transitions, "publish")
	if !ok {
		t.Fatalf("expected publish transition, got %+v", transitions)
	}
	if workflowTransitionAllowed(publish) {
		t.Fatalf("expected publish transition to be blocked, got %+v", publish)
	}
	rejections := workflowTransitionRejections(publish)
	if len(rejections) == 0 {
		t.Fatalf("expected guard rejection diagnostics, got %+v", publish)
	}
}

func TestWorkflowTransportApplyEventMapsCanonicalErrorDetails(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	workflow := NewFSMWorkflowEngine()
	if err := workflow.RegisterGuard("deny_publish", func(context.Context, WorkflowMessage, WorkflowExecutionContext) error {
		return errors.New("publish blocked")
	}); err != nil {
		t.Fatalf("register guard: %v", err)
	}
	if err := workflow.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published", Guard: "deny_publish"},
		},
	}); err != nil {
		t.Fatalf("register workflow: %v", err)
	}

	adm := mustNewAdmin(t, cfg, Dependencies{Workflow: workflow})
	adm.WithAuthorizer(allowAll{})
	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		WithWorkflow(workflow).
		ListFields(Field{Name: "title", Label: "Title", Type: "text"}, Field{Name: "status", Label: "Status", Type: "text"}).
		FormFields(Field{Name: "title", Label: "Title", Type: "text"}, Field{Name: "status", Label: "Status", Type: "text"}).
		Actions(Action{Name: "publish"})
	if _, err := adm.RegisterPanel("pages", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	created, err := repo.Create(context.Background(), map[string]any{
		"title":  "Draft page",
		"status": "draft",
		"locale": "en",
	})
	if err != nil {
		t.Fatalf("seed page: %v", err)
	}
	id := strings.TrimSpace(toString(created["id"]))
	if id == "" {
		t.Fatalf("expected seeded id")
	}

	actionPath := adminAPIPath(adm, cfg, "panel.action", map[string]string{
		"panel":  "pages",
		"action": "publish",
	}, nil)
	req := httptest.NewRequest("POST", actionPath, strings.NewReader(`{"id":"`+id+`"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected bad request status, got %d body=%s", rr.Code, rr.Body.String())
	}

	var payload map[string]any
	if decodeErr := json.Unmarshal(rr.Body.Bytes(), &payload); decodeErr != nil {
		t.Fatalf("decode error payload: %v", decodeErr)
	}
	errPayload, _ := payload["error"].(map[string]any)
	if errPayload == nil {
		t.Fatalf("expected error envelope, got %+v", payload)
	}
	if textCode := strings.TrimSpace(toString(errPayload["text_code"])); textCode != TextCodeWorkflowInvalidTransition {
		t.Fatalf("expected text_code=%s, got %+v", TextCodeWorkflowInvalidTransition, errPayload["text_code"])
	}
	metadata, _ := errPayload["metadata"].(map[string]any)
	if len(metadata) == 0 {
		t.Fatalf("expected canonical runtime metadata, got %+v", errPayload)
	}
	persisted, err := repo.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("load persisted page: %v", err)
	}
	if got := strings.TrimSpace(toString(persisted["status"])); got != "draft" {
		t.Fatalf("expected status to remain draft after rejected transition, got %q", got)
	}
}

func workflowTransitionsFromEnvelope(workflowEnvelope map[string]any) []map[string]any {
	raw, ok := workflowEnvelope["transitions"]
	if !ok || raw == nil {
		return nil
	}
	items, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		transition, ok := item.(map[string]any)
		if !ok || transition == nil {
			continue
		}
		out = append(out, transition)
	}
	return out
}

func workflowTransitionByEvent(transitions []map[string]any, event string) (map[string]any, bool) {
	event = strings.TrimSpace(strings.ToLower(event))
	for _, transition := range transitions {
		name := strings.TrimSpace(strings.ToLower(toString(transition["event"])))
		if name == "" {
			name = strings.TrimSpace(strings.ToLower(toString(transition["Event"])))
		}
		if name == event {
			return transition, true
		}
	}
	return nil, false
}

func workflowTransitionAllowed(transition map[string]any) bool {
	if transition == nil {
		return false
	}
	if value, ok := transition["allowed"].(bool); ok {
		return value
	}
	if value, ok := transition["Allowed"].(bool); ok {
		return value
	}
	return false
}

func workflowTransitionRejections(transition map[string]any) []any {
	if transition == nil {
		return nil
	}
	if value, ok := transition["rejections"].([]any); ok {
		return value
	}
	if value, ok := transition["Rejections"].([]any); ok {
		return value
	}
	return nil
}

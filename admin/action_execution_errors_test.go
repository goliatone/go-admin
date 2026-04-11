package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/flow"
	router "github.com/goliatone/go-router"
)

type phase3ActionRepoStub struct {
	deleteErr error
}

func (s *phase3ActionRepoStub) List(context.Context, ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (s *phase3ActionRepoStub) Get(context.Context, string) (map[string]any, error) {
	return map[string]any{"id": "doc_123"}, nil
}

func (s *phase3ActionRepoStub) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, nil
}

func (s *phase3ActionRepoStub) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, nil
}

func (s *phase3ActionRepoStub) Delete(context.Context, string) error {
	return s.deleteErr
}

func TestActionExecutionPhase3DeleteFailureEnvelope(t *testing.T) {
	server := router.NewHTTPServer()
	panel := &Panel{
		name: "documents",
		repo: &phase3ActionRepoStub{
			deleteErr: resourceInUseDomainError("document cannot be deleted while attached to agreements", map[string]any{
				"entity": "documents",
				"field":  "id",
				"id":     "doc_123",
				"reason": "in use by agreements",
			}),
		},
	}
	ctx := AdminContext{Context: context.Background()}
	server.Router().Delete("/panels/documents/:id", func(c router.Context) error {
		if err := panel.Delete(ctx, c.Param("id")); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"status": "ok"})
	})

	req := httptest.NewRequest("DELETE", "/panels/documents/doc_123", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d body=%s", rr.Code, rr.Body.String())
	}
	assertPhase3ErrorEnvelope(t, rr.Body.Bytes(), TextCodeResourceInUse, "document cannot be deleted while attached to agreements", map[string]any{
		"entity": "documents",
		"field":  "id",
		"id":     "doc_123",
		"reason": "in use by agreements",
	})
}

func TestActionExecutionPhase3PanelActionFailureEnvelope(t *testing.T) {
	bus := NewCommandBus(true)
	if err := bus.RegisterFactory("phase3.publish", func(map[string]any, []string) (command.Message, error) {
		return nil, workflowRuntimeError(flow.ErrPreconditionFailed, "publish requires a reviewed record", nil, map[string]any{
			"field": "status",
		})
	}); err != nil {
		t.Fatalf("register factory: %v", err)
	}

	panel := &Panel{
		name: "documents",
		repo: &phase3ActionRepoStub{},
		actions: []Action{
			{Name: "publish", CommandName: "phase3.publish"},
		},
		commandBus: bus,
	}
	ctx := AdminContext{Context: context.Background()}
	server := router.NewHTTPServer()
	server.Router().Post("/panels/documents/actions/:action", func(c router.Context) error {
		if _, err := panel.RunActionResponse(ctx, c.Param("action"), map[string]any{"id": "doc_123"}, []string{"doc_123"}); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"status": "ok"})
	})

	req := httptest.NewRequest("POST", "/panels/documents/actions/publish", strings.NewReader(`{"id":"doc_123"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d body=%s", rr.Code, rr.Body.String())
	}
	assertPhase3ErrorEnvelope(t, rr.Body.Bytes(), TextCodePreconditionFailed, "publish requires a reviewed record", map[string]any{
		"field": "status",
	})
}

func TestActionExecutionPhase3BulkFailureEnvelope(t *testing.T) {
	server := router.NewHTTPServer()
	panel := &Panel{
		name: "documents",
		repo: &phase3ActionRepoStub{},
		bulkActions: []Action{
			{Name: "bulk_publish", CommandName: "phase3.publish"},
		},
	}
	ctx := AdminContext{Context: context.Background()}
	server.Router().Post("/panels/documents/bulk/:action", func(c router.Context) error {
		if err := panel.RunBulkAction(ctx, c.Param("action"), map[string]any{}, nil); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"status": "ok"})
	})

	req := httptest.NewRequest("POST", "/panels/documents/bulk/bulk_publish", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != 400 {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	assertPhase3ErrorEnvelope(t, rr.Body.Bytes(), TextCodeInvalidSelection, "bulk action requires at least one selected record", map[string]any{
		"panel":  "documents",
		"action": "bulk_publish",
		"field":  "ids",
	})
}

func assertPhase3ErrorEnvelope(t *testing.T, body []byte, wantCode, wantMessage string, wantMeta map[string]any) {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal error response: %v", err)
	}
	errPayload := extractMap(payload["error"])
	if got := strings.TrimSpace(toString(errPayload["text_code"])); got != wantCode {
		t.Fatalf("expected text_code %q, got %q", wantCode, got)
	}
	if got := strings.TrimSpace(toString(errPayload["message"])); got != wantMessage {
		t.Fatalf("expected message %q, got %q", wantMessage, got)
	}
	meta := extractMap(errPayload["metadata"])
	for key, want := range wantMeta {
		if got := meta[key]; toString(got) != toString(want) {
			t.Fatalf("expected metadata[%q]=%v, got %v", key, want, got)
		}
	}
}

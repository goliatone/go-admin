package httptransport

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
)

func TestHandleReadReturnsCanonicalEnvelopeAndServerDerivedScope(t *testing.T) {
	handler := mustNewHandler(t, syncServiceStub{
		get: func(_ context.Context, ref core.ResourceRef) (core.Snapshot, error) {
			if ref.Scope["tenant"] != "tenant_1" || ref.Scope["org"] != "org_9" {
				t.Fatalf("expected server-derived scope, got %+v", ref.Scope)
			}
			return core.Snapshot{
				ResourceRef: ref,
				Data:        []byte(`{"id":"agreement_draft_123","status":"draft"}`),
				Revision:    12,
				UpdatedAt:   time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC),
			}, nil
		},
	}, WithRequestIdentityResolver(func(*http.Request) (RequestIdentity, error) {
		return RequestIdentity{
			Scope: map[string]string{
				"tenant": "tenant_1",
				"org":    "org_9",
			},
		}, nil
	}))

	req := httptest.NewRequest(http.MethodGet, "/sync/resources/agreement_draft/agreement_draft_123", nil)
	req.SetPathValue("kind", "agreement_draft")
	req.SetPathValue("id", "agreement_draft_123")

	res := httptest.NewRecorder()
	handler.HandleRead(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}

	var envelope ReadResponse
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal read response: %v", err)
	}
	if envelope.Revision != 12 {
		t.Fatalf("expected revision 12, got %d", envelope.Revision)
	}
	scope, ok := envelope.Metadata["scope"].(map[string]any)
	if !ok {
		t.Fatalf("expected metadata.scope in response, got %#v", envelope.Metadata["scope"])
	}
	if scope["tenant"] != "tenant_1" || scope["org"] != "org_9" {
		t.Fatalf("expected transport metadata scope from server-derived ref, got %+v", scope)
	}
}

func TestHandleMutateDerivesTrustedIdentityAndReturnsMutationEnvelope(t *testing.T) {
	handler := mustNewHandler(t, syncServiceStub{
		mutate: func(_ context.Context, input core.MutationInput) (core.MutationResult, error) {
			if input.ResourceRef.Scope["tenant"] != "tenant_1" {
				t.Fatalf("expected trusted scope, got %+v", input.ResourceRef.Scope)
			}
			if input.ActorID != "user_42" || input.ClientID != "browser_7" || input.CorrelationID != "req_9" {
				t.Fatalf("expected trusted actor metadata, got actor=%q client=%q correlation=%q", input.ActorID, input.ClientID, input.CorrelationID)
			}
			if input.Operation != "autosave" {
				t.Fatalf("expected patch operation autosave, got %q", input.Operation)
			}
			if input.ExpectedRevision != 12 {
				t.Fatalf("expected revision 12, got %d", input.ExpectedRevision)
			}
			return core.MutationResult{
				Snapshot: core.Snapshot{
					ResourceRef: input.ResourceRef,
					Data:        []byte(`{"id":"agreement_draft_123","status":"draft"}`),
					Revision:    13,
					UpdatedAt:   time.Date(2026, time.March, 12, 18, 0, 2, 0, time.UTC),
					Metadata: map[string]any{
						"operation": input.Operation,
					},
				},
				Applied: true,
				Replay:  false,
			}, nil
		},
	}, WithRequestIdentityResolver(func(*http.Request) (RequestIdentity, error) {
		return RequestIdentity{
			Scope: map[string]string{
				"tenant": "tenant_1",
			},
			ActorID:       "user_42",
			ClientID:      "browser_7",
			CorrelationID: "req_9",
		}, nil
	}))

	req := httptest.NewRequest(http.MethodPatch, "/sync/resources/agreement_draft/agreement_draft_123", bytes.NewBufferString(`{
		"operation":"autosave",
		"payload":{"title":"Mutual NDA"},
		"expected_revision":12,
		"idempotency_key":"idem_autosave_12",
		"metadata":{"source":"contract_test"}
	}`))
	req.SetPathValue("kind", "agreement_draft")
	req.SetPathValue("id", "agreement_draft_123")

	res := httptest.NewRecorder()
	handler.HandleMutate(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}

	var envelope MutationResponse
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal mutation response: %v", err)
	}
	if !envelope.Applied || envelope.Replay {
		t.Fatalf("expected applied=true replay=false, got %+v", envelope)
	}
	if envelope.Metadata["operation"] != "autosave" {
		t.Fatalf("expected metadata.operation autosave, got %+v", envelope.Metadata)
	}
}

func TestHandleActionUsesPathOperationAndReturnsReplayEnvelope(t *testing.T) {
	handler := mustNewHandler(t, syncServiceStub{
		mutate: func(_ context.Context, input core.MutationInput) (core.MutationResult, error) {
			if input.Operation != "send" {
				t.Fatalf("expected action operation from path, got %q", input.Operation)
			}
			return core.MutationResult{
				Snapshot: core.Snapshot{
					ResourceRef: input.ResourceRef,
					Data:        []byte(`{"id":"agreement_draft_123","status":"sent"}`),
					Revision:    14,
					UpdatedAt:   time.Date(2026, time.March, 12, 18, 0, 5, 0, time.UTC),
				},
				Applied: true,
				Replay:  true,
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/sync/resources/agreement_draft/agreement_draft_123/actions/send", bytes.NewBufferString(`{
		"operation":"ignored-body-operation",
		"payload":{"confirm":true},
		"expected_revision":13,
		"idempotency_key":"idem_send_13"
	}`))
	req.SetPathValue("kind", "agreement_draft")
	req.SetPathValue("id", "agreement_draft_123")
	req.SetPathValue("operation", "send")

	res := httptest.NewRecorder()
	handler.HandleAction(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}

	var envelope MutationResponse
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal action response: %v", err)
	}
	if !envelope.Replay {
		t.Fatalf("expected replay=true, got %+v", envelope)
	}
}

func TestHandleMutateReturnsConflictEnvelope(t *testing.T) {
	latest := core.Snapshot{
		ResourceRef: core.ResourceRef{
			Kind: "agreement_draft",
			ID:   "agreement_draft_123",
			Scope: map[string]string{
				"tenant": "tenant_1",
			},
		},
		Data:      []byte(`{"id":"agreement_draft_123","status":"draft"}`),
		Revision:  13,
		UpdatedAt: time.Date(2026, time.March, 12, 18, 0, 2, 0, time.UTC),
	}
	handler := mustNewHandler(t, syncServiceStub{
		mutate: func(_ context.Context, input core.MutationInput) (core.MutationResult, error) {
			return core.MutationResult{}, core.NewStaleRevisionError(13, &latest)
		},
	})

	req := httptest.NewRequest(http.MethodPatch, "/sync/resources/agreement_draft/agreement_draft_123", bytes.NewBufferString(`{
		"operation":"autosave",
		"payload":{"title":"Changed"},
		"expected_revision":12
	}`))
	req.SetPathValue("kind", "agreement_draft")
	req.SetPathValue("id", "agreement_draft_123")

	res := httptest.NewRecorder()
	handler.HandleMutate(res, req)

	if res.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", res.Code, res.Body.String())
	}

	var envelope ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal conflict response: %v", err)
	}
	if envelope.Error.Code != core.CodeStaleRevision {
		t.Fatalf("expected stale revision code, got %s", envelope.Error.Code)
	}
}

func TestHandleMutateRejectsInvalidRequestEnvelope(t *testing.T) {
	handler := mustNewHandler(t, syncServiceStub{})

	req := httptest.NewRequest(http.MethodPatch, "/sync/resources/agreement_draft/agreement_draft_123", bytes.NewBufferString(`{
		"operation":"autosave",
		"payload":{"title":"Changed"}
	}`))
	req.SetPathValue("kind", "agreement_draft")
	req.SetPathValue("id", "agreement_draft_123")

	res := httptest.NewRecorder()
	handler.HandleMutate(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", res.Code, res.Body.String())
	}

	var envelope ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal invalid request response: %v", err)
	}
	if envelope.Error.Code != core.CodeInvalidMutation {
		t.Fatalf("expected invalid mutation code, got %s", envelope.Error.Code)
	}
}

func TestHandleActionMapsTemporaryFailureEnvelope(t *testing.T) {
	handler := mustNewHandler(t, syncServiceStub{
		mutate: func(context.Context, core.MutationInput) (core.MutationResult, error) {
			return core.MutationResult{}, core.NewError(core.CodeTemporaryFailure, "upstream unavailable", nil)
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/sync/resources/agreement_draft/agreement_draft_123/actions/send", bytes.NewBufferString(`{
		"payload":{"confirm":true},
		"expected_revision":13,
		"idempotency_key":"idem_send_13"
	}`))
	req.SetPathValue("kind", "agreement_draft")
	req.SetPathValue("id", "agreement_draft_123")
	req.SetPathValue("operation", "send")

	res := httptest.NewRecorder()
	handler.HandleAction(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d body=%s", res.Code, res.Body.String())
	}

	var envelope ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal temporary failure response: %v", err)
	}
	if envelope.Error.Code != core.CodeTemporaryFailure {
		t.Fatalf("expected temporary failure code, got %s", envelope.Error.Code)
	}
}

type syncServiceStub struct {
	get    func(context.Context, core.ResourceRef) (core.Snapshot, error)
	mutate func(context.Context, core.MutationInput) (core.MutationResult, error)
}

func (stub syncServiceStub) Get(ctx context.Context, ref core.ResourceRef) (core.Snapshot, error) {
	if stub.get == nil {
		return core.Snapshot{}, core.NewError(core.CodeNotFound, "resource not found", nil)
	}
	return stub.get(ctx, ref)
}

func (stub syncServiceStub) Mutate(ctx context.Context, input core.MutationInput) (core.MutationResult, error) {
	if stub.mutate == nil {
		return core.MutationResult{}, core.NewError(core.CodeTemporaryFailure, "mutation not configured", nil)
	}
	return stub.mutate(ctx, input)
}

func mustNewHandler(t *testing.T, service core.SyncService, opts ...HandlerOption) *Handler {
	t.Helper()
	handler, err := NewHandler(service, opts...)
	if err != nil {
		t.Fatalf("new handler: %v", err)
	}
	return handler
}

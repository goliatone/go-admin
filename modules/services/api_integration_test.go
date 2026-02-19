package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	goadmin "github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	goservices "github.com/goliatone/go-services"
	gocore "github.com/goliatone/go-services/core"
	goserviceswebhooks "github.com/goliatone/go-services/webhooks"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/julienschmidt/httprouter"
	"github.com/uptrace/bun"
)

type servicesAllowAuthorizer struct{}

func (servicesAllowAuthorizer) Can(context.Context, string, string) bool { return true }

type servicesMapAuthorizer struct {
	allowed map[string]bool
}

func (a servicesMapAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if a.allowed == nil {
		return true
	}
	allowed, ok := a.allowed[action]
	if !ok {
		return true
	}
	return allowed
}

type testServicesProvider struct {
	id string
}

func (p testServicesProvider) ID() string { return p.id }

func (p testServicesProvider) AuthKind() gocore.AuthKind { return gocore.AuthKindOAuth2AuthCode }

func (p testServicesProvider) SupportedScopeTypes() []string { return []string{"user", "org"} }

func (p testServicesProvider) Capabilities() []gocore.CapabilityDescriptor {
	return []gocore.CapabilityDescriptor{{
		Name:           "repo.read",
		RequiredGrants: []string{"repo:read"},
		DeniedBehavior: gocore.CapabilityDeniedBehaviorBlock,
	}}
}

func (p testServicesProvider) BeginAuth(_ context.Context, req gocore.BeginAuthRequest) (gocore.BeginAuthResponse, error) {
	state := strings.TrimSpace(req.State)
	if state == "" {
		state = "state-1"
	}
	return gocore.BeginAuthResponse{
		URL:             "https://example.com/oauth/start",
		State:           state,
		RequestedGrants: append([]string(nil), req.RequestedGrants...),
	}, nil
}

func (p testServicesProvider) CompleteAuth(_ context.Context, req gocore.CompleteAuthRequest) (gocore.CompleteAuthResponse, error) {
	now := time.Now().UTC().Add(1 * time.Hour)
	return gocore.CompleteAuthResponse{
		ExternalAccountID: "acct_1",
		Credential: gocore.ActiveCredential{
			TokenType:       "bearer",
			AccessToken:     "token_1",
			RefreshToken:    "refresh_1",
			RequestedScopes: []string{"repo:read"},
			GrantedScopes:   []string{"repo:read"},
			ExpiresAt:       &now,
			Refreshable:     true,
		},
		RequestedGrants: []string{"repo:read"},
		GrantedGrants:   []string{"repo:read"},
	}, nil
}

func (p testServicesProvider) Refresh(_ context.Context, _ gocore.ActiveCredential) (gocore.RefreshResult, error) {
	now := time.Now().UTC().Add(1 * time.Hour)
	return gocore.RefreshResult{
		Credential: gocore.ActiveCredential{
			TokenType:     "bearer",
			AccessToken:   "token_refresh",
			GrantedScopes: []string{"repo:read"},
			Refreshable:   true,
			ExpiresAt:     &now,
		},
		GrantedGrants: []string{"repo:read"},
	}, nil
}

type failJobEnqueuer struct{}

func (failJobEnqueuer) Enqueue(context.Context, *gocore.JobExecutionMessage) error {
	return errors.New("queue unavailable")
}

type signatureVerifier struct{}

func (signatureVerifier) Verify(_ context.Context, req gocore.InboundRequest) error {
	if strings.TrimSpace(req.Headers["X-Signature"]) == "" {
		return errors.New("missing signature")
	}
	return nil
}

type flakyInboundHandler struct {
	mu    sync.Mutex
	surf  string
	calls int
}

func (h *flakyInboundHandler) Surface() string {
	if strings.TrimSpace(h.surf) == "" {
		return "webhook"
	}
	return h.surf
}

func (h *flakyInboundHandler) Handle(_ context.Context, _ gocore.InboundRequest) (gocore.InboundResult, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.calls++
	if h.calls == 1 {
		return gocore.InboundResult{Accepted: false, StatusCode: 500}, errors.New("transient")
	}
	return gocore.InboundResult{Accepted: true, StatusCode: 202}, nil
}

func (h *flakyInboundHandler) Count() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.calls
}

type captureJobEnqueuer struct {
	mu       sync.Mutex
	messages []gocore.JobExecutionMessage
}

func (e *captureJobEnqueuer) Enqueue(_ context.Context, message *gocore.JobExecutionMessage) error {
	if message == nil {
		return errors.New("message is required")
	}
	copyMessage := *message
	copyMessage.Parameters = copyAnyMap(message.Parameters)
	e.mu.Lock()
	defer e.mu.Unlock()
	e.messages = append(e.messages, copyMessage)
	return nil
}

func (e *captureJobEnqueuer) JobIDs() []string {
	e.mu.Lock()
	defer e.mu.Unlock()
	ids := make([]string, 0, len(e.messages))
	for _, message := range e.messages {
		ids = append(ids, message.JobID)
	}
	return ids
}

type memoryWebhookLedger struct {
	mu      sync.Mutex
	records map[string]goserviceswebhooks.DeliveryRecord
	now     func() time.Time
}

func newMemoryWebhookLedger() *memoryWebhookLedger {
	return &memoryWebhookLedger{
		records: map[string]goserviceswebhooks.DeliveryRecord{},
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (l *memoryWebhookLedger) Claim(
	_ context.Context,
	providerID string,
	deliveryID string,
	_ []byte,
	lease time.Duration,
) (goserviceswebhooks.DeliveryRecord, bool, error) {
	if lease <= 0 {
		lease = 30 * time.Second
	}
	key := strings.TrimSpace(providerID) + ":" + strings.TrimSpace(deliveryID)
	if key == ":" {
		return goserviceswebhooks.DeliveryRecord{}, false, errors.New("provider and delivery id are required")
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now().UTC()
	record, exists := l.records[key]
	if !exists {
		record = goserviceswebhooks.DeliveryRecord{
			ID:         "delivery_1",
			ProviderID: strings.TrimSpace(providerID),
			DeliveryID: strings.TrimSpace(deliveryID),
			Status:     goserviceswebhooks.DeliveryStatusPending,
			Attempts:   0,
			CreatedAt:  now,
		}
	}

	claimable := false
	switch record.Status {
	case goserviceswebhooks.DeliveryStatusPending:
		claimable = true
	case goserviceswebhooks.DeliveryStatusRetryReady:
		claimable = record.NextAttemptAt == nil || !record.NextAttemptAt.After(now)
	case goserviceswebhooks.DeliveryStatusProcessing:
		claimable = record.NextAttemptAt == nil || !record.NextAttemptAt.After(now)
	default:
		claimable = false
	}
	if !claimable {
		l.records[key] = record
		return record, false, nil
	}

	record.Attempts++
	record.Status = goserviceswebhooks.DeliveryStatusProcessing
	record.ClaimID = key + ":" + toString(record.Attempts)
	leaseUntil := now.Add(lease).UTC()
	record.NextAttemptAt = &leaseUntil
	record.UpdatedAt = now
	l.records[key] = record
	return record, true, nil
}

func (l *memoryWebhookLedger) Get(_ context.Context, providerID string, deliveryID string) (goserviceswebhooks.DeliveryRecord, error) {
	key := strings.TrimSpace(providerID) + ":" + strings.TrimSpace(deliveryID)
	l.mu.Lock()
	defer l.mu.Unlock()
	record, ok := l.records[key]
	if !ok {
		return goserviceswebhooks.DeliveryRecord{}, errors.New("delivery not found")
	}
	return record, nil
}

func (l *memoryWebhookLedger) Complete(_ context.Context, claimID string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	for key, record := range l.records {
		if record.ClaimID != strings.TrimSpace(claimID) {
			continue
		}
		record.Status = goserviceswebhooks.DeliveryStatusProcessed
		record.NextAttemptAt = nil
		record.UpdatedAt = l.now().UTC()
		l.records[key] = record
		return nil
	}
	return nil
}

func (l *memoryWebhookLedger) Fail(_ context.Context, claimID string, _ error, nextAttemptAt time.Time, maxAttempts int) error {
	if maxAttempts <= 0 {
		maxAttempts = 8
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	for key, record := range l.records {
		if record.ClaimID != strings.TrimSpace(claimID) {
			continue
		}
		if record.Attempts >= maxAttempts {
			record.Status = goserviceswebhooks.DeliveryStatusDead
			record.NextAttemptAt = nil
		} else {
			record.Status = goserviceswebhooks.DeliveryStatusRetryReady
			if nextAttemptAt.IsZero() {
				nextAttemptAt = l.now().UTC()
			}
			next := nextAttemptAt.UTC()
			record.NextAttemptAt = &next
		}
		record.UpdatedAt = l.now().UTC()
		l.records[key] = record
		return nil
	}
	return nil
}

func TestServicesAPI_AuthzEnforced(t *testing.T) {
	_, _, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesMapAuthorizer{allowed: map[string]bool{
			permissionServicesView:     false,
			permissionServicesWebhooks: false,
		}})
	})

	res := performJSONRequest(t, server, http.MethodGet, base+"/providers", nil, nil)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", res.Code, res.Body.String())
	}
	assertErrorCode(t, res.Body.Bytes(), "forbidden")

	res = performJSONRequest(t, server, http.MethodPost, base+"/webhooks/github", map[string]any{"metadata": map[string]any{"delivery_id": "d-1"}}, map[string]string{"X-Signature": "sig"})
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", res.Code, res.Body.String())
	}
	assertErrorCode(t, res.Body.Bytes(), "forbidden")
}

func TestServicesAPI_WebhookVerificationAndClaimLifecycleRetry(t *testing.T) {
	handler := &flakyInboundHandler{surf: "webhook"}
	ledger := newMemoryWebhookLedger()
	_, _, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	},
		WithWebhookVerifier(signatureVerifier{}),
		WithWebhookDeliveryLedger(ledger),
		WithInboundHandler(handler),
	)

	unauthorized := performJSONRequest(t, server, http.MethodPost, base+"/webhooks/github", map[string]any{"metadata": map[string]any{"delivery_id": "d-verify"}}, nil)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", unauthorized.Code, unauthorized.Body.String())
	}
	assertErrorEnvelope(t, unauthorized.Body.Bytes(), "unauthorized", false)

	headers := map[string]string{
		"X-Signature":   "sig",
		"X-Delivery-ID": "d-retry-1",
	}
	first := performJSONRequest(t, server, http.MethodPost, base+"/webhooks/github", map[string]any{"metadata": map[string]any{"delivery_id": "d-retry-1"}}, headers)
	if first.Code != http.StatusInternalServerError {
		t.Fatalf("expected first webhook attempt 500, got %d body=%s", first.Code, first.Body.String())
	}
	assertErrorEnvelope(t, first.Body.Bytes(), "internal_error", true)

	second := performJSONRequest(t, server, http.MethodPost, base+"/webhooks/github", map[string]any{"metadata": map[string]any{"delivery_id": "d-retry-1"}}, headers)
	if second.Code != http.StatusOK {
		t.Fatalf("expected deduped retry-ready response 200, got %d body=%s", second.Code, second.Body.String())
	}
	if handler.Count() != 1 {
		t.Fatalf("expected webhook handler count=1 after immediate retry, got %d", handler.Count())
	}

	time.Sleep(1100 * time.Millisecond)
	third := performJSONRequest(t, server, http.MethodPost, base+"/webhooks/github", map[string]any{"metadata": map[string]any{"delivery_id": "d-retry-1"}}, headers)
	if third.Code != http.StatusAccepted {
		t.Fatalf("expected reprocessed retry response 202, got %d body=%s", third.Code, third.Body.String())
	}
	if handler.Count() != 2 {
		t.Fatalf("expected webhook handler count=2 after lease expiration, got %d", handler.Count())
	}
}

func TestServicesAPI_QueueFailureAndErrorEnvelopeMapping(t *testing.T) {
	_, _, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	}, WithJobEnqueuer(failJobEnqueuer{}))

	refreshBody := map[string]any{"provider_id": "github"}
	refresh := performJSONRequest(t, server, http.MethodPost, base+"/connections/conn_1/refresh", refreshBody, map[string]string{"Idempotency-Key": "refresh-1"})
	if refresh.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected queue failure 503, got %d body=%s", refresh.Code, refresh.Body.String())
	}
	assertErrorEnvelope(t, refresh.Body.Bytes(), "provider_unavailable", true)

	invalid := performJSONRequest(t, server, http.MethodPost, base+"/connections/github/begin", map[string]any{}, map[string]string{"Idempotency-Key": "begin-invalid"})
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("expected validation 400, got %d body=%s", invalid.Code, invalid.Body.String())
	}
	assertErrorEnvelope(t, invalid.Body.Bytes(), "validation_error", false)

	withRequestID := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/github/begin",
		map[string]any{},
		map[string]string{"Idempotency-Key": "begin-invalid-request-id", "X-Request-ID": "req-services-1"},
	)
	assertErrorRequestID(t, withRequestID.Body.Bytes(), "req-services-1")
}

func TestServicesAPI_IdempotencyReplayAndConflict(t *testing.T) {
	_, _, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	})

	headers := map[string]string{"Idempotency-Key": "connect-1"}
	payload := map[string]any{"scope_type": "user", "scope_id": "user-1", "state": "state-a"}
	first := performJSONRequest(t, server, http.MethodPost, base+"/connections/github/begin", payload, headers)
	if first.Code != http.StatusOK {
		t.Fatalf("expected first begin 200, got %d body=%s", first.Code, first.Body.String())
	}

	second := performJSONRequest(t, server, http.MethodPost, base+"/connections/github/begin", payload, headers)
	if second.Code != http.StatusOK {
		t.Fatalf("expected replay begin 200, got %d body=%s", second.Code, second.Body.String())
	}
	assertJSONEqual(t, first.Body.Bytes(), second.Body.Bytes())

	conflict := performJSONRequest(t, server, http.MethodPost, base+"/connections/github/begin", map[string]any{"scope_type": "user", "scope_id": "user-2"}, headers)
	if conflict.Code != http.StatusConflict {
		t.Fatalf("expected idempotency conflict 409, got %d body=%s", conflict.Code, conflict.Body.String())
	}
	assertErrorCode(t, conflict.Body.Bytes(), "conflict")
}

func TestServicesAPI_BeginConnectionResolvesCallbackRedirectFromRequestOrigin(t *testing.T) {
	adm, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
	)

	response := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/github/begin",
		map[string]any{"scope_type": "user", "scope_id": "user-1"},
		map[string]string{"Idempotency-Key": "callback-origin-1"},
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected begin connection 200, got %d body=%s", response.Code, response.Body.String())
	}

	payload := decodeJSONMap(t, response.Body.Bytes())
	begin := toAnyMap(payload["begin"])
	state := strings.TrimSpace(primitives.FirstNonEmpty(toString(begin["state"]), toString(begin["State"])))
	record := consumeOAuthStateRecord(t, module, state)
	expected := "http://example.com" + strings.TrimRight(adm.AdminAPIBasePath(), "/") + "/services/connections/github/callback"
	if got := strings.TrimSpace(record.RedirectURI); got != expected {
		t.Fatalf("expected resolved redirect %q, got %q", expected, got)
	}
}

func TestServicesAPI_BeginConnectionResolvesCallbackRedirectWithPublicBaseOverride(t *testing.T) {
	adm, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithCallbackURLConfig(CallbackURLConfig{
			PublicBaseURL: "https://callbacks.example.com",
		}),
	)

	response := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/github/begin",
		map[string]any{"scope_type": "user", "scope_id": "user-1"},
		map[string]string{"Idempotency-Key": "callback-public-1"},
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected begin connection 200, got %d body=%s", response.Code, response.Body.String())
	}

	payload := decodeJSONMap(t, response.Body.Bytes())
	begin := toAnyMap(payload["begin"])
	state := strings.TrimSpace(primitives.FirstNonEmpty(toString(begin["state"]), toString(begin["State"])))
	record := consumeOAuthStateRecord(t, module, state)
	expected := "https://callbacks.example.com" + strings.TrimRight(adm.AdminAPIBasePath(), "/") + "/services/connections/github/callback"
	if got := strings.TrimSpace(record.RedirectURI); got != expected {
		t.Fatalf("expected resolved redirect %q, got %q", expected, got)
	}
}

func TestServicesAPI_BeginConnectionResolvesProviderSpecificCallbackRoute(t *testing.T) {
	adm, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) {
			adm.WithAuthorizer(servicesAllowAuthorizer{})
			manager, ok := adm.URLs().(*urlkit.RouteManager)
			if !ok || manager == nil {
				t.Fatalf("expected URL manager")
			}
			if _, err := manager.AddRoutes(adm.AdminAPIGroup(), map[string]string{
				"services.github.callback.custom": "/services/oauth/github/custom-callback",
			}); err != nil {
				t.Fatalf("add callback route: %v", err)
			}
		},
		WithCallbackURLConfig(CallbackURLConfig{
			ProviderRoutes: map[string]string{
				"github": "services.github.callback.custom",
			},
		}),
	)

	response := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/github/begin",
		map[string]any{"scope_type": "user", "scope_id": "user-1"},
		map[string]string{"Idempotency-Key": "callback-provider-route-1"},
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected begin connection 200, got %d body=%s", response.Code, response.Body.String())
	}

	payload := decodeJSONMap(t, response.Body.Bytes())
	begin := toAnyMap(payload["begin"])
	state := strings.TrimSpace(primitives.FirstNonEmpty(toString(begin["state"]), toString(begin["State"])))
	record := consumeOAuthStateRecord(t, module, state)
	expected := "http://example.com" + strings.TrimRight(adm.AdminAPIBasePath(), "/") + "/services/oauth/github/custom-callback"
	if got := strings.TrimSpace(record.RedirectURI); got != expected {
		t.Fatalf("expected resolved redirect %q, got %q", expected, got)
	}
}

func TestServicesAPI_BeginConnectionResolvesProviderSpecificCallbackURLOverride(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithCallbackURLConfig(CallbackURLConfig{
			ProviderURLOverrides: map[string]string{
				"github": "https://hooks.example.com/oauth/github/callback",
			},
		}),
	)

	response := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/github/begin",
		map[string]any{"scope_type": "user", "scope_id": "user-1"},
		map[string]string{"Idempotency-Key": "callback-provider-url-1"},
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected begin connection 200, got %d body=%s", response.Code, response.Body.String())
	}

	payload := decodeJSONMap(t, response.Body.Bytes())
	begin := toAnyMap(payload["begin"])
	state := strings.TrimSpace(primitives.FirstNonEmpty(toString(begin["state"]), toString(begin["State"])))
	record := consumeOAuthStateRecord(t, module, state)
	if got := strings.TrimSpace(record.RedirectURI); got != "https://hooks.example.com/oauth/github/callback" {
		t.Fatalf("expected override redirect, got %q", got)
	}
}

func TestServicesAPI_BeginConnectionRedirectURIRequestValueHasPrecedence(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithCallbackURLConfig(CallbackURLConfig{
			ProviderURLOverrides: map[string]string{
				"github": "https://hooks.example.com/oauth/github/callback",
			},
		}),
	)

	response := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/github/begin",
		map[string]any{
			"scope_type":   "user",
			"scope_id":     "user-1",
			"redirect_uri": "https://request.example.com/oauth/direct-callback",
		},
		map[string]string{"Idempotency-Key": "callback-request-precedence-1"},
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected begin connection 200, got %d body=%s", response.Code, response.Body.String())
	}

	payload := decodeJSONMap(t, response.Body.Bytes())
	begin := toAnyMap(payload["begin"])
	state := strings.TrimSpace(primitives.FirstNonEmpty(toString(begin["state"]), toString(begin["State"])))
	record := consumeOAuthStateRecord(t, module, state)
	if got := strings.TrimSpace(record.RedirectURI); got != "https://request.example.com/oauth/direct-callback" {
		t.Fatalf("expected request redirect URI precedence, got %q", got)
	}
}

func TestServicesAPI_InboundVerificationAndClaimLifecycleRetry(t *testing.T) {
	handler := &flakyInboundHandler{surf: "command"}
	_, _, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	},
		WithInboundVerifier(signatureVerifier{}),
		WithInboundHandler(handler),
	)

	unauthorized := performJSONRequest(t, server, http.MethodPost, base+"/inbound/github/command", map[string]any{"metadata": map[string]any{"message_id": "m-verify"}}, nil)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", unauthorized.Code, unauthorized.Body.String())
	}
	assertErrorEnvelope(t, unauthorized.Body.Bytes(), "unauthorized", false)

	headers := map[string]string{
		"X-Signature":  "sig",
		"X-Message-ID": "m-retry-1",
	}
	first := performJSONRequest(t, server, http.MethodPost, base+"/inbound/github/command", map[string]any{"metadata": map[string]any{"message_id": "m-retry-1"}}, headers)
	if first.Code != http.StatusInternalServerError {
		t.Fatalf("expected first inbound attempt 500, got %d body=%s", first.Code, first.Body.String())
	}
	assertErrorEnvelope(t, first.Body.Bytes(), "internal_error", true)

	second := performJSONRequest(t, server, http.MethodPost, base+"/inbound/github/command", map[string]any{"metadata": map[string]any{"message_id": "m-retry-1"}}, headers)
	if second.Code != http.StatusAccepted {
		t.Fatalf("expected retry claim response 202, got %d body=%s", second.Code, second.Body.String())
	}
	if handler.Count() != 2 {
		t.Fatalf("expected inbound handler count=2 after immediate retry claim, got %d", handler.Count())
	}

	third := performJSONRequest(t, server, http.MethodPost, base+"/inbound/github/command", map[string]any{"metadata": map[string]any{"message_id": "m-retry-1"}}, headers)
	if third.Code != http.StatusOK {
		t.Fatalf("expected completed dedupe response 200, got %d body=%s", third.Code, third.Body.String())
	}
	if handler.Count() != 2 {
		t.Fatalf("expected inbound handler count=2 after completion dedupe, got %d", handler.Count())
	}
}

func TestServicesAPI_QueuesWorkerJobsForAsyncOperations(t *testing.T) {
	enqueuer := &captureJobEnqueuer{}
	ledger := newMemoryWebhookLedger()
	_, _, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithJobEnqueuer(enqueuer),
		WithWebhookVerifier(signatureVerifier{}),
		WithWebhookDeliveryLedger(ledger),
	)

	refresh := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/connections/conn_1/refresh",
		map[string]any{"provider_id": "github"},
		map[string]string{"Idempotency-Key": "queue-refresh-1"},
	)
	if refresh.Code != http.StatusAccepted {
		t.Fatalf("expected refresh enqueue 202, got %d body=%s", refresh.Code, refresh.Body.String())
	}

	renew := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/subscriptions/sub_1/renew",
		map[string]any{"metadata": map[string]any{"source": "test"}},
		map[string]string{"Idempotency-Key": "queue-renew-1"},
	)
	if renew.Code != http.StatusAccepted {
		t.Fatalf("expected renew enqueue 202, got %d body=%s", renew.Code, renew.Body.String())
	}

	syncRun := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/connections/conn_1/run",
		map[string]any{"provider_id": "github", "resource_type": "issues", "resource_id": "repo-1"},
		map[string]string{"Idempotency-Key": "queue-sync-1"},
	)
	if syncRun.Code != http.StatusAccepted {
		t.Fatalf("expected sync enqueue 202, got %d body=%s", syncRun.Code, syncRun.Body.String())
	}

	webhook := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/webhooks/github",
		map[string]any{"metadata": map[string]any{"delivery_id": "queue-delivery-1"}},
		map[string]string{"X-Signature": "sig", "X-Delivery-ID": "queue-delivery-1"},
	)
	if webhook.Code != http.StatusAccepted {
		t.Fatalf("expected webhook enqueue 202, got %d body=%s", webhook.Code, webhook.Body.String())
	}

	jobIDs := enqueuer.JobIDs()
	if len(jobIDs) != 4 {
		t.Fatalf("expected 4 queued jobs, got %d (%v)", len(jobIDs), jobIDs)
	}
	expected := map[string]bool{
		"services.refresh":            false,
		"services.subscription.renew": false,
		"services.sync.incremental":   false,
		"services.webhook.process":    false,
	}
	for _, jobID := range jobIDs {
		if _, ok := expected[jobID]; ok {
			expected[jobID] = true
		}
	}
	for jobID, seen := range expected {
		if !seen {
			t.Fatalf("expected queued job id %q in %v", jobID, jobIDs)
		}
	}
}

func TestServicesAPI_RoutePermissionMatrixReturnsForbiddenEnvelope(t *testing.T) {
	tests := []struct {
		name       string
		permission string
		method     string
		path       string
		payload    map[string]any
		headers    map[string]string
	}{
		{name: "providers", permission: permissionServicesView, method: http.MethodGet, path: "/providers"},
		{name: "activity", permission: permissionServicesActivityView, method: http.MethodGet, path: "/activity"},
		{name: "status", permission: permissionServicesActivityView, method: http.MethodGet, path: "/status"},
		{name: "extensions diagnostics", permission: permissionServicesView, method: http.MethodGet, path: "/extensions/diagnostics"},
		{name: "retention cleanup", permission: permissionServicesEdit, method: http.MethodPost, path: "/activity/retention/cleanup", payload: map[string]any{}},
		{name: "installations list", permission: permissionServicesView, method: http.MethodGet, path: "/installations"},
		{name: "installation detail", permission: permissionServicesView, method: http.MethodGet, path: "/installations/install_1"},
		{name: "installation begin", permission: permissionServicesConnect, method: http.MethodPost, path: "/installations/github/begin", payload: map[string]any{}},
		{name: "installation update status", permission: permissionServicesEdit, method: http.MethodPost, path: "/installations/install_1/status", payload: map[string]any{}},
		{name: "installation uninstall", permission: permissionServicesRevoke, method: http.MethodPost, path: "/installations/install_1/uninstall", payload: map[string]any{}},
		{name: "connections list", permission: permissionServicesView, method: http.MethodGet, path: "/connections"},
		{name: "connection detail", permission: permissionServicesView, method: http.MethodGet, path: "/connections/conn_1"},
		{name: "connection begin", permission: permissionServicesConnect, method: http.MethodPost, path: "/connections/github/begin", payload: map[string]any{}},
		{name: "connection callback", permission: permissionServicesConnect, method: http.MethodGet, path: "/connections/github/callback"},
		{name: "connection grants", permission: permissionServicesView, method: http.MethodGet, path: "/connections/conn_1/grants"},
		{name: "reconsent begin", permission: permissionServicesReconsent, method: http.MethodPost, path: "/connections/conn_1/reconsent/begin", payload: map[string]any{}},
		{name: "connection refresh", permission: permissionServicesEdit, method: http.MethodPost, path: "/connections/conn_1/refresh", payload: map[string]any{}},
		{name: "connection revoke", permission: permissionServicesRevoke, method: http.MethodPost, path: "/connections/conn_1/revoke", payload: map[string]any{}},
		{name: "capability invoke", permission: permissionServicesEdit, method: http.MethodPost, path: "/capabilities/github/repo.read/invoke", payload: map[string]any{}},
		{name: "webhook ingress", permission: permissionServicesWebhooks, method: http.MethodPost, path: "/webhooks/github", payload: map[string]any{}},
		{name: "subscriptions list", permission: permissionServicesView, method: http.MethodGet, path: "/subscriptions"},
		{name: "subscription renew", permission: permissionServicesEdit, method: http.MethodPost, path: "/subscriptions/sub_1/renew", payload: map[string]any{}},
		{name: "subscription cancel", permission: permissionServicesEdit, method: http.MethodPost, path: "/subscriptions/sub_1/cancel", payload: map[string]any{}},
		{name: "sync run", permission: permissionServicesEdit, method: http.MethodPost, path: "/sync/connections/conn_1/run", payload: map[string]any{}},
		{name: "sync status", permission: permissionServicesView, method: http.MethodGet, path: "/sync/connections/conn_1/status"},
		{name: "rate limits", permission: permissionServicesView, method: http.MethodGet, path: "/rate-limits"},
		{name: "rate limits runtime", permission: permissionServicesView, method: http.MethodGet, path: "/rate-limits/runtime"},
		{name: "operation status", permission: permissionServicesView, method: http.MethodGet, path: "/operations/status"},
		{name: "inbound ingress", permission: permissionServicesWebhooks, method: http.MethodPost, path: "/inbound/github/command", payload: map[string]any{}},
		{name: "workflow mappings list", permission: permissionServicesView, method: http.MethodGet, path: "/mappings"},
		{name: "workflow mappings get", permission: permissionServicesView, method: http.MethodGet, path: "/mappings/spec/spec_1"},
		{name: "workflow mappings version", permission: permissionServicesView, method: http.MethodGet, path: "/mappings/spec/spec_1/versions/1"},
		{name: "workflow mappings create", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings", payload: map[string]any{}},
		{name: "workflow mappings update", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings/spec/spec_1/update", payload: map[string]any{}},
		{name: "workflow mappings mark validated", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings/spec/spec_1/validate", payload: map[string]any{}},
		{name: "workflow mappings publish", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings/spec/spec_1/publish", payload: map[string]any{}},
		{name: "workflow mappings unpublish", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings/spec/spec_1/unpublish", payload: map[string]any{}},
		{name: "workflow mappings validate", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings/validate", payload: map[string]any{}},
		{name: "workflow mappings preview", permission: permissionServicesEdit, method: http.MethodPost, path: "/mappings/preview", payload: map[string]any{}},
		{name: "workflow sync plan", permission: permissionServicesEdit, method: http.MethodPost, path: "/sync/plan", payload: map[string]any{}},
		{name: "workflow sync run", permission: permissionServicesEdit, method: http.MethodPost, path: "/sync/run", payload: map[string]any{}},
		{name: "workflow sync runs list", permission: permissionServicesView, method: http.MethodGet, path: "/sync/runs"},
		{name: "workflow sync run detail", permission: permissionServicesView, method: http.MethodGet, path: "/sync/runs/run_1"},
		{name: "workflow sync run resume", permission: permissionServicesEdit, method: http.MethodPost, path: "/sync/runs/run_1/resume", payload: map[string]any{}},
		{name: "workflow sync checkpoint detail", permission: permissionServicesView, method: http.MethodGet, path: "/sync/checkpoints/checkpoint_1"},
		{name: "workflow conflicts list", permission: permissionServicesView, method: http.MethodGet, path: "/sync/conflicts"},
		{name: "workflow conflict detail", permission: permissionServicesView, method: http.MethodGet, path: "/sync/conflicts/conflict_1"},
		{name: "workflow conflict resolve", permission: permissionServicesEdit, method: http.MethodPost, path: "/sync/conflicts/conflict_1/resolve", payload: map[string]any{}},
		{name: "workflow schema drift list", permission: permissionServicesView, method: http.MethodGet, path: "/sync/schema-drift"},
		{name: "workflow schema drift baseline", permission: permissionServicesEdit, method: http.MethodPost, path: "/sync/schema-drift/baseline", payload: map[string]any{}},
		{name: "workflow candidates list", permission: permissionServicesView, method: http.MethodGet, path: "/connection-candidates"},
		{name: "workflow invoke capability", permission: permissionServicesEdit, method: http.MethodPost, path: "/capabilities/github/repo.read/invoke", payload: map[string]any{}},
		{name: "workflow callback diagnostics status", permission: permissionServicesView, method: http.MethodGet, path: "/callbacks/diagnostics/status"},
		{name: "workflow callback diagnostics preview", permission: permissionServicesView, method: http.MethodPost, path: "/callbacks/diagnostics/preview", payload: map[string]any{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
				adm.WithAuthorizer(servicesMapAuthorizer{
					allowed: map[string]bool{tt.permission: false},
				})
			})
			res := performJSONRequest(t, server, tt.method, base+tt.path, tt.payload, tt.headers)
			if res.Code != http.StatusForbidden {
				t.Fatalf("expected 403, got %d body=%s", res.Code, res.Body.String())
			}
			assertErrorEnvelope(t, res.Body.Bytes(), "forbidden", false)
		})
	}
}

func TestServicesAPI_ListFiltersPaginationAndEnvelope(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	})
	seedServicesReadModelFixtures(t, module)

	connections := performJSONRequest(t, server, http.MethodGet, base+"/connections?provider_id=github&scope_type=user&page=1&per_page=1", nil, nil)
	if connections.Code != http.StatusOK {
		t.Fatalf("connections list status=%d body=%s", connections.Code, connections.Body.String())
	}
	assertListEnvelopeHasCoreFields(t, decodeJSONMap(t, connections.Body.Bytes()))

	installations := performJSONRequest(t, server, http.MethodGet, base+"/installations?status=active&page=1&per_page=1", nil, nil)
	if installations.Code != http.StatusOK {
		t.Fatalf("installations list status=%d body=%s", installations.Code, installations.Body.String())
	}
	assertListEnvelopeHasCoreFields(t, decodeJSONMap(t, installations.Body.Bytes()))

	subscriptions := performJSONRequest(t, server, http.MethodGet, base+"/subscriptions?status=active&page=1&per_page=1", nil, nil)
	if subscriptions.Code != http.StatusOK {
		t.Fatalf("subscriptions list status=%d body=%s", subscriptions.Code, subscriptions.Body.String())
	}
	assertListEnvelopeHasCoreFields(t, decodeJSONMap(t, subscriptions.Body.Bytes()))

	activity := performJSONRequest(t, server, http.MethodGet, base+"/activity?provider_id=github&channel=services.sync&limit=1&offset=0", nil, nil)
	if activity.Code != http.StatusOK {
		t.Fatalf("activity list status=%d body=%s", activity.Code, activity.Body.String())
	}
	assertListEnvelopeHasCoreFields(t, decodeJSONMap(t, activity.Body.Bytes()))

	providers := performJSONRequest(t, server, http.MethodGet, base+"/providers", nil, nil)
	if providers.Code != http.StatusOK {
		t.Fatalf("providers list status=%d body=%s", providers.Code, providers.Body.String())
	}
	assertListEnvelopeHasCoreFields(t, decodeJSONMap(t, providers.Body.Bytes()))
}

func TestServicesAPI_ConnectionDetailSyncRateLimitAndActionLabels(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithActivityActionLabelOverrides(map[string]string{
			"connection.revoked": "Connection Revoked",
		}),
	)
	seedServicesReadModelFixtures(t, module)

	detail := performJSONRequest(t, server, http.MethodGet, base+"/connections/conn_1", nil, nil)
	if detail.Code != http.StatusOK {
		t.Fatalf("connection detail status=%d body=%s", detail.Code, detail.Body.String())
	}
	detailPayload := decodeJSONMap(t, detail.Body.Bytes())
	credentialHealth := toAnyMap(detailPayload["credential_health"])
	if credentialHealth["expires_at"] == nil {
		t.Fatalf("expected credential_health.expires_at in %v", credentialHealth)
	}
	if credentialHealth["last_refresh_at"] == nil {
		t.Fatalf("expected credential_health.last_refresh_at in %v", credentialHealth)
	}
	if credentialHealth["next_refresh_attempt_at"] == nil {
		t.Fatalf("expected credential_health.next_refresh_attempt_at in %v", credentialHealth)
	}
	if got := strings.TrimSpace(toString(credentialHealth["last_error"])); got == "" {
		t.Fatalf("expected credential_health.last_error in %v", credentialHealth)
	}

	grantsSummary := toAnyMap(detailPayload["grants_summary"])
	if found, _ := grantsSummary["snapshot_found"].(bool); !found {
		t.Fatalf("expected grants snapshot in %v", grantsSummary)
	}

	subscriptionSummary := toAnyMap(detailPayload["subscription_summary"])
	if toInt(subscriptionSummary["total"], 0) <= 0 {
		t.Fatalf("expected subscriptions in %v", subscriptionSummary)
	}
	syncSummary := toAnyMap(detailPayload["sync_summary"])
	if toInt(syncSummary["cursor_count"], 0) <= 0 {
		t.Fatalf("expected sync cursors in %v", syncSummary)
	}
	rateLimitSummary := toAnyMap(detailPayload["rate_limit_summary"])
	if toInt(rateLimitSummary["bucket_count"], 0) <= 0 {
		t.Fatalf("expected rate-limit buckets in %v", rateLimitSummary)
	}

	syncStatus := performJSONRequest(t, server, http.MethodGet, base+"/sync/connections/conn_1/status", nil, nil)
	if syncStatus.Code != http.StatusOK {
		t.Fatalf("sync status status=%d body=%s", syncStatus.Code, syncStatus.Body.String())
	}
	syncPayload := decodeJSONMap(t, syncStatus.Body.Bytes())
	if toInt(toAnyMap(syncPayload["sync_summary"])["cursor_count"], 0) <= 0 {
		t.Fatalf("expected sync status cursor_count>0 payload=%v", syncPayload)
	}

	rateLimits := performJSONRequest(t, server, http.MethodGet, base+"/rate-limits?connection_id=conn_1", nil, nil)
	if rateLimits.Code != http.StatusOK {
		t.Fatalf("rate limit list status=%d body=%s", rateLimits.Code, rateLimits.Body.String())
	}
	assertListEnvelopeHasCoreFields(t, decodeJSONMap(t, rateLimits.Body.Bytes()))

	activity := performJSONRequest(t, server, http.MethodGet, base+"/activity?limit=1", nil, nil)
	if activity.Code != http.StatusOK {
		t.Fatalf("activity status=%d body=%s", activity.Code, activity.Body.String())
	}
	activityPayload := decodeJSONMap(t, activity.Body.Bytes())
	overrides := toAnyMap(activityPayload["action_label_overrides"])
	if got := strings.TrimSpace(toString(overrides["connection.revoked"])); got == "" {
		t.Fatalf("expected action label override in %v", overrides)
	}
}

func TestServicesAPI_ConnectionDetailSummaryLoaders(t *testing.T) {
	_, module, _, _ := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithActivityActionLabelOverrides(map[string]string{
			"connection.revoked": "Connection Revoked",
		}),
	)
	seedServicesReadModelFixtures(t, module)

	db := resolveBunDB(module.config.PersistenceClient, module.repositoryFactory)
	if db == nil {
		t.Fatalf("expected persistence db")
	}
	ctx := context.Background()
	connection := connectionRecord{}
	if err := db.NewSelect().Model(&connection).Where("id = ?", "conn_1").Limit(1).Scan(ctx); err != nil {
		t.Fatalf("load connection fixture: %v", err)
	}

	if _, err := loadConnectionCredentialHealth(ctx, db, connection.ID, connection.LastError); err != nil {
		t.Fatalf("loadConnectionCredentialHealth: %v", err)
	}
	if _, err := module.loadConnectionGrantSummary(ctx, connection.ID, connection.ProviderID); err != nil {
		t.Fatalf("loadConnectionGrantSummary: %v", err)
	}
	if _, err := loadConnectionSubscriptionSummary(ctx, db, connection.ID); err != nil {
		t.Fatalf("loadConnectionSubscriptionSummary: %v", err)
	}
	if _, err := loadConnectionSyncSummary(ctx, db, connection.ID, connection.LastError); err != nil {
		t.Fatalf("loadConnectionSyncSummary: %v", err)
	}
	if _, err := loadConnectionRateLimitSummary(ctx, db, connection); err != nil {
		t.Fatalf("loadConnectionRateLimitSummary: %v", err)
	}
}

func TestServicesAPI_ExtensionDiagnosticsAndStatusSurface(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithProviderPack("orders-pack", testServicesProvider{id: "orders_provider"}),
		WithEnabledProviderPacks("orders-pack"),
		WithCommandQueryBundle("orders-bundle", func(goservices.CommandQueryService) (any, error) {
			return map[string]any{"name": "orders"}, nil
		}),
		WithExtensionFeatureFlags(map[string]bool{"orders.enabled": true}),
		WithExtensionLifecycleSubscriber("orders.lifecycle", &flakyLifecycleSubscriber{}),
	)
	seedServicesReadModelFixtures(t, module)

	diagnostics := performJSONRequest(t, server, http.MethodGet, base+"/extensions/diagnostics", nil, nil)
	if diagnostics.Code != http.StatusOK {
		t.Fatalf("extension diagnostics status=%d body=%s", diagnostics.Code, diagnostics.Body.String())
	}
	diagPayload := decodeJSONMap(t, diagnostics.Body.Bytes())
	extensions := toAnyMap(diagPayload["extensions"])
	packs := toStringSlice(extensions["enabled_provider_packs"])
	if len(packs) != 1 || packs[0] != "orders-pack" {
		t.Fatalf("expected enabled provider packs in diagnostics, got %#v", packs)
	}
	bundles := toStringSlice(extensions["command_query_bundles"])
	if len(bundles) != 1 || bundles[0] != "orders-bundle" {
		t.Fatalf("expected command/query bundle diagnostics, got %#v", bundles)
	}
	flags := toAnyMap(extensions["feature_flags"])
	if enabled, _ := flags["orders.enabled"].(bool); !enabled {
		t.Fatalf("expected extension feature flag in diagnostics: %#v", flags)
	}

	status := performJSONRequest(t, server, http.MethodGet, base+"/status", nil, nil)
	if status.Code != http.StatusOK {
		t.Fatalf("status endpoint status=%d body=%s", status.Code, status.Body.String())
	}
	statusPayload := decodeJSONMap(t, status.Body.Bytes())
	if _, ok := statusPayload["extensions"]; !ok {
		t.Fatalf("expected extensions diagnostics in status payload: %#v", statusPayload)
	}
}

func TestServicesAPI_InstallationLifecyclePrimitiveEndpoints(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	})
	seedServicesReadModelFixtures(t, module)

	detail := performJSONRequest(t, server, http.MethodGet, base+"/installations/install_1", nil, nil)
	if detail.Code != http.StatusOK {
		t.Fatalf("installation detail status=%d body=%s", detail.Code, detail.Body.String())
	}
	detailPayload := decodeJSONMap(t, detail.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(detailPayload["installation"])["id"])); got != "install_1" {
		t.Fatalf("expected installation id install_1, got %q", got)
	}

	updateHeaders := map[string]string{"Idempotency-Key": "installation-status-1"}
	update := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/installations/install_1/status",
		map[string]any{"status": "suspended", "reason": "policy"},
		updateHeaders,
	)
	if update.Code != http.StatusOK {
		t.Fatalf("installation status update status=%d body=%s", update.Code, update.Body.String())
	}
	updatePayload := decodeJSONMap(t, update.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(updatePayload["installation"])["status"])); got != "suspended" {
		t.Fatalf("expected suspended installation status, got %q", got)
	}

	uninstall := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/installations/install_1/uninstall",
		map[string]any{"reason": "cleanup"},
		map[string]string{"Idempotency-Key": "installation-uninstall-1"},
	)
	if uninstall.Code != http.StatusOK {
		t.Fatalf("installation uninstall status=%d body=%s", uninstall.Code, uninstall.Body.String())
	}
	uninstallPayload := decodeJSONMap(t, uninstall.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(uninstallPayload["installation"])["status"])); got != "uninstalled" {
		t.Fatalf("expected uninstalled installation status, got %q", got)
	}
}

func TestServicesAPI_RateLimitRuntimeAndProviderOperationStatus(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	})
	seedServicesReadModelFixtures(t, module)

	runtimeList := performJSONRequest(t, server, http.MethodGet, base+"/rate-limits/runtime?connection_id=conn_1&page=1&per_page=10", nil, nil)
	if runtimeList.Code != http.StatusOK {
		t.Fatalf("rate limit runtime status=%d body=%s", runtimeList.Code, runtimeList.Body.String())
	}
	runtimePayload := decodeJSONMap(t, runtimeList.Body.Bytes())
	assertListEnvelopeHasCoreFields(t, runtimePayload)
	items, _ := runtimePayload["rate_limits"].([]any)
	if len(items) == 0 {
		t.Fatalf("expected runtime rate-limit items in payload=%#v", runtimePayload)
	}
	firstRuntime := toAnyMap(toAnyMap(items[0])["runtime"])
	if _, ok := firstRuntime["attempts"]; !ok {
		t.Fatalf("expected runtime state attempts field in %#v", firstRuntime)
	}

	ops := performJSONRequest(t, server, http.MethodGet, base+"/operations/status?connection_id=conn_1&page=1&per_page=10", nil, nil)
	if ops.Code != http.StatusOK {
		t.Fatalf("operations status=%d body=%s", ops.Code, ops.Body.String())
	}
	opsPayload := decodeJSONMap(t, ops.Body.Bytes())
	assertListEnvelopeHasCoreFields(t, opsPayload)
	statuses, _ := opsPayload["operation_statuses"].([]any)
	if len(statuses) == 0 {
		t.Fatalf("expected operation statuses in payload=%#v", opsPayload)
	}
	firstStatus := toAnyMap(statuses[0])
	if strings.TrimSpace(toString(firstStatus["operation_source"])) == "" {
		t.Fatalf("expected operation_source in status payload=%#v", firstStatus)
	}
	if strings.TrimSpace(toString(firstStatus["last_operation_status"])) == "" {
		t.Fatalf("expected last_operation_status in status payload=%#v", firstStatus)
	}
}

func TestServicesAPI_MutatingRouteIdempotencyReplayAndConflict(t *testing.T) {
	enqueuer := &captureJobEnqueuer{}
	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithJobEnqueuer(enqueuer),
	)
	seedServicesReadModelFixtures(t, module)

	headers := map[string]string{"Idempotency-Key": "refresh-replay-1"}
	payload := map[string]any{"provider_id": "github"}

	first := performJSONRequest(t, server, http.MethodPost, base+"/connections/conn_1/refresh", payload, headers)
	if first.Code != http.StatusAccepted {
		t.Fatalf("expected first refresh 202, got %d body=%s", first.Code, first.Body.String())
	}
	second := performJSONRequest(t, server, http.MethodPost, base+"/connections/conn_1/refresh", payload, headers)
	if second.Code != http.StatusAccepted {
		t.Fatalf("expected replay refresh 202, got %d body=%s", second.Code, second.Body.String())
	}
	assertJSONEqual(t, first.Body.Bytes(), second.Body.Bytes())

	conflict := performJSONRequest(t, server, http.MethodPost, base+"/connections/conn_1/refresh", map[string]any{"provider_id": "google"}, headers)
	if conflict.Code != http.StatusConflict {
		t.Fatalf("expected refresh conflict 409, got %d body=%s", conflict.Code, conflict.Body.String())
	}
	assertErrorCode(t, conflict.Body.Bytes(), "conflict")
}

func TestServicesAPI_WorkflowMappingSyncConflictWorkflow(t *testing.T) {
	_, _, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
	)
	headers := map[string]string{"Idempotency-Key": "workflow-mapping-create-1"}
	createDraft := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings",
		map[string]any{
			"provider_id":   "github",
			"scope_type":    "user",
			"scope_id":      "user-1",
			"spec_id":       "catalog",
			"name":          "Catalog Mapping",
			"source_object": "product",
			"target_model":  "catalog_item",
			"schema_ref":    "schema/catalog/v1",
			"rules": []map[string]any{
				{"id": "rule_1", "source_path": "product.id", "target_path": "id", "transform": "string", "required": true},
			},
		},
		headers,
	)
	if createDraft.Code != http.StatusOK {
		t.Fatalf("workflow create draft status=%d body=%s", createDraft.Code, createDraft.Body.String())
	}
	createPayload := decodeJSONMap(t, createDraft.Body.Bytes())
	mapping := toAnyMap(createPayload["mapping"])
	if got := strings.TrimSpace(toString(mapping["status"])); got != "draft" {
		t.Fatalf("expected draft status, got %q payload=%v", got, createPayload)
	}
	if got := toInt(mapping["version"], 0); got != 1 {
		t.Fatalf("expected version=1, got %d payload=%v", got, createPayload)
	}

	validateDraft := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings/spec/catalog/validate",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"version":     1,
		},
		map[string]string{"Idempotency-Key": "workflow-mapping-validate-1"},
	)
	if validateDraft.Code != http.StatusOK {
		t.Fatalf("workflow mark validated status=%d body=%s", validateDraft.Code, validateDraft.Body.String())
	}
	validatedPayload := decodeJSONMap(t, validateDraft.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(validatedPayload["mapping"])["status"])); got != "validated" {
		t.Fatalf("expected validated status, got %q payload=%v", got, validatedPayload)
	}

	publish := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings/spec/catalog/publish",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"version":     1,
		},
		map[string]string{"Idempotency-Key": "workflow-mapping-publish-1"},
	)
	if publish.Code != http.StatusOK {
		t.Fatalf("workflow publish status=%d body=%s", publish.Code, publish.Body.String())
	}
	publishedPayload := decodeJSONMap(t, publish.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(publishedPayload["mapping"])["status"])); got != "published" {
		t.Fatalf("expected published status, got %q payload=%v", got, publishedPayload)
	}

	inspectVersion := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/mappings/spec/catalog/versions/1?provider_id=github&scope_type=user&scope_id=user-1",
		nil,
		nil,
	)
	if inspectVersion.Code != http.StatusOK {
		t.Fatalf("workflow inspect version status=%d body=%s", inspectVersion.Code, inspectVersion.Body.String())
	}

	unpublish := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings/spec/catalog/unpublish",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"version":     1,
		},
		map[string]string{"Idempotency-Key": "workflow-mapping-unpublish-1"},
	)
	if unpublish.Code != http.StatusOK {
		t.Fatalf("workflow unpublish status=%d body=%s", unpublish.Code, unpublish.Body.String())
	}
	unpublishedPayload := decodeJSONMap(t, unpublish.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(unpublishedPayload["mapping"])["status"])); got != "validated" {
		t.Fatalf("expected validated status after unpublish, got %q payload=%v", got, unpublishedPayload)
	}

	validateResult := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings/validate",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"spec": map[string]any{
				"spec_id":       "catalog",
				"provider_id":   "github",
				"name":          "Catalog Mapping",
				"source_object": "product",
				"target_model":  "catalog_item",
				"version":       1,
				"status":        "draft",
				"rules": []map[string]any{
					{"id": "rule_1", "source_path": "product.id", "target_path": "id", "transform": "string", "required": true},
				},
			},
			"schema": map[string]any{
				"provider_id": "github",
				"scope": map[string]any{
					"type": "user",
					"id":   "user-1",
				},
				"name": "catalog schema",
				"objects": []map[string]any{
					{
						"name": "product",
						"fields": []map[string]any{
							{"path": "product.id", "type": "string", "required": true},
						},
					},
				},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-mapping-validate-result-1"},
	)
	if validateResult.Code != http.StatusOK {
		t.Fatalf("workflow validate route status=%d body=%s", validateResult.Code, validateResult.Body.String())
	}
	validationPayload := decodeJSONMap(t, validateResult.Body.Bytes())
	validation := toAnyMap(validationPayload["validation"])
	if valid, _ := validation["valid"].(bool); !valid {
		t.Fatalf("expected validation.valid=true payload=%v", validationPayload)
	}

	previewResult := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings/preview",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"spec": map[string]any{
				"spec_id":       "catalog",
				"provider_id":   "github",
				"name":          "Catalog Mapping",
				"source_object": "product",
				"target_model":  "catalog_item",
				"version":       1,
				"status":        "draft",
				"rules": []map[string]any{
					{"id": "rule_1", "source_path": "product.id", "target_path": "id", "transform": "string", "required": true},
				},
			},
			"schema": map[string]any{
				"provider_id": "github",
				"scope": map[string]any{
					"type": "user",
					"id":   "user-1",
				},
				"name": "catalog schema",
				"objects": []map[string]any{
					{
						"name": "product",
						"fields": []map[string]any{
							{"path": "product.id", "type": "string", "required": true},
						},
					},
				},
			},
			"samples": []map[string]any{
				{"product": map[string]any{"id": "ext-1"}},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-mapping-preview-1"},
	)
	if previewResult.Code != http.StatusOK {
		t.Fatalf("workflow preview route status=%d body=%s", previewResult.Code, previewResult.Body.String())
	}

	planSync := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/plan",
		map[string]any{
			"mode": "dry_run",
			"binding": map[string]any{
				"id":              "binding_catalog",
				"provider_id":     "github",
				"scope":           map[string]any{"type": "user", "id": "user-1"},
				"connection_id":   "conn_1",
				"mapping_spec_id": "catalog",
				"source_object":   "product",
				"target_model":    "catalog_item",
				"direction":       "import",
				"status":          "active",
			},
		},
		map[string]string{"Idempotency-Key": "workflow-sync-plan-1"},
	)
	if planSync.Code != http.StatusOK {
		t.Fatalf("workflow sync plan status=%d body=%s", planSync.Code, planSync.Body.String())
	}
	planPayload := decodeJSONMap(t, planSync.Body.Bytes())
	plan := toAnyMap(planPayload["plan"])
	if strings.TrimSpace(toString(plan["id"])) == "" {
		t.Fatalf("expected sync plan id payload=%v", planPayload)
	}

	runSync := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/run",
		map[string]any{
			"plan":      plan,
			"direction": "import",
			"changes": []map[string]any{
				{
					"source_object":  "product",
					"external_id":    "ext-1",
					"source_version": "v1",
					"payload":        map[string]any{"product": map[string]any{"id": "ext-1"}},
				},
			},
			"conflicts": []map[string]any{
				{
					"provider_id":     "github",
					"scope":           map[string]any{"type": "user", "id": "user-1"},
					"connection_id":   "conn_1",
					"sync_binding_id": "binding_catalog",
					"source_object":   "product",
					"external_id":     "ext-1",
					"reason":          "duplicate_entity",
				},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-sync-run-1"},
	)
	if runSync.Code != http.StatusOK {
		t.Fatalf("workflow sync run status=%d body=%s", runSync.Code, runSync.Body.String())
	}
	runPayload := decodeJSONMap(t, runSync.Body.Bytes())
	result := toAnyMap(runPayload["result"])
	if got := strings.TrimSpace(toString(result["status"])); got != "succeeded" {
		t.Fatalf("expected sync result status succeeded, got %q payload=%v", got, runPayload)
	}
	recordedConflicts, _ := runPayload["recorded_conflicts"].([]any)
	if len(recordedConflicts) == 0 {
		t.Fatalf("expected recorded conflicts payload=%v", runPayload)
	}
	conflictID := strings.TrimSpace(toString(toAnyMap(recordedConflicts[0])["id"]))
	if conflictID == "" {
		t.Fatalf("expected conflict id payload=%v", runPayload)
	}

	listConflicts := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/conflicts?provider_id=github&scope_type=user&scope_id=user-1&sync_binding_id=binding_catalog",
		nil,
		nil,
	)
	if listConflicts.Code != http.StatusOK {
		t.Fatalf("workflow list conflicts status=%d body=%s", listConflicts.Code, listConflicts.Body.String())
	}
	listPayload := decodeJSONMap(t, listConflicts.Body.Bytes())
	conflicts, _ := listPayload["conflicts"].([]any)
	if len(conflicts) == 0 {
		t.Fatalf("expected conflict list payload=%v", listPayload)
	}

	conflictDetail := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/conflicts/"+conflictID+"?provider_id=github&scope_type=user&scope_id=user-1",
		nil,
		nil,
	)
	if conflictDetail.Code != http.StatusOK {
		t.Fatalf("workflow conflict detail status=%d body=%s", conflictDetail.Code, conflictDetail.Body.String())
	}

	resolveConflict := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/conflicts/"+conflictID+"/resolve",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"action":      "resolve",
			"reason":      "manual_override",
			"patch":       map[string]any{"target_id": "internal-123"},
		},
		map[string]string{"Idempotency-Key": "workflow-conflict-resolve-1"},
	)
	if resolveConflict.Code != http.StatusOK {
		t.Fatalf("workflow resolve conflict status=%d body=%s", resolveConflict.Code, resolveConflict.Body.String())
	}
	resolvePayload := decodeJSONMap(t, resolveConflict.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(resolvePayload["conflict"])["status"])); got != "resolved" {
		t.Fatalf("expected resolved conflict status, got %q payload=%v", got, resolvePayload)
	}
}

func TestServicesAPI_WorkflowRunHistoryResumeCheckpointAndSchemaDrift(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	})
	seedServicesReadModelFixtures(t, module)

	createMappingV1 := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings",
		map[string]any{
			"provider_id":   "github",
			"scope_type":    "user",
			"scope_id":      "user-1",
			"spec_id":       "catalog",
			"name":          "Catalog Mapping",
			"source_object": "product",
			"target_model":  "catalog_item",
			"schema_ref":    "schema:v1",
			"version":       1,
			"rules": []map[string]any{
				{"id": "rule_1", "source_path": "product.id", "target_path": "id", "transform": "string", "required": true},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-run-history-mapping-v1"},
	)
	if createMappingV1.Code != http.StatusOK {
		t.Fatalf("create mapping v1 status=%d body=%s", createMappingV1.Code, createMappingV1.Body.String())
	}

	planSync := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/plan",
		map[string]any{
			"mode": "apply",
			"binding": map[string]any{
				"id":              "binding_catalog",
				"provider_id":     "github",
				"scope":           map[string]any{"type": "user", "id": "user-1"},
				"connection_id":   "conn_1",
				"mapping_spec_id": "catalog",
				"source_object":   "product",
				"target_model":    "catalog_item",
				"direction":       "import",
				"status":          "active",
			},
		},
		map[string]string{"Idempotency-Key": "workflow-run-history-plan-1"},
	)
	if planSync.Code != http.StatusOK {
		t.Fatalf("workflow sync plan status=%d body=%s", planSync.Code, planSync.Body.String())
	}
	plan := toAnyMap(decodeJSONMap(t, planSync.Body.Bytes())["plan"])

	runSync := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/run",
		map[string]any{
			"plan":      plan,
			"direction": "import",
			"changes": []map[string]any{
				{
					"source_object":  "product",
					"external_id":    "ext-1",
					"source_version": "v1",
					"payload":        map[string]any{"product": map[string]any{"id": "ext-1"}},
				},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-run-history-run-1"},
	)
	if runSync.Code != http.StatusOK {
		t.Fatalf("workflow sync run status=%d body=%s", runSync.Code, runSync.Body.String())
	}
	runPayload := decodeJSONMap(t, runSync.Body.Bytes())
	result := toAnyMap(runPayload["result"])
	runID := strings.TrimSpace(toString(result["run_id"]))
	if runID == "" {
		t.Fatalf("expected run_id in result payload=%v", runPayload)
	}
	nextCheckpoint := toAnyMap(result["next_checkpoint"])
	checkpointID := strings.TrimSpace(toString(nextCheckpoint["id"]))
	if checkpointID == "" {
		t.Fatalf("expected checkpoint id in result payload=%v", runPayload)
	}

	listRuns := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/runs?provider_id=github&scope_type=user&scope_id=user-1",
		nil,
		nil,
	)
	if listRuns.Code != http.StatusOK {
		t.Fatalf("workflow sync runs list status=%d body=%s", listRuns.Code, listRuns.Body.String())
	}
	listRunsPayload := decodeJSONMap(t, listRuns.Body.Bytes())
	runs, _ := listRunsPayload["runs"].([]any)
	if len(runs) == 0 {
		t.Fatalf("expected at least one sync run payload=%v", listRunsPayload)
	}

	runDetail := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/runs/"+runID+"?provider_id=github&scope_type=user&scope_id=user-1",
		nil,
		nil,
	)
	if runDetail.Code != http.StatusOK {
		t.Fatalf("workflow sync run detail status=%d body=%s", runDetail.Code, runDetail.Body.String())
	}
	runDetailPayload := decodeJSONMap(t, runDetail.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(runDetailPayload["run"])["run_id"])); got != runID {
		t.Fatalf("expected run detail run_id %q, got %q payload=%v", runID, got, runDetailPayload)
	}

	checkpointDetail := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/checkpoints/"+checkpointID+"?provider_id=github&scope_type=user&scope_id=user-1",
		nil,
		nil,
	)
	if checkpointDetail.Code != http.StatusOK {
		t.Fatalf("workflow checkpoint detail status=%d body=%s", checkpointDetail.Code, checkpointDetail.Body.String())
	}
	checkpointPayload := decodeJSONMap(t, checkpointDetail.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(checkpointPayload["checkpoint"])["id"])); got != checkpointID {
		t.Fatalf("expected checkpoint id %q, got %q payload=%v", checkpointID, got, checkpointPayload)
	}

	resume := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/runs/"+runID+"/resume",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"mode":        "apply",
			"direction":   "import",
			"changes": []map[string]any{
				{
					"source_object":  "product",
					"external_id":    "ext-2",
					"source_version": "v2",
					"payload":        map[string]any{"product": map[string]any{"id": "ext-2"}},
				},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-run-history-resume-1"},
	)
	if resume.Code != http.StatusOK {
		t.Fatalf("workflow sync run resume status=%d body=%s", resume.Code, resume.Body.String())
	}
	resumePayload := decodeJSONMap(t, resume.Body.Bytes())
	if got := strings.TrimSpace(toString(resumePayload["resumed_from_run_id"])); got != runID {
		t.Fatalf("expected resumed_from_run_id %q, got %q payload=%v", runID, got, resumePayload)
	}
	resumedResult := toAnyMap(resumePayload["result"])
	if strings.TrimSpace(toString(resumedResult["run_id"])) == "" {
		t.Fatalf("expected resumed result run_id payload=%v", resumePayload)
	}

	listDriftBeforeBaseline := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/schema-drift?provider_id=github&scope_type=user&scope_id=user-1&spec_id=catalog",
		nil,
		nil,
	)
	if listDriftBeforeBaseline.Code != http.StatusOK {
		t.Fatalf("workflow schema drift list status=%d body=%s", listDriftBeforeBaseline.Code, listDriftBeforeBaseline.Body.String())
	}
	driftBeforePayload := decodeJSONMap(t, listDriftBeforeBaseline.Body.Bytes())
	driftItemsBefore, _ := driftBeforePayload["drift_items"].([]any)
	if len(driftItemsBefore) != 1 {
		t.Fatalf("expected one schema drift item before baseline payload=%v", driftBeforePayload)
	}
	if got := strings.TrimSpace(toString(toAnyMap(driftItemsBefore[0])["status"])); got != "baseline_missing" {
		t.Fatalf("expected baseline_missing status before baseline, got %q payload=%v", got, driftBeforePayload)
	}

	baseline := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/sync/schema-drift/baseline",
		map[string]any{
			"provider_id": "github",
			"scope_type":  "user",
			"scope_id":    "user-1",
			"spec_id":     "catalog",
			"version":     1,
			"schema_ref":  "schema:v1",
			"captured_by": "tester",
		},
		map[string]string{"Idempotency-Key": "workflow-run-history-baseline-1"},
	)
	if baseline.Code != http.StatusOK {
		t.Fatalf("workflow schema drift baseline status=%d body=%s", baseline.Code, baseline.Body.String())
	}
	baselinePayload := decodeJSONMap(t, baseline.Body.Bytes())
	if got := strings.TrimSpace(toString(toAnyMap(baselinePayload["drift"])["status"])); got != "in_sync" {
		t.Fatalf("expected in_sync baseline status, got %q payload=%v", got, baselinePayload)
	}

	createMappingV2 := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/mappings",
		map[string]any{
			"provider_id":   "github",
			"scope_type":    "user",
			"scope_id":      "user-1",
			"spec_id":       "catalog",
			"name":          "Catalog Mapping",
			"source_object": "product",
			"target_model":  "catalog_item",
			"schema_ref":    "schema:v2",
			"version":       2,
			"rules": []map[string]any{
				{"id": "rule_1", "source_path": "product.id", "target_path": "id", "transform": "string", "required": true},
			},
		},
		map[string]string{"Idempotency-Key": "workflow-run-history-mapping-v2"},
	)
	if createMappingV2.Code != http.StatusOK {
		t.Fatalf("create mapping v2 status=%d body=%s", createMappingV2.Code, createMappingV2.Body.String())
	}

	listDriftAfterSchemaChange := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/sync/schema-drift?provider_id=github&scope_type=user&scope_id=user-1&spec_id=catalog",
		nil,
		nil,
	)
	if listDriftAfterSchemaChange.Code != http.StatusOK {
		t.Fatalf("workflow schema drift list after update status=%d body=%s", listDriftAfterSchemaChange.Code, listDriftAfterSchemaChange.Body.String())
	}
	driftAfterPayload := decodeJSONMap(t, listDriftAfterSchemaChange.Body.Bytes())
	driftItemsAfter, _ := driftAfterPayload["drift_items"].([]any)
	if len(driftItemsAfter) != 1 {
		t.Fatalf("expected one schema drift item after schema update payload=%v", driftAfterPayload)
	}
	item := toAnyMap(driftItemsAfter[0])
	if got := strings.TrimSpace(toString(item["status"])); got != "drift_detected" {
		t.Fatalf("expected drift_detected status after schema update, got %q payload=%v", got, driftAfterPayload)
	}
	if detected, _ := item["drift_detected"].(bool); !detected {
		t.Fatalf("expected drift_detected=true payload=%v", driftAfterPayload)
	}
}

func TestServicesAPI_WorkflowAmbiguousCapabilityRemediation(t *testing.T) {
	_, module, server, base := setupServicesTestRuntime(t, func(adm *goadmin.Admin) {
		adm.WithAuthorizer(servicesAllowAuthorizer{})
	})
	seedServicesReadModelFixtures(t, module)
	db := resolveBunDB(module.config.PersistenceClient, module.repositoryFactory)
	now := time.Now().UTC().Truncate(time.Second)
	mustExec(t, db, `INSERT OR REPLACE INTO service_connections (id, provider_id, scope_type, scope_id, external_account_id, status, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"conn_3", "github", "user", "user-1", "acct_3", "active", "", now, now)

	invokeAmbiguous := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/capabilities/github/repo.read/invoke",
		map[string]any{
			"scope_type": "user",
			"scope_id":   "user-1",
			"payload":    map[string]any{},
		},
		map[string]string{"Idempotency-Key": "workflow-ambiguous-capability-1"},
	)
	if invokeAmbiguous.Code != http.StatusConflict {
		t.Fatalf("expected conflict for ambiguous invoke, got %d body=%s", invokeAmbiguous.Code, invokeAmbiguous.Body.String())
	}
	assertErrorCode(t, invokeAmbiguous.Body.Bytes(), "conflict")

	candidates := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/connection-candidates?provider_id=github&scope_type=user&scope_id=user-1",
		nil,
		nil,
	)
	if candidates.Code != http.StatusOK {
		t.Fatalf("expected candidates list ok, got %d body=%s", candidates.Code, candidates.Body.String())
	}
	candidatesPayload := decodeJSONMap(t, candidates.Body.Bytes())
	rows, _ := candidatesPayload["candidates"].([]any)
	if len(rows) < 2 {
		t.Fatalf("expected >=2 candidates payload=%v", candidatesPayload)
	}

	invokeResolved := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/capabilities/github/repo.read/invoke",
		map[string]any{
			"scope_type":    "user",
			"scope_id":      "user-1",
			"connection_id": "conn_1",
			"payload":       map[string]any{},
		},
		map[string]string{"Idempotency-Key": "workflow-ambiguous-capability-2"},
	)
	if invokeResolved.Code != http.StatusOK {
		t.Fatalf("expected resolved invoke status 200, got %d body=%s", invokeResolved.Code, invokeResolved.Body.String())
	}
}

func TestServicesAPI_WorkflowCallbackDiagnosticsAndIdempotency(t *testing.T) {
	_, _, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithCallbackURLConfig(CallbackURLConfig{
			Strict: true,
			ProviderRoutes: map[string]string{
				"github": "services.missing.callback.route",
			},
		}),
	)

	status := performJSONRequest(
		t,
		server,
		http.MethodGet,
		base+"/callbacks/diagnostics/status?provider_id=github",
		nil,
		nil,
	)
	if status.Code != http.StatusOK {
		t.Fatalf("workflow callback diagnostics status code=%d body=%s", status.Code, status.Body.String())
	}
	statusPayload := decodeJSONMap(t, status.Body.Bytes())
	resolver := toAnyMap(statusPayload["resolver"])
	if got := strings.TrimSpace(toString(resolver["status"])); got != "degraded" {
		t.Fatalf("expected degraded resolver status, got %q payload=%v", got, statusPayload)
	}

	headers := map[string]string{"Idempotency-Key": "workflow-callback-preview-1"}
	previewPayload := map[string]any{"provider_id": "github", "flow": "connect"}
	preview1 := performJSONRequest(t, server, http.MethodPost, base+"/callbacks/diagnostics/preview", previewPayload, headers)
	if preview1.Code != http.StatusOK {
		t.Fatalf("workflow callback preview status=%d body=%s", preview1.Code, preview1.Body.String())
	}
	preview2 := performJSONRequest(t, server, http.MethodPost, base+"/callbacks/diagnostics/preview", previewPayload, headers)
	if preview2.Code != http.StatusOK {
		t.Fatalf("workflow callback preview replay status=%d body=%s", preview2.Code, preview2.Body.String())
	}
	assertJSONEqual(t, preview1.Body.Bytes(), preview2.Body.Bytes())
	previewPayloadMap := decodeJSONMap(t, preview1.Body.Bytes())
	preview := toAnyMap(previewPayloadMap["preview"])
	if ok, _ := preview["ok"].(bool); ok {
		t.Fatalf("expected preview ok=false for missing route payload=%v", previewPayloadMap)
	}

	conflict := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/callbacks/diagnostics/preview",
		map[string]any{"provider_id": "github", "flow": "reconsent"},
		headers,
	)
	if conflict.Code != http.StatusConflict {
		t.Fatalf("expected idempotency conflict status=409, got %d body=%s", conflict.Code, conflict.Body.String())
	}
	assertErrorCode(t, conflict.Body.Bytes(), "conflict")
}

func setupServicesTestRuntime(
	t *testing.T,
	adminMutator func(*goadmin.Admin),
	opts ...Option,
) (*goadmin.Admin, *Module, router.Server[*httprouter.Router], string) {
	t.Helper()

	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)
	if adminMutator != nil {
		adminMutator(adm)
	}

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client
	cfg.Providers = []Provider{testServicesProvider{id: "github"}}

	module, err := Setup(adm, cfg, opts...)
	if err != nil {
		t.Fatalf("setup services module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	base := strings.TrimRight(adm.AdminAPIBasePath(), "/") + "/services"
	return adm, module, server, base
}

func performJSONRequest(
	t *testing.T,
	server router.Server[*httprouter.Router],
	method string,
	path string,
	payload map[string]any,
	headers map[string]string,
) *httptest.ResponseRecorder {
	t.Helper()
	body := bytes.NewBuffer(nil)
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		body.Write(raw)
	}
	req := httptest.NewRequest(method, path, body)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	return res
}

func assertErrorCode(t *testing.T, raw []byte, want string) {
	t.Helper()
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode error response: %v raw=%s", err, string(raw))
	}
	errorPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("missing error payload: %s", string(raw))
	}
	if got := toString(errorPayload["code"]); got != want {
		t.Fatalf("expected error code %q, got %q payload=%s", want, got, string(raw))
	}
}

func assertErrorEnvelope(t *testing.T, raw []byte, wantCode string, wantRetryable bool) {
	t.Helper()
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode error response: %v raw=%s", err, string(raw))
	}
	errorPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("missing error payload: %s", string(raw))
	}
	if got := toString(errorPayload["code"]); got != wantCode {
		t.Fatalf("expected error code %q, got %q payload=%s", wantCode, got, string(raw))
	}
	retryable, ok := errorPayload["retryable"].(bool)
	if !ok {
		t.Fatalf("error payload retryable missing: %s", string(raw))
	}
	if retryable != wantRetryable {
		t.Fatalf("expected retryable=%v, got %v payload=%s", wantRetryable, retryable, string(raw))
	}
}

func assertErrorRequestID(t *testing.T, raw []byte, want string) {
	t.Helper()
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode error response: %v raw=%s", err, string(raw))
	}
	errorPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("missing error payload: %s", string(raw))
	}
	if got := strings.TrimSpace(toString(errorPayload["request_id"])); got != strings.TrimSpace(want) {
		t.Fatalf("expected request_id %q, got %q payload=%s", want, got, string(raw))
	}
}

func assertJSONEqual(t *testing.T, left []byte, right []byte) {
	t.Helper()
	var leftPayload any
	if err := json.Unmarshal(left, &leftPayload); err != nil {
		t.Fatalf("decode left payload: %v raw=%s", err, string(left))
	}
	var rightPayload any
	if err := json.Unmarshal(right, &rightPayload); err != nil {
		t.Fatalf("decode right payload: %v raw=%s", err, string(right))
	}
	if !reflect.DeepEqual(leftPayload, rightPayload) {
		t.Fatalf("expected equivalent payloads\nleft=%s\nright=%s", string(left), string(right))
	}
}

func assertListEnvelopeHasCoreFields(t *testing.T, payload map[string]any) {
	t.Helper()
	required := []string{"items", "total", "limit", "offset", "page", "per_page", "has_more", "has_next", "next_offset", "filter_applied"}
	for _, key := range required {
		if _, ok := payload[key]; !ok {
			t.Fatalf("expected key %q in payload %v", key, payload)
		}
	}
}

func decodeJSONMap(t *testing.T, raw []byte) map[string]any {
	t.Helper()
	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode JSON: %v raw=%s", err, string(raw))
	}
	return out
}

func consumeOAuthStateRecord(t *testing.T, module *Module, state string) gocore.OAuthStateRecord {
	t.Helper()
	if module == nil || module.Service() == nil {
		t.Fatalf("module/service is required")
	}
	store := module.Service().Dependencies().OAuthStateStore
	if store == nil {
		t.Fatalf("oauth state store is required")
	}
	record, err := store.Consume(context.Background(), strings.TrimSpace(state))
	if err != nil {
		t.Fatalf("consume oauth state record: %v", err)
	}
	return record
}

func toAnyMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	typed, _ := value.(map[string]any)
	if typed == nil {
		return map[string]any{}
	}
	return typed
}

func seedServicesReadModelFixtures(t *testing.T, module *Module) {
	t.Helper()
	if module == nil {
		t.Fatalf("module is required")
	}
	db := resolveBunDB(module.config.PersistenceClient, module.repositoryFactory)
	if db == nil {
		t.Fatalf("expected Bun DB")
	}
	ensureServicesTablesForTests(t, db)
	now := time.Now().UTC().Truncate(time.Second)
	expireAt := now.Add(2 * time.Hour)
	nextAttempt := now.Add(10 * time.Minute)
	lastNotified := now.Add(-3 * time.Minute)
	lastSynced := now.Add(-5 * time.Minute)
	resetAt := now.Add(7 * time.Minute)

	mustExec(t, db, `INSERT OR REPLACE INTO service_connections (id, provider_id, scope_type, scope_id, external_account_id, status, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"conn_1", "github", "user", "user-1", "acct_1", "active", "sync pipeline failed", now, now)
	mustExec(t, db, `INSERT OR REPLACE INTO service_connections (id, provider_id, scope_type, scope_id, external_account_id, status, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"conn_2", "github", "org", "org-1", "acct_2", "active", "", now, now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_installations (id, provider_id, scope_type, scope_id, install_type, status, granted_at, revoked_at, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"install_1", "github", "user", "user-1", "standard", "active", now, nil, []byte(`{}`), now, now)
	mustExec(t, db, `INSERT OR REPLACE INTO service_installations (id, provider_id, scope_type, scope_id, install_type, status, granted_at, revoked_at, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"install_2", "github", "org", "org-1", "standard", "uninstalled", now, now, []byte(`{}`), now, now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_credentials (id, connection_id, version, encrypted_payload, token_type, requested_scopes, granted_scopes, expires_at, refreshable, status, grant_version, encryption_key_id, encryption_version, revocation_reason, payload_format, payload_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"cred_1", "conn_1", 1, []byte{0x01, 0x02}, "bearer", []byte(`["repo:read","repo:write"]`), []byte(`["repo:read"]`), expireAt, true, "active", 1, "app-key", 1, "", "credential_payload", 1, now, now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_grant_snapshots (id, connection_id, provider_id, scope_type, scope_id, version, requested_grants, granted_grants, metadata, captured_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"conn_1:1", "conn_1", "github", "user", "user-1", 1, []byte(`["repo:read","repo:write"]`), []byte(`["repo:read"]`), []byte(`{}`), now, now, now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_activity_entries (id, provider_id, scope_type, scope_id, connection_id, channel, action, object_type, object_id, actor, actor_type, status, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"activity_1", "github", "user", "user-1", "conn_1", "services.sync", "connection.revoked", "connection", "conn_1", "system", "service", "ok", []byte(`{}`), now)
	mustExec(t, db, `INSERT OR REPLACE INTO service_activity_entries (id, provider_id, scope_type, scope_id, connection_id, channel, action, object_type, object_id, actor, actor_type, status, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"activity_2", "github", "org", "org-1", "conn_2", "services.auth", "token.refresh.failed", "connection", "conn_2", "system", "service", "error", []byte(`{}`), now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_subscriptions (id, connection_id, provider_id, resource_type, resource_id, channel_id, remote_subscription_id, callback_url, verification_token_ref, status, expires_at, metadata, last_notified_at, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"sub_1", "conn_1", "github", "issues", "repo-1", "channel-1", "remote-1", "https://example.com/hook", "", "active", expireAt, []byte(`{}`), lastNotified, now, now, nil)
	mustExec(t, db, `INSERT OR REPLACE INTO service_subscriptions (id, connection_id, provider_id, resource_type, resource_id, channel_id, remote_subscription_id, callback_url, verification_token_ref, status, expires_at, metadata, last_notified_at, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"sub_2", "conn_2", "github", "issues", "repo-2", "channel-2", "remote-2", "https://example.com/hook", "", "cancelled", expireAt, []byte(`{}`), nil, now, now, nil)

	mustExec(t, db, `INSERT OR REPLACE INTO service_sync_cursors (id, connection_id, provider_id, resource_type, resource_id, cursor, status, last_synced_at, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"cursor_1", "conn_1", "github", "issues", "repo-1", "cursor-123", "active", lastSynced, []byte(`{}`), now, now)
	mustExec(t, db, `INSERT OR REPLACE INTO service_sync_jobs (id, connection_id, provider_id, mode, checkpoint, status, attempts, next_attempt_at, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"sync_job_1", "conn_1", "github", "incremental", "checkpoint-1", "failed", 2, nextAttempt, []byte(`{"reason":"provider_timeout"}`), now, now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_rate_limit_state (id, provider_id, scope_type, scope_id, bucket_key, "limit", remaining, reset_at, retry_after, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"rate_1", "github", "user", "user-1", "core-api", 5000, 120, resetAt, 60, []byte(`{}`), now, now)

	mustExec(t, db, `INSERT OR REPLACE INTO service_lifecycle_outbox (id, event_id, event_name, provider_id, scope_type, scope_id, connection_id, payload, metadata, status, attempts, next_attempt_at, last_error, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"outbox_1", "event_1", "token.refresh.failed", "github", "user", "user-1", "conn_1", []byte(`{}`), []byte(`{}`), "pending", 1, nextAttempt, "refresh failed", now, now, now)
}

func mustExec(t *testing.T, db *bun.DB, query string, args ...any) {
	t.Helper()
	if db == nil {
		t.Fatalf("db is nil")
	}
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec failed query=%q err=%v", query, err)
	}
}

func ensureServicesTablesForTests(t *testing.T, db *bun.DB) {
	t.Helper()
	ddl := []string{
		`CREATE TABLE IF NOT EXISTS service_connections (
			id TEXT PRIMARY KEY,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			external_account_id TEXT NOT NULL,
			status TEXT NOT NULL,
			inherits_from_connection_id TEXT,
			last_error TEXT NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			deleted_at DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS service_installations (
			id TEXT PRIMARY KEY,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			install_type TEXT NOT NULL,
			status TEXT NOT NULL,
			granted_at DATETIME,
			revoked_at DATETIME,
			metadata TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_credentials (
			id TEXT PRIMARY KEY,
			connection_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			encrypted_payload BLOB NOT NULL,
			token_type TEXT NOT NULL,
			requested_scopes TEXT NOT NULL DEFAULT '[]',
			granted_scopes TEXT NOT NULL DEFAULT '[]',
			expires_at DATETIME,
			refreshable BOOLEAN NOT NULL DEFAULT 0,
			status TEXT NOT NULL,
			grant_version INTEGER NOT NULL DEFAULT 1,
			encryption_key_id TEXT NOT NULL DEFAULT '',
			encryption_version INTEGER NOT NULL DEFAULT 1,
			revocation_reason TEXT NOT NULL DEFAULT '',
			payload_format TEXT NOT NULL DEFAULT 'legacy_token',
			payload_version INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_grant_snapshots (
			id TEXT PRIMARY KEY,
			connection_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			requested_grants TEXT NOT NULL DEFAULT '[]',
			granted_grants TEXT NOT NULL DEFAULT '[]',
			metadata TEXT NOT NULL DEFAULT '{}',
			captured_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_activity_entries (
			id TEXT PRIMARY KEY,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			connection_id TEXT,
			installation_id TEXT,
			subscription_id TEXT,
			sync_job_id TEXT,
			channel TEXT NOT NULL,
			action TEXT NOT NULL,
			object_type TEXT NOT NULL,
			object_id TEXT NOT NULL,
			actor TEXT NOT NULL,
			actor_type TEXT NOT NULL,
			status TEXT NOT NULL,
			metadata TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_subscriptions (
			id TEXT PRIMARY KEY,
			connection_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			resource_type TEXT NOT NULL,
			resource_id TEXT NOT NULL,
			channel_id TEXT NOT NULL,
			remote_subscription_id TEXT,
			callback_url TEXT NOT NULL,
			verification_token_ref TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL,
			expires_at DATETIME,
			metadata TEXT NOT NULL DEFAULT '{}',
			last_notified_at DATETIME,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			deleted_at DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS service_sync_cursors (
			id TEXT PRIMARY KEY,
			connection_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			resource_type TEXT NOT NULL,
			resource_id TEXT NOT NULL,
			cursor TEXT NOT NULL,
			status TEXT NOT NULL,
			last_synced_at DATETIME,
			metadata TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_sync_jobs (
			id TEXT PRIMARY KEY,
			connection_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			mode TEXT NOT NULL,
			checkpoint TEXT,
			status TEXT NOT NULL,
			attempts INTEGER NOT NULL DEFAULT 0,
			next_attempt_at DATETIME,
			metadata TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_rate_limit_state (
			id TEXT PRIMARY KEY,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			bucket_key TEXT NOT NULL,
			"limit" INTEGER NOT NULL,
			remaining INTEGER NOT NULL,
			reset_at DATETIME,
			retry_after INTEGER,
			metadata TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_lifecycle_outbox (
			id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			event_name TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			connection_id TEXT,
			payload TEXT NOT NULL DEFAULT '{}',
			metadata TEXT NOT NULL DEFAULT '{}',
			status TEXT NOT NULL,
			attempts INTEGER NOT NULL DEFAULT 0,
			next_attempt_at DATETIME,
			last_error TEXT NOT NULL DEFAULT '',
			occurred_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS service_notification_dispatches (
			id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			projector_name TEXT NOT NULL,
			recipient_id TEXT NOT NULL,
			idempotency_key TEXT NOT NULL,
			status TEXT NOT NULL,
			attempts INTEGER NOT NULL DEFAULT 0,
			last_error TEXT,
			next_attempt_at DATETIME,
			metadata TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
	}
	for _, statement := range ddl {
		mustExec(t, db, statement)
	}
}

package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/types"
)

type ingestionHTTPVerifier struct {
	err       error
	principal *ActivityProducerPrincipal
}

func TestActivityIngestionNumericPortability(t *testing.T) {
	for _, database := range []struct {
		name     string
		postgres bool
	}{{"sqlite", false}, {"postgres", true}} {
		t.Run(database.name, func(t *testing.T) {
			for _, tc := range []struct {
				number string
				valid  bool
			}{{"1e-16383", true}, {"10e-16384", true}, {"0e-20000", true}, {"1e-16384", false}, {"1e-20000", false}} {
				t.Run(tc.number, func(t *testing.T) {
					svc, store, _, ctx := ingestionServiceFixture(t, database.postgres)
					a := ingestionHTTPAdmin(t, Config{BasePath: "/admin"}, svc)
					server := router.NewHTTPServer()
					if err := RegisterActivityIngestionRoutes(ctx, server.Router(), a, ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: &ingestionHTTPVerifier{}}); err != nil {
						t.Fatal(err)
					}
					e := ingestionTestEvent()
					e.Metadata = json.RawMessage(`{"value":` + tc.number + `}`)
					raw := ingestionTestJSON(t, e)
					_, decodeErr := DecodeActivityIngestionEvent(raw)
					first, directErr := svc.Ingest(ctx, e)
					replay, commandErr := DispatchActivityIngestion(ctx, a.Commands(), ActivityIngestMsg{Event: e})
					req := httptest.NewRequestWithContext(t.Context(), "POST", "/admin/api/activity/ingest", bytes.NewReader(raw))
					req.Header.Set("Authorization", "Bearer producer-secret")
					req.Header.Set("Content-Type", "application/json")
					rr := httptest.NewRecorder()
					server.WrappedRouter().ServeHTTP(rr, req)
					for _, err := range []error{decodeErr, directErr, commandErr} {
						if tc.valid && err != nil || !tc.valid && !errors.Is(err, ErrActivityIngestionTooLarge) {
							t.Fatalf("numeric entry parity: %v", err)
						}
					}
					if tc.valid {
						if !replay.Replayed || first.ActivityID != replay.ActivityID || rr.Code != 200 {
							t.Fatal("numeric replay", rr.Code, rr.Body.String(), replay)
						}
						page, err := store.repository.ListActivity(ctx, types.ActivityFilter{})
						if err != nil || len(page.Records) != 1 {
							t.Fatal("numeric read", page, err)
						}
						assertIngestionExactNumber(t, page.Records[0].Data["value"], tc.number)
					} else {
						binding, err := store.Binding(ctx, "billing", e.EventID)
						if rr.Code != 413 || binding != nil || err != nil {
							t.Fatal("numeric overflow consumed key", rr.Code, binding, err)
						}
					}
					// Host disclosure cannot introduce a value outside the same contract.
					svc.config.Disclose = func(context.Context, ActivityIngestionEvent) (json.RawMessage, error) { return e.Metadata, nil }
					callback := ingestionTestEvent()
					callback.EventID = "callback"
					_, err := svc.Ingest(ctx, callback)
					if tc.valid && err != nil || !tc.valid && !errors.Is(err, ErrActivityIngestionTooLarge) {
						t.Fatalf("numeric disclosure parity: %v", err)
					}
				})
			}
		})
	}
}

func (v *ingestionHTTPVerifier) VerifyActivityProducer(_ context.Context, c ActivityProducerCredential) (ActivityProducerPrincipal, error) {
	if v.err != nil {
		return ActivityProducerPrincipal{}, v.err
	}
	if c.Bearer != "producer-secret" {
		return ActivityProducerPrincipal{}, ErrActivityIngestionUnauthenticated
	}
	if v.principal != nil {
		return *v.principal, nil
	}
	return ingestionTestPrincipal(), nil
}

type ingestionHTTPAttribution struct {
	evidence ActivityAttributionEvidence
	err      error
}

func (v ingestionHTTPAttribution) VerifyActivityAttribution(context.Context, ActivityProducerPrincipal, string) (ActivityAttributionEvidence, error) {
	return v.evidence, v.err
}
func ingestionHTTPAdmin(t *testing.T, cfg Config, svc *ActivityIngestionService) *Admin {
	t.Helper()
	cfg = applyConfigDefaults(cfg)
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatal(err)
	}
	bus := NewCommandBus(true)
	t.Cleanup(bus.Close)
	if _, err = RegisterActivityIngestionCommand(bus, svc); err != nil {
		t.Fatal(err)
	}
	return &Admin{config: cfg, urlManager: manager, commandBus: bus}
}
func TestActivityIngestionHTTP(t *testing.T) {
	svc, _, policy, _ := ingestionServiceFixture(t, false)
	a := ingestionHTTPAdmin(t, Config{BasePath: "/control"}, svc)
	server := router.NewHTTPServer()
	verifier := &ingestionHTTPVerifier{}
	if err := RegisterActivityIngestionRoutes(context.Background(), server.Router(), a, ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: verifier}); err != nil {
		t.Fatal(err)
	}
	endpoint, err := a.ActivityIngestionURL()
	if err != nil || endpoint != "/control/api/activity/ingest" {
		t.Fatal(endpoint, err)
	}
	raw := ingestionTestJSON(t, ingestionTestEvent())
	post := func(body []byte, edit func(*http.Request)) *httptest.ResponseRecorder {
		request := httptest.NewRequestWithContext(t.Context(), "POST", endpoint, bytes.NewReader(body))
		request.Header.Set("Authorization", "Bearer producer-secret")
		request.Header.Set("Content-Type", "application/json")
		if edit != nil {
			edit(request)
		}
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, request)
		if rr.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("missing no-store")
		}
		if strings.Contains(rr.Body.String(), "producer-secret") {
			t.Fatal("credential leaked")
		}
		return rr
	}
	first := post(raw, nil)
	if first.Code != 201 {
		t.Fatal(first.Code, first.Body.String())
	}
	var accepted ActivityIngestResult
	if err = json.Unmarshal(first.Body.Bytes(), &accepted); err != nil {
		t.Fatal(err)
	}
	replay := post(raw, nil)
	if replay.Code != 200 {
		t.Fatal(replay.Code, replay.Body.String())
	}
	changed := bytes.Replace(raw, []byte("INV-42"), []byte("INV-43"), 1)
	if rr := post(changed, nil); rr.Code != 409 {
		t.Fatal(rr.Code, rr.Body.String())
	}
	for _, tc := range []struct {
		name string
		code int
		body []byte
		edit func(*http.Request)
	}{
		{"cookie-only", 401, raw, func(r *http.Request) {
			r.Header.Del("Authorization")
			r.AddCookie(&http.Cookie{Name: "session", Value: "browser"})
		}},
		{"duplicate bearer", 401, raw, func(r *http.Request) { r.Header.Add("Authorization", "Bearer producer-secret") }},
		{"forged typed context", 401, raw, func(r *http.Request) {
			r.Header.Del("Authorization")
			*r = *r.WithContext(WithVerifiedActivityProducer(r.Context(), ingestionTestPrincipal()))
		}},
		{"wrong bearer", 401, raw, func(r *http.Request) { r.Header.Set("Authorization", "Bearer browser-token") }},
		{"large bearer", 401, raw, func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+strings.Repeat("a", 8193)) }},
		{"proof without verifier", 403, raw, func(r *http.Request) { r.Header.Set("X-Activity-Actor-Assertion", "proof") }},
		{"duplicate proof", 403, raw, func(r *http.Request) {
			r.Header.Add("X-Activity-Actor-Assertion", "proof")
			r.Header.Add("X-Activity-Actor-Assertion", "proof")
		}},
		{"query authority", 400, raw, func(r *http.Request) { r.URL.RawQuery = "tenant_id=" + ingestTenant }},
		{"alias conflict", 400, raw, func(r *http.Request) { r.Header.Set("Idempotency-Key", "different") }},
		{"alias duplicate", 400, raw, func(r *http.Request) {
			r.Header.Add("Idempotency-Key", "event-1")
			r.Header.Add("Idempotency-Key", "event-1")
		}},
		{"media", 415, raw, func(r *http.Request) { r.Header.Set("Content-Type", "text/plain") }},
		{"trailing", 400, append(append([]byte(nil), raw...), []byte(` {}`)...), nil},
		{"duplicate key", 400, bytes.Replace(raw, []byte(`"event_id":`), []byte(`"event_id":"duplicate","event_id":`), 1), nil},
		{"payload authority", 400, bytes.Replace(raw, []byte(`"event_id":`), []byte(`"producer_id":"forged","event_id":`), 1), nil},
		{"oversized", 413, []byte(strings.Repeat(" ", 65537)), nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rr := post(tc.body, tc.edit)
			if rr.Code != tc.code {
				t.Fatalf("want %d got %d %s", tc.code, rr.Code, rr.Body)
			}
			if rr.Code == 401 && rr.Header().Get("WWW-Authenticate") == "" {
				t.Fatal("missing challenge")
			}
		})
	}
	verifier.err = errors.New("credential backend secret")
	if rr := post(raw, nil); rr.Code != 503 || strings.Contains(rr.Body.String(), "secret") {
		t.Fatal(rr.Code, rr.Body.String())
	}
	verifier.err = nil
	wrong := ingestionTestPrincipal()
	wrong.Audience = "browser"
	verifier.principal = &wrong
	if rr := post(raw, nil); rr.Code != 401 {
		t.Fatal(rr.Code)
	}
	verifier.principal = nil
	policy.revoked = true
	if rr := post(raw, nil); rr.Code != 403 {
		t.Fatal(rr.Code)
	}
	if err := RegisterActivityIngestionRoutes(context.Background(), server.Router(), a, ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: verifier}); !errors.Is(err, ErrActivityIngestionConflict) {
		t.Fatal("collision accepted", err)
	}
}
func TestActivityIngestionURLKitOverrides(t *testing.T) {
	svc, _, _, _ := ingestionServiceFixture(t, false)
	for _, tc := range []struct {
		name     string
		cfg      Config
		override string
		want     string
	}{
		{name: "default", cfg: Config{BasePath: "/admin"}, want: "/admin/api/activity/ingest"},
		{name: "root", cfg: Config{Routing: routing.Config{Roots: routing.RootsConfig{AdminRoot: "/control", APIRoot: "/control/v3"}}}, want: "/control/v3/activity/ingest"},
		{name: "version", cfg: Config{BasePath: "/console", URLs: URLConfig{Admin: URLNamespaceConfig{APIPrefix: "service", APIVersion: "v9"}}}, want: "/console/service/v9/activity/ingest"},
		{name: "absolute override", cfg: Config{BasePath: "/admin"}, override: "/internal/business-events", want: "/internal/business-events"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cfg := applyConfigDefaults(tc.cfg)
			if tc.override != "" {
				cfg.URLs.URLKit = defaultURLKitConfig(cfg)
				cfg.URLs.URLKit.Groups[0].Groups[0].Routes[ActivityIngestionRouteKey] = tc.override
				delete(cfg.URLs.URLKit.Groups[0].Groups[0].Routes, "activity.filter_options")
			}
			a := ingestionHTTPAdmin(t, cfg, svc)
			got, err := a.ActivityIngestionURL()
			if err != nil || got != tc.want {
				t.Fatal(got, err)
			}
			server := router.NewHTTPServer()
			if err = RegisterActivityIngestionRoutes(context.Background(), server.Router(), a, ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: &ingestionHTTPVerifier{}}); err != nil {
				t.Fatal(err)
			}
			e := ingestionTestEvent()
			e.EventID = tc.name
			raw := ingestionTestJSON(t, e)
			req := httptest.NewRequestWithContext(t.Context(), "POST", tc.want, bytes.NewReader(raw))
			req.Header.Set("Authorization", "Bearer producer-secret")
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)
			if rr.Code != 201 {
				t.Fatal(rr.Code, rr.Body.String())
			}
			if len(server.Router().Routes()) != 1 {
				t.Fatal("implicit route alias mounted")
			}
		})
	}
}
func TestActivityIngestionHTTPReadinessAndProof(t *testing.T) {
	svc, _, _, _ := ingestionServiceFixture(t, false)
	a := ingestionHTTPAdmin(t, Config{}, svc)
	server := router.NewHTTPServer()
	if err := RegisterActivityIngestionRoutes(context.Background(), server.Router(), nil, ActivityIngestionHTTPOptions{}); err != nil || len(server.Router().Routes()) != 0 {
		t.Fatal("disabled routes changed", err)
	}
	if err := RegisterActivityIngestionRoutes(context.Background(), server.Router(), a, ActivityIngestionHTTPOptions{Enabled: true, Service: svc}); !errors.Is(err, ErrActivityIngestionUnavailable) {
		t.Fatal("missing verifier ready", err)
	}
	for _, invalid := range []string{"https://example.org/ingest", "/ingest/:id", "/ingest/{id}", "/ingest?mode=x", "//evil/path", "/a/../ingest", "/ingest%2fother"} {
		if validActivityIngestionPath(invalid) {
			t.Fatal("invalid route", invalid)
		}
	}
	p := ingestionTestPrincipal()
	proof := ActivityAttributionEvidence{ProducerID: p.ProducerID, ActorID: ingestActor, Scope: ScopeInput{TenantID: ingestTenant, OrgID: ingestOrg}, Issuer: p.Issuer, Audience: p.Audience, Purpose: p.Purpose, NotBefore: p.NotBefore, ExpiresAt: p.ExpiresAt}
	proof.Scope.OrgID = ingestActor
	opts := ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: &ingestionHTTPVerifier{}, AttributionVerifier: ingestionHTTPAttribution{evidence: proof}}
	if err := RegisterActivityIngestionRoutes(context.Background(), server.Router(), a, opts); err != nil {
		t.Fatal(err)
	}
	endpoint, endpointErr := a.ActivityIngestionURL()
	if endpointErr != nil {
		t.Fatal(endpointErr)
	}
	raw := ingestionTestJSON(t, ingestionTestEvent())
	req := httptest.NewRequestWithContext(t.Context(), "POST", endpoint, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer producer-secret")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Activity-Actor-Assertion", "proof")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatal("mismatched proof accepted", rr.Code, rr.Body.String())
	}
}

func TestActivityIngestionDepthParity(t *testing.T) {
	for _, depth := range []int{ActivityIngestionMaxDepth - 1, ActivityIngestionMaxDepth} {
		for _, arrays := range []bool{false, true} {
			svc, store, _, ctx := ingestionServiceFixture(t, false)
			a := ingestionHTTPAdmin(t, Config{BasePath: "/admin"}, svc)
			server := router.NewHTTPServer()
			if err := RegisterActivityIngestionRoutes(ctx, server.Router(), a, ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: &ingestionHTTPVerifier{}}); err != nil {
				t.Fatal(err)
			}
			e := ingestionTestEvent()
			e.Metadata = json.RawMessage(strings.Repeat(`{"x":`, depth) + `0` + strings.Repeat(`}`, depth))
			if arrays {
				e.Metadata = json.RawMessage(`{"x":` + strings.Repeat(`[`, depth-1) + `0` + strings.Repeat(`]`, depth-1) + `}`)
			}
			raw := ingestionTestJSON(t, e)
			_, decodeErr := DecodeActivityIngestionEvent(raw)
			_, directErr := svc.Ingest(ctx, e)
			_, commandErr := (&ActivityIngestCommand{Service: svc}).Run(ctx, ActivityIngestMsg{Event: e})
			result, dispatchErr := DispatchActivityIngestion(ctx, a.Commands(), ActivityIngestMsg{Event: e})
			request := httptest.NewRequestWithContext(t.Context(), "POST", "/admin/api/activity/ingest", bytes.NewReader(raw))
			request.Header.Set("Authorization", "Bearer producer-secret")
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(response, request)
			for _, err := range []error{decodeErr, directErr, commandErr, dispatchErr} {
				if depth < ActivityIngestionMaxDepth && err != nil {
					t.Fatalf("depth %d arrays=%v: %v", depth, arrays, err)
				}
				if depth == ActivityIngestionMaxDepth && !errors.Is(err, ErrActivityIngestionTooLarge) {
					t.Fatalf("overflow accepted: %v", err)
				}
			}
			if depth < ActivityIngestionMaxDepth {
				if !result.Replayed || response.Code != http.StatusOK {
					t.Fatalf("cross-transport replay: %+v, %d %s", result, response.Code, response.Body.String())
				}
			} else {
				binding, err := store.Binding(ctx, "billing", e.EventID)
				if response.Code != http.StatusRequestEntityTooLarge || binding != nil || err != nil {
					t.Fatalf("overflow consumed key: %d %+v %v", response.Code, binding, err)
				}
			}
			// Disclosure output observes the same metadata offset as incoming data.
			svc.config.Disclose = func(context.Context, ActivityIngestionEvent) (json.RawMessage, error) { return e.Metadata, nil }
			callback := ingestionTestEvent()
			callback.EventID = "callback"
			_, err := svc.Ingest(ctx, callback)
			if (depth < ActivityIngestionMaxDepth && err != nil) || (depth == ActivityIngestionMaxDepth && !errors.Is(err, ErrActivityIngestionTooLarge)) {
				t.Fatalf("disclosure parity: %v", err)
			}
			a.Commands().Close()
		}
	}
}

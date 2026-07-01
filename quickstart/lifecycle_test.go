package quickstart

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	lifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	router "github.com/goliatone/go-router"
)

func TestLifecycleStatusPayloadIncludesTaskDiagnostics(t *testing.T) {
	started := time.Date(2026, 6, 12, 1, 0, 0, 0, time.UTC)
	payload := LifecycleStatusPayload(lifecycle.Snapshot{
		Serving:   true,
		Ready:     false,
		StartedAt: started,
		UpdatedAt: started.Add(time.Second),
		Tasks: []lifecycle.TaskSnapshot{{
			Name:     "repair",
			Phase:    lifecycle.PhasePostBind,
			Policy:   lifecycle.ErrorPolicyDegraded,
			State:    lifecycle.StateDegraded,
			Attempts: 2,
			Duration: 1500 * time.Millisecond,
			Error:    " soft failure ",
		}},
	})
	if payload["status"] != "serving_not_ready" {
		t.Fatalf("status = %v, want serving_not_ready", payload["status"])
	}
	tasks, ok := payload["tasks"].([]map[string]any)
	if !ok || len(tasks) != 1 {
		t.Fatalf("tasks payload = %#v", payload["tasks"])
	}
	if tasks[0]["duration_ms"] != int64(1500) || tasks[0]["error"] != "soft failure" {
		t.Fatalf("unexpected task payload: %#v", tasks[0])
	}
}

func TestRegisterLifecycleReadinessRouteReportsReadyState(t *testing.T) {
	server := router.NewHTTPServer()
	provider := &snapshotProvider{snapshot: lifecycle.Snapshot{Serving: true, Ready: false}}
	path, err := RegisterLifecycleReadinessRoute(server.Router(), " ready ", provider)
	if err != nil {
		t.Fatalf("RegisterLifecycleReadinessRoute() error = %v", err)
	}
	if path != "/ready" {
		t.Fatalf("path = %q, want /ready", path)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/ready", nil)
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d body=%s, want 503", rec.Code, rec.Body.String())
	}

	provider.snapshot = lifecycle.Snapshot{Serving: true, Ready: true}
	rec = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s, want 200", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["status"] != "ready" {
		t.Fatalf("response status = %v, want ready", body["status"])
	}
}

func TestRegisterLifecycleReadinessRouteRejectsNilRouter(t *testing.T) {
	if _, err := RegisterLifecycleReadinessRoute[any](nil, "/ready", &snapshotProvider{}); err == nil {
		t.Fatal("expected nil router to fail")
	}
}

func TestLifecycleDoctorCheckReportsReadinessAndTaskFailures(t *testing.T) {
	check := LifecycleDoctorCheck(&snapshotProvider{snapshot: lifecycle.Snapshot{
		Serving: true,
		Ready:   false,
		Tasks: []lifecycle.TaskSnapshot{{
			Name:   "seed",
			Phase:  lifecycle.PhasePostBind,
			Policy: lifecycle.ErrorPolicyDegraded,
			State:  lifecycle.StateDegraded,
			Error:  "seed failed",
		}},
	}})
	output := check.Run(context.Background(), nil)
	if len(output.Findings) != 2 {
		t.Fatalf("findings = %#v, want not_ready and degraded task", output.Findings)
	}
	if output.Metadata["status"] != "serving_not_ready" {
		t.Fatalf("metadata = %#v", output.Metadata)
	}
}

func TestLifecycleDoctorCheckReportsMissingProvider(t *testing.T) {
	check := LifecycleDoctorCheck(nil)
	output := check.Run(context.Background(), nil)
	if len(output.Findings) != 1 || output.Findings[0].Code != "quickstart.lifecycle.provider_missing" {
		t.Fatalf("unexpected findings: %#v", output.Findings)
	}
}

type snapshotProvider struct {
	snapshot lifecycle.Snapshot
}

func (p *snapshotProvider) Snapshot() lifecycle.Snapshot {
	return p.snapshot
}

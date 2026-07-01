package quickstart

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	lifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	router "github.com/goliatone/go-router"
)

const (
	// DefaultLifecycleReadyPath is the default route for lifecycle readiness.
	DefaultLifecycleReadyPath = "/readyz"
	// LifecycleDoctorCheckID is the built-in doctor check ID for lifecycle state.
	LifecycleDoctorCheckID = "quickstart.lifecycle"
)

// LifecycleSnapshotProvider exposes a lifecycle status snapshot.
type LifecycleSnapshotProvider interface {
	Snapshot() lifecycle.Snapshot
}

// LifecycleStatusPayload converts a lifecycle snapshot into JSON-safe
// diagnostics suitable for readiness endpoints, debug panels, or logs.
func LifecycleStatusPayload(snapshot lifecycle.Snapshot) map[string]any {
	tasks := make([]map[string]any, 0, len(snapshot.Tasks))
	for _, task := range snapshot.Tasks {
		tasks = append(tasks, lifecycleTaskPayload(task))
	}
	return map[string]any{
		"serving":    snapshot.Serving,
		"ready":      snapshot.Ready,
		"status":     lifecycleStatusString(snapshot),
		"started_at": snapshot.StartedAt,
		"updated_at": snapshot.UpdatedAt,
		"tasks":      tasks,
	}
}

// LifecycleReadinessHandler returns a handler that reports full lifecycle
// readiness. It is separate from liveness endpoints such as /health.
func LifecycleReadinessHandler(provider LifecycleSnapshotProvider) router.HandlerFunc {
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		if provider == nil {
			return c.JSON(http.StatusServiceUnavailable, map[string]any{
				"status": "unavailable",
				"ready":  false,
				"error":  "lifecycle snapshot provider is not configured",
			})
		}
		snapshot := provider.Snapshot()
		status := http.StatusOK
		if !snapshot.Ready {
			status = http.StatusServiceUnavailable
		}
		return c.JSON(status, LifecycleStatusPayload(snapshot))
	}
}

// RegisterLifecycleReadinessRoute registers a readiness endpoint on the given
// router and returns the normalized path.
func RegisterLifecycleReadinessRoute[T any](r router.Router[T], routePath string, provider LifecycleSnapshotProvider) (string, error) {
	if r == nil {
		return "", fmt.Errorf("lifecycle readiness router is required")
	}
	resolved := resolveInternalOpsPath(routePath, DefaultLifecycleReadyPath)
	r.Get(resolved, LifecycleReadinessHandler(provider))
	return resolved, nil
}

// LifecycleDoctorCheck builds a doctor check for lifecycle diagnostics.
func LifecycleDoctorCheck(provider LifecycleSnapshotProvider) admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          LifecycleDoctorCheckID,
		Label:       "Lifecycle",
		Description: "Reports host lifecycle serving, readiness, and task status.",
		Help:        "Use this check to identify startup, readiness, background, or shutdown tasks that failed or left the app degraded.",
		Action: admin.NewManualDoctorAction(
			"Review lifecycle task status and logs for failed or degraded tasks.",
			"Review lifecycle status",
		),
		Run: func(context.Context, *admin.Admin) admin.DoctorCheckOutput {
			if provider == nil {
				return admin.DoctorCheckOutput{
					Summary: "Lifecycle snapshot provider is not configured.",
					Findings: []admin.DoctorFinding{{
						Severity:  admin.DoctorSeverityWarn,
						Code:      "quickstart.lifecycle.provider_missing",
						Component: "lifecycle",
						Message:   "Lifecycle snapshot provider is not configured",
						Hint:      "Pass a lifecycle runner or snapshot provider when registering the doctor check.",
					}},
				}
			}
			snapshot := provider.Snapshot()
			findings := lifecycleDoctorFindings(snapshot)
			return admin.DoctorCheckOutput{
				Summary:  lifecycleDoctorSummary(snapshot, findings),
				Findings: findings,
				Metadata: LifecycleStatusPayload(snapshot),
			}
		},
	}
}

func lifecycleTaskPayload(task lifecycle.TaskSnapshot) map[string]any {
	return map[string]any{
		"name":         task.Name,
		"phase":        task.Phase,
		"priority":     task.Priority,
		"policy":       task.Policy,
		"state":        task.State,
		"attempts":     task.Attempts,
		"started_at":   task.StartedAt,
		"completed_at": task.CompletedAt,
		"duration_ms":  durationMilliseconds(task.Duration),
		"error":        strings.TrimSpace(task.Error),
	}
}

func lifecycleStatusString(snapshot lifecycle.Snapshot) string {
	if !snapshot.Serving {
		return "starting"
	}
	if !snapshot.Ready {
		return "serving_not_ready"
	}
	for _, task := range snapshot.Tasks {
		if task.State == lifecycle.StateFailed {
			return "failed"
		}
		if task.State == lifecycle.StateDegraded {
			return "degraded"
		}
	}
	return "ready"
}

func lifecycleDoctorFindings(snapshot lifecycle.Snapshot) []admin.DoctorFinding {
	findings := []admin.DoctorFinding{}
	if !snapshot.Serving {
		findings = append(findings, admin.DoctorFinding{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.lifecycle.not_serving",
			Component: "lifecycle",
			Message:   "Lifecycle runner is not marked serving",
			Hint:      "Mark serving only after the listener accepts requests.",
		})
	}
	if !snapshot.Ready {
		findings = append(findings, admin.DoctorFinding{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.lifecycle.not_ready",
			Component: "lifecycle",
			Message:   "Lifecycle runner is not fully ready",
			Hint:      "Inspect pre-bind, post-bind, ready, and background task status.",
		})
	}
	for _, task := range snapshot.Tasks {
		switch task.State {
		case lifecycle.StateFailed:
			findings = append(findings, lifecycleTaskFinding(task, admin.DoctorSeverityError))
		case lifecycle.StateDegraded:
			findings = append(findings, lifecycleTaskFinding(task, admin.DoctorSeverityWarn))
		}
	}
	return findings
}

func lifecycleTaskFinding(task lifecycle.TaskSnapshot, severity admin.DoctorSeverity) admin.DoctorFinding {
	message := fmt.Sprintf("Lifecycle task %q is %s", task.Name, task.State)
	return admin.DoctorFinding{
		Severity:  severity,
		Code:      "quickstart.lifecycle.task_" + strings.ReplaceAll(string(task.State), "-", "_"),
		Component: "lifecycle",
		Message:   message,
		Hint:      "Review the lifecycle task error and phase assignment.",
		Metadata: map[string]any{
			"name":     task.Name,
			"phase":    task.Phase,
			"policy":   task.Policy,
			"state":    task.State,
			"attempts": task.Attempts,
			"error":    strings.TrimSpace(task.Error),
		},
	}
}

func lifecycleDoctorSummary(snapshot lifecycle.Snapshot, findings []admin.DoctorFinding) string {
	if len(findings) == 0 {
		return "Lifecycle is serving and ready."
	}
	return fmt.Sprintf("Lifecycle status is %s with %d finding(s).", lifecycleStatusString(snapshot), len(findings))
}

func durationMilliseconds(duration time.Duration) int64 {
	if duration <= 0 {
		return 0
	}
	return duration.Milliseconds()
}

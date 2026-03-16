package setup

import (
	"fmt"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/admin"
)

func attachContentActionState(builder *admin.PanelBuilder, panelName string) *admin.PanelBuilder {
	if builder == nil {
		return nil
	}
	return builder.WithActionStateResolver(contentActionStateResolver(panelName))
}

func withContentWorkflowGuard(panelName string, action admin.Action) admin.Action {
	if !isContentWorkflowAction(action.Name) {
		return action
	}
	action.Guard = contentWorkflowActionGuard(panelName)
	return action
}

func withPostScheduleGuard(action admin.Action) admin.Action {
	if !strings.EqualFold(strings.TrimSpace(action.Name), "schedule") {
		return action
	}
	action.Guard = postScheduleActionGuard()
	return action
}

func contentActionStateResolver(panelName string) coreadmin.BatchActionStateResolver {
	normalizedPanel := strings.ToLower(strings.TrimSpace(panelName))
	return func(
		_ coreadmin.AdminContext,
		records []map[string]any,
		actions []coreadmin.Action,
		_ coreadmin.ActionScope,
	) (map[string]map[string]coreadmin.ActionState, error) {
		if len(records) == 0 || len(actions) == 0 {
			return nil, nil
		}
		available := map[string]struct{}{}
		for _, action := range actions {
			name := strings.ToLower(strings.TrimSpace(action.Name))
			if name == "" {
				continue
			}
			available[name] = struct{}{}
		}

		resolved := map[string]map[string]coreadmin.ActionState{}
		for _, record := range records {
			recordID := strings.TrimSpace(fmt.Sprint(record["id"]))
			if recordID == "" {
				continue
			}

			states := map[string]coreadmin.ActionState{}
			switch normalizedPanel {
			case "pages":
				if isProtectedHomePage(record) {
					if _, ok := available["delete"]; ok {
						states["delete"] = protectedHomePageActionState("delete")
					}
					if _, ok := available["unpublish"]; ok {
						states["unpublish"] = protectedHomePageActionState("unpublish")
					}
				}
			case "posts":
				if _, ok := available["schedule"]; ok {
					if state, blocked := postScheduleAvailabilityState(record); blocked {
						states["schedule"] = state
					}
				}
			}

			if len(states) > 0 {
				resolved[recordID] = states
			}
		}

		if len(resolved) == 0 {
			return nil, nil
		}
		return resolved, nil
	}
}

func contentWorkflowActionGuard(panelName string) coreadmin.ActionGuard {
	normalizedPanel := strings.ToLower(strings.TrimSpace(panelName))
	return func(ctx coreadmin.ActionGuardContext) coreadmin.ActionState {
		actionName := strings.ToLower(strings.TrimSpace(ctx.Action.Name))
		status := normalizedContentStatus(ctx.Record["status"])
		allowedStatuses, ok := contentWorkflowAllowedStatuses(actionName)
		if !ok {
			return coreadmin.ActionState{Enabled: true}
		}
		if statusAllowed(status, allowedStatuses...) {
			return coreadmin.ActionState{Enabled: true}
		}
		return coreadmin.ActionState{
			Enabled:  false,
			Severity: "info",
			Kind:     "workflow",
			Metadata: map[string]any{
				"panel":            normalizedPanel,
				"action":           actionName,
				"current_status":   status,
				"allowed_statuses": append([]string{}, allowedStatuses...),
			},
		}
	}
}

func postScheduleActionGuard() coreadmin.ActionGuard {
	return func(ctx coreadmin.ActionGuardContext) coreadmin.ActionState {
		if state, blocked := postScheduleAvailabilityState(ctx.Record); blocked {
			return state
		}
		return coreadmin.ActionState{Enabled: true}
	}
}

func isContentWorkflowAction(name string) bool {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "request_approval", "approve", "reject", "publish", "unpublish":
		return true
	default:
		return false
	}
}

func contentWorkflowAllowedStatuses(actionName string) ([]string, bool) {
	switch strings.ToLower(strings.TrimSpace(actionName)) {
	case "request_approval":
		return []string{"draft"}, true
	case "approve", "reject":
		return []string{"pending_approval"}, true
	case "publish":
		return []string{"draft", "pending_approval", "scheduled"}, true
	case "unpublish":
		return []string{"published"}, true
	default:
		return nil, false
	}
}

func postScheduleAvailabilityState(record map[string]any) (coreadmin.ActionState, bool) {
	status := normalizedContentStatus(record["status"])
	if status == "" || status == "draft" {
		return coreadmin.ActionState{Enabled: true}, false
	}

	reason := "Only draft posts can be scheduled for publication."
	switch status {
	case "scheduled":
		reason = "This post is already scheduled. Update the publish date on the post instead of scheduling it again."
	case "published":
		reason = "Unpublish this post before scheduling a new publication window."
	case "pending_approval":
		reason = "Approve or reject this post before scheduling publication."
	case "archived":
		reason = "Restore this post to draft before scheduling publication."
	}

	metadata := map[string]any{
		"current_status":  status,
		"required_status": "draft",
	}
	if publishedAt := normalizedActionStateTimestamp(record["published_at"]); publishedAt != "" {
		metadata["published_at"] = publishedAt
	}

	return coreadmin.ActionState{
		Enabled:    false,
		ReasonCode: coreadmin.ActionDisabledReasonCodePreconditionFailed,
		Reason:     reason,
		Severity:   "warning",
		Kind:       "business_rule",
		Metadata:   metadata,
	}, true
}

func protectedHomePageActionState(actionName string) coreadmin.ActionState {
	reason := "The home page must remain published so the site root always has an active landing page."
	if strings.EqualFold(strings.TrimSpace(actionName), "delete") {
		reason = "The home page cannot be deleted because the site root must always resolve to a published page."
	}
	return coreadmin.ActionState{
		Enabled:    false,
		ReasonCode: coreadmin.ActionDisabledReasonCodePreconditionFailed,
		Reason:     reason,
		Severity:   "warning",
		Kind:       "business_rule",
		Metadata: map[string]any{
			"page_role":        "home",
			"required_path":    "/",
			"required_status":  "published",
			"blocked_action":   strings.ToLower(strings.TrimSpace(actionName)),
			"business_rule_id": "content.home_page_protection",
		},
	}
}

func isProtectedHomePage(record map[string]any) bool {
	if len(record) == 0 {
		return false
	}
	path := strings.TrimSpace(fmt.Sprint(record["path"]))
	if path == "/" {
		return true
	}
	slug := strings.ToLower(strings.TrimSpace(fmt.Sprint(record["slug"])))
	parentID := strings.TrimSpace(fmt.Sprint(record["parent_id"]))
	return slug == "home" && parentID == ""
}

func normalizedContentStatus(value any) string {
	return strings.ToLower(strings.TrimSpace(fmt.Sprint(value)))
}

func statusAllowed(current string, allowed ...string) bool {
	current = strings.ToLower(strings.TrimSpace(current))
	for _, candidate := range allowed {
		if current == strings.ToLower(strings.TrimSpace(candidate)) {
			return true
		}
	}
	return false
}

func normalizedActionStateTimestamp(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case time.Time:
		if typed.IsZero() {
			return ""
		}
		return typed.UTC().Format(time.RFC3339)
	case *time.Time:
		if typed == nil || typed.IsZero() {
			return ""
		}
		return typed.UTC().Format(time.RFC3339)
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" || trimmed == "<nil>" {
			return ""
		}
		if parsed, err := time.Parse(time.RFC3339, trimmed); err == nil {
			return parsed.UTC().Format(time.RFC3339)
		}
		return trimmed
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

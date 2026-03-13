package admin

const (
	translationDashboardCardMyTasks               = "my_tasks"
	translationDashboardCardNeedsReview           = "needs_review"
	translationDashboardCardOverdueTasks          = "overdue_tasks"
	translationDashboardCardBlockedFamilies       = "blocked_families"
	translationDashboardCardMissingRequiredLocale = "missing_required_locales"

	translationDashboardTableTopOverdueAssignments = "top_overdue_assignments"
	translationDashboardTableBlockedFamilies       = "blocked_families"

	translationDashboardAlertStateOK       = "ok"
	translationDashboardAlertStateWarning  = "warning"
	translationDashboardAlertStateCritical = "critical"
	translationDashboardAlertStateDegraded = "degraded"
)

func TranslationDashboardContractPayload() map[string]any {
	return map[string]any{
		"card_ids": []string{
			translationDashboardCardMyTasks,
			translationDashboardCardNeedsReview,
			translationDashboardCardOverdueTasks,
			translationDashboardCardBlockedFamilies,
			translationDashboardCardMissingRequiredLocale,
		},
		"table_ids": []string{
			translationDashboardTableTopOverdueAssignments,
			translationDashboardTableBlockedFamilies,
		},
		"alert_states": []string{
			translationDashboardAlertStateOK,
			translationDashboardAlertStateWarning,
			translationDashboardAlertStateCritical,
			translationDashboardAlertStateDegraded,
		},
		"default_limits": map[string]any{
			translationDashboardTableTopOverdueAssignments: translationDashboardDefaultOverdueLimit,
			translationDashboardTableBlockedFamilies:       translationDashboardDefaultBlockedLimit,
		},
		"query_models": TranslationDashboardQueryModels(),
		"runbooks":     translationDashboardRunbookCatalog(),
	}
}

func TranslationDashboardQueryModels() map[string]any {
	return map[string]any{
		translationDashboardTableTopOverdueAssignments: map[string]any{
			"id":                translationDashboardTableTopOverdueAssignments,
			"description":       "Top overdue assignments across the visible scope, sorted by oldest due date first.",
			"scope_fields":      []string{"tenant_id", "org_id"},
			"default_limit":     translationDashboardDefaultOverdueLimit,
			"stable_sort_keys":  []string{"due_date", "priority", "updated_at", "assignment_id"},
			"drilldown_route":   "translations.assignments.edit",
			"queue_route":       "translations.queue",
			"index_hints":       []string{"translation_assignments_scope_due_date_idx", "translation_assignments_scope_status_due_idx"},
			"resolver_keys":     []string{"admin.translations.assignments.edit", "admin.translations.queue"},
			"supported_filters": []string{"tenant_id", "org_id", "status", "overdue", "assignee_id", "reviewer_id", "translation_group_id"},
			"drilldown_links":   translationDashboardQueryModelLinks(translationDashboardTableTopOverdueAssignments),
		},
		translationDashboardTableBlockedFamilies: map[string]any{
			"id":                translationDashboardTableBlockedFamilies,
			"description":       "Blocked families in the visible scope, ranked by missing required locales and review pressure.",
			"scope_fields":      []string{"tenant_id", "org_id"},
			"default_limit":     translationDashboardDefaultBlockedLimit,
			"stable_sort_keys":  []string{"missing_required_locale_count", "pending_review_count", "updated_at", "family_id"},
			"drilldown_route":   "translations.families.id",
			"api_route":         "translations.families",
			"index_hints":       []string{"content_families_scope_readiness_idx", "content_families_scope_missing_required_locales_idx"},
			"resolver_keys":     []string{"admin.translations.families.id", "admin.api.translations.families"},
			"supported_filters": []string{"tenant_id", "org_id", "family_id", "readiness_state", "blocker_code", "missing_locale"},
			"drilldown_links":   translationDashboardQueryModelLinks(translationDashboardTableBlockedFamilies),
		},
	}
}

func translationDashboardQueryModelLinks(tableID string) map[string]any {
	switch tableID {
	case translationDashboardTableTopOverdueAssignments:
		return map[string]any{
			"assignment": map[string]any{
				"key":          "assignment",
				"label":        "Open assignment",
				"description":  "Open the assignment editor for the overdue work item.",
				"relation":     "primary",
				"group":        "admin",
				"route":        "translations.assignments.edit",
				"resolver_key": "admin.translations.assignments.edit",
				"entity_type":  "assignment",
			},
			"queue": map[string]any{
				"key":          "queue",
				"label":        "Open queue context",
				"description":  "Open the translation queue filtered to the related family.",
				"relation":     "secondary",
				"group":        "admin",
				"route":        "translations.queue",
				"resolver_key": "admin.translations.queue",
				"entity_type":  "translation_group",
			},
		}
	case translationDashboardTableBlockedFamilies:
		return map[string]any{
			"family": map[string]any{
				"key":          "family",
				"label":        "Open family",
				"description":  "Open the family detail screen for blocker diagnosis.",
				"relation":     "primary",
				"group":        "admin",
				"route":        "translations.families.id",
				"resolver_key": "admin.translations.families.id",
				"entity_type":  "family",
			},
			"api": map[string]any{
				"key":          "api",
				"label":        "Open blocker feed",
				"description":  "Open the blocked family API feed scoped to this family.",
				"relation":     "secondary",
				"group":        "admin.api",
				"route":        "translations.families",
				"resolver_key": "admin.api.translations.families",
				"entity_type":  "family",
			},
		}
	default:
		return map[string]any{}
	}
}

func translationDashboardRunbookCatalog() []map[string]any {
	return []map[string]any{
		{
			"id":           "translations.dashboard.overdue_triage",
			"title":        "Overdue assignment triage",
			"description":  "Review past-due assignments, rebalance ownership, and clear blockers before SLA breach windows compound.",
			"route":        "translations.queue",
			"resolver_key": "admin.translations.queue",
			"query": map[string]any{
				"due_state": "overdue",
				"sort":      "due_date",
				"order":     "asc",
			},
		},
		{
			"id":           "translations.dashboard.review_backlog",
			"title":        "Reviewer backlog triage",
			"description":  "Focus reviewer-owned items waiting in review and escalate anything already overdue.",
			"route":        "translations.queue",
			"resolver_key": "admin.translations.queue",
			"query": map[string]any{
				"status": "review",
				"sort":   "due_date",
				"order":  "asc",
			},
		},
		{
			"id":           "translations.dashboard.publish_blockers",
			"title":        "Publish blocker remediation",
			"description":  "Work family readiness blockers from missing locales through pending review before publish windows open.",
			"group":        "admin.api",
			"route":        "translations.families",
			"resolver_key": "admin.api.translations.families",
			"query": map[string]any{
				"readiness_state": "blocked",
			},
		},
	}
}

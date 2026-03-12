package admin

func TranslationQueueContractPayload() map[string]any {
	return map[string]any{
		"supported_sort_keys":  TranslationQueueSupportedSortKeys(),
		"default_sort":         translationQueueDefaultSortContract(),
		"saved_filter_presets": TranslationQueueSavedFilterPresets(),
	}
}

func TranslationQueueSupportedSortKeys() []string {
	return []string{
		"updated_at",
		"created_at",
		"due_date",
		"due_state",
		"status",
		"locale",
		"priority",
		"assignee_id",
		"reviewer_id",
	}
}

func TranslationQueueSavedFilterPresets() []map[string]any {
	return []map[string]any{
		{
			"id":          "mine",
			"label":       "Mine",
			"description": "Assignments currently assigned to the active actor.",
			"query": map[string]any{
				"assignee_id": "__me__",
				"sort":        "due_date",
				"order":       "asc",
			},
		},
		{
			"id":          "open",
			"label":       "Open",
			"description": "Claimable or active assignments that still need translator work.",
			"query": map[string]any{
				"status": "pending,assigned,in_progress,rejected",
				"sort":   "updated_at",
				"order":  "desc",
			},
		},
		{
			"id":          "needs_review",
			"label":       "Needs Review",
			"description": "Assignments awaiting review for the active actor.",
			"query": map[string]any{
				"status":      "review",
				"reviewer_id": "__me__",
				"sort":        "due_date",
				"order":       "asc",
			},
		},
		{
			"id":          "overdue",
			"label":       "Overdue",
			"description": "Past-due assignments across the visible queue scope.",
			"query": map[string]any{
				"due_state": "overdue",
				"sort":      "due_date",
				"order":     "asc",
			},
		},
		{
			"id":          "high_priority",
			"label":       "High Priority",
			"description": "Assignments marked high or urgent.",
			"query": map[string]any{
				"priority": "high,urgent",
				"sort":     "due_date",
				"order":    "asc",
			},
		},
	}
}

func translationQueueDefaultSortContract() map[string]any {
	return map[string]any{
		"key":   "updated_at",
		"order": "desc",
	}
}

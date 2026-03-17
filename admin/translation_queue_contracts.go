package admin

func TranslationQueueContractPayload() map[string]any {
	return map[string]any{
		"supported_sort_keys":          TranslationQueueSupportedSortKeys(),
		"supported_filter_keys":        TranslationQueueSupportedFilterKeys(),
		"supported_review_states":      TranslationQueueSupportedReviewStates(),
		"default_sort":                 translationQueueDefaultSortContract(),
		"saved_filter_presets":         TranslationQueueSavedFilterPresets(),
		"saved_review_filter_presets":  TranslationQueueSavedReviewFilterPresets(),
		"default_review_filter_preset": "review_inbox",
		"review_aggregate_count_keys":  TranslationQueueReviewAggregateCountKeys(),
	}
}

func TranslationQueueSupportedFilterKeys() []string {
	return []string{
		"status",
		"assignee_id",
		"reviewer_id",
		"due_state",
		"locale",
		"priority",
		"family_id",
		"review_state",
	}
}

func TranslationQueueSupportedReviewStates() []string {
	return []string{
		"qa_blocked",
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
				"status": "open,assigned,in_progress,changes_requested",
				"sort":   "updated_at",
				"order":  "desc",
			},
		},
		{
			"id":          "needs_review",
			"label":       "Needs Review",
			"description": "Assignments awaiting review for the active actor.",
			"query": map[string]any{
				"status":      "in_review",
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

func TranslationQueueSavedReviewFilterPresets() []map[string]any {
	return []map[string]any{
		{
			"id":          "review_inbox",
			"label":       "Review Inbox",
			"description": "Assignments currently waiting on the active reviewer.",
			"query": map[string]any{
				"status":      "in_review",
				"reviewer_id": "__me__",
				"sort":        "due_date",
				"order":       "asc",
			},
		},
		{
			"id":          "review_overdue",
			"label":       "Review Overdue",
			"description": "Reviewer-owned assignments that are already overdue.",
			"query": map[string]any{
				"status":      "in_review",
				"reviewer_id": "__me__",
				"due_state":   "overdue",
				"sort":        "due_date",
				"order":       "asc",
			},
		},
		{
			"id":           "review_blocked",
			"label":        "QA Blocked",
			"description":  "Reviewer inbox items with blocking QA findings.",
			"review_state": "qa_blocked",
			"query": map[string]any{
				"status":      "in_review",
				"reviewer_id": "__me__",
				"sort":        "due_date",
				"order":       "asc",
			},
		},
		{
			"id":          "review_changes_requested",
			"label":       "Changes Requested",
			"description": "Assignments the active reviewer already sent back for fixes.",
			"query": map[string]any{
				"status":      "changes_requested",
				"reviewer_id": "__me__",
				"sort":        "updated_at",
				"order":       "desc",
			},
		},
	}
}

func TranslationQueueReviewAggregateCountKeys() []string {
	return []string{
		"review_inbox",
		"review_overdue",
		"review_blocked",
		"review_changes_requested",
	}
}

func translationQueueDefaultSortContract() map[string]any {
	return map[string]any{
		"key":   "updated_at",
		"order": "desc",
	}
}

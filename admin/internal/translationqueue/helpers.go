package translationqueue

import (
	"fmt"
	"sort"
	"strings"

	translationcontracts "github.com/goliatone/go-admin/admin/internal/translationcontracts"
	"github.com/goliatone/go-admin/internal/primitives"
)

const MissingActorFilterToken = "__missing_actor__"
const ReviewStateQABlocked = "qa_blocked"

type AssignmentListFilter struct {
	Status      string `json:"status"`
	AssigneeID  string `json:"assignee_id"`
	ReviewerID  string `json:"reviewer_id"`
	DueState    string `json:"due_state"`
	Locale      string `json:"locale"`
	Priority    string `json:"priority"`
	ReviewState string `json:"review_state"`
	FamilyID    string `json:"family_id"`
	SortBy      string `json:"sort_by"`
	SortDesc    bool   `json:"sort_desc"`
	TenantID    string `json:"tenant_id"`
	OrgID       string `json:"org_id"`
}

func ContractPayload() map[string]any {
	return map[string]any{
		"supported_sort_keys":          SupportedSortKeys(),
		"supported_filter_keys":        SupportedFilterKeys(),
		"supported_review_states":      SupportedReviewStates(),
		"default_sort":                 DefaultSortContract(),
		"saved_filter_presets":         SavedFilterPresets(),
		"saved_review_filter_presets":  SavedReviewFilterPresets(),
		"default_review_filter_preset": "review_inbox",
		"review_aggregate_count_keys":  ReviewAggregateCountKeys(),
	}
}

func SupportedFilterKeys() []string {
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

func SupportedReviewStates() []string {
	return []string{ReviewStateQABlocked}
}

func SupportedSortKeys() []string {
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

func SavedFilterPresets() []map[string]any {
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

func SavedReviewFilterPresets() []map[string]any {
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
			"review_state": ReviewStateQABlocked,
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

func ReviewAggregateCountKeys() []string {
	return []string{
		"review_inbox",
		"review_overdue",
		"review_blocked",
		"review_changes_requested",
	}
}

func DefaultSortContract() map[string]any {
	return map[string]any{
		"key":   "updated_at",
		"order": "desc",
	}
}

func AssignmentFilterFromQuery(query func(string) string, actorID, tenantID, orgID string) AssignmentListFilter {
	get := func(key string) string {
		if query == nil {
			return ""
		}
		return query(key)
	}
	filter := AssignmentListFilter{
		Status:      strings.TrimSpace(strings.ToLower(get("status"))),
		AssigneeID:  ResolveActorFilter(get("assignee_id"), actorID),
		ReviewerID:  ResolveActorFilter(get("reviewer_id"), actorID),
		DueState:    strings.TrimSpace(strings.ToLower(get("due_state"))),
		Locale:      strings.TrimSpace(strings.ToLower(primitives.FirstNonEmptyRaw(get("locale"), get("target_locale")))),
		Priority:    strings.TrimSpace(strings.ToLower(get("priority"))),
		ReviewState: NormalizeReviewState(get("review_state")),
		FamilyID:    strings.TrimSpace(get("family_id")),
		SortBy:      strings.TrimSpace(strings.ToLower(get("sort"))),
		SortDesc:    strings.EqualFold(strings.TrimSpace(get("order")), "desc"),
		TenantID:    strings.TrimSpace(tenantID),
		OrgID:       strings.TrimSpace(orgID),
	}
	if !filter.SortDesc && strings.EqualFold(strings.TrimSpace(get("direction")), "desc") {
		filter.SortDesc = true
	}
	if filter.DueState != "" {
		filter.DueState = translationcontracts.NormalizeQueueDueState(filter.DueState)
	}
	if filter.SortBy == "" {
		filter.SortBy = strings.TrimSpace(strings.ToLower(get("sort_by")))
	}
	if filter.SortBy == "" {
		filter.SortBy = "updated_at"
		filter.SortDesc = true
	}
	if reviewOnly := strings.TrimSpace(strings.ToLower(get("review"))); reviewOnly == "1" || reviewOnly == "true" {
		filter.Status = "in_review"
	}
	return filter
}

func ResolveActorFilter(value, actorID string) string {
	value = strings.TrimSpace(value)
	if strings.EqualFold(value, "__me__") {
		if actorID = strings.TrimSpace(actorID); actorID != "" {
			return actorID
		}
		return MissingActorFilterToken
	}
	return value
}

func ListFilterMatches(filterValue, candidate string, normalize func(string) string) bool {
	filterValue = strings.TrimSpace(filterValue)
	if filterValue == "" {
		return true
	}
	if normalize == nil {
		normalize = func(value string) string { return strings.TrimSpace(value) }
	}
	candidate = normalize(candidate)
	if candidate == "" {
		return false
	}
	for item := range strings.SplitSeq(filterValue, ",") {
		if normalize(item) == candidate {
			return true
		}
	}
	return false
}

func NormalizePriorityFilterValue(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizeLocaleFilterValue(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizeReviewState(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case ReviewStateQABlocked:
		return ReviewStateQABlocked
	default:
		return ""
	}
}

func SourceRecordOption(record map[string]any, panelName string) map[string]any {
	id := strings.TrimSpace(stringFromAny(record["id"]))
	if id == "" {
		return nil
	}
	label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringFromAny(record["source_title"]),
		stringFromAny(record["title"]),
		stringFromAny(record["name"]),
		stringFromAny(record["slug"]),
		id,
	))
	previewParts := []string{}
	if path := strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(record["source_path"]), stringFromAny(record["path"]), stringFromAny(record["slug"]))); path != "" {
		previewParts = append(previewParts, path)
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(record["locale"]), stringFromAny(record["resolved_locale"]), stringFromAny(record["source_locale"]))); locale != "" {
		previewParts = append(previewParts, strings.ToUpper(locale))
	}
	if len(previewParts) > 0 {
		label = label + " • " + strings.Join(previewParts, " • ")
	}
	descriptionParts := []string{}
	if path := strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(record["source_path"]), stringFromAny(record["path"]), stringFromAny(record["slug"]))); path != "" {
		descriptionParts = append(descriptionParts, path)
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(record["locale"]), stringFromAny(record["resolved_locale"]), stringFromAny(record["source_locale"]))); locale != "" {
		descriptionParts = append(descriptionParts, strings.ToUpper(locale))
	}
	if status := strings.TrimSpace(stringFromAny(record["status"])); status != "" {
		descriptionParts = append(descriptionParts, status)
	}
	option := map[string]any{
		"value": id,
		"label": label,
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(record["source_locale"]), stringFromAny(record["locale"]), stringFromAny(record["resolved_locale"]))); locale != "" {
		option["source_locale"] = strings.ToLower(locale)
	}
	if description := strings.Join(descriptionParts, " • "); description != "" {
		option["description"] = description
	}
	if familyID := strings.TrimSpace(stringFromAny(record["family_id"])); familyID != "" {
		option["family_id"] = familyID
	}
	if panelName != "" {
		option["entity_type"] = NormalizeEntityType(panelName)
	}
	return option
}

func AssigneeOption(record map[string]any) map[string]any {
	id := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringFromAny(record["id"]),
		stringFromAny(record["user_id"]),
		stringFromAny(record["assignee_id"]),
	))
	if id == "" {
		return nil
	}
	displayName := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringFromAny(record["display_name"]),
		stringFromAny(record["full_name"]),
		stringFromAny(record["name"]),
		stringFromAny(record["username"]),
		stringFromAny(record["email"]),
		id,
	))
	descriptionParts := []string{}
	if email := strings.TrimSpace(stringFromAny(record["email"])); email != "" && !strings.EqualFold(email, displayName) {
		descriptionParts = append(descriptionParts, email)
	}
	if role := strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(record["role"]), stringFromAny(record["role_key"]))); role != "" {
		descriptionParts = append(descriptionParts, role)
	}
	if status := strings.TrimSpace(stringFromAny(record["status"])); status != "" {
		descriptionParts = append(descriptionParts, status)
	}
	option := map[string]any{
		"value":        id,
		"label":        displayName,
		"display_name": displayName,
	}
	if avatarURL := AssigneeAvatarURL(record); avatarURL != "" {
		option["avatar_url"] = avatarURL
	}
	if len(descriptionParts) > 0 {
		option["description"] = strings.Join(descriptionParts, " • ")
	}
	return option
}

func AssigneeAvatarURL(record map[string]any) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringFromAny(record["avatar_url"]),
		stringFromAny(record["avatar"]),
		stringFromAny(record["profile_avatar_url"]),
		stringFromAny(record["profile_picture"]),
		stringFromAny(record["picture"]),
		stringFromAny(record["image_url"]),
		stringFromAny(record["photo_url"]),
	))
}

func OptionsSearch(query func(string) string) string {
	if query == nil {
		return ""
	}
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(query("search"), query("q")))
}

func FilterOptionsBySearch(options []map[string]any, search string) []map[string]any {
	search = strings.ToLower(strings.TrimSpace(search))
	if search == "" || len(options) == 0 {
		return options
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		if OptionMatchesSearch(option, search) {
			out = append(out, option)
		}
	}
	return out
}

func OptionMatchesSearch(option map[string]any, search string) bool {
	search = strings.ToLower(strings.TrimSpace(search))
	if search == "" {
		return true
	}
	for _, key := range []string{"label", "value", "description"} {
		if strings.Contains(strings.ToLower(strings.TrimSpace(stringFromAny(option[key]))), search) {
			return true
		}
	}
	return false
}

func SortOptions(options []map[string]any) {
	if len(options) == 0 {
		return
	}
	sort.SliceStable(options, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(options[i]["label"]), stringFromAny(options[i]["value"]))))
		right := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(stringFromAny(options[j]["label"]), stringFromAny(options[j]["value"]))))
		if left == right {
			return strings.ToLower(strings.TrimSpace(stringFromAny(options[i]["value"]))) < strings.ToLower(strings.TrimSpace(stringFromAny(options[j]["value"])))
		}
		return left < right
	})
}

func NormalizeEntityType(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if idx := strings.Index(value, "@"); idx > 0 {
		value = strings.TrimSpace(value[:idx])
	}
	return strings.ToLower(value)
}

func EntityTypeLabel(entityType string) string {
	entityType = NormalizeEntityType(entityType)
	if entityType == "" {
		return ""
	}
	entityType = strings.ReplaceAll(entityType, "-", " ")
	entityType = strings.ReplaceAll(entityType, "_", " ")
	parts := strings.Fields(entityType)
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func stringFromAny(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case []byte:
		return string(v)
	case nil:
		return ""
	default:
		return strings.TrimSpace(fmt.Sprint(v))
	}
}

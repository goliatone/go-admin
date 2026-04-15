package admin

import (
	"maps"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	translationservices "github.com/goliatone/go-admin/translations/services"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const (
	translationDashboardDefaultOverdueLimit = 5
	translationDashboardDefaultBlockedLimit = 5
	translationDashboardRefreshIntervalMS   = 30_000
	translationDashboardLatencyTargetMS     = 300
)

func (b *translationQueueBinding) Dashboard(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.dashboard.summary",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation dashboard binding", map[string]any{"component": "translation_dashboard_binding"})
	}

	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	now := b.translationDashboardNow()
	channel := translationChannelFromRequest(c, adminCtx, nil)
	overdueLimit := clampInt(atoiDefault(c.Query("overdue_limit"), translationDashboardDefaultOverdueLimit), 1, 25)
	blockedLimit := clampInt(atoiDefault(c.Query("blocked_limit"), translationDashboardDefaultBlockedLimit), 1, 25)
	identity := translationIdentityFromAdminContext(adminCtx)
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	return b.translationDashboardPayload(adminCtx, identity, actorID, channel, now, overdueLimit, blockedLimit)
}

func (b *translationQueueBinding) translationDashboardNow() time.Time {
	now := time.Now().UTC()
	if b.now != nil {
		now = b.now().UTC()
	}
	return now
}

func (b *translationQueueBinding) translationDashboardPayload(adminCtx AdminContext, identity translationTransportIdentity, actorID, channel string, now time.Time, overdueLimit, blockedLimit int) (map[string]any, error) {
	assignments, families, runtime, degradedReasons, err := b.translationDashboardDataSources(adminCtx, identity, channel)
	if err != nil {
		return nil, err
	}
	data, meta := b.translationDashboardSections(assignments, families, runtime, degradedReasons, identity, actorID, channel, now, overdueLimit, blockedLimit)
	return map[string]any{"data": data, "meta": meta}, nil
}

func (b *translationQueueBinding) translationDashboardDataSources(adminCtx AdminContext, identity translationTransportIdentity, channel string) ([]TranslationAssignment, []translationservices.FamilyRecord, *translationFamilyRuntime, []map[string]any, error) {
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, nil, nil, nil, err
	}
	assignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, "due_date", map[string]any{
		"tenant_id": identity.TenantID,
		"org_id":    identity.OrgID,
	})
	if err != nil {
		return nil, nil, nil, nil, err
	}
	familyBinding := &translationFamilyBinding{admin: b.admin, loadRuntime: b.dashboardLoadRuntime}
	runtime, degradedReasons := translationDashboardRuntimeSources(adminCtx, familyBinding, channel)
	families, degradedReasons := translationDashboardFamiliesFromRuntime(adminCtx, runtime, degradedReasons)
	return assignments, families, runtime, degradedReasons, nil
}

func translationDashboardRuntimeSources(adminCtx AdminContext, familyBinding *translationFamilyBinding, channel string) (*translationFamilyRuntime, []map[string]any) {
	runtime, err := familyBinding.runtime(adminCtx.Context, channel)
	if err == nil {
		return runtime, nil
	}
	return nil, []map[string]any{{"component": "family_runtime", "message": err.Error()}}
}

func translationDashboardFamiliesFromRuntime(adminCtx AdminContext, runtime *translationFamilyRuntime, degradedReasons []map[string]any) ([]translationservices.FamilyRecord, []map[string]any) {
	if runtime == nil || runtime.service == nil || runtime.service.Store == nil {
		return nil, degradedReasons
	}
	families, err := runtime.service.Store.Families(adminCtx.Context)
	if err == nil {
		return families, degradedReasons
	}
	degradedReasons = append(degradedReasons, map[string]any{"component": "family_store", "message": err.Error()})
	return nil, degradedReasons
}

func (b *translationQueueBinding) translationDashboardSections(assignments []TranslationAssignment, families []translationservices.FamilyRecord, runtime *translationFamilyRuntime, degradedReasons []map[string]any, identity translationTransportIdentity, actorID, channel string, now time.Time, overdueLimit, blockedLimit int) (map[string]any, map[string]any) {
	myTasks := translationDashboardMyTasks(assignments, actorID, now)
	needsReview := translationDashboardNeedsReview(assignments, actorID)
	overdueAssignments := translationDashboardOverdueAssignments(assignments, now)
	scopedFamilies := translationDashboardScopedFamilies(families, identity.TenantID, identity.OrgID)
	blockedFamilies := translationDashboardBlockedFamilies(scopedFamilies)
	missingRequiredFamilies := translationDashboardMissingRequiredFamilies(scopedFamilies)
	cards := b.translationDashboardCards(channel, now, myTasks, needsReview, overdueAssignments, blockedFamilies, missingRequiredFamilies)
	return map[string]any{
			"cards":     cards,
			"tables":    translationDashboardTables(b.admin.URLs(), overdueAssignments, blockedFamilies, overdueLimit, blockedLimit, now, channel),
			"alerts":    translationDashboardAlerts(cards, len(degradedReasons) > 0),
			"runbooks":  translationDashboardRunbooks(b.admin.URLs()),
			"generated": now,
			"summary": map[string]any{
				"my_tasks":                 len(myTasks),
				"needs_review":             len(needsReview),
				"overdue_tasks":            len(overdueAssignments),
				"blocked_families":         len(blockedFamilies),
				"missing_required_locales": len(missingRequiredFamilies),
			},
		}, mergeTranslationChannelContract(map[string]any{
			"generated_at":        now,
			"refresh_interval_ms": translationDashboardRefreshIntervalMS,
			"latency_target_ms":   translationDashboardLatencyTargetMS,
			"query_models":        TranslationDashboardQueryModels(),
			"contracts":           TranslationDashboardContractPayload(),
			"degraded":            len(degradedReasons) > 0,
			"degraded_reasons":    degradedReasons,
			"family_report":       translationDashboardFamilyReport(runtime),
			"scope":               map[string]any{"tenant_id": identity.TenantID, "org_id": identity.OrgID, "actor_id": actorID},
			"metrics":             translationDashboardMetricCatalog(),
		}, channel)
}

func (b *translationQueueBinding) translationDashboardCards(channel string, now time.Time, myTasks, needsReview, overdueAssignments []TranslationAssignment, blockedFamilies, missingRequiredFamilies []translationservices.FamilyRecord) []map[string]any {
	return []map[string]any{
		translationDashboardMyTasksCard(b.admin.URLs(), channel, myTasks, now),
		translationDashboardNeedsReviewCard(b.admin.URLs(), channel, needsReview, now),
		translationDashboardOverdueTasksCard(b.admin.URLs(), channel, overdueAssignments, now),
		translationDashboardBlockedFamiliesCard(b.admin.URLs(), b.admin.AdminAPIGroup(), channel, blockedFamilies, missingRequiredFamilies),
		translationDashboardMissingLocalesCard(b.admin.URLs(), b.admin.AdminAPIGroup(), channel, blockedFamilies, missingRequiredFamilies),
	}
}

func translationDashboardTables(urls urlkit.Resolver, overdueAssignments []TranslationAssignment, blockedFamilies []translationservices.FamilyRecord, overdueLimit, blockedLimit int, now time.Time, channel string) map[string]any {
	return map[string]any{
		translationDashboardTableTopOverdueAssignments: map[string]any{
			"id":    translationDashboardTableTopOverdueAssignments,
			"label": "Top Overdue Assignments",
			"total": len(overdueAssignments),
			"limit": overdueLimit,
			"rows":  translationDashboardTopOverdueRows(urls, overdueAssignments, overdueLimit, now, channel),
		},
		translationDashboardTableBlockedFamilies: map[string]any{
			"id":    translationDashboardTableBlockedFamilies,
			"label": "Blocked Families",
			"total": len(blockedFamilies),
			"limit": blockedLimit,
			"rows":  translationDashboardTopBlockedRows(urls, blockedFamilies, blockedLimit, channel),
		},
	}
}

func translationDashboardMyTasksCard(urls urlkit.Resolver, channel string, myTasks []TranslationAssignment, now time.Time) map[string]any {
	return translationDashboardCard(
		translationDashboardCardMyTasks,
		"My Tasks",
		"Assignments currently owned by the active actor.",
		len(myTasks),
		map[string]any{
			"in_progress": translationDashboardCountByStatus(myTasks, AssignmentStatusInProgress),
			"due_soon":    translationDashboardCountByDueState(myTasks, translationQueueDueStateSoon, now),
			"overdue":     translationDashboardCountByDueState(myTasks, translationQueueDueStateOverdue, now),
		},
		translationDashboardCardAlert(len(myTasks), translationDashboardCountByDueState(myTasks, translationQueueDueStateOverdue, now) > 0, translationDashboardCountByDueState(myTasks, translationQueueDueStateSoon, now) > 0),
		translationDashboardLink(urls, "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{
			"assignee_id": "__me__",
			"sort":        "due_date",
			"order":       "asc",
		}), map[string]any{
			"label":       "Open my tasks",
			"description": "Open the queue filtered to assignments owned by the active actor.",
			"relation":    "primary",
		}),
		"translations.dashboard.my_tasks",
		"translations.dashboard.overdue_triage",
	)
}

func translationDashboardNeedsReviewCard(urls urlkit.Resolver, channel string, needsReview []TranslationAssignment, now time.Time) map[string]any {
	return translationDashboardCard(
		translationDashboardCardNeedsReview,
		"Needs Review",
		"Assignments waiting on the active reviewer.",
		len(needsReview),
		map[string]any{
			"overdue": translationDashboardCountByDueState(needsReview, translationQueueDueStateOverdue, now),
		},
		translationDashboardCardAlert(len(needsReview), translationDashboardCountByDueState(needsReview, translationQueueDueStateOverdue, now) > 0, len(needsReview) > 0),
		translationDashboardLink(urls, "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{
			"status":      string(AssignmentStatusInReview),
			"reviewer_id": "__me__",
			"sort":        "due_date",
			"order":       "asc",
		}), map[string]any{
			"label":       "Open reviewer backlog",
			"description": "Open the queue filtered to review work owned by the active reviewer.",
			"relation":    "primary",
		}),
		"translations.dashboard.needs_review",
		"translations.dashboard.review_backlog",
	)
}

func translationDashboardOverdueTasksCard(urls urlkit.Resolver, channel string, overdueAssignments []TranslationAssignment, now time.Time) map[string]any {
	return translationDashboardCard(
		translationDashboardCardOverdueTasks,
		"Overdue Tasks",
		"Past-due assignments across the visible queue scope.",
		len(overdueAssignments),
		map[string]any{
			"high_priority": translationDashboardCountByPriorities(overdueAssignments, PriorityHigh, PriorityUrgent),
		},
		translationDashboardCardAlert(len(overdueAssignments), len(overdueAssignments) > 0, false),
		translationDashboardLink(urls, "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{
			"due_state": "overdue",
			"sort":      "due_date",
			"order":     "asc",
		}), map[string]any{
			"label":       "Open overdue queue",
			"description": "Open the queue filtered to overdue assignments.",
			"relation":    "primary",
		}),
		"translations.dashboard.overdue_tasks",
		"translations.dashboard.overdue_triage",
	)
}

func translationDashboardBlockedFamiliesCard(urls urlkit.Resolver, adminAPIGroup, channel string, blockedFamilies, missingRequiredFamilies []translationservices.FamilyRecord) map[string]any {
	return translationDashboardCard(
		translationDashboardCardBlockedFamilies,
		"Blocked Families",
		"Families currently blocked from publish readiness.",
		len(blockedFamilies),
		map[string]any{"missing_required_locales": len(missingRequiredFamilies)},
		translationDashboardCardAlert(len(blockedFamilies), len(blockedFamilies) > 0, false),
		translationDashboardLink(urls, adminAPIGroup, "translations.families", adminAPIGroup+".translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{
			"readiness_state": "blocked",
		}), map[string]any{
			"label":       "Open blocked families",
			"description": "Open the blocked family feed for the current scope.",
			"relation":    "primary",
		}),
		"translations.dashboard.blocked_families",
		"translations.dashboard.publish_blockers",
	)
}

func translationDashboardMissingLocalesCard(urls urlkit.Resolver, adminAPIGroup, channel string, blockedFamilies, missingRequiredFamilies []translationservices.FamilyRecord) map[string]any {
	return translationDashboardCard(
		translationDashboardCardMissingRequiredLocale,
		"Missing Required Locales",
		"Families still missing policy-required locale variants.",
		len(missingRequiredFamilies),
		map[string]any{"families_blocked": len(blockedFamilies)},
		translationDashboardCardAlert(len(missingRequiredFamilies), len(missingRequiredFamilies) > 0, false),
		translationDashboardLink(urls, adminAPIGroup, "translations.families", adminAPIGroup+".translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{
			"readiness_state": "blocked",
			"blocker_code":    "missing_locale",
		}), map[string]any{
			"label":       "Open missing locale blockers",
			"description": "Open the blocked family feed filtered to missing locale blockers.",
			"relation":    "primary",
		}),
		"translations.dashboard.missing_required_locales",
		"translations.dashboard.publish_blockers",
	)
}

func translationDashboardScopedFamilies(families []translationservices.FamilyRecord, tenantID, orgID string) []translationservices.FamilyRecord {
	out := make([]translationservices.FamilyRecord, 0, len(families))
	tenantID = strings.TrimSpace(strings.ToLower(tenantID))
	orgID = strings.TrimSpace(strings.ToLower(orgID))
	for _, family := range families {
		if tenantID != "" && !strings.EqualFold(strings.TrimSpace(family.TenantID), tenantID) {
			continue
		}
		if orgID != "" && !strings.EqualFold(strings.TrimSpace(family.OrgID), orgID) {
			continue
		}
		out = append(out, family)
	}
	return out
}

func translationDashboardBlockedFamilies(families []translationservices.FamilyRecord) []translationservices.FamilyRecord {
	out := make([]translationservices.FamilyRecord, 0, len(families))
	for _, family := range families {
		if strings.EqualFold(strings.TrimSpace(family.ReadinessState), "blocked") {
			out = append(out, family)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		if left.MissingRequiredLocaleCount != right.MissingRequiredLocaleCount {
			return left.MissingRequiredLocaleCount > right.MissingRequiredLocaleCount
		}
		if left.PendingReviewCount != right.PendingReviewCount {
			return left.PendingReviewCount > right.PendingReviewCount
		}
		if left.UpdatedAt.Equal(right.UpdatedAt) {
			return strings.TrimSpace(left.ID) < strings.TrimSpace(right.ID)
		}
		return left.UpdatedAt.After(right.UpdatedAt)
	})
	return out
}

func translationDashboardMissingRequiredFamilies(families []translationservices.FamilyRecord) []translationservices.FamilyRecord {
	out := make([]translationservices.FamilyRecord, 0, len(families))
	for _, family := range families {
		if family.MissingRequiredLocaleCount > 0 {
			out = append(out, family)
		}
	}
	return out
}

func translationDashboardMyTasks(assignments []TranslationAssignment, actorID string, now time.Time) []TranslationAssignment {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil
	}
	out := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if !assignment.Status.IsActive() {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
			continue
		}
		out = append(out, assignment)
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		leftDue := translationQueueDueState(left.DueDate, now)
		rightDue := translationQueueDueState(right.DueDate, now)
		if translationQueueDueStateSortRank[leftDue] != translationQueueDueStateSortRank[rightDue] {
			return translationQueueDueStateSortRank[leftDue] > translationQueueDueStateSortRank[rightDue]
		}
		if left.DueDate != nil && right.DueDate != nil && !left.DueDate.Equal(*right.DueDate) {
			return left.DueDate.Before(*right.DueDate)
		}
		return strings.TrimSpace(left.ID) < strings.TrimSpace(right.ID)
	})
	return out
}

func translationDashboardNeedsReview(assignments []TranslationAssignment, actorID string) []TranslationAssignment {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil
	}
	out := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		reviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
		if !strings.EqualFold(reviewerID, actorID) || assignment.Status != AssignmentStatusInReview {
			continue
		}
		out = append(out, assignment)
	}
	return out
}

func translationDashboardOverdueAssignments(assignments []TranslationAssignment, now time.Time) []TranslationAssignment {
	out := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if assignment.Status.IsTerminal() {
			continue
		}
		if translationQueueDueState(assignment.DueDate, now) != translationQueueDueStateOverdue {
			continue
		}
		out = append(out, assignment)
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		if left.DueDate != nil && right.DueDate != nil && !left.DueDate.Equal(*right.DueDate) {
			return left.DueDate.Before(*right.DueDate)
		}
		if translationQueuePrioritySortRank[string(left.Priority)] != translationQueuePrioritySortRank[string(right.Priority)] {
			return translationQueuePrioritySortRank[string(left.Priority)] > translationQueuePrioritySortRank[string(right.Priority)]
		}
		return strings.TrimSpace(left.ID) < strings.TrimSpace(right.ID)
	})
	return out
}

func translationDashboardCard(id, label, description string, count int, breakdown map[string]any, alert, drilldown map[string]any, metricKey, runbookID string) map[string]any {
	return map[string]any{
		"id":          id,
		"label":       label,
		"description": description,
		"count":       count,
		"breakdown":   breakdown,
		"alert":       alert,
		"drilldown":   drilldown,
		"metric_key":  metricKey,
		"runbook_id":  runbookID,
	}
}

func translationDashboardCardAlert(count int, critical, warning bool) map[string]any {
	state := translationDashboardAlertStateOK
	message := "Healthy"
	if count == 0 {
		return map[string]any{
			"state":   state,
			"message": message,
		}
	}
	if critical {
		state = translationDashboardAlertStateCritical
		message = "Action required"
	} else if warning {
		state = translationDashboardAlertStateWarning
		message = "Needs attention"
	}
	return map[string]any{
		"state":   state,
		"message": message,
	}
}

func translationDashboardAlerts(cards []map[string]any, degraded bool) []map[string]any {
	alerts := make([]map[string]any, 0, len(cards)+1)
	if degraded {
		alerts = append(alerts, map[string]any{
			"state":   translationDashboardAlertStateDegraded,
			"code":    "DEGRADED_DATA",
			"message": "Dashboard data is partially degraded; some family aggregates could not be refreshed.",
		})
	}
	for _, card := range cards {
		alert, _ := card["alert"].(map[string]any)
		state := strings.TrimSpace(toString(alert["state"]))
		if state == "" || state == translationDashboardAlertStateOK {
			continue
		}
		alerts = append(alerts, map[string]any{
			"state":      state,
			"code":       strings.ToUpper(strings.TrimSpace(toString(card["id"]))),
			"message":    strings.TrimSpace(toString(alert["message"])),
			"card_id":    strings.TrimSpace(toString(card["id"])),
			"runbook_id": strings.TrimSpace(toString(card["runbook_id"])),
		})
	}
	return alerts
}

func translationDashboardLink(urls urlkit.Resolver, group, route, resolverKey string, params, query map[string]string, metadata map[string]any) map[string]any {
	link := map[string]any{
		"group":        strings.TrimSpace(group),
		"route":        strings.TrimSpace(route),
		"resolver_key": strings.TrimSpace(resolverKey),
	}
	if len(params) > 0 {
		link["params"] = params
	}
	if len(query) > 0 {
		link["query"] = query
	}
	if url := resolveURLWith(urls, strings.TrimSpace(group), strings.TrimSpace(route), params, query); url != "" {
		link["href"] = url
	}
	for key, value := range metadata {
		if value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			if strings.TrimSpace(typed) == "" {
				continue
			}
		}
		link[key] = value
	}
	return link
}

func translationDashboardQuery(base map[string]string, channel string, extra map[string]string) map[string]string {
	out := map[string]string{}
	maps.Copy(out, base)
	maps.Copy(out, extra)
	if strings.TrimSpace(channel) != "" {
		out["channel"] = strings.TrimSpace(channel)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationDashboardTopOverdueRows(urls urlkit.Resolver, assignments []TranslationAssignment, limit int, now time.Time, channel string) []map[string]any {
	if limit > len(assignments) {
		limit = len(assignments)
	}
	rows := make([]map[string]any, 0, limit)
	for _, assignment := range assignments[:limit] {
		overdueBy := 0
		if assignment.DueDate != nil {
			overdueBy = int(now.Sub(*assignment.DueDate).Round(time.Minute).Minutes())
		}
		rows = append(rows, map[string]any{
			"assignment_id":    assignment.ID,
			"family_id":        assignment.FamilyID,
			"entity_type":      assignment.EntityType,
			"source_record_id": assignment.SourceRecordID,
			"source_title":     assignment.SourceTitle,
			"source_locale":    assignment.SourceLocale,
			"target_locale":    assignment.TargetLocale,
			"assignee_id":      assignment.AssigneeID,
			"reviewer_id":      assignment.ReviewerID,
			"priority":         string(assignment.Priority),
			"status":           string(assignment.Status),
			"due_date":         assignment.DueDate,
			"due_state":        translationQueueDueState(assignment.DueDate, now),
			"overdue_minutes":  overdueBy,
			"links": map[string]any{
				"assignment": translationDashboardLink(urls, "admin", "translations.assignments.edit", "admin.translations.assignments.edit", map[string]string{
					"assignment_id": assignment.ID,
				}, translationDashboardQuery(nil, channel, nil), map[string]any{
					"key":         "assignment",
					"label":       "Open assignment",
					"description": "Open the assignment editor for this overdue item.",
					"relation":    "primary",
					"table_id":    translationDashboardTableTopOverdueAssignments,
					"entity_type": "assignment",
					"entity_id":   assignment.ID,
				}),
				"queue": translationDashboardLink(urls, "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{
					"family_id": assignment.FamilyID,
				}), map[string]any{
					"key":         "queue",
					"label":       "Open queue context",
					"description": "Open the queue filtered to the related family.",
					"relation":    "secondary",
					"table_id":    translationDashboardTableTopOverdueAssignments,
					"entity_type": "family",
					"entity_id":   assignment.FamilyID,
				}),
			},
		})
	}
	return rows
}

func translationDashboardTopBlockedRows(urls urlkit.Resolver, families []translationservices.FamilyRecord, limit int, channel string) []map[string]any {
	if limit > len(families) {
		limit = len(families)
	}
	rows := make([]map[string]any, 0, limit)
	for _, family := range families[:limit] {
		rows = append(rows, map[string]any{
			"family_id":                     family.ID,
			"content_type":                  family.ContentType,
			"source_locale":                 family.SourceLocale,
			"readiness_state":               family.ReadinessState,
			"missing_required_locale_count": family.MissingRequiredLocaleCount,
			"pending_review_count":          family.PendingReviewCount,
			"outdated_locale_count":         family.OutdatedLocaleCount,
			"blocker_codes":                 append([]string{}, family.BlockerCodes...),
			"updated_at":                    family.UpdatedAt,
			"links": map[string]any{
				"family": translationDashboardLink(urls, "admin", "translations.families.id", "admin.translations.families.id", map[string]string{
					"family_id": family.ID,
				}, translationDashboardQuery(nil, channel, nil), map[string]any{
					"key":         "family",
					"label":       "Open family",
					"description": "Open the family detail screen for blocker diagnosis.",
					"relation":    "primary",
					"table_id":    translationDashboardTableBlockedFamilies,
					"entity_type": "family",
					"entity_id":   family.ID,
				}),
				"api": translationDashboardLink(urls, "admin.api", "translations.families", "admin.api.translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{
					"family_id":       family.ID,
					"readiness_state": "blocked",
				}), map[string]any{
					"key":         "api",
					"label":       "Open blocker feed",
					"description": "Open the blocked family API feed scoped to this family.",
					"relation":    "secondary",
					"table_id":    translationDashboardTableBlockedFamilies,
					"entity_type": "family",
					"entity_id":   family.ID,
				}),
			},
		})
	}
	return rows
}

func translationDashboardRunbooks(urls urlkit.Resolver) []map[string]any {
	catalog := translationDashboardRunbookCatalog()
	out := make([]map[string]any, 0, len(catalog))
	for _, item := range catalog {
		record := cloneAnyMap(item)
		group := strings.TrimSpace(toString(record["group"]))
		if group == "" {
			group = "admin"
		}
		route := strings.TrimSpace(toString(record["route"]))
		query := map[string]string{}
		switch raw := record["query"].(type) {
		case map[string]string:
			query = raw
		case map[string]any:
			for key, value := range raw {
				query[key] = toString(value)
			}
		}
		if route != "" {
			if href := resolveURLWith(urls, group, route, nil, query); href != "" {
				record["href"] = href
			}
		}
		out = append(out, record)
	}
	return out
}

func translationDashboardMetricCatalog() []map[string]any {
	return []map[string]any{
		{
			"key":        "translations.dashboard.refresh_latency_ms",
			"unit":       "ms",
			"slo_p95_ms": translationDashboardLatencyTargetMS,
		},
		{
			"key":  "translations.dashboard.overdue_tasks",
			"unit": "count",
		},
		{
			"key":  "translations.dashboard.blocked_families",
			"unit": "count",
		},
	}
}

func translationDashboardFamilyReport(runtime *translationFamilyRuntime) map[string]any {
	if runtime == nil {
		return map[string]any{}
	}
	return map[string]any{
		"checksum": runtime.report.Checksum,
		"summary": map[string]any{
			"families":    runtime.report.Summary.Families,
			"variants":    runtime.report.Summary.Variants,
			"assignments": runtime.report.Summary.Assignments,
			"blockers":    runtime.report.Summary.Blockers,
			"warnings":    runtime.report.Summary.Warnings,
		},
	}
}

func translationDashboardCountByStatus(assignments []TranslationAssignment, status AssignmentStatus) int {
	count := 0
	for _, assignment := range assignments {
		if assignment.Status == status {
			count++
		}
	}
	return count
}

func translationDashboardCountByDueState(assignments []TranslationAssignment, dueState string, now time.Time) int {
	count := 0
	for _, assignment := range assignments {
		if translationQueueDueState(assignment.DueDate, now) == dueState {
			count++
		}
	}
	return count
}

func translationDashboardCountByPriorities(assignments []TranslationAssignment, priorities ...Priority) int {
	allowed := map[Priority]struct{}{}
	for _, priority := range priorities {
		allowed[priority] = struct{}{}
	}
	count := 0
	for _, assignment := range assignments {
		if _, ok := allowed[assignment.Priority]; ok {
			count++
		}
	}
	return count
}

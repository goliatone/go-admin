package admin

import (
	"maps"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	translationcore "github.com/goliatone/go-admin/translations/core"
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

func translationDashboardActionableStatusFilter() string {
	return strings.Join([]string{
		string(AssignmentStatusOpen),
		string(AssignmentStatusAssigned),
		string(AssignmentStatusInProgress),
		string(AssignmentStatusInReview),
		string(AssignmentStatusChangesRequested),
	}, ",")
}

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
	if payload, ok, err := b.translationDashboardOptimizedPayload(adminCtx, identity, actorID, channel, now, overdueLimit, blockedLimit); ok || err != nil {
		return payload, err
	}
	assignments, families, runtime, degradedReasons, err := b.translationDashboardDataSources(adminCtx, identity, channel)
	if err != nil {
		return nil, err
	}
	data, meta := b.translationDashboardSections(assignments, families, runtime, degradedReasons, identity, actorID, channel, now, overdueLimit, blockedLimit)
	return map[string]any{"data": data, "meta": meta}, nil
}

func (b *translationQueueBinding) translationDashboardOptimizedPayload(adminCtx AdminContext, identity translationTransportIdentity, actorID, channel string, now time.Time, overdueLimit, blockedLimit int) (map[string]any, bool, error) {
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, false, err
	}
	assignmentStore, ok := repo.(TranslationAssignmentSummaryStore)
	if !ok || assignmentStore == nil {
		assignmentStore = nil
	}
	familyBinding := &translationFamilyBinding{admin: b.admin, loadRuntime: b.dashboardLoadRuntime}
	runtime, degradedReasons := translationDashboardRuntimeSources(adminCtx, familyBinding, channel)
	familyStore := translationDashboardOptimizedFamilyStore(runtime)
	if assignmentStore == nil && familyStore == nil {
		return nil, false, nil
	}
	assignments, degradedReasons, err := b.translationDashboardOptimizedAssignmentSummary(adminCtx, repo, assignmentStore, identity, actorID, now, overdueLimit, degradedReasons)
	if err != nil {
		return nil, true, err
	}
	familyMetrics, degradedReasons := translationDashboardOptimizedFamilyMetrics(adminCtx, runtime, familyStore, identity, blockedLimit, degradedReasons)
	data, meta := b.translationDashboardOptimizedSections(assignments, familyMetrics, runtime, degradedReasons, identity, actorID, channel, now, overdueLimit, blockedLimit)
	return map[string]any{"data": data, "meta": meta}, true, nil
}

func translationDashboardOptimizedFamilyStore(runtime *translationFamilyRuntime) TranslationDashboardFamilyMetricsStore {
	if runtime == nil || runtime.service == nil || runtime.service.Store == nil {
		return nil
	}
	optimizedStore, ok := runtime.service.Store.(TranslationDashboardFamilyMetricsStore)
	if !ok {
		return nil
	}
	return optimizedStore
}

func (b *translationQueueBinding) translationDashboardOptimizedAssignmentSummary(adminCtx AdminContext, repo TranslationAssignmentRepository, store TranslationAssignmentSummaryStore, identity translationTransportIdentity, actorID string, now time.Time, overdueLimit int, degradedReasons []map[string]any) (TranslationAssignmentDashboardSummary, []map[string]any, error) {
	if store == nil {
		assignments, err := b.translationDashboardAssignmentFallback(adminCtx, repo, identity)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, degradedReasons, err
		}
		return translationDashboardAssignmentSummaryFromAssignments(assignments, actorID, now, overdueLimit), degradedReasons, nil
	}
	summary, err := store.AssignmentDashboardSummary(adminCtx.Context, TranslationAssignmentDashboardSummaryInput{
		TenantID:     identity.TenantID,
		OrgID:        identity.OrgID,
		ActorID:      actorID,
		Now:          now,
		OverdueLimit: overdueLimit,
	})
	if err == nil {
		return summary, degradedReasons, nil
	}
	degradedReasons = append(degradedReasons, map[string]any{"component": "assignment_metrics_query", "message": err.Error()})
	assignments, fallbackErr := b.translationDashboardAssignmentFallback(adminCtx, repo, identity)
	if fallbackErr != nil {
		return TranslationAssignmentDashboardSummary{}, degradedReasons, fallbackErr
	}
	return translationDashboardAssignmentSummaryFromAssignments(assignments, actorID, now, overdueLimit), degradedReasons, nil
}

func translationDashboardOptimizedFamilyMetrics(adminCtx AdminContext, runtime *translationFamilyRuntime, store TranslationDashboardFamilyMetricsStore, identity translationTransportIdentity, blockedLimit int, degradedReasons []map[string]any) (TranslationDashboardFamilyMetrics, []map[string]any) {
	if store != nil {
		metrics, err := store.TranslationDashboardFamilyMetrics(adminCtx.Context, TranslationDashboardFamilyMetricsInput{
			TenantID:     identity.TenantID,
			OrgID:        identity.OrgID,
			BlockedLimit: blockedLimit,
		})
		if err == nil {
			return metrics, degradedReasons
		}
		degradedReasons = append(degradedReasons, map[string]any{"component": "family_metrics_query", "message": err.Error()})
	}
	return translationDashboardFamilyMetricsFallback(adminCtx, runtime, identity, degradedReasons)
}

func translationDashboardFamilyMetricsFallback(adminCtx AdminContext, runtime *translationFamilyRuntime, identity translationTransportIdentity, degradedReasons []map[string]any) (TranslationDashboardFamilyMetrics, []map[string]any) {
	families, reasons := translationDashboardFamiliesFromRuntime(adminCtx, runtime, degradedReasons)
	scopedFamilies := translationDashboardScopedFamilies(families, identity.TenantID, identity.OrgID)
	blockedFamilies := translationDashboardBlockedFamilies(scopedFamilies)
	missingRequiredFamilies := translationDashboardMissingRequiredFamilies(scopedFamilies)
	return TranslationDashboardFamilyMetrics{
		BlockedFamilies:         len(blockedFamilies),
		MissingRequiredFamilies: len(missingRequiredFamilies),
		TopBlocked:              blockedFamilies,
	}, reasons
}

func (b *translationQueueBinding) translationDashboardAssignmentFallback(adminCtx AdminContext, repo TranslationAssignmentRepository, identity translationTransportIdentity) ([]TranslationAssignment, error) {
	if b == nil || repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	return b.listAssignmentsForSummary(adminCtx.Context, repo, "due_date", map[string]any{
		ScopeTenantIDKey: identity.TenantID,
		ScopeOrgIDKey:    identity.OrgID,
	})
}

func translationDashboardAssignmentSummaryFromAssignments(assignments []TranslationAssignment, actorID string, now time.Time, overdueLimit int) TranslationAssignmentDashboardSummary {
	myTasks := translationDashboardMyTasks(assignments, actorID, now)
	needsReview := translationDashboardNeedsReview(assignments, actorID)
	overdueAssignments := translationDashboardOverdueAssignments(assignments, now)
	topOverdue := overdueAssignments
	if overdueLimit > 0 && overdueLimit < len(topOverdue) {
		topOverdue = topOverdue[:overdueLimit]
	}
	return TranslationAssignmentDashboardSummary{
		MyTasks:             len(myTasks),
		MyInProgress:        translationDashboardCountByStatus(myTasks, AssignmentStatusInProgress),
		MyDueSoon:           translationDashboardCountByDueState(myTasks, translationQueueDueStateSoon, now),
		MyOverdue:           translationDashboardCountByDueState(myTasks, translationQueueDueStateOverdue, now),
		NeedsReview:         len(needsReview),
		NeedsReviewOverdue:  translationDashboardCountByDueState(needsReview, translationQueueDueStateOverdue, now),
		OverdueTasks:        len(overdueAssignments),
		HighPriorityOverdue: translationDashboardCountByPriorities(overdueAssignments, PriorityHigh, PriorityUrgent),
		TopOverdue:          topOverdue,
	}
}

func (b *translationQueueBinding) translationDashboardOptimizedSections(assignments TranslationAssignmentDashboardSummary, families TranslationDashboardFamilyMetrics, runtime *translationFamilyRuntime, degradedReasons []map[string]any, identity translationTransportIdentity, actorID, channel string, now time.Time, overdueLimit, blockedLimit int) (map[string]any, map[string]any) {
	cards := b.translationDashboardOptimizedCards(channel, now, assignments, families)
	return map[string]any{
			"cards": cards,
			"tables": map[string]any{
				translationDashboardTableTopOverdueAssignments: map[string]any{
					"id":    translationDashboardTableTopOverdueAssignments,
					"label": "Top Overdue Assignments",
					"total": assignments.OverdueTasks,
					"limit": overdueLimit,
					"rows":  translationDashboardTopOverdueRows(b.admin.URLs(), assignments.TopOverdue, overdueLimit, now, channel),
				},
				translationDashboardTableBlockedFamilies: map[string]any{
					"id":    translationDashboardTableBlockedFamilies,
					"label": "Blocked Families",
					"total": families.BlockedFamilies,
					"limit": blockedLimit,
					"rows":  translationDashboardTopBlockedRows(b.admin.URLs(), families.TopBlocked, blockedLimit, channel),
				},
			},
			"alerts":    translationDashboardAlerts(cards, len(degradedReasons) > 0),
			"runbooks":  translationDashboardRunbooks(b.admin.URLs()),
			"generated": now,
			"summary": map[string]any{
				"my_tasks":                 assignments.MyTasks,
				"needs_review":             assignments.NeedsReview,
				"overdue_tasks":            assignments.OverdueTasks,
				"blocked_families":         families.BlockedFamilies,
				"missing_required_locales": families.MissingRequiredFamilies,
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
			"scope":               map[string]any{ScopeTenantIDKey: identity.TenantID, ScopeOrgIDKey: identity.OrgID, "actor_id": actorID},
			"metrics":             translationDashboardMetricCatalog(),
		}, channel)
}

func (b *translationQueueBinding) translationDashboardOptimizedCards(channel string, now time.Time, assignments TranslationAssignmentDashboardSummary, families TranslationDashboardFamilyMetrics) []map[string]any {
	return []map[string]any{
		translationDashboardCard(
			translationDashboardCardMyTasks,
			"My Tasks",
			"Assignments currently owned by the active actor.",
			assignments.MyTasks,
			map[string]any{"in_progress": assignments.MyInProgress, "due_soon": assignments.MyDueSoon, "overdue": assignments.MyOverdue},
			translationDashboardCardAlert(assignments.MyTasks, assignments.MyOverdue > 0, assignments.MyDueSoon > 0),
			translationDashboardLink(b.admin.URLs(), "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{"assignee_id": "__me__", "sort": "due_date", "order": "asc"}), map[string]any{"label": "My tasks", "description": "Open the queue filtered to assignments owned by the active actor.", "relation": "primary"}),
			"translations.dashboard.my_tasks",
			"translations.dashboard.overdue_triage",
		),
		translationDashboardCard(
			translationDashboardCardNeedsReview,
			"Needs Review",
			"Assignments waiting on the active reviewer.",
			assignments.NeedsReview,
			map[string]any{"overdue": assignments.NeedsReviewOverdue},
			translationDashboardCardAlert(assignments.NeedsReview, assignments.NeedsReviewOverdue > 0, assignments.NeedsReview > 0),
			translationDashboardLink(b.admin.URLs(), "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{"status": string(AssignmentStatusInReview), "reviewer_id": "__me__", "sort": "due_date", "order": "asc"}), map[string]any{"label": "Reviewer backlog", "description": "Open the queue filtered to review work owned by the active reviewer.", "relation": "primary"}),
			"translations.dashboard.needs_review",
			"translations.dashboard.review_backlog",
		),
		translationDashboardCard(
			translationDashboardCardOverdueTasks,
			"Overdue Tasks",
			"Past-due assignments across the visible queue scope.",
			assignments.OverdueTasks,
			map[string]any{"high_priority": assignments.HighPriorityOverdue},
			translationDashboardCardAlert(assignments.OverdueTasks, assignments.OverdueTasks > 0, false),
			translationDashboardLink(b.admin.URLs(), "admin", "translations.queue", "admin.translations.queue", nil, translationDashboardQuery(nil, channel, map[string]string{"status": translationDashboardActionableStatusFilter(), "due_state": "overdue", "sort": "due_date", "order": "asc"}), map[string]any{"label": "Overdue queue", "description": "Open the queue filtered to overdue assignments.", "relation": "primary"}),
			"translations.dashboard.overdue_tasks",
			"translations.dashboard.overdue_triage",
		),
		translationDashboardCard(
			translationDashboardCardBlockedFamilies,
			"Blocked Families",
			"Families currently blocked from publish readiness.",
			families.BlockedFamilies,
			map[string]any{"missing_required_locales": families.MissingRequiredFamilies},
			translationDashboardCardAlert(families.BlockedFamilies, families.BlockedFamilies > 0, false),
			translationDashboardLink(b.admin.URLs(), "admin", "translations.families", "admin.translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{"readiness_state": "blocked"}), map[string]any{"label": "Blocked families", "description": "Open the blocked families workbench for the current scope.", "relation": "primary"}),
			"translations.dashboard.blocked_families",
			"translations.dashboard.publish_blockers",
		),
		translationDashboardCard(
			translationDashboardCardMissingRequiredLocale,
			"Missing Required Locales",
			"Families still missing policy-required locale variants.",
			families.MissingRequiredFamilies,
			map[string]any{"families_blocked": families.BlockedFamilies},
			translationDashboardCardAlert(families.MissingRequiredFamilies, families.MissingRequiredFamilies > 0, false),
			translationDashboardLink(b.admin.URLs(), "admin", "translations.families", "admin.translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{"readiness_state": "blocked", "blocker_code": "missing_locale"}), map[string]any{"label": "Missing locale blockers", "description": "Open the families workbench filtered to missing locale blockers.", "relation": "primary"}),
			"translations.dashboard.missing_required_locales",
			"translations.dashboard.publish_blockers",
		),
	}
}

func (b *translationQueueBinding) translationDashboardDataSources(adminCtx AdminContext, identity translationTransportIdentity, channel string) ([]TranslationAssignment, []translationservices.FamilyRecord, *translationFamilyRuntime, []map[string]any, error) {
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, nil, nil, nil, err
	}
	assignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, "due_date", map[string]any{
		ScopeTenantIDKey: identity.TenantID,
		ScopeOrgIDKey:    identity.OrgID,
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
			"scope":               map[string]any{ScopeTenantIDKey: identity.TenantID, ScopeOrgIDKey: identity.OrgID, "actor_id": actorID},
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
			"label":       "My tasks",
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
			"label":       "Reviewer backlog",
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
			"status":    translationDashboardActionableStatusFilter(),
			"due_state": "overdue",
			"sort":      "due_date",
			"order":     "asc",
		}), map[string]any{
			"label":       "Overdue queue",
			"description": "Open the queue filtered to overdue assignments.",
			"relation":    "primary",
		}),
		"translations.dashboard.overdue_tasks",
		"translations.dashboard.overdue_triage",
	)
}

func translationDashboardBlockedFamiliesCard(urls urlkit.Resolver, adminAPIGroup, channel string, blockedFamilies, missingRequiredFamilies []translationservices.FamilyRecord) map[string]any {
	_ = adminAPIGroup
	return translationDashboardCard(
		translationDashboardCardBlockedFamilies,
		"Blocked Families",
		"Families currently blocked from publish readiness.",
		len(blockedFamilies),
		map[string]any{"missing_required_locales": len(missingRequiredFamilies)},
		translationDashboardCardAlert(len(blockedFamilies), len(blockedFamilies) > 0, false),
		translationDashboardLink(urls, "admin", "translations.families", "admin.translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{
			"readiness_state": "blocked",
		}), map[string]any{
			"label":       "Blocked families",
			"description": "Open the blocked families workbench for the current scope.",
			"relation":    "primary",
		}),
		"translations.dashboard.blocked_families",
		"translations.dashboard.publish_blockers",
	)
}

func translationDashboardMissingLocalesCard(urls urlkit.Resolver, adminAPIGroup, channel string, blockedFamilies, missingRequiredFamilies []translationservices.FamilyRecord) map[string]any {
	_ = adminAPIGroup
	return translationDashboardCard(
		translationDashboardCardMissingRequiredLocale,
		"Missing Required Locales",
		"Families still missing policy-required locale variants.",
		len(missingRequiredFamilies),
		map[string]any{"families_blocked": len(blockedFamilies)},
		translationDashboardCardAlert(len(missingRequiredFamilies), len(missingRequiredFamilies) > 0, false),
		translationDashboardLink(urls, "admin", "translations.families", "admin.translations.families", nil, translationDashboardQuery(nil, channel, map[string]string{
			"readiness_state": "blocked",
			"blocker_code":    "missing_locale",
		}), map[string]any{
			"label":       "Missing locale blockers",
			"description": "Open the families workbench filtered to missing locale blockers.",
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
		if !assignment.Status.IsActive() {
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
		alert := extractMap(card["alert"])
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
			"blocker_labels":                translationDashboardBlockerLabelsForFamily(family.Blockers, family.BlockerCodes),
			"reason_breakdown":              translationDashboardReasonBreakdown(family.Blockers, family.BlockerCodes),
			"affected_locales":              translationDashboardAffectedLocales(family.Blockers),
			"reason_data":                   translationDashboardReasonDataState(family),
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

func translationDashboardReasonBreakdown(blockers []translationservices.FamilyBlocker, fallbackCodes []string) []map[string]any {
	labels := translationDashboardReasonLabels()
	type reasonAggregate struct {
		code    string
		locales map[string]struct{}
		count   int
	}
	byCode := map[string]*reasonAggregate{}
	for _, blocker := range blockers {
		code := translationDashboardPresentationReasonCode(blocker)
		if code == "" {
			continue
		}
		entry := byCode[code]
		if entry == nil {
			entry = &reasonAggregate{code: code, locales: map[string]struct{}{}}
			byCode[code] = entry
		}
		entry.count++
		if locale := strings.TrimSpace(strings.ToLower(blocker.Locale)); locale != "" {
			entry.locales[locale] = struct{}{}
		}
	}
	for _, raw := range fallbackCodes {
		code := strings.TrimSpace(strings.ToLower(raw))
		if code == "" {
			continue
		}
		if code == string(translationcore.FamilyBlockerPolicyDenied) {
			if _, ok := byCode[string(translationcore.FamilyBlockerReasonPolicyUnavailable)]; ok {
				continue
			}
		}
		if _, ok := byCode[code]; !ok {
			byCode[code] = &reasonAggregate{code: code, locales: map[string]struct{}{}, count: 0}
		}
	}
	codes := make([]string, 0, len(byCode))
	for code := range byCode {
		codes = append(codes, code)
	}
	sort.SliceStable(codes, func(i, j int) bool {
		leftRank := translationDashboardReasonRank(codes[i])
		rightRank := translationDashboardReasonRank(codes[j])
		if leftRank != rightRank {
			return leftRank < rightRank
		}
		return codes[i] < codes[j]
	})
	out := make([]map[string]any, 0, len(codes))
	for _, code := range codes {
		entry := byCode[code]
		out = append(out, map[string]any{
			"code":             code,
			"label":            translationDashboardReasonLabel(labels, code),
			"count":            entry.count,
			"affected_locales": sortedStringSet(entry.locales),
		})
	}
	return out
}

func translationDashboardAffectedLocales(blockers []translationservices.FamilyBlocker) []string {
	locales := map[string]struct{}{}
	for _, blocker := range blockers {
		if locale := strings.TrimSpace(strings.ToLower(blocker.Locale)); locale != "" {
			locales[locale] = struct{}{}
		}
	}
	return sortedStringSet(locales)
}

func translationDashboardBlockerLabelsForFamily(blockers []translationservices.FamilyBlocker, fallbackCodes []string) map[string]string {
	out := translationDashboardBlockerLabels(fallbackCodes)
	if len(blockers) == 0 {
		return out
	}
	hasPolicyUnavailable := false
	hasHostPolicyDenied := false
	for _, blocker := range blockers {
		code := strings.TrimSpace(strings.ToLower(blocker.BlockerCode))
		if code == "" {
			continue
		}
		if code == string(translationcore.FamilyBlockerPolicyDenied) && translationFamilyBlockerIsPolicyUnavailable(blocker) {
			hasPolicyUnavailable = true
			out[string(translationcore.FamilyBlockerReasonPolicyUnavailable)] = "Policy unavailable"
			continue
		}
		if code == string(translationcore.FamilyBlockerPolicyDenied) {
			hasHostPolicyDenied = true
			out[code] = translationDashboardReasonLabel(translationDashboardReasonLabels(), code)
			continue
		}
		if _, ok := out[code]; !ok {
			out[code] = translationDashboardReasonLabel(translationDashboardReasonLabels(), code)
		}
	}
	if hasPolicyUnavailable && !hasHostPolicyDenied {
		out[string(translationcore.FamilyBlockerPolicyDenied)] = "Policy unavailable"
	}
	return out
}

func translationDashboardBlockerLabels(codes []string) map[string]string {
	labels := translationDashboardReasonLabels()
	out := map[string]string{}
	for _, raw := range codes {
		code := strings.TrimSpace(strings.ToLower(raw))
		if code == "" {
			continue
		}
		out[code] = translationDashboardReasonLabel(labels, code)
	}
	return out
}

func translationDashboardPresentationReasonCode(blocker translationservices.FamilyBlocker) string {
	code := strings.TrimSpace(strings.ToLower(blocker.BlockerCode))
	if code != string(translationcore.FamilyBlockerPolicyDenied) {
		return code
	}
	if translationFamilyBlockerIsPolicyUnavailable(blocker) {
		return string(translationcore.FamilyBlockerReasonPolicyUnavailable)
	}
	return code
}

func translationDashboardReasonDataState(family translationservices.FamilyRecord) map[string]any {
	if len(family.Blockers) > 0 {
		return map[string]any{"state": "available"}
	}
	if len(family.BlockerCodes) > 0 {
		return map[string]any{
			"state":   "unavailable",
			"message": "Reason counts and locale context are not available from the current dashboard projection.",
		}
	}
	return map[string]any{
		"state":   "degraded",
		"message": "No blocker reason data is available for this blocked family.",
	}
}

func translationDashboardReasonLabel(labels map[string]string, code string) string {
	if label := strings.TrimSpace(labels[code]); label != "" {
		return label
	}
	return strings.ReplaceAll(strings.TrimSpace(code), "_", " ")
}

func translationDashboardReasonRank(code string) int {
	ranks := map[string]int{
		"missing_locale":     0,
		"missing_field":      1,
		"pending_review":     2,
		"outdated_source":    3,
		"policy_denied":      4,
		"policy_unavailable": 4,
	}
	if rank, ok := ranks[strings.TrimSpace(strings.ToLower(code))]; ok {
		return rank
	}
	return len(ranks)
}

func sortedStringSet(set map[string]struct{}) []string {
	out := make([]string, 0, len(set))
	for value := range set {
		if value = strings.TrimSpace(strings.ToLower(value)); value != "" {
			out = append(out, value)
		}
	}
	sort.Strings(out)
	return out
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

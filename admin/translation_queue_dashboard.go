package admin

import (
	"context"
	"strings"
	"time"

	urlkit "github.com/goliatone/go-urlkit"
)

const (
	translationQueueDashboardWidgetCode = "admin.widget.translation_progress"
	translationQueueResolverKey         = "admin.translations.queue"
)

// TranslationQueueStatsSnapshot captures queue dashboard aggregate counts.
type TranslationQueueStatsSnapshot struct {
	Summary        map[string]int `json:"summary"`
	StatusCounts   map[string]int `json:"status_counts"`
	LocaleCounts   map[string]int `json:"locale_counts"`
	UpdatedAt      time.Time      `json:"updated_at"`
	AssignmentRows int            `json:"assignment_rows"`
}

// TranslationQueueStatsService provides aggregate queue metrics for dashboard providers.
type TranslationQueueStatsService interface {
	Snapshot(ctx context.Context) (TranslationQueueStatsSnapshot, error)
}

// TranslationQueueStatsFromRepository computes queue stats from assignment storage.
type TranslationQueueStatsFromRepository struct {
	Repository TranslationAssignmentRepository
}

func (s *TranslationQueueStatsFromRepository) Snapshot(ctx context.Context) (TranslationQueueStatsSnapshot, error) {
	if s == nil || s.Repository == nil {
		return TranslationQueueStatsSnapshot{}, serviceNotConfiguredDomainError("translation queue stats repository", map[string]any{"component": "translation_queue_dashboard"})
	}

	rows := []TranslationAssignment{}
	page := 1
	perPage := 200
	for {
		batch, total, err := s.Repository.List(ctx, ListOptions{Page: page, PerPage: perPage})
		if err != nil {
			return TranslationQueueStatsSnapshot{}, err
		}
		rows = append(rows, batch...)
		if len(rows) >= total || len(batch) == 0 {
			break
		}
		page++
	}

	statusCounts := map[string]int{}
	localeCounts := map[string]int{}
	summary := map[string]int{
		"total":    0,
		"active":   0,
		"overdue":  0,
		"review":   0,
		"approved": 0,
	}
	now := time.Now().UTC()
	for _, assignment := range rows {
		summary["total"]++
		status := strings.TrimSpace(string(assignment.Status))
		if status == "" {
			status = string(AssignmentStatusPending)
		}
		statusCounts[status]++
		locale := strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
		if locale == "" {
			locale = "unknown"
		}
		localeCounts[locale]++
		if !assignment.Status.IsTerminal() {
			summary["active"]++
		}
		if assignment.Status == AssignmentStatusReview {
			summary["review"]++
		}
		if assignment.Status == AssignmentStatusApproved {
			summary["approved"]++
		}
		if assignment.DueDate != nil && assignment.DueDate.Before(now) && !assignment.Status.IsTerminal() {
			summary["overdue"]++
		}
	}

	return TranslationQueueStatsSnapshot{
		Summary:        summary,
		StatusCounts:   statusCounts,
		LocaleCounts:   localeCounts,
		UpdatedAt:      now,
		AssignmentRows: len(rows),
	}, nil
}

// RegisterTranslationProgressWidget registers queue progress dashboard provider.
func RegisterTranslationProgressWidget(dash *Dashboard, stats TranslationQueueStatsService, urls urlkit.Resolver) {
	if dash == nil || stats == nil {
		return
	}

	dash.RegisterProvider(DashboardProviderSpec{
		Code:        translationQueueDashboardWidgetCode,
		Name:        "Translation Progress",
		Description: "Overview of translation queue and completion status",
		DefaultArea: "admin.dashboard.main",
		DefaultSpan: 6,
		Permission:  PermAdminTranslationsView,
		Handler: func(ctx AdminContext, _ map[string]any) (map[string]any, error) {
			snapshot, err := stats.Snapshot(ctx.Context)
			if err != nil {
				return nil, err
			}
			return map[string]any{
				"summary":       snapshot.Summary,
				"status_counts": snapshot.StatusCounts,
				"locale_counts": snapshot.LocaleCounts,
				"updated_at":    snapshot.UpdatedAt,
				"links":         translationQueueDashboardLinks(urls, ctx.UserID),
			}, nil
		},
	})
}

func translationQueueStatsServiceFromAdmin(admin *Admin) TranslationQueueStatsService {
	if admin == nil || admin.registry == nil {
		return nil
	}
	panel, ok := admin.registry.Panel(translationQueuePanelID)
	if !ok || panel == nil {
		return nil
	}
	repo, ok := panel.repo.(*TranslationAssignmentPanelRepository)
	if !ok || repo == nil || repo.repo == nil {
		return nil
	}
	return &TranslationQueueStatsFromRepository{Repository: repo.repo}
}

func translationQueueDashboardLinks(urls urlkit.Resolver, userID string) []map[string]any {
	build := func(label string, query map[string]string) map[string]any {
		item := map[string]any{
			"label":        label,
			"resolver_key": translationQueueResolverKey,
			"group":        "admin",
			"route":        "translations.queue",
		}
		if len(query) > 0 {
			item["query"] = query
		}
		if url := resolveURLWith(urls, "admin", "translations.queue", nil, query); url != "" {
			item["url"] = url
		}
		return item
	}

	myQueueQuery := map[string]string{"assignee_id": strings.TrimSpace(userID)}
	if strings.TrimSpace(userID) == "" {
		myQueueQuery = nil
	}

	return []map[string]any{
		build("All Translations", nil),
		build("My Queue", myQueueQuery),
		build("Open Pool", map[string]string{"assignment_type": string(AssignmentTypeOpenPool), "status": string(AssignmentStatusPending)}),
		build("Review Queue", map[string]string{"status": string(AssignmentStatusReview)}),
		build("Overdue", map[string]string{"overdue": "true"}),
	}
}

package admin

import (
	"context"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
	urlkit "github.com/goliatone/go-urlkit"
)

const (
	translationQueueResolverKey = "admin.translations.queue"
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
	Repository TranslationAssignmentRepository `json:"repository"`
}

func (s *TranslationQueueStatsFromRepository) Snapshot(ctx context.Context) (TranslationQueueStatsSnapshot, error) {
	if s == nil || s.Repository == nil {
		return TranslationQueueStatsSnapshot{}, serviceNotConfiguredDomainError("translation queue stats repository", map[string]any{"component": "translation_queue_dashboard"})
	}

	rows, err := s.listTranslationQueueAssignments(ctx)
	if err != nil {
		return TranslationQueueStatsSnapshot{}, err
	}
	now := time.Now().UTC()
	statusCounts, localeCounts, summary := summarizeTranslationAssignments(rows, now)

	return TranslationQueueStatsSnapshot{
		Summary:        summary,
		StatusCounts:   statusCounts,
		LocaleCounts:   localeCounts,
		UpdatedAt:      now,
		AssignmentRows: len(rows),
	}, nil
}

func (s *TranslationQueueStatsFromRepository) listTranslationQueueAssignments(ctx context.Context) ([]TranslationAssignment, error) {
	rows := []TranslationAssignment{}
	page := 1
	perPage := 200
	for {
		batch, total, err := s.Repository.List(ctx, ListOptions{Page: page, PerPage: perPage})
		if err != nil {
			return nil, err
		}
		rows = append(rows, batch...)
		if len(rows) >= total || len(batch) == 0 {
			return rows, nil
		}
		page++
	}
}

func summarizeTranslationAssignments(rows []TranslationAssignment, now time.Time) (map[string]int, map[string]int, map[string]int) {
	statusCounts := map[string]int{}
	localeCounts := map[string]int{}
	summary := map[string]int{
		"total":    0,
		"active":   0,
		"overdue":  0,
		"review":   0,
		"approved": 0,
	}
	for _, assignment := range rows {
		translationAssignmentQueueStats(summary, statusCounts, localeCounts, assignment, now)
	}
	return statusCounts, localeCounts, summary
}

func translationAssignmentQueueStats(summary, statusCounts, localeCounts map[string]int, assignment TranslationAssignment, now time.Time) {
	summary["total"]++
	status := normalizeTranslationQueueState(strings.TrimSpace(primitives.FirstNonEmptyRaw(string(assignment.Status), string(AssignmentStatusOpen))))
	statusCounts[status]++
	locale := strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
	if locale == "" {
		locale = "unknown"
	}
	localeCounts[locale]++
	if !assignment.Status.IsTerminal() {
		summary["active"]++
	}
	normalized := normalizeTranslationAssignmentStatus(assignment.Status)
	if normalized == AssignmentStatusInReview {
		summary["review"]++
	}
	if normalized == AssignmentStatusApproved {
		summary["approved"]++
	}
	if assignment.DueDate != nil && assignment.DueDate.Before(now) && !assignment.Status.IsTerminal() {
		summary["overdue"]++
	}
}

// RegisterTranslationProgressWidget registers queue progress dashboard provider.
func RegisterTranslationProgressWidget(dash *Dashboard, stats TranslationQueueStatsService, urls urlkit.Resolver) {
	if dash == nil || stats == nil {
		return
	}

	dash.RegisterProvider(DashboardProviderSpec{
		Code:        WidgetTranslationProgress,
		Name:        "Translation Progress",
		Description: "Overview of translation queue and completion status",
		DefaultArea: uiplacement.DashboardAreaCodeForPlacement(uiplacement.DashboardPlacementMain, ""),
		DefaultSpan: 6,
		Permission:  PermAdminTranslationsView,
		Handler: func(ctx AdminContext, _ map[string]any) (WidgetPayload, error) {
			snapshot, err := stats.Snapshot(ctx.Context)
			if err != nil {
				return WidgetPayload{}, err
			}
			return WidgetPayloadOf(TranslationProgressWidgetPayload{
				Summary: TranslationSummaryWidgetPayload{
					Total:    snapshot.Summary["total"],
					Active:   snapshot.Summary["active"],
					Overdue:  snapshot.Summary["overdue"],
					Review:   snapshot.Summary["review"],
					Approved: snapshot.Summary["approved"],
				},
				StatusCounts: snapshot.StatusCounts,
				LocaleCounts: snapshot.LocaleCounts,
				UpdatedAt:    snapshot.UpdatedAt.UTC().Format(time.RFC3339Nano),
				Links:        translationQueueDashboardLinks(urls, ctx.UserID),
			}), nil
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

func translationQueueDashboardLinks(urls urlkit.Resolver, userID string) []TranslationLinkWidgetPayload {
	build := func(label string, query map[string]string) TranslationLinkWidgetPayload {
		item := TranslationLinkWidgetPayload{
			Label:       label,
			ResolverKey: translationQueueResolverKey,
			Group:       "admin",
			Route:       "translations.queue",
			Query:       query,
		}
		if len(query) == 0 {
			item.Query = nil
		}
		if url := resolveURLWith(urls, "admin", "translations.queue", nil, query); url != "" {
			item.URL = url
		}
		return item
	}

	myQueueQuery := map[string]string{"assignee_id": strings.TrimSpace(userID)}
	if strings.TrimSpace(userID) == "" {
		myQueueQuery = nil
	}

	return []TranslationLinkWidgetPayload{
		build("All Translations", nil),
		build("My Queue", myQueueQuery),
		build("Open Pool", map[string]string{"assignment_type": string(AssignmentTypeOpenPool), "status": string(AssignmentStatusOpen)}),
		build("Review Queue", map[string]string{"status": string(AssignmentStatusInReview)}),
		build("Overdue", map[string]string{"overdue": "true"}),
	}
}

package admin

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestTranslationQueueStatsFromRepositorySnapshot(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	past := time.Now().UTC().Add(-time.Hour)
	ctx := context.Background()

	_, _ = repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_1",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
		DueDate:            &past,
	})
	_, _ = repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_2",
		EntityType:         "posts",
		SourceRecordID:     "post_1",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusReview,
		Priority:           PriorityHigh,
	})

	svc := &TranslationQueueStatsFromRepository{Repository: repo}
	snapshot, err := svc.Snapshot(ctx)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if snapshot.Summary["total"] != 2 {
		t.Fatalf("expected total=2, got %+v", snapshot.Summary)
	}
	if snapshot.Summary["active"] != 2 {
		t.Fatalf("expected active=2, got %+v", snapshot.Summary)
	}
	if snapshot.Summary["overdue"] != 1 {
		t.Fatalf("expected overdue=1, got %+v", snapshot.Summary)
	}
	if snapshot.StatusCounts[string(AssignmentStatusReview)] != 1 {
		t.Fatalf("expected review status count=1, got %+v", snapshot.StatusCounts)
	}
	if snapshot.LocaleCounts["es"] != 1 || snapshot.LocaleCounts["fr"] != 1 {
		t.Fatalf("expected locale counts for es/fr, got %+v", snapshot.LocaleCounts)
	}
}

func TestRegisterTranslationProgressWidgetUsesResolverLinks(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()
	_, _ = repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_1",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})

	dash := NewDashboard()
	dash.WithWidgetService(NewInMemoryWidgetService())
	dash.RegisterArea(WidgetAreaDefinition{Code: "admin.dashboard.main"})

	cfg := applyConfigDefaults(Config{BasePath: "/admin", DefaultLocale: "en"})
	urls, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("new url manager: %v", err)
	}

	RegisterTranslationProgressWidget(dash, &TranslationQueueStatsFromRepository{Repository: repo}, urls)
	widgets, err := dash.Resolve(AdminContext{Context: ctx, Locale: "en", UserID: "translator_1"})
	if err != nil {
		t.Fatalf("resolve dashboard: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("expected one widget, got %d", len(widgets))
	}
	if widgets[0]["definition"] != translationQueueDashboardWidgetCode {
		t.Fatalf("expected queue widget code %q, got %v", translationQueueDashboardWidgetCode, widgets[0]["definition"])
	}

	data, ok := widgets[0]["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected widget data map, got %T", widgets[0]["data"])
	}
	rawLinks := data["links"]
	links := []map[string]any{}
	switch typed := rawLinks.(type) {
	case []map[string]any:
		links = typed
	case []any:
		for _, raw := range typed {
			if link, ok := raw.(map[string]any); ok {
				links = append(links, link)
			}
		}
	}
	if len(links) == 0 {
		t.Fatalf("expected links array, got %T %v", data["links"], data["links"])
	}

	foundAll := false
	foundMyQueue := false
	for _, link := range links {
		if link["resolver_key"] != translationQueueResolverKey || link["route"] != "translations.queue" {
			t.Fatalf("expected resolver route metadata, got %v", link)
		}
		if url, _ := link["url"].(string); url != "" && !strings.HasPrefix(url, "/admin/translations") {
			t.Fatalf("expected resolver-built translations URL, got %q", url)
		}
		if link["label"] == "All Translations" {
			foundAll = true
		}
		if link["label"] == "My Queue" {
			query := map[string]string{}
			switch raw := link["query"].(type) {
			case map[string]string:
				query = raw
			case map[string]any:
				for key, value := range raw {
					query[key] = toString(value)
				}
			}
			if len(query) == 0 {
				t.Fatalf("expected query payload for My Queue link")
			}
			if query["assignee_id"] != "translator_1" {
				t.Fatalf("expected assignee query to use current user id, got %v", query)
			}
			foundMyQueue = true
		}
	}
	if !foundAll || !foundMyQueue {
		t.Fatalf("expected All Translations and My Queue links, got %v", links)
	}
}

func TestTranslationQueueStatsServiceFromAdminUsesQueuePanelRepository(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS)})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	stats := translationQueueStatsServiceFromAdmin(adm)
	if stats == nil {
		t.Fatalf("expected queue stats service from registered queue panel")
	}
}

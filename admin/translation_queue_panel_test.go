package admin

import (
	"context"
	"strings"
	"testing"
)

func TestNewTranslationQueuePanelSchemaIncludesQueueActionsAndFilters(t *testing.T) {
	store := NewInMemoryTranslationAssignmentRepository()
	repo := NewTranslationAssignmentPanelRepository(store)
	panel, err := NewTranslationQueuePanel(repo).Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	schema := panel.Schema()
	if !hasActionCommand(schema.Actions, "claim", translationQueueClaimCommandName) {
		t.Fatalf("expected claim action with command %q", translationQueueClaimCommandName)
	}
	if !hasActionCommand(schema.Actions, "archive", translationQueueArchiveCommandName) {
		t.Fatalf("expected archive action with command %q", translationQueueArchiveCommandName)
	}
	if !hasActionCommand(schema.BulkActions, "bulk_assign", translationQueueBulkAssignCommandName) {
		t.Fatalf("expected bulk_assign action")
	}
	if !hasActionCommand(schema.BulkActions, "bulk_archive", translationQueueBulkArchiveCommandName) {
		t.Fatalf("expected bulk_archive action")
	}
	for _, filter := range []string{"status", "target_locale", "assignee_id", "assignment_type", "entity_type", "priority", "overdue"} {
		if !hasFilter(schema.Filters, filter) {
			t.Fatalf("expected filter %q", filter)
		}
	}
	if schema.Permissions.View != PermAdminTranslationsView || schema.Permissions.Delete != PermAdminTranslationsManage {
		t.Fatalf("unexpected permissions: %+v", schema.Permissions)
	}
	for _, action := range append(append([]Action{}, schema.Actions...), schema.BulkActions...) {
		if action.Permission == "" {
			t.Fatalf("expected permission for action %q", action.Name)
		}
		if !strings.HasPrefix(action.Permission, "admin.translations.") {
			t.Fatalf("expected queue action permission namespace admin.translations.*, got %q for %q", action.Permission, action.Name)
		}
	}
}

func TestTranslationAssignmentPanelRepositoryDeleteArchivesInsteadOfDeleting(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryTranslationAssignmentRepository()
	repo := NewTranslationAssignmentPanelRepository(store)

	created, err := repo.Create(ctx, map[string]any{
		"translation_group_id": "tg_123",
		"entity_type":          "pages",
		"source_record_id":     "page_1",
		"source_locale":        "en",
		"target_locale":        "es",
		"assignment_type":      string(AssignmentTypeOpenPool),
		"status":               string(AssignmentStatusPending),
		"priority":             string(PriorityNormal),
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	id := toString(created["id"])
	if id == "" {
		t.Fatalf("expected created id")
	}
	if err := repo.Delete(ctx, id); err != nil {
		t.Fatalf("delete should archive, got %v", err)
	}

	after, err := repo.Get(ctx, id)
	if err != nil {
		t.Fatalf("expected record to remain after delete/archive, got %v", err)
	}
	if toString(after["status"]) != string(AssignmentStatusArchived) {
		t.Fatalf("expected archived status, got %v", after["status"])
	}
}

func hasActionCommand(actions []Action, name, command string) bool {
	for _, action := range actions {
		if action.Name == name && action.CommandName == command {
			return true
		}
	}
	return false
}

func hasFilter(filters []Filter, name string) bool {
	for _, filter := range filters {
		if filter.Name == name {
			return true
		}
	}
	return false
}

func TestTranslationQueuePanelRunActionRequiresPermission(t *testing.T) {
	panel := &Panel{
		name: "translations",
		actions: []Action{
			{Name: "claim", CommandName: translationQueueClaimCommandName, Permission: PermAdminTranslationsClaim},
		},
		commandBus: NewCommandBus(true),
		authorizer: denyAll{},
	}
	err := panel.RunAction(AdminContext{Context: context.Background()}, "claim", nil, nil)
	if err == nil {
		t.Fatalf("expected permission denied error")
	}
}

func TestRegisterTranslationQueuePanelAlsoRegistersPageAndPostTabs(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	for _, panelName := range []string{"pages", "posts"} {
		tabs := adm.registry.PanelTabs(panelName)
		if len(tabs) != 1 {
			t.Fatalf("expected one queue tab on %s, got %d", panelName, len(tabs))
		}
		if tabs[0].Target.Panel != translationQueuePanelID {
			t.Fatalf("expected %s tab target, got %+v", translationQueuePanelID, tabs[0].Target)
		}
	}
}

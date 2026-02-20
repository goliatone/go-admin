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
	for _, requiredField := range []string{"translation_group_id", "entity_type", "source_record_id", "source_locale", "target_locale"} {
		field, ok := findFormField(schema.FormFields, requiredField)
		if !ok {
			t.Fatalf("expected form field %q", requiredField)
		}
		if !field.Required {
			t.Fatalf("expected form field %q to be required", requiredField)
		}
	}
	sourceLocaleField, ok := findFormField(schema.FormFields, "source_locale")
	if !ok {
		t.Fatalf("expected source_locale form field")
	}
	if !sourceLocaleField.ReadOnly {
		t.Fatalf("expected source_locale form field to be read only")
	}
	for expected, expectedType := range map[string]string{
		"translation_group_id": "select",
		"entity_type":          "select",
		"source_record_id":     "select",
		"target_locale":        "select",
		"assignee_id":          "select",
		"priority":             "select",
		"due_date":             "date",
	} {
		field, ok := findFormField(schema.FormFields, expected)
		if !ok {
			t.Fatalf("expected form field %q", expected)
		}
		if strings.TrimSpace(field.Type) != expectedType {
			t.Fatalf("expected form field %q type %q, got %q", expected, expectedType, field.Type)
		}
	}
	if schema.FormSchema == nil {
		t.Fatalf("expected form schema")
	}
	required, _ := schema.FormSchema["required"].([]string)
	for _, expected := range []string{"translation_group_id", "entity_type", "source_record_id", "source_locale", "target_locale"} {
		found := false
		for _, field := range required {
			if field == expected {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected required field %q in form schema, got %v", expected, required)
		}
	}
	properties, _ := schema.FormSchema["properties"].(map[string]any)
	dueDate, _ := properties["due_date"].(map[string]any)
	if strings.TrimSpace(toString(dueDate["format"])) != "date" {
		t.Fatalf("expected due_date format date, got %+v", dueDate)
	}
	priority, _ := properties["priority"].(map[string]any)
	enumValues, _ := priority["enum"].([]any)
	if len(enumValues) == 0 {
		t.Fatalf("expected priority enum values in form schema")
	}
	assignee, _ := properties["assignee_id"].(map[string]any)
	assigneeEndpoint, _ := assignee["x-endpoint"].(map[string]any)
	if strings.TrimSpace(toString(assigneeEndpoint["url"])) == "" {
		t.Fatalf("expected assignee_id x-endpoint url")
	}
	sourceRecord, _ := properties["source_record_id"].(map[string]any)
	sourceRecordEndpoint, _ := sourceRecord["x-endpoint"].(map[string]any)
	if strings.TrimSpace(toString(sourceRecordEndpoint["url"])) == "" {
		t.Fatalf("expected source_record_id x-endpoint url")
	}
	sourceLocale, _ := properties["source_locale"].(map[string]any)
	if readonly, _ := sourceLocale["readOnly"].(bool); !readonly {
		t.Fatalf("expected source_locale schema readOnly=true, got %+v", sourceLocale)
	}
	sourceLocaleFormgen, _ := sourceLocale["x-formgen"].(map[string]any)
	if strings.TrimSpace(toString(sourceLocaleFormgen["readonly"])) != "true" {
		t.Fatalf("expected source_locale x-formgen readonly=true, got %+v", sourceLocaleFormgen)
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

func TestQueueTimeParsesDateOnlyValue(t *testing.T) {
	parsed := queueTime("2026-03-01")
	if parsed.IsZero() {
		t.Fatalf("expected parsed date-only value")
	}
	if parsed.UTC().Format("2006-01-02") != "2026-03-01" {
		t.Fatalf("expected parsed date 2026-03-01, got %s", parsed.UTC().Format("2006-01-02"))
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

func TestTranslationAssignmentPanelRepositoryCreateAppliesDefaultsForMinimalRequiredInput(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryTranslationAssignmentRepository()
	repo := NewTranslationAssignmentPanelRepository(store)

	created, err := repo.Create(ctx, map[string]any{
		"translation_group_id": "tg_required",
		"entity_type":          "pages",
		"source_record_id":     "page_required",
		"source_locale":        "en",
		"target_locale":        "fr",
	})
	if err != nil {
		t.Fatalf("create assignment with minimal required fields: %v", err)
	}

	if got := strings.TrimSpace(toString(created["assignment_type"])); got != string(AssignmentTypeOpenPool) {
		t.Fatalf("expected default assignment_type %q, got %q", AssignmentTypeOpenPool, got)
	}
	if got := strings.TrimSpace(toString(created["status"])); got != string(AssignmentStatusPending) {
		t.Fatalf("expected default status %q, got %q", AssignmentStatusPending, got)
	}
	if got := strings.TrimSpace(toString(created["priority"])); got != string(PriorityNormal) {
		t.Fatalf("expected default priority %q, got %q", PriorityNormal, got)
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

func findFormField(fields []Field, name string) (Field, bool) {
	for _, field := range fields {
		if strings.TrimSpace(field.Name) == strings.TrimSpace(name) {
			return field, true
		}
	}
	return Field{}, false
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

func TestRegisterTranslationQueuePanelRegistersTabsForExistingAndFutureTranslationPanels(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	registerTranslationPanel := func(name string) {
		t.Helper()
		builder := (&PanelBuilder{}).
			WithRepository(NewMemoryRepository()).
			Actions(Action{Name: CreateTranslationKey, CommandName: name + ".create_translation"})
		if _, err := adm.RegisterPanel(name, builder); err != nil {
			t.Fatalf("register panel %s: %v", name, err)
		}
	}
	registerTranslationPanel("articles")

	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}

	if got := len(adm.registry.PanelTabs("articles")); got != 1 {
		t.Fatalf("expected queue tab on existing translation panel, got %d", got)
	}
	if adm.registry.PanelTabs("articles")[0].Target.Panel != translationQueuePanelID {
		t.Fatalf("expected %s tab target for existing translation panel, got %+v", translationQueuePanelID, adm.registry.PanelTabs("articles")[0].Target)
	}

	registerTranslationPanel("announcements")
	if got := len(adm.registry.PanelTabs("announcements")); got != 1 {
		t.Fatalf("expected queue tab on future translation panel, got %d", got)
	}
	if adm.registry.PanelTabs("announcements")[0].Target.Panel != translationQueuePanelID {
		t.Fatalf("expected %s tab target for future translation panel, got %+v", translationQueuePanelID, adm.registry.PanelTabs("announcements")[0].Target)
	}
}

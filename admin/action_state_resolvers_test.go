package admin

import (
	"errors"
	"reflect"
	"testing"

	boot "github.com/goliatone/go-admin/admin/internal/boot"
)

func TestPanelBuilderWithActionStateResolversBuildsPanelWiring(t *testing.T) {
	actionResolver := func(AdminContext, []map[string]any, []Action, ActionScope) (map[string]map[string]ActionState, error) {
		return nil, nil
	}
	bulkResolver := func(AdminContext, []Action, ListOptions) (map[string]ActionState, error) {
		return nil, nil
	}

	panel, err := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		WithActionStateResolver(actionResolver).
		WithBulkActionStateResolver(bulkResolver).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}
	if panel.actionStateResolver == nil {
		t.Fatalf("expected action state resolver on built panel")
	}
	if panel.bulkActionStateResolver == nil {
		t.Fatalf("expected bulk action state resolver on built panel")
	}
}

func TestPanelBindingActionStateOrderingAndStickyDisablement(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"doc_123": {
				"id":     "doc_123",
				"title":  "Terms",
				"status": "draft",
			},
		},
		list: []map[string]any{
			{
				"id":     "doc_123",
				"title":  "Terms",
				"status": "draft",
			},
		},
	}
	panel := &Panel{
		name:       "documents",
		repo:       repo,
		authorizer: denyAll{},
		actions: []Action{
			{
				Name:            "publish",
				Scope:           ActionScopeAny,
				Permission:      "documents.publish",
				ContextRequired: []string{"document_version_id"},
			},
			{
				Name:  "rotate_key",
				Scope: ActionScopeAny,
				Guard: func(ActionGuardContext) ActionState {
					return ActionState{
						Enabled:    false,
						ReasonCode: ActionDisabledReasonCodePreconditionFailed,
						Reason:     "document must be reviewed before it can be archived",
					}
				},
			},
		},
		actionStateResolver: func(_ AdminContext, records []map[string]any, actions []Action, scope ActionScope) (map[string]map[string]ActionState, error) {
			if len(records) != 1 {
				t.Fatalf("expected one record in resolver, got %d", len(records))
			}
			if scope != ActionScopeRow {
				t.Fatalf("expected row scope, got %q", scope)
			}
			return map[string]map[string]ActionState{
				"doc_123": {
					"publish": {
						Enabled: true,
						Metadata: map[string]any{
							"source": "resolver",
						},
					},
					"rotate_key": {
						Enabled: true,
						Remediation: &ActionRemediation{
							Label: "Open review checklist",
							Href:  "/admin/content/documents/doc_123/review",
							Kind:  "link",
						},
					},
				},
			}, nil
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	records, total, _, _, _, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("expected one record, got total=%d len=%d", total, len(records))
	}

	actionState := extractMap(records[0]["_action_state"])
	publishState := extractActionStateEntry(records[0]["_action_state"], "publish")
	if publishState["enabled"] != false {
		t.Fatalf("expected publish disabled, got %#v", publishState)
	}
	if got := publishState["reason_code"]; got != ActionDisabledReasonCodeMissingContext {
		t.Fatalf("expected missing context to win before permission/resolver, got %#v", got)
	}
	if got := publishState["permission"]; got != "documents.publish" {
		t.Fatalf("expected later permission stage to enrich disabled state, got %#v", publishState)
	}
	metadata := extractMap(publishState["metadata"])
	if got := metadata["source"]; got != "resolver" {
		t.Fatalf("expected resolver metadata enrichment, got %#v", publishState)
	}

	_ = actionState
	archiveState := extractActionStateEntry(records[0]["_action_state"], "rotate_key")
	if archiveState["enabled"] != false {
		t.Fatalf("expected archive disabled by guard, got %#v", archiveState)
	}
	if got := archiveState["reason_code"]; got != ActionDisabledReasonCodePreconditionFailed {
		t.Fatalf("expected guard disablement to win, got %#v", archiveState)
	}
	remediation := extractMap(archiveState["remediation"])
	if got := remediation["href"]; got != "/admin/content/documents/doc_123/review" {
		t.Fatalf("expected resolver remediation enrichment, got %#v", archiveState)
	}
}

func TestPanelBindingDetailPublishesDetailScopedActionState(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"doc_123": {
				"id":     "doc_123",
				"title":  "Terms",
				"status": "draft",
			},
		},
		list: []map[string]any{
			{
				"id":     "doc_123",
				"title":  "Terms",
				"status": "draft",
			},
		},
	}
	panel := &Panel{
		name:               "documents",
		repo:               repo,
		actionDefaultsMode: PanelActionDefaultsModeNone,
		actions: []Action{
			{Name: "view", Scope: ActionScopeRow},
			{
				Name:  "rotate_key",
				Scope: ActionScopeAny,
				Guard: func(ActionGuardContext) ActionState {
					return ActionState{
						Enabled:    false,
						ReasonCode: ActionDisabledReasonCodePreconditionFailed,
						Reason:     "document must be reviewed before it can be archived",
					}
				},
			},
			{Name: "delete", Scope: ActionScopeDetail},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	records, _, listSchemaAny, _, _, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	listSchema, ok := listSchemaAny.(Schema)
	if !ok {
		t.Fatalf("expected schema payload")
	}
	if !containsActionName(listSchema.Actions, "view") || !containsActionName(listSchema.Actions, "rotate_key") || containsActionName(listSchema.Actions, "delete") {
		t.Fatalf("expected row-scoped schema actions only, got %+v", listSchema.Actions)
	}
	rowState := extractActionStateMap(records[0]["_action_state"])

	detail, err := binding.Detail(newPanelBindingMockContext(), "en", "doc_123")
	if err != nil {
		t.Fatalf("detail: %v", err)
	}
	detailSchema, ok := detail["schema"].(Schema)
	if !ok {
		t.Fatalf("expected detail schema payload")
	}
	detailActions := make([]map[string]any, 0, len(detailSchema.Actions))
	for _, action := range detailSchema.Actions {
		detailActions = append(detailActions, map[string]any{"name": action.Name})
	}
	if len(detailActions) != 2 {
		t.Fatalf("expected detail actions filtered to detail/any, got %#v", detailActions)
	}
	if actionName := toString(detailActions[0]["name"]); actionName == "view" {
		t.Fatalf("expected row-only action to be filtered from detail schema, got %#v", detailActions)
	}
	detailData := extractMap(detail["data"])
	detailState := extractActionStateMap(detailData["_action_state"])
	if got := extractMap(detailState["rotate_key"])["reason_code"]; got != extractMap(rowState["rotate_key"])["reason_code"] {
		t.Fatalf("expected detail action state parity for shared action, got row=%#v detail=%#v", rowState, detailState)
	}
}

func TestPanelBindingListPublishesStaticBulkActionState(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{"id": "doc_123", "title": "Terms"},
		},
	}
	panel := &Panel{
		name:       "documents",
		repo:       repo,
		authorizer: allowAll{},
		bulkActions: []Action{
			{Name: "delete", Scope: ActionScopeBulk, Permission: "documents.delete"},
			{Name: "archive", Scope: ActionScopeBulk},
		},
		bulkActionStateResolver: func(_ AdminContext, actions []Action, opts ListOptions) (map[string]ActionState, error) {
			if len(actions) != 2 {
				t.Fatalf("expected filtered bulk actions, got %d", len(actions))
			}
			if opts.Page != 1 || opts.PerPage != 10 {
				t.Fatalf("expected list options forwarded to bulk resolver, got %+v", opts)
			}
			return map[string]ActionState{
				"delete": {
					Enabled:    false,
					ReasonCode: ActionDisabledReasonCodeInvalidSelection,
					Reason:     "Some selected records cannot be deleted",
				},
			}, nil
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	_, _, schemaAny, _, meta, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	schema, ok := schemaAny.(Schema)
	if !ok {
		t.Fatalf("expected schema payload")
	}
	if len(schema.BulkActions) != 2 {
		t.Fatalf("expected filtered bulk actions, got %+v", schema.BulkActions)
	}
	bulkState := extractActionStateMap(meta["bulk_action_state"])
	if got := extractMap(bulkState["delete"])["reason_code"]; got != ActionDisabledReasonCodeInvalidSelection {
		t.Fatalf("expected list meta bulk action state, got %#v", meta)
	}
	if got := meta["count"]; got != 1 {
		t.Fatalf("expected count in list meta, got %#v", meta)
	}
}

func TestPanelBindingResolverErrorsFailListAndDetail(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"doc_123": {
				"id":    "doc_123",
				"title": "Terms",
			},
		},
		list: []map[string]any{
			{"id": "doc_123", "title": "Terms"},
		},
	}
	expected := errors.New("resolver failed")
	panel := &Panel{
		name: "documents",
		repo: repo,
		actions: []Action{
			{Name: "archive", Scope: ActionScopeAny},
		},
		actionStateResolver: func(AdminContext, []map[string]any, []Action, ActionScope) (map[string]map[string]ActionState, error) {
			return nil, expected
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	if _, _, _, _, _, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10}); !errors.Is(err, expected) {
		t.Fatalf("expected list to fail on resolver error, got %v", err)
	}
	if _, err := binding.Detail(newPanelBindingMockContext(), "en", "doc_123"); !errors.Is(err, expected) {
		t.Fatalf("expected detail to fail on resolver error, got %v", err)
	}
}

func TestPanelBindingBulkResolverErrorFailsList(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{"id": "doc_123", "title": "Terms"},
		},
	}
	expected := errors.New("bulk resolver failed")
	panel := &Panel{
		name: "documents",
		repo: repo,
		bulkActions: []Action{
			{Name: "delete", Scope: ActionScopeBulk},
		},
		bulkActionStateResolver: func(AdminContext, []Action, ListOptions) (map[string]ActionState, error) {
			return nil, expected
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	if _, _, _, _, _, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10}); !errors.Is(err, expected) {
		t.Fatalf("expected list to fail on bulk resolver error, got %v", err)
	}
}

func TestActionStateResolverReceivesDetailScope(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"doc_123": {"id": "doc_123", "title": "Terms"},
		},
	}
	scopes := []ActionScope{}
	panel := &Panel{
		name: "documents",
		repo: repo,
		actions: []Action{
			{Name: "archive", Scope: ActionScopeAny},
		},
		actionStateResolver: func(_ AdminContext, _ []map[string]any, _ []Action, scope ActionScope) (map[string]map[string]ActionState, error) {
			scopes = append(scopes, scope)
			return map[string]map[string]ActionState{
				"doc_123": {
					"archive": {
						Enabled: false,
						Reason:  "resolver ran",
					},
				},
			}, nil
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	if _, err := binding.Detail(newPanelBindingMockContext(), "en", "doc_123"); err != nil {
		t.Fatalf("detail: %v", err)
	}
	if len(scopes) != 1 || scopes[0] != ActionScopeDetail {
		t.Fatalf("expected detail scope forwarded to resolver, got %+v", scopes)
	}
}

func TestActionStateEnvelopeReadsTypedAndGenericPayloads(t *testing.T) {
	typed := map[string]map[string]any{
		"publish": {
			"enabled": false,
			"metadata": map[string]any{
				"source": "typed",
			},
		},
	}
	fromTyped := actionStateEnvelope(typed)
	if !reflect.DeepEqual(typed, fromTyped) {
		t.Fatalf("expected typed envelope preserved, got %#v", fromTyped)
	}

	generic := map[string]any{
		"publish": map[string]any{
			"enabled": false,
			"metadata": map[string]any{
				"source": "generic",
			},
		},
	}
	fromGeneric := actionStateEnvelope(generic)
	if got := extractMap(fromGeneric["publish"]["metadata"])["source"]; got != "generic" {
		t.Fatalf("expected generic envelope metadata source preserved, got %#v", fromGeneric)
	}

	extractMap(generic["publish"])["enabled"] = true
	extractMap(extractMap(generic["publish"])["metadata"])["source"] = "mutated"
	if enabled, _ := fromGeneric["publish"]["enabled"].(bool); enabled {
		t.Fatalf("expected cloned envelope not to track source mutation, got %#v", fromGeneric)
	}
	if got := extractMap(fromGeneric["publish"]["metadata"])["source"]; got != "generic" {
		t.Fatalf("expected cloned metadata not to track source mutation, got %#v", fromGeneric)
	}
}

func extractActionStateMap(raw any) map[string]map[string]any {
	return actionStateEnvelope(raw)
}

func extractActionStateEntry(raw any, actionName string) map[string]any {
	return extractActionStateMap(raw)[actionName]
}

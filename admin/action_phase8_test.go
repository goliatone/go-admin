package admin

import (
	"context"
	"errors"
	"testing"

	boot "github.com/goliatone/go-admin/admin/internal/boot"
)

func TestActionPhase8RegressionPreservesWorkflowAndTranslationActionState(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_123": {
				"id":     "page_123",
				"title":  "Phase 8 Regression Page",
				"status": "draft",
				"translation_readiness": map[string]any{
					"readiness_state":          "missing_locales",
					"missing_required_locales": []string{"es", "fr"},
				},
			},
		},
		list: []map[string]any{
			{
				"id":     "page_123",
				"title":  "Phase 8 Regression Page",
				"status": "draft",
				"translation_readiness": map[string]any{
					"readiness_state":          "missing_locales",
					"missing_required_locales": []string{"es", "fr"},
				},
			},
		},
	}
	panel := &Panel{
		name: "pages",
		repo: repo,
		workflow: translationWorkflowStateStub{transitionsByState: map[string][]WorkflowTransition{
			"draft": {
				{Name: "publish", To: "published"},
			},
		}},
		actions: []Action{
			{Name: "publish", Scope: ActionScopeAny},
			{Name: "unpublish", Scope: ActionScopeAny},
		},
	}
	binding := &panelBinding{
		admin: &Admin{
			config:            Config{DefaultLocale: "en"},
			actionDiagnostics: NewActionDiagnosticsStore(16),
		},
		name:  "pages",
		panel: panel,
	}

	records, _, _, _, _, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("expected one list record, got %d", len(records))
	}
	detail, err := binding.Detail(newPanelBindingMockContext(), "en", "page_123")
	if err != nil {
		t.Fatalf("detail: %v", err)
	}

	rowState := extractActionStateMap(records[0]["_action_state"])
	detailState := extractActionStateMap(extractMap(detail["data"])["_action_state"])

	if got := extractMap(rowState["publish"])["reason_code"]; got != ActionDisabledReasonCodeTranslationMissing {
		t.Fatalf("expected publish blocked by translation readiness in list, got %#v", rowState["publish"])
	}
	if got := extractMap(detailState["publish"])["reason_code"]; got != ActionDisabledReasonCodeTranslationMissing {
		t.Fatalf("expected publish blocked by translation readiness in detail, got %#v", detailState["publish"])
	}
	if got := extractMap(rowState["unpublish"])["reason_code"]; got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected unpublish blocked by workflow state in list, got %#v", rowState["unpublish"])
	}
	if got := extractMap(detailState["unpublish"])["reason_code"]; got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected unpublish blocked by workflow state in detail, got %#v", detailState["unpublish"])
	}
}

func TestActionPhase8DiagnosticsPanelSummarizesDisablementsResolverErrorsAndExecutionFailures(t *testing.T) {
	store := NewActionDiagnosticsStore(16)
	admin := &Admin{
		config:            Config{DefaultLocale: "en"},
		actionDiagnostics: store,
	}
	panel := NewActionDiagnosticsDebugPanel(admin)

	store.Capture(ActionDiagnosticEntry{
		Kind:       actionDiagnosticKindDisablement,
		Panel:      "pages",
		Action:     "publish",
		Scope:      string(ActionScopeRow),
		Stage:      "translation_readiness",
		ReasonCode: ActionDisabledReasonCodeTranslationMissing,
		Reason:     "missing required locales: ES, FR",
	})
	store.Capture(ActionDiagnosticEntry{
		Kind:        actionDiagnosticKindAvailabilityErr,
		Panel:       "documents",
		ActionNames: []string{"delete"},
		Scope:       string(ActionScopeRow),
		Stage:       "resolver",
		ReasonCode:  TextCodeTemporarilyUnavailable,
		Reason:      "resolver unavailable",
	})
	store.Capture(ActionDiagnosticEntry{
		Kind:       actionDiagnosticKindExecutionErr,
		Panel:      "esign_documents",
		Action:     "delete",
		Scope:      string(ActionScopeDetail),
		Stage:      "repository_delete",
		ReasonCode: TextCodeResourceInUse,
		Reason:     "document cannot be deleted while attached to agreements",
	})

	snapshot := panel.Collect(context.Background())
	summary := extractMap(snapshot["summary"])
	if got := summary["total"]; got != 3 {
		t.Fatalf("expected total diagnostics count 3, got %#v", summary)
	}
	if got := summary["disablements"]; got != 1 {
		t.Fatalf("expected disablements summary 1, got %#v", summary)
	}
	if got := summary["availability_errors"]; got != 1 {
		t.Fatalf("expected availability_errors summary 1, got %#v", summary)
	}
	if got := summary["execution_failures"]; got != 1 {
		t.Fatalf("expected execution_failures summary 1, got %#v", summary)
	}

	entries, ok := snapshot["entries"].([]ActionDiagnosticEntry)
	if !ok || len(entries) != 3 {
		t.Fatalf("expected typed entries in debug snapshot, got %#v", snapshot["entries"])
	}
	if entries[0].Kind != actionDiagnosticKindExecutionErr {
		t.Fatalf("expected most recent entry first, got %+v", entries)
	}
}

func TestActionPhase8DiagnosticsCaptureDisablementsResolverErrorsAndStructuredFailures(t *testing.T) {
	admin := &Admin{
		config:            Config{DefaultLocale: "en"},
		actionDiagnostics: NewActionDiagnosticsStore(32),
	}

	disabledBinding := &panelBinding{
		admin: admin,
		name:  "pages",
		panel: &Panel{
			name: "pages",
			repo: &translationActionRepoStub{
				records: map[string]map[string]any{
					"page_123": {
						"id":     "page_123",
						"status": "draft",
						"translation_readiness": map[string]any{
							"readiness_state":          "missing_locales",
							"missing_required_locales": []string{"es"},
						},
					},
				},
				list: []map[string]any{
					{
						"id":     "page_123",
						"status": "draft",
						"translation_readiness": map[string]any{
							"readiness_state":          "missing_locales",
							"missing_required_locales": []string{"es"},
						},
					},
				},
			},
			workflow: translationWorkflowStateStub{transitionsByState: map[string][]WorkflowTransition{
				"draft": {
					{Name: "publish", To: "published"},
				},
			}},
			actions: []Action{{Name: "publish", Scope: ActionScopeAny}},
		},
	}
	if _, _, _, _, _, err := disabledBinding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("disabled list: %v", err)
	}

	expectedResolverErr := errors.New("resolver unavailable")
	resolverBinding := &panelBinding{
		admin: admin,
		name:  "documents",
		panel: &Panel{
			name: "documents",
			repo: &translationActionRepoStub{
				records: map[string]map[string]any{
					"doc_123": {"id": "doc_123", "title": "Terms"},
				},
				list: []map[string]any{
					{"id": "doc_123", "title": "Terms"},
				},
			},
			actions: []Action{{Name: "archive", Scope: ActionScopeAny}},
			actionStateResolver: func(AdminContext, []map[string]any, []Action, ActionScope) (map[string]map[string]ActionState, error) {
				return nil, expectedResolverErr
			},
		},
	}
	if _, _, _, _, _, err := resolverBinding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 10}); !errors.Is(err, expectedResolverErr) {
		t.Fatalf("expected resolver error, got %v", err)
	}

	deleteBinding := &panelBinding{
		admin: admin,
		name:  "esign_documents",
		panel: &Panel{
			name: "esign_documents",
			repo: &phase3ActionRepoStub{
				deleteErr: resourceInUseDomainError("document cannot be deleted while attached to agreements", map[string]any{
					"agreement_count": 2,
				}),
			},
		},
	}
	if err := deleteBinding.Delete(newPanelBindingMockContext(), "en", "doc_123"); err == nil {
		t.Fatalf("expected delete failure")
	}

	entries := admin.actionDiagnostics.Entries()
	if len(entries) < 3 {
		t.Fatalf("expected at least three diagnostic entries, got %+v", entries)
	}

	var sawDisablement, sawResolverErr, sawExecutionErr bool
	for _, entry := range entries {
		switch entry.Kind {
		case actionDiagnosticKindDisablement:
			if entry.Panel == "pages" && entry.ReasonCode == ActionDisabledReasonCodeTranslationMissing {
				sawDisablement = true
			}
		case actionDiagnosticKindAvailabilityErr:
			if entry.Panel == "documents" && entry.Stage == "resolver" {
				sawResolverErr = true
			}
		case actionDiagnosticKindExecutionErr:
			if entry.Panel == "esign_documents" && entry.Action == "delete" && entry.ReasonCode == TextCodeResourceInUse {
				sawExecutionErr = true
			}
		}
	}
	if !sawDisablement || !sawResolverErr || !sawExecutionErr {
		t.Fatalf("expected disablement/resolver/execution diagnostics, got %+v", entries)
	}
}

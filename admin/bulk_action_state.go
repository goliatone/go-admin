package admin

import (
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

const defaultBulkActionStateDebounceMS = 150

type bulkSelectionActionCandidate struct {
	recordID string
	state    ActionState
}

func (p *panelBinding) bulkActionStateConfig(actions []Action) *BulkActionStateConfig {
	if !p.selectionSensitiveBulkStateEnabled(actions) {
		return nil
	}
	endpoint := strings.TrimSpace(p.panelBulkActionStatePath())
	if endpoint == "" {
		return nil
	}
	return &BulkActionStateConfig{
		SelectionSensitive:     true,
		SelectionStateEndpoint: endpoint,
		DebounceMS:             defaultBulkActionStateDebounceMS,
	}
}

func (p *panelBinding) selectionSensitiveBulkStateEnabled(actions []Action) bool {
	if p == nil || p.panel == nil || len(actions) == 0 {
		return false
	}
	if p.panel.actionStateResolver != nil {
		return true
	}
	for _, action := range actions {
		if action.Guard != nil {
			return true
		}
	}
	return false
}

func (p *panelBinding) panelBulkActionStatePath() string {
	if p == nil || p.admin == nil {
		return ""
	}
	path := resolveURLWith(p.admin.urlManager, adminAPIGroupName(p.admin.config), "panel.bulk.state", map[string]string{
		"panel": p.name,
	}, nil)
	path = strings.TrimSpace(path)
	if path != "" {
		return path
	}
	return "/admin/api/panels/" + strings.Trim(strings.TrimSpace(p.name), "/") + "/bulk-actions/state"
}

func (p *panelBinding) BulkActionState(c router.Context, locale string, body map[string]any) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	body = mergePanelActionContext(body, locale, c.Query("locale"), c.Query("environment"), c.Query("env"), c.Query("policy_entity"), c.Query("policyEntity"))
	body = mergePanelActionActorContext(body, ctx)
	actions := filterActionsForScope(p.panel.Schema().BulkActions, ActionScopeBulk)
	states, err := p.selectionAwareBulkActionStates(ctx, actions, parseCommandIDs(body, c.Query("id"), c.Query("ids")), parseListOptions(c))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"bulk_action_state": actionStatePayloadMap(states),
		"selection": map[string]any{
			"count": len(parseCommandIDs(body, c.Query("id"), c.Query("ids"))),
		},
	}, nil
}

func (p *panelBinding) selectionAwareBulkActionStates(
	ctx AdminContext,
	actions []Action,
	ids []string,
	listOpts ListOptions,
) (map[string]ActionState, error) {
	base, err := p.bulkActionStates(ctx, actions, listOpts)
	if err != nil {
		return nil, err
	}
	selection := dedupeStrings(ids)
	if len(actions) == 0 || len(selection) == 0 || !p.selectionSensitiveBulkStateEnabled(actions) {
		return base, nil
	}

	records, missingIDs, err := p.loadSelectedBulkRecords(ctx, selection)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 && len(missingIDs) == 0 {
		return base, nil
	}

	resolverStates, err := p.resolveBatchActionStates(ctx, records, actions, ActionScopeBulk)
	if err != nil {
		return nil, err
	}
	workflowTransitionsByRecord, workflowTransitionErrByRecord := p.workflowTransitionsForRecords(ctx, records, actions)
	recordByID := map[string]map[string]any{}
	for _, record := range records {
		recordID := strings.TrimSpace(toString(record["id"]))
		if recordID == "" {
			continue
		}
		recordByID[recordID] = record
	}

	candidatesByAction := map[string][]bulkSelectionActionCandidate{}
	for _, id := range selection {
		record, ok := recordByID[id]
		if !ok {
			missing := missingBulkSelectionState(id)
			for _, action := range actions {
				name := strings.TrimSpace(action.Name)
				if name == "" {
					continue
				}
				candidatesByAction[name] = append(candidatesByAction[name], bulkSelectionActionCandidate{
					recordID: id,
					state:    missing,
				})
			}
			continue
		}
		recordState := p.actionStateForRecord(
			ctx,
			record,
			actions,
			ActionScopeBulk,
			workflowTransitionsByRecord[id],
			workflowTransitionErrByRecord[id],
			resolverStates[id],
		)
		for _, action := range actions {
			name := strings.TrimSpace(action.Name)
			if name == "" {
				continue
			}
			candidate, ok := recordState[name]
			if !ok {
				candidate = defaultEnabledActionState()
			}
			candidatesByAction[name] = append(candidatesByAction[name], bulkSelectionActionCandidate{
				recordID: id,
				state:    candidate,
			})
		}
	}

	out := map[string]ActionState{}
	for name, state := range base {
		out[name] = state
	}
	for _, action := range actions {
		name := strings.TrimSpace(action.Name)
		if name == "" {
			continue
		}
		aggregated, ok := aggregateBulkSelectionState(action, candidatesByAction[name], len(selection))
		if !ok {
			continue
		}
		out[name] = mergeActionState(out[name], aggregated, true)
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}

func (p *panelBinding) loadSelectedBulkRecords(ctx AdminContext, ids []string) ([]map[string]any, []string, error) {
	if p == nil || p.panel == nil || len(ids) == 0 {
		return nil, nil, nil
	}
	records := make([]map[string]any, 0, len(ids))
	missing := make([]string, 0)
	for _, rawID := range ids {
		id := strings.TrimSpace(rawID)
		if id == "" {
			continue
		}
		record, err := p.panel.Get(ctx, id)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				missing = append(missing, id)
				continue
			}
			return nil, nil, err
		}
		if len(record) == 0 {
			missing = append(missing, id)
			continue
		}
		records = append(records, record)
	}
	return records, missing, nil
}

func (p *panelBinding) targetedBulkActionExecutionState(
	ctx AdminContext,
	actionName string,
	ids []string,
	listOpts ListOptions,
) (ActionState, bool, error) {
	if p == nil || p.panel == nil {
		return ActionState{}, false, nil
	}
	actionName = strings.TrimSpace(actionName)
	if actionName == "" {
		return ActionState{}, false, nil
	}
	action, ok := p.panel.findBulkAction(actionName)
	if !ok {
		return ActionState{}, false, nil
	}
	if !p.selectionSensitiveBulkStateEnabled([]Action{action}) {
		return ActionState{}, false, nil
	}
	states, err := p.selectionAwareBulkActionStates(ctx, []Action{action}, ids, listOpts)
	if err != nil {
		return ActionState{}, false, err
	}
	state, ok := states[action.Name]
	return state, ok, nil
}

func aggregateBulkSelectionState(action Action, candidates []bulkSelectionActionCandidate, total int) (ActionState, bool) {
	if len(candidates) == 0 {
		return ActionState{}, false
	}
	disabled := make([]bulkSelectionActionCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if !candidate.state.Enabled {
			disabled = append(disabled, candidate)
		}
	}
	if len(disabled) == 0 {
		return ActionState{}, false
	}
	if len(disabled) == len(candidates) && equivalentBulkSelectionStates(disabled) {
		state := disabled[0].state
		state.Metadata = mergeBulkSelectionMetadata(action, state.Metadata, disabled, total)
		return state, true
	}
	return mixedBulkSelectionState(action, disabled, total), true
}

func equivalentBulkSelectionStates(disabled []bulkSelectionActionCandidate) bool {
	if len(disabled) <= 1 {
		return true
	}
	first := disabled[0].state
	for _, candidate := range disabled[1:] {
		if !strings.EqualFold(strings.TrimSpace(candidate.state.ReasonCode), strings.TrimSpace(first.ReasonCode)) {
			return false
		}
		if strings.TrimSpace(candidate.state.Reason) != strings.TrimSpace(first.Reason) {
			return false
		}
		if !strings.EqualFold(strings.TrimSpace(candidate.state.Kind), strings.TrimSpace(first.Kind)) {
			return false
		}
	}
	return true
}

func missingBulkSelectionState(id string) ActionState {
	return ActionState{
		Enabled:    false,
		ReasonCode: ActionDisabledReasonCodeInvalidSelection,
		Reason:     "Selected record is no longer available.",
		Severity:   "warning",
		Kind:       "business_rule",
		Metadata: map[string]any{
			"field":        "ids",
			"missing_id":   strings.TrimSpace(id),
			"missing":      true,
			"error_code":   TextCodeInvalidSelection,
			"blocked_action": "selection",
		},
	}
}

func mixedBulkSelectionState(action Action, disabled []bulkSelectionActionCandidate, total int) ActionState {
	meta := mergeBulkSelectionMetadata(action, nil, disabled, total)
	kind := "business_rule"
	if firstKind := strings.TrimSpace(disabled[0].state.Kind); firstKind != "" {
		kind = firstKind
	}
	return ActionState{
		Enabled:    false,
		ReasonCode: ActionDisabledReasonCodeInvalidSelection,
		Reason:     bulkMixedSelectionReason(action),
		Severity:   "warning",
		Kind:       kind,
		Metadata:   meta,
	}
}

func mergeBulkSelectionMetadata(action Action, base map[string]any, disabled []bulkSelectionActionCandidate, total int) map[string]any {
	meta := primitives.CloneAnyMap(base)
	if meta == nil {
		meta = map[string]any{}
	}
	invalidIDs := make([]string, 0, len(disabled))
	reasonCodes := make([]string, 0, len(disabled))
	seenCodes := map[string]struct{}{}
	for _, candidate := range disabled {
		if id := strings.TrimSpace(candidate.recordID); id != "" {
			invalidIDs = append(invalidIDs, id)
		}
		if code := strings.TrimSpace(candidate.state.ReasonCode); code != "" {
			if _, ok := seenCodes[code]; !ok {
				seenCodes[code] = struct{}{}
				reasonCodes = append(reasonCodes, code)
			}
		}
	}
	meta["field"] = "ids"
	meta["blocked_action"] = strings.ToLower(strings.TrimSpace(action.Name))
	meta["invalid_count"] = len(disabled)
	meta["selected_count"] = total
	if len(invalidIDs) > 0 {
		meta["invalid_ids"] = append([]string{}, invalidIDs...)
	}
	if len(reasonCodes) > 0 {
		meta["reason_codes"] = append([]string{}, reasonCodes...)
	}
	first := disabled[0].state
	if sampleReason := strings.TrimSpace(first.Reason); sampleReason != "" {
		meta["sample_reason"] = sampleReason
	}
	if first.Remediation != nil {
		if label := strings.TrimSpace(first.Remediation.Label); label != "" {
			meta["remediation_label"] = label
		}
		if href := strings.TrimSpace(first.Remediation.Href); href != "" {
			meta["remediation_href"] = href
		}
		if kind := strings.TrimSpace(first.Remediation.Kind); kind != "" {
			meta["remediation_kind"] = kind
		}
	}
	if len(meta) == 0 {
		return nil
	}
	return meta
}

func bulkMixedSelectionReason(action Action) string {
	switch strings.ToLower(strings.TrimSpace(action.Name)) {
	case "delete", "bulk_delete":
		return "Some selected records cannot be deleted."
	case "publish":
		return "Some selected records cannot be published."
	case "unpublish":
		return "Some selected records cannot be unpublished."
	case "schedule":
		return "Some selected records cannot be scheduled."
	case "archive":
		return "Some selected records cannot be archived."
	case "send":
		return "Some selected records cannot be sent."
	case "void":
		return "Some selected records cannot be voided."
	}
	if label := strings.TrimSpace(action.Label); label != "" {
		return fmt.Sprintf("Some selected records cannot complete %q.", label)
	}
	return "Some selected records cannot complete this bulk action."
}

func bulkActionBlockedError(panelName string, action Action, state ActionState) error {
	code := strings.TrimSpace(state.ReasonCode)
	if code == "" {
		code = TextCodeInvalidSelection
	}
	message := strings.TrimSpace(state.Reason)
	if message == "" {
		message = bulkMixedSelectionReason(action)
	}
	meta := primitives.CloneAnyMap(state.Metadata)
	if meta == nil {
		meta = map[string]any{}
	}
	meta["panel"] = strings.TrimSpace(panelName)
	meta["action"] = strings.TrimSpace(action.Name)
	if state.Remediation != nil {
		if label := strings.TrimSpace(state.Remediation.Label); label != "" {
			meta["remediation_label"] = label
		}
		if href := strings.TrimSpace(state.Remediation.Href); href != "" {
			meta["remediation_href"] = href
		}
		if kind := strings.TrimSpace(state.Remediation.Kind); kind != "" {
			meta["remediation_kind"] = kind
		}
	}
	return NewDomainError(code, message, meta)
}

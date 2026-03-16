package modules

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"sort"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type documentAgreementReferenceSummary struct {
	Count    int
	Statuses []string
}

func documentsActionStateResolver(basePath string, agreements stores.AgreementStore, defaultScope stores.Scope) coreadmin.BatchActionStateResolver {
	return func(
		ctx coreadmin.AdminContext,
		records []map[string]any,
		actions []coreadmin.Action,
		_ coreadmin.ActionScope,
	) (map[string]map[string]coreadmin.ActionState, error) {
		if len(records) == 0 || len(actions) == 0 || agreements == nil || !containsActionName(actions, "delete") {
			return nil, nil
		}
		scope, err := resolveScopeFromContext(ctx.Context, defaultScope)
		if err != nil {
			return nil, err
		}
		summaries, err := listDocumentAgreementReferenceSummaries(ctx.Context, agreements, scope)
		if err != nil {
			return nil, err
		}
		if len(summaries) == 0 {
			return nil, nil
		}

		resolved := map[string]map[string]coreadmin.ActionState{}
		for _, record := range records {
			documentID := strings.TrimSpace(toString(record["id"]))
			if documentID == "" {
				continue
			}
			summary, ok := summaries[documentID]
			if !ok || summary.Count <= 0 {
				continue
			}
			resolved[documentID] = map[string]coreadmin.ActionState{
				"delete": documentDeleteBlockedActionState(basePath, documentID, summary),
			}
		}
		if len(resolved) == 0 {
			return nil, nil
		}
		return resolved, nil
	}
}

func withAgreementActionGuard(action coreadmin.Action) coreadmin.Action {
	switch strings.ToLower(strings.TrimSpace(action.Name)) {
	case "edit":
		action.Guard = agreementAllowedStatusesGuard(
			action.Name,
			[]string{stores.AgreementStatusDraft},
			"Draft agreements can be edited before they are sent.",
			"esign.agreements.edit_requires_draft",
		)
	case "send":
		action.Guard = agreementAllowedStatusesGuard(
			action.Name,
			[]string{stores.AgreementStatusDraft},
			"Only draft agreements can be sent for signature.",
			"esign.agreements.send_requires_draft",
		)
	case "request_review":
		action.Guard = agreementDraftReviewGuard(
			action.Name,
			[]string{stores.AgreementReviewStatusNone, ""},
			"Review can only be requested for draft agreements that do not already have an active review.",
			"esign.agreements.request_review_requires_draft_without_active_review",
		)
	case "reopen_review":
		action.Guard = agreementDraftReviewGuard(
			action.Name,
			[]string{
				stores.AgreementReviewStatusChangesRequested,
				stores.AgreementReviewStatusApproved,
				stores.AgreementReviewStatusClosed,
			},
			"Review can only be reopened for draft agreements after a prior review cycle exists.",
			"esign.agreements.reopen_review_requires_prior_review",
		)
	case "close_review":
		action.Guard = agreementDraftReviewGuard(
			action.Name,
			[]string{
				stores.AgreementReviewStatusInReview,
				stores.AgreementReviewStatusChangesRequested,
				stores.AgreementReviewStatusApproved,
			},
			"Review can only be closed when a draft agreement currently has review activity.",
			"esign.agreements.close_review_requires_active_review",
		)
	case "resend":
		action.Guard = agreementAllowedStatusesGuard(
			action.Name,
			[]string{stores.AgreementStatusSent, stores.AgreementStatusInProgress},
			"Only sent or in-progress agreements can be resent.",
			"esign.agreements.resend_requires_active_delivery",
		)
	case "request_correction":
		action.Guard = agreementAllowedStatusesGuard(
			action.Name,
			[]string{stores.AgreementStatusSent, stores.AgreementStatusInProgress},
			"Corrections can only be requested for sent or in-progress agreements.",
			"esign.agreements.request_correction_requires_active_delivery",
		)
	case "request_amendment":
		action.Guard = agreementAllowedStatusesGuard(
			action.Name,
			[]string{stores.AgreementStatusCompleted},
			"Amendments can only be requested for completed agreements.",
			"esign.agreements.request_amendment_requires_completed",
		)
	case "void":
		action.Guard = agreementAllowedStatusesGuard(
			action.Name,
			[]string{stores.AgreementStatusSent, stores.AgreementStatusInProgress},
			"Only sent or in-progress agreements can be voided.",
			"esign.agreements.void_requires_active_delivery",
		)
	case "delete":
		action.Guard = agreementDeleteDisabledGuard()
	case "resume_delivery":
		action.Guard = agreementResumeDeliveryGuard()
	}
	return action
}

func agreementAllowedStatusesGuard(actionName string, allowedStatuses []string, reason string, ruleID string) coreadmin.ActionGuard {
	normalizedAllowed := normalizeStatuses(allowedStatuses)
	return func(ctx coreadmin.ActionGuardContext) coreadmin.ActionState {
		currentStatus := normalizeAgreementStatus(ctx.Record["status"])
		if currentStatus != "" && statusAllowed(currentStatus, normalizedAllowed...) {
			return coreadmin.ActionState{Enabled: true}
		}
		return coreadmin.ActionState{
			Enabled:    false,
			ReasonCode: coreadmin.ActionDisabledReasonCodeInvalidStatus,
			Reason:     strings.TrimSpace(reason),
			Severity:   "warning",
			Kind:       "business_rule",
			Metadata: map[string]any{
				"blocked_action":   strings.ToLower(strings.TrimSpace(actionName)),
				"current_status":   currentStatus,
				"allowed_statuses": append([]string{}, normalizedAllowed...),
				"business_rule_id": strings.TrimSpace(ruleID),
			},
		}
	}
}

func agreementDraftReviewGuard(actionName string, allowedReviewStatuses []string, reason string, ruleID string) coreadmin.ActionGuard {
	normalizedAllowedReview := normalizeStatuses(allowedReviewStatuses)
	return func(ctx coreadmin.ActionGuardContext) coreadmin.ActionState {
		currentStatus := normalizeAgreementStatus(ctx.Record["status"])
		if !statusAllowed(currentStatus, stores.AgreementStatusDraft) {
			return coreadmin.ActionState{
				Enabled:    false,
				ReasonCode: coreadmin.ActionDisabledReasonCodeInvalidStatus,
				Reason:     "Review actions are only available for draft agreements.",
				Severity:   "warning",
				Kind:       "business_rule",
				Metadata: map[string]any{
					"blocked_action":   strings.ToLower(strings.TrimSpace(actionName)),
					"current_status":   currentStatus,
					"allowed_statuses": []string{stores.AgreementStatusDraft},
					"business_rule_id": "esign.agreements.review_requires_draft",
				},
			}
		}
		currentReviewStatus := normalizeAgreementStatus(ctx.Record["review_status"])
		if statusAllowed(currentReviewStatus, normalizedAllowedReview...) {
			return coreadmin.ActionState{Enabled: true}
		}
		return coreadmin.ActionState{
			Enabled:    false,
			ReasonCode: coreadmin.ActionDisabledReasonCodePreconditionFailed,
			Reason:     strings.TrimSpace(reason),
			Severity:   "warning",
			Kind:       "business_rule",
			Metadata: map[string]any{
				"blocked_action":          strings.ToLower(strings.TrimSpace(actionName)),
				"current_status":          currentStatus,
				"current_review_status":   currentReviewStatus,
				"allowed_review_statuses": append([]string{}, normalizedAllowedReview...),
				"business_rule_id":        strings.TrimSpace(ruleID),
			},
		}
	}
}

func agreementDeleteDisabledGuard() coreadmin.ActionGuard {
	return func(ctx coreadmin.ActionGuardContext) coreadmin.ActionState {
		return coreadmin.ActionState{
			Enabled:    false,
			ReasonCode: coreadmin.ActionDisabledReasonCodePreconditionFailed,
			Reason:     "Agreements cannot be deleted. Use Void to cancel an active agreement.",
			Severity:   "warning",
			Kind:       "business_rule",
			Metadata: map[string]any{
				"blocked_action":     "delete",
				"recommended_action": "void",
				"business_rule_id":   "esign.agreements.delete_disabled",
			},
		}
	}
}

func agreementResumeDeliveryGuard() coreadmin.ActionGuard {
	return func(ctx coreadmin.ActionGuardContext) coreadmin.ActionState {
		delivery, _ := ctx.Record["delivery"].(map[string]any)
		if delivery != nil {
			if recoverable, ok := delivery["notification_recoverable"].(bool); ok && recoverable {
				return coreadmin.ActionState{Enabled: true}
			}
		}
		return coreadmin.ActionState{
			Enabled:    false,
			ReasonCode: coreadmin.ActionDisabledReasonCodePreconditionFailed,
			Reason:     "Delivery retry is only available when notification recovery is possible.",
			Severity:   "warning",
			Kind:       "business_rule",
			Metadata: map[string]any{
				"blocked_action":   "resume_delivery",
				"recoverable":      false,
				"business_rule_id": "esign.agreements.resume_delivery_requires_recoverable_notification",
			},
		}
	}
}

func containsActionName(actions []coreadmin.Action, target string) bool {
	target = strings.ToLower(strings.TrimSpace(target))
	if target == "" {
		return false
	}
	for _, action := range actions {
		if strings.ToLower(strings.TrimSpace(action.Name)) == target {
			return true
		}
	}
	return false
}

func normalizeAgreementStatus(value any) string {
	return strings.ToLower(strings.TrimSpace(toString(value)))
}

func normalizeStatuses(statuses []string) []string {
	out := make([]string, 0, len(statuses))
	for _, status := range statuses {
		normalized := strings.ToLower(strings.TrimSpace(status))
		if normalized == "" {
			continue
		}
		out = append(out, normalized)
	}
	return out
}

func statusAllowed(current string, allowed ...string) bool {
	current = strings.ToLower(strings.TrimSpace(current))
	for _, candidate := range allowed {
		if current == strings.ToLower(strings.TrimSpace(candidate)) {
			return true
		}
	}
	return false
}

func listDocumentAgreementReferenceSummaries(ctx context.Context, agreements stores.AgreementStore, scope stores.Scope) (map[string]documentAgreementReferenceSummary, error) {
	if agreements == nil {
		return nil, nil
	}
	records, err := agreements.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, nil
	}

	type statusSet map[string]struct{}
	statusesByDocument := map[string]statusSet{}
	out := map[string]documentAgreementReferenceSummary{}
	for _, agreement := range records {
		documentID := strings.TrimSpace(agreement.DocumentID)
		if documentID == "" {
			continue
		}
		summary := out[documentID]
		summary.Count++
		out[documentID] = summary

		status := normalizeAgreementStatus(agreement.Status)
		if status == "" {
			continue
		}
		if _, ok := statusesByDocument[documentID]; !ok {
			statusesByDocument[documentID] = statusSet{}
		}
		statusesByDocument[documentID][status] = struct{}{}
	}

	for documentID, summary := range out {
		set := statusesByDocument[documentID]
		if len(set) == 0 {
			continue
		}
		statuses := make([]string, 0, len(set))
		for status := range set {
			statuses = append(statuses, status)
		}
		sort.Strings(statuses)
		summary.Statuses = statuses
		out[documentID] = summary
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}

func documentDeleteBlockedActionState(basePath, documentID string, summary documentAgreementReferenceSummary) coreadmin.ActionState {
	return coreadmin.ActionState{
		Enabled:    false,
		ReasonCode: coreadmin.ActionDisabledReasonCodeResourceInUse,
		Reason:     documentDeleteBlockedReason(summary),
		Severity:   "warning",
		Kind:       "business_rule",
		Metadata: documentDeleteBlockedMetadata(documentID, summary, map[string]any{
			"blocked_action":   "delete",
			"business_rule_id": "esign.documents.delete_requires_no_agreements",
		}),
		Remediation: &coreadmin.ActionRemediation{
			Label: "View agreements",
			Href:  documentAgreementRemediationHref(basePath, documentID),
			Kind:  "link",
		},
	}
}

func documentDeleteConflictError(basePath, documentID string, summary documentAgreementReferenceSummary) error {
	return coreadmin.NewDomainError(
		coreadmin.TextCodeResourceInUse,
		documentDeleteBlockedReason(summary),
		documentDeleteBlockedMetadata(documentID, summary, map[string]any{
			"blocked_action":    "delete",
			"business_rule_id":  "esign.documents.delete_requires_no_agreements",
			"remediation_href":  documentAgreementRemediationHref(basePath, documentID),
			"remediation_label": "View agreements",
		}),
	)
}

func documentDeleteBlockedReason(summary documentAgreementReferenceSummary) string {
	if summary.Count == 1 {
		return "This document cannot be deleted because it is attached to 1 agreement."
	}
	return fmt.Sprintf("This document cannot be deleted because it is attached to %d agreements.", summary.Count)
}

func documentDeleteBlockedMetadata(documentID string, summary documentAgreementReferenceSummary, extra map[string]any) map[string]any {
	meta := map[string]any{
		"entity":          "documents",
		"field":           "id",
		"id":              strings.TrimSpace(documentID),
		"document_id":     strings.TrimSpace(documentID),
		"agreement_count": summary.Count,
	}
	if len(summary.Statuses) > 0 {
		meta["agreement_statuses"] = append([]string{}, summary.Statuses...)
	}
	for key, value := range extra {
		if _, exists := meta[key]; exists {
			continue
		}
		meta[key] = value
	}
	return meta
}

func documentAgreementRemediationHref(basePath, documentID string) string {
	href := joinBasePath(basePath, path.Join("content", esignAgreementsPanelID))
	if strings.TrimSpace(documentID) == "" {
		return href
	}
	return href + "?document_id=" + url.QueryEscape(strings.TrimSpace(documentID))
}

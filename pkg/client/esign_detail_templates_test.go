package client

import (
	"strings"
	"testing"
)

func TestESignAgreementDetailTemplateGatesExecutedWarningsByApplicability(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/esign-agreements/detail.html")

	required := []string{
		`{% set page_executed_applicable = resource_item.delivery and resource_item.delivery.executed_applicable %}`,
		`{% if page_executed_applicable and page_status == "completed" and not page_executed_available %}`,
		`const executedApplicable = {% if resource_item.delivery and resource_item.delivery.executed_applicable %}true{% else %}false{% endif %};`,
		`if (executedApplicable && agreementStatus === 'completed' && executedDeliveryStatus !== 'ready' && !executedObjectKey) {`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected applicability-gated warning fragment not found: %q", fragment)
	}
}

func TestESignAgreementDetailTemplateShowsNonApplicableArtifactCopy(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/esign-agreements/detail.html")

	required := []string{
		`{% if not page_executed_applicable %}`,
		`{% if not page_certificate_applicable %}`,
		`Not Available Until Completion`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected non-applicable artifact fragment not found: %q", fragment)
	}
}

func TestESignDocumentDetailTemplateIncludesLineagePresentationCard(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/esign-documents/detail.html")

	required := []string{
		`{% if resource_item.lineage_presentation %}`,
		`{% include "partials/esign-lineage-card.html" with provenance=resource_item.lineage_presentation %}`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected lineage presentation fragment not found: %q", fragment)
	}
}

func TestESignLineageCardTemplateRendersBackendAuthoredWarningActions(t *testing.T) {
	template := mustReadClientTemplate(t, "partials/esign-lineage-card.html")

	required := []string{
		`{% if warning.action_label and warning.action_url %}`,
		`data-lineage-warning-action`,
		`data-lineage-warning-visibility="{{ warning.review_action_visible|default:'' }}"`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected lineage action fragment not found: %q", fragment)
	}
}

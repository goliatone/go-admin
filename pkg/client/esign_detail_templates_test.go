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

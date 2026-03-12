package services

import (
	"strings"

	"github.com/google/uuid"
)

var translationBackfillNamespace = uuid.MustParse("2e6af8bf-2983-4e6f-bb00-8b7fb2af1499")

type Scope struct {
	TenantID string `json:"tenant_id,omitempty"`
	OrgID    string `json:"org_id,omitempty"`
}

func (s Scope) normalizedTenantID() string {
	if tenantID := strings.TrimSpace(strings.ToLower(s.TenantID)); tenantID != "" {
		return tenantID
	}
	return "__global__"
}

func (s Scope) normalizedOrgID() string {
	if orgID := strings.TrimSpace(strings.ToLower(s.OrgID)); orgID != "" {
		return orgID
	}
	return "__global__"
}

func deterministicTranslationID(parts ...string) string {
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		normalized = append(normalized, strings.TrimSpace(strings.ToLower(part)))
	}
	return uuid.NewSHA1(translationBackfillNamespace, []byte(strings.Join(normalized, "|"))).String()
}

func DeterministicFamilyID(scope Scope, contentType, sourceRecordID string) string {
	return deterministicTranslationID(
		"family",
		scope.normalizedTenantID(),
		scope.normalizedOrgID(),
		contentType,
		sourceRecordID,
	)
}

func DeterministicVariantID(scope Scope, familyID, locale string) string {
	return deterministicTranslationID(
		"variant",
		scope.normalizedTenantID(),
		scope.normalizedOrgID(),
		familyID,
		locale,
	)
}

func DeterministicAssignmentID(scope Scope, familyID, locale, workScope string) string {
	return deterministicTranslationID(
		"assignment",
		scope.normalizedTenantID(),
		scope.normalizedOrgID(),
		familyID,
		locale,
		workScope,
	)
}

func DeterministicBlockerID(scope Scope, familyID, blockerCode, locale, fieldPath string) string {
	return deterministicTranslationID(
		"blocker",
		scope.normalizedTenantID(),
		scope.normalizedOrgID(),
		familyID,
		blockerCode,
		locale,
		fieldPath,
	)
}

func DeterministicEventID(scope Scope, assignmentID, eventType, actorID string) string {
	return deterministicTranslationID(
		"event",
		scope.normalizedTenantID(),
		scope.normalizedOrgID(),
		assignmentID,
		eventType,
		actorID,
	)
}

func DeterministicExchangeJobID(scope Scope, kind, actorID, checksum string) string {
	return deterministicTranslationID(
		"exchange-job",
		scope.normalizedTenantID(),
		scope.normalizedOrgID(),
		kind,
		actorID,
		checksum,
	)
}

package core

import "sort"

const SchemaVersion = 1

type FamilyReadinessState string

const (
	FamilyReadinessReady   FamilyReadinessState = "ready"
	FamilyReadinessBlocked FamilyReadinessState = "blocked"
)

type FamilyBlockerCode string

const (
	FamilyBlockerMissingLocale  FamilyBlockerCode = "missing_locale"
	FamilyBlockerMissingField   FamilyBlockerCode = "missing_field"
	FamilyBlockerPendingReview  FamilyBlockerCode = "pending_review"
	FamilyBlockerOutdatedSource FamilyBlockerCode = "outdated_source"
	FamilyBlockerPolicyDenied   FamilyBlockerCode = "policy_denied"
)

type VariantStatus string

const (
	VariantStatusDraft      VariantStatus = "draft"
	VariantStatusInProgress VariantStatus = "in_progress"
	VariantStatusInReview   VariantStatus = "in_review"
	VariantStatusApproved   VariantStatus = "approved"
	VariantStatusPublished  VariantStatus = "published"
	VariantStatusArchived   VariantStatus = "archived"
)

type AssignmentStatus string

const (
	AssignmentStatusOpen             AssignmentStatus = "open"
	AssignmentStatusAssigned         AssignmentStatus = "assigned"
	AssignmentStatusInProgress       AssignmentStatus = "in_progress"
	AssignmentStatusInReview         AssignmentStatus = "in_review"
	AssignmentStatusChangesRequested AssignmentStatus = "changes_requested"
	AssignmentStatusApproved         AssignmentStatus = "approved"
	AssignmentStatusArchived         AssignmentStatus = "archived"
)

type DueState string

const (
	DueStateNone    DueState = "none"
	DueStateOnTrack DueState = "on_track"
	DueStateDueSoon DueState = "due_soon"
	DueStateOverdue DueState = "overdue"
)

type AssignmentLifecycleMode string

const (
	AssignmentLifecycleManualArchive       AssignmentLifecycleMode = "manual_archive"
	AssignmentLifecycleAutoArchive         AssignmentLifecycleMode = "auto_archive"
	AssignmentLifecycleSingleActivePerLang AssignmentLifecycleMode = "single_active_per_locale"
)

type DisabledReasonCode string

const (
	DisabledReasonTranslationMissing DisabledReasonCode = "TRANSLATION_MISSING"
	DisabledReasonInvalidStatus      DisabledReasonCode = "INVALID_STATUS"
	DisabledReasonPermissionDenied   DisabledReasonCode = "PERMISSION_DENIED"
	DisabledReasonMissingContext     DisabledReasonCode = "MISSING_CONTEXT"
	DisabledReasonFeatureDisabled    DisabledReasonCode = "FEATURE_DISABLED"
)

type ErrorCode string

const (
	ErrorValidation       ErrorCode = "VALIDATION_ERROR"
	ErrorNotFound         ErrorCode = "NOT_FOUND"
	ErrorPermissionDenied ErrorCode = "PERMISSION_DENIED"
	ErrorVersionConflict  ErrorCode = "VERSION_CONFLICT"
	ErrorInvalidStatus    ErrorCode = "INVALID_STATUS_TRANSITION"
	ErrorMissingLinkage   ErrorCode = "MISSING_LINKAGE"
	ErrorDuplicateRow     ErrorCode = "DUPLICATE_ROW"
	ErrorStaleSourceHash  ErrorCode = "STALE_SOURCE_HASH"
	ErrorPolicyBlocked    ErrorCode = "POLICY_BLOCKED"
	ErrorInternal         ErrorCode = "INTERNAL_ERROR"
)

func FamilyReadinessStates() []string {
	return []string{
		string(FamilyReadinessReady),
		string(FamilyReadinessBlocked),
	}
}

func FamilyBlockerCodes() []string {
	return []string{
		string(FamilyBlockerMissingLocale),
		string(FamilyBlockerMissingField),
		string(FamilyBlockerPendingReview),
		string(FamilyBlockerOutdatedSource),
		string(FamilyBlockerPolicyDenied),
	}
}

func VariantStatuses() []string {
	return []string{
		string(VariantStatusDraft),
		string(VariantStatusInProgress),
		string(VariantStatusInReview),
		string(VariantStatusApproved),
		string(VariantStatusPublished),
		string(VariantStatusArchived),
	}
}

func AssignmentStatuses() []string {
	return []string{
		string(AssignmentStatusOpen),
		string(AssignmentStatusAssigned),
		string(AssignmentStatusInProgress),
		string(AssignmentStatusInReview),
		string(AssignmentStatusChangesRequested),
		string(AssignmentStatusApproved),
		string(AssignmentStatusArchived),
	}
}

func DueStates() []string {
	return []string{
		string(DueStateNone),
		string(DueStateOnTrack),
		string(DueStateDueSoon),
		string(DueStateOverdue),
	}
}

func AssignmentLifecycleModes() []string {
	return []string{
		string(AssignmentLifecycleManualArchive),
		string(AssignmentLifecycleAutoArchive),
		string(AssignmentLifecycleSingleActivePerLang),
	}
}

func DisabledReasonCodes() []string {
	return []string{
		string(DisabledReasonTranslationMissing),
		string(DisabledReasonInvalidStatus),
		string(DisabledReasonPermissionDenied),
		string(DisabledReasonMissingContext),
		string(DisabledReasonFeatureDisabled),
	}
}

func ErrorCodes() []string {
	return []string{
		string(ErrorValidation),
		string(ErrorNotFound),
		string(ErrorPermissionDenied),
		string(ErrorVersionConflict),
		string(ErrorInvalidStatus),
		string(ErrorMissingLinkage),
		string(ErrorDuplicateRow),
		string(ErrorStaleSourceHash),
		string(ErrorPolicyBlocked),
		string(ErrorInternal),
	}
}

func VocabularyPayload() map[string]any {
	return map[string]any{
		"schema_version": SchemaVersion,
		"statuses": map[string]any{
			"family_readiness":  FamilyReadinessStates(),
			"family_blockers":   FamilyBlockerCodes(),
			"variant_status":    VariantStatuses(),
			"assignment_status": AssignmentStatuses(),
			"due_state":         DueStates(),
		},
		"disabled_reason_codes": DisabledReasonCodes(),
		"error_codes":           ErrorCodes(),
		"assignment_lifecycle":  AssignmentLifecycleModes(),
	}
}

func SortedStrings(values []string) []string {
	out := append([]string{}, values...)
	sort.Strings(out)
	return out
}

package admin

// Canonical action disabled reason codes consumed by frontend action renderers.
const (
	ActionDisabledReasonCodeTranslationMissing = "TRANSLATION_MISSING"
	ActionDisabledReasonCodeInvalidStatus      = "INVALID_STATUS"
	ActionDisabledReasonCodePermissionDenied   = "PERMISSION_DENIED"
	ActionDisabledReasonCodeMissingContext     = "MISSING_CONTEXT"
)

// ActionDisabledReasonCodes returns the canonical disabled reason-code vocabulary.
func ActionDisabledReasonCodes() []string {
	return []string{
		ActionDisabledReasonCodeTranslationMissing,
		ActionDisabledReasonCodeInvalidStatus,
		ActionDisabledReasonCodePermissionDenied,
		ActionDisabledReasonCodeMissingContext,
	}
}

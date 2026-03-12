package admin

import translationcore "github.com/goliatone/go-admin/translations/core"

// Canonical action disabled reason codes consumed by frontend action renderers.
const (
	ActionDisabledReasonCodeTranslationMissing = string(translationcore.DisabledReasonTranslationMissing)
	ActionDisabledReasonCodeInvalidStatus      = string(translationcore.DisabledReasonInvalidStatus)
	ActionDisabledReasonCodePermissionDenied   = string(translationcore.DisabledReasonPermissionDenied)
	ActionDisabledReasonCodeMissingContext     = string(translationcore.DisabledReasonMissingContext)
	ActionDisabledReasonCodeFeatureDisabled    = TextCodeFeatureDisabled
)

// ActionDisabledReasonCodes returns the canonical disabled reason-code vocabulary.
func ActionDisabledReasonCodes() []string {
	return []string{
		ActionDisabledReasonCodeTranslationMissing,
		ActionDisabledReasonCodeInvalidStatus,
		ActionDisabledReasonCodePermissionDenied,
		ActionDisabledReasonCodeMissingContext,
		ActionDisabledReasonCodeFeatureDisabled,
	}
}

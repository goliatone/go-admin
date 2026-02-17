package admin

import "testing"

func TestActionDisabledReasonCodesCanonicalVocabulary(t *testing.T) {
	codes := ActionDisabledReasonCodes()
	if len(codes) == 0 {
		t.Fatalf("expected canonical disabled reason codes")
	}
	seen := map[string]struct{}{}
	for _, code := range codes {
		if code == "" {
			t.Fatalf("expected non-empty reason code")
		}
		if _, ok := seen[code]; ok {
			t.Fatalf("duplicate reason code %q", code)
		}
		seen[code] = struct{}{}
	}
	for _, required := range []string{
		ActionDisabledReasonCodeTranslationMissing,
		ActionDisabledReasonCodeInvalidStatus,
		ActionDisabledReasonCodePermissionDenied,
		ActionDisabledReasonCodeMissingContext,
		ActionDisabledReasonCodeFeatureDisabled,
	} {
		if _, ok := seen[required]; !ok {
			t.Fatalf("missing required reason code %q from %+v", required, codes)
		}
	}
}

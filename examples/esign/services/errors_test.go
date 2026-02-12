package services

import (
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
)

func TestRegisterDomainErrorCodes(t *testing.T) {
	RegisterDomainErrorCodes()

	for _, code := range DomainErrorCodes {
		if _, ok := coreadmin.DomainErrorCodeFor(code.Code); !ok {
			t.Fatalf("expected domain error code %s to be registered", code.Code)
		}
	}
}

func TestErrorCodeConstantsIncludePhaseZeroBaseline(t *testing.T) {
	required := []ErrorCode{
		ErrorCodeTokenExpired,
		ErrorCodeAssetUnavailable,
		ErrorCodeAgreementImmutable,
		ErrorCodeMissingRequiredFields,
	}

	for _, code := range required {
		if string(code) == "" {
			t.Fatalf("expected non-empty code")
		}
	}
}

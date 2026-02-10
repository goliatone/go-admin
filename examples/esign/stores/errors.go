package stores

import (
	"fmt"
	"net/http"

	goerrors "github.com/goliatone/go-errors"
)

func scopeRequiredError() error {
	return goerrors.New("tenant_id and org_id are required", goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode("SCOPE_DENIED")
}

func scopeDeniedError() error {
	return goerrors.New("tenant or org scope denied", goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithTextCode("SCOPE_DENIED")
}

func invalidRecordError(entity, field, reason string) error {
	meta := map[string]any{"entity": entity, "field": field}
	if reason != "" {
		meta["reason"] = reason
	}
	return goerrors.New("invalid record", goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode("MISSING_REQUIRED_FIELDS").
		WithMetadata(meta)
}

func notFoundError(entity, id string) error {
	return goerrors.New(fmt.Sprintf("%s not found", entity), goerrors.CategoryNotFound).
		WithCode(http.StatusNotFound).
		WithTextCode("NOT_FOUND").
		WithMetadata(map[string]any{"entity": entity, "id": id})
}

func immutableAgreementError(agreementID, status string) error {
	return goerrors.New("agreement is immutable after send", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("AGREEMENT_IMMUTABLE").
		WithMetadata(map[string]any{"agreement_id": agreementID, "status": status})
}

func versionConflictError(entity, id string, expected, actual int64) error {
	return goerrors.New("version conflict", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("VERSION_CONFLICT").
		WithMetadata(map[string]any{
			"entity":   entity,
			"id":       id,
			"expected": expected,
			"actual":   actual,
		})
}

func invalidSignerStateError(message string) error {
	message = fmt.Sprintf("invalid signer state: %s", message)
	return goerrors.New(message, goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("INVALID_SIGNER_STATE")
}

func auditEventsAppendOnlyError() error {
	return goerrors.New("audit_events is append-only", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("AUDIT_EVENTS_APPEND_ONLY")
}

func invalidTokenError() error {
	return goerrors.New("invalid signing token", goerrors.CategoryAuthz).
		WithCode(http.StatusUnauthorized).
		WithTextCode("TOKEN_INVALID")
}

func tokenExpiredError(tokenID string) error {
	return goerrors.New("signing token expired", goerrors.CategoryAuthz).
		WithCode(http.StatusGone).
		WithTextCode("TOKEN_EXPIRED").
		WithMetadata(map[string]any{"token_id": tokenID})
}

func tokenRevokedError(tokenID string) error {
	return goerrors.New("signing token revoked", goerrors.CategoryAuthz).
		WithCode(http.StatusGone).
		WithTextCode("TOKEN_REVOKED").
		WithMetadata(map[string]any{"token_id": tokenID})
}

func rateLimitedError() error {
	return goerrors.New("rate limit exceeded", goerrors.CategoryRateLimit).
		WithCode(http.StatusTooManyRequests).
		WithTextCode("RATE_LIMITED")
}

func storageEncryptionRequiredError(objectKey string) error {
	return goerrors.New("object storage encryption required", goerrors.CategoryBadInput).
		WithCode(http.StatusInternalServerError).
		WithTextCode("STORAGE_ENCRYPTION_REQUIRED").
		WithMetadata(map[string]any{"object_key": objectKey})
}

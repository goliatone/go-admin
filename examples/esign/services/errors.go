package services

import (
	coreadmin "github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
)

// ErrorCode defines typed, API-safe text codes for e-sign domain errors.
type ErrorCode string

const (
	ErrorCodeTokenExpired           ErrorCode = "TOKEN_EXPIRED"
	ErrorCodeTokenRevoked           ErrorCode = "TOKEN_REVOKED"
	ErrorCodeTokenInvalid           ErrorCode = "TOKEN_INVALID"
	ErrorCodeAssetUnavailable       ErrorCode = "ASSET_UNAVAILABLE"
	ErrorCodeAgreementImmutable     ErrorCode = "AGREEMENT_IMMUTABLE"
	ErrorCodeMissingRequiredFields  ErrorCode = "MISSING_REQUIRED_FIELDS"
	ErrorCodeInvalidSignerState     ErrorCode = "INVALID_SIGNER_STATE"
	ErrorCodeScopeDenied            ErrorCode = "SCOPE_DENIED"
	ErrorCodeRateLimited            ErrorCode = "RATE_LIMITED"
	ErrorCodeTransportSecurity      ErrorCode = "TRANSPORT_SECURITY_REQUIRED"
	ErrorCodeStorageEncryption      ErrorCode = "STORAGE_ENCRYPTION_REQUIRED"
	ErrorCodeGooglePermissionDenied ErrorCode = "GOOGLE_PERMISSION_DENIED"
	ErrorCodeGoogleRateLimited      ErrorCode = "GOOGLE_RATE_LIMITED"
	ErrorCodeGoogleAccessRevoked    ErrorCode = "GOOGLE_ACCESS_REVOKED"
	ErrorCodeGoogleScopeViolation   ErrorCode = "GOOGLE_SCOPE_VIOLATION"
	ErrorCodeGoogleIntegrationOff   ErrorCode = "GOOGLE_INTEGRATION_DISABLED"
	ErrorCodeGoogleProviderDegraded ErrorCode = "GOOGLE_PROVIDER_DEGRADED"
)

// DomainErrorCodes is the phase-0 e-sign error namespace registration payload.
var DomainErrorCodes = []coreadmin.DomainErrorCode{
	{
		Code:        string(ErrorCodeTokenExpired),
		Description: "Signing token has expired.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  410,
	},
	{
		Code:        string(ErrorCodeTokenRevoked),
		Description: "Signing token has been revoked.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  410,
	},
	{
		Code:        string(ErrorCodeTokenInvalid),
		Description: "Signing token is invalid.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  401,
	},
	{
		Code:        string(ErrorCodeAssetUnavailable),
		Description: "Requested signer asset is unavailable for this token.",
		Category:    goerrors.CategoryNotFound,
		HTTPStatus:  404,
	},
	{
		Code:        string(ErrorCodeAgreementImmutable),
		Description: "Agreement is immutable after send.",
		Category:    goerrors.CategoryConflict,
		HTTPStatus:  409,
	},
	{
		Code:        string(ErrorCodeMissingRequiredFields),
		Description: "Required fields are missing.",
		Category:    goerrors.CategoryValidation,
		HTTPStatus:  400,
	},
	{
		Code:        string(ErrorCodeInvalidSignerState),
		Description: "Signer action is invalid for the current agreement state.",
		Category:    goerrors.CategoryBadInput,
		HTTPStatus:  409,
	},
	{
		Code:        string(ErrorCodeScopeDenied),
		Description: "Tenant or organization scope access is denied.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  403,
	},
	{
		Code:        string(ErrorCodeRateLimited),
		Description: "Request has been rate limited.",
		Category:    goerrors.CategoryRateLimit,
		HTTPStatus:  429,
	},
	{
		Code:        string(ErrorCodeTransportSecurity),
		Description: "TLS transport is required for this endpoint.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  426,
	},
	{
		Code:        string(ErrorCodeStorageEncryption),
		Description: "Encrypted object storage is required for e-sign artifacts.",
		Category:    goerrors.CategoryBadInput,
		HTTPStatus:  500,
	},
	{
		Code:        string(ErrorCodeGooglePermissionDenied),
		Description: "Google provider denied permission for the requested operation.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  403,
	},
	{
		Code:        string(ErrorCodeGoogleRateLimited),
		Description: "Google provider rate limit exceeded.",
		Category:    goerrors.CategoryRateLimit,
		HTTPStatus:  429,
	},
	{
		Code:        string(ErrorCodeGoogleAccessRevoked),
		Description: "Google integration access was revoked.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  401,
	},
	{
		Code:        string(ErrorCodeGoogleScopeViolation),
		Description: "Google OAuth scopes do not match the least-privilege policy.",
		Category:    goerrors.CategoryValidation,
		HTTPStatus:  400,
	},
	{
		Code:        string(ErrorCodeGoogleIntegrationOff),
		Description: "Google integration is disabled by feature flag.",
		Category:    goerrors.CategoryAuthz,
		HTTPStatus:  404,
	},
	{
		Code:        string(ErrorCodeGoogleProviderDegraded),
		Description: "Google provider is degraded or unavailable.",
		Category:    goerrors.CategoryBadInput,
		HTTPStatus:  503,
	},
}

// RegisterDomainErrorCodes registers the phase-0 e-sign domain error namespace.
func RegisterDomainErrorCodes() {
	coreadmin.RegisterDomainErrorCodes(DomainErrorCodes...)
}

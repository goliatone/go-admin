package admin

import (
	"net/http"
	"sort"

	goerrors "github.com/goliatone/go-errors"
	ferrors "github.com/goliatone/go-featuregate/ferrors"
)

const (
	TextCodeValidationError           = "VALIDATION_ERROR"
	TextCodeInvalidFeatureConfig      = "INVALID_FEATURE_CONFIG"
	TextCodeForbidden                 = "FORBIDDEN"
	TextCodeNotFound                  = "NOT_FOUND"
	TextCodeFeatureDisabled           = "FEATURE_DISABLED"
	TextCodeReplSessionLimit          = "REPL_SESSION_LIMIT"
	TextCodeWorkflowNotFound          = "WORKFLOW_NOT_FOUND"
	TextCodeWorkflowInvalidTransition = "WORKFLOW_INVALID_TRANSITION"
	TextCodeTranslationMissing        = "TRANSLATION_MISSING"
	TextCodeContentTypeSchemaBreaking = "CONTENT_TYPE_SCHEMA_BREAKING"
	TextCodeFeatureEnabledRequired    = "FEATURE_ENABLED_REQUIRED"
	TextCodeFeatureAliasDisabled      = "FEATURE_ALIAS_DISABLED"
	TextCodeMissingPanel              = "MISSING_PANEL"
	TextCodeRawUINotSupported         = "RAW_UI_NOT_SUPPORTED"
	TextCodeClearKeysNotSupported     = "CLEAR_KEYS_NOT_SUPPORTED"
	TextCodeReplDebugDisabled         = "REPL_DEBUG_DISABLED"
	TextCodeReplShellDisabled         = "REPL_SHELL_DISABLED"
	TextCodeReplAppDisabled           = "REPL_APP_DISABLED"
	TextCodeReplDisabled              = "REPL_DISABLED"
	TextCodeReplOverrideDenied        = "REPL_OVERRIDE_DENIED"
	TextCodeReplRoleDenied            = "REPL_ROLE_DENIED"
	TextCodeReplPermissionDenied      = "REPL_PERMISSION_DENIED"
	TextCodeReplExecPermissionDenied  = "REPL_EXEC_PERMISSION_DENIED"
	TextCodeReplReadOnly              = "REPL_READ_ONLY"
	TextCodeReplIPDenied              = "REPL_IP_DENIED"
	TextCodePathConflict              = "PATH_CONFLICT"
	TextCodeConflict                  = "CONFLICT"
	TextCodeServiceUnavailable        = "SERVICE_UNAVAILABLE"
)

// DomainErrorCode describes a text code exposed to clients.
type DomainErrorCode struct {
	Code        string
	Description string
	Category    goerrors.Category
	HTTPStatus  int
}

var defaultDomainErrorCodes = []DomainErrorCode{
	{Code: TextCodeValidationError, Description: "Validation failed for the submitted payload.", Category: goerrors.CategoryValidation, HTTPStatus: 400},
	{Code: TextCodeInvalidFeatureConfig, Description: "Feature configuration is invalid or missing dependencies.", Category: goerrors.CategoryValidation, HTTPStatus: 400},
	{Code: TextCodeForbidden, Description: "The request is not authorized.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeNotFound, Description: "The requested resource was not found.", Category: goerrors.CategoryNotFound, HTTPStatus: 404},
	{Code: TextCodeFeatureDisabled, Description: "The requested feature is disabled.", Category: goerrors.CategoryNotFound, HTTPStatus: 404},
	{Code: TextCodeReplSessionLimit, Description: "REPL session limit reached.", Category: goerrors.CategoryRateLimit, HTTPStatus: 429},
	{Code: TextCodeWorkflowNotFound, Description: "Workflow definition is missing for the entity type.", Category: goerrors.CategoryNotFound, HTTPStatus: 404},
	{Code: TextCodeWorkflowInvalidTransition, Description: "Workflow transition is invalid for the current state.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: TextCodeTranslationMissing, Description: "Required translations are missing for this workflow transition.", Category: goerrors.CategoryValidation, HTTPStatus: 400},
	{Code: TextCodeContentTypeSchemaBreaking, Description: "Content type schema changes are breaking.", Category: goerrors.CategoryBadInput, HTTPStatus: 409},
	{Code: TextCodeFeatureEnabledRequired, Description: "Feature must be enabled to apply overrides.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: TextCodeFeatureAliasDisabled, Description: "Feature alias overrides are disabled.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: TextCodeMissingPanel, Description: "Required debug panel identifier is missing.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: TextCodeRawUINotSupported, Description: "Raw preferences UI is not supported for this module.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: TextCodeClearKeysNotSupported, Description: "Clearing preference keys is not supported for this scope.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: TextCodeReplDebugDisabled, Description: "Debug module is disabled.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplShellDisabled, Description: "Shell REPL is disabled.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplAppDisabled, Description: "App REPL is disabled.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplDisabled, Description: "REPL is disabled.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplOverrideDenied, Description: "REPL override denied.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplRoleDenied, Description: "REPL role not allowed.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplPermissionDenied, Description: "REPL permission denied.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplExecPermissionDenied, Description: "REPL exec permission denied.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplReadOnly, Description: "REPL exec disabled while read-only.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodeReplIPDenied, Description: "REPL access denied by IP policy.", Category: goerrors.CategoryAuthz, HTTPStatus: 403},
	{Code: TextCodePathConflict, Description: "The requested path or slug conflicts with an existing resource.", Category: goerrors.CategoryConflict, HTTPStatus: 409},
	{Code: TextCodeConflict, Description: "The request conflicts with an existing resource or state.", Category: goerrors.CategoryConflict, HTTPStatus: 409},
	{Code: TextCodeServiceUnavailable, Description: "A required service dependency is unavailable.", Category: goerrors.CategoryInternal, HTTPStatus: 500},
	{Code: ferrors.TextCodeInvalidKey, Description: "Feature key is required.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: ferrors.TextCodeScopeMetadataMissing, Description: "Scope metadata is missing.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
	{Code: ferrors.TextCodeScopeInvalid, Description: "Scope is invalid.", Category: goerrors.CategoryBadInput, HTTPStatus: 400},
}

var domainErrorRegistry = map[string]DomainErrorCode{}

func init() {
	RegisterDomainErrorCodes(defaultDomainErrorCodes...)
}

// RegisterDomainErrorCodes adds or replaces domain error code metadata.
func RegisterDomainErrorCodes(codes ...DomainErrorCode) {
	for _, code := range codes {
		if code.Code == "" {
			continue
		}
		domainErrorRegistry[code.Code] = code
	}
}

// DomainErrorCodeFor returns metadata for a registered domain error code.
func DomainErrorCodeFor(code string) (DomainErrorCode, bool) {
	meta, ok := domainErrorRegistry[code]
	return meta, ok
}

// DomainErrorCodes returns all registered codes sorted by code.
func DomainErrorCodes() []DomainErrorCode {
	out := make([]DomainErrorCode, 0, len(domainErrorRegistry))
	for _, meta := range domainErrorRegistry {
		out = append(out, meta)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Code < out[j].Code
	})
	return out
}

// NewDomainError builds a go-errors Error from a registered domain error code.
func NewDomainError(code, message string, meta map[string]any) *goerrors.Error {
	if entry, ok := DomainErrorCodeFor(code); ok {
		err := goerrors.New(message, entry.Category).
			WithCode(entry.HTTPStatus).
			WithTextCode(code)
		if len(meta) > 0 {
			err.WithMetadata(meta)
		}
		return err
	}
	err := goerrors.New(message, goerrors.CategoryInternal).
		WithCode(http.StatusInternalServerError).
		WithTextCode(code)
	if len(meta) > 0 {
		err.WithMetadata(meta)
	}
	return err
}

package modules

import (
	"fmt"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/services"
)

const (
	settingEmailDefaultFromName      = "esign.email.default_from_name"
	settingEmailDefaultFromAddress   = "esign.email.default_from_address"
	settingTokenTTLSeconds           = "esign.policy.token_ttl_seconds"
	settingPDFMaxSourceBytes         = services.SettingPDFMaxSourceBytes
	settingMaxSourceSizeBytes        = services.SettingPDFMaxSourceBytesLegacy
	settingPDFMaxPages               = services.SettingPDFMaxPages
	settingPDFMaxObjects             = services.SettingPDFMaxObjects
	settingPDFMaxDecompressedBytes   = services.SettingPDFMaxDecompressedBytes
	settingPDFParseTimeoutMS         = services.SettingPDFParseTimeoutMS
	settingPDFNormalizationTimeoutMS = services.SettingPDFNormalizationTimeoutMS
	settingPDFAllowEncrypted         = services.SettingPDFAllowEncrypted
	settingPDFAllowJavaScript        = services.SettingPDFAllowJavaScriptActions
	settingPDFCompatibilityMode      = services.SettingPDFCompatibilityMode
	settingPDFPipelineMode           = services.SettingPDFPipelineMode
	settingSavedSignaturesLimit      = "esign.policy.saved_signatures_limit_per_type"
	settingPreviewFallbackEnabled    = services.SettingPDFPreviewFallbackEnabled
)

// RuntimeSettings captures e-sign runtime settings resolved from SettingsService.
type RuntimeSettings struct {
	EmailDefaultFromName    string
	EmailDefaultFromAddress string
	TokenTTLSeconds         int64
	MaxSourcePDFBytes       int64
	SavedSignaturesLimit    int64
	PreviewFallbackEnabled  bool
}

func defaultRuntimeSettings() RuntimeSettings {
	cfg := appcfg.Active()
	savedSignatureLimit := int64(appcfg.Active().Signer.SavedSignaturesLimitPerType)
	if savedSignatureLimit <= 0 {
		savedSignatureLimit = 10
	}
	maxSourceBytes := cfg.Signer.PDF.MaxSourceBytes
	if maxSourceBytes <= 0 {
		maxSourceBytes = 10 * 1024 * 1024
	}
	return RuntimeSettings{
		EmailDefaultFromName:    "E-Sign",
		EmailDefaultFromAddress: "no-reply@example.test",
		TokenTTLSeconds:         int64((72 * time.Hour) / time.Second),
		MaxSourcePDFBytes:       maxSourceBytes,
		SavedSignaturesLimit:    savedSignatureLimit,
		PreviewFallbackEnabled:  cfg.Signer.PDF.PreviewFallbackEnabled,
	}
}

func registerRuntimeSettings(service *coreadmin.SettingsService) RuntimeSettings {
	settings := defaultRuntimeSettings()
	if service == nil {
		return settings
	}

	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingEmailDefaultFromName,
		Title:         "E-Sign Email Sender Name",
		Description:   "Default display name for outgoing e-sign emails",
		Default:       settings.EmailDefaultFromName,
		Type:          "string",
		Group:         "esign.email",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingEmailDefaultFromAddress,
		Title:         "E-Sign Email Sender Address",
		Description:   "Default from address for outgoing e-sign emails",
		Default:       settings.EmailDefaultFromAddress,
		Type:          "string",
		Group:         "esign.email",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingTokenTTLSeconds,
		Title:         "E-Sign Token TTL (seconds)",
		Description:   "Default recipient signing token lifetime in seconds",
		Default:       settings.TokenTTLSeconds,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFMaxSourceBytes,
		Title:         "E-Sign Max Source PDF Bytes",
		Description:   "Maximum source PDF byte size accepted for uploads",
		Default:       settings.MaxSourcePDFBytes,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingMaxSourceSizeBytes,
		Title:         "E-Sign Max Source PDF Bytes (Legacy Alias)",
		Description:   "Legacy key alias for max source PDF byte size",
		Default:       settings.MaxSourcePDFBytes,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFMaxPages,
		Title:         "E-Sign Max PDF Pages",
		Description:   "Maximum page count accepted for source PDFs",
		Default:       appcfg.Active().Signer.PDF.MaxPages,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFMaxObjects,
		Title:         "E-Sign Max PDF Objects",
		Description:   "Maximum object count threshold allowed for source PDFs",
		Default:       appcfg.Active().Signer.PDF.MaxObjects,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFMaxDecompressedBytes,
		Title:         "E-Sign Max Decompressed PDF Bytes",
		Description:   "Maximum decompressed payload budget for source PDF parsing",
		Default:       appcfg.Active().Signer.PDF.MaxDecompressedBytes,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFParseTimeoutMS,
		Title:         "E-Sign PDF Parse Timeout (ms)",
		Description:   "Parsing deadline budget in milliseconds",
		Default:       appcfg.Active().Signer.PDF.ParseTimeoutMS,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFNormalizationTimeoutMS,
		Title:         "E-Sign PDF Normalization Timeout (ms)",
		Description:   "Normalization deadline budget in milliseconds",
		Default:       appcfg.Active().Signer.PDF.NormalizationTimeoutMS,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFAllowEncrypted,
		Title:         "E-Sign Allow Encrypted PDFs",
		Description:   "Allow encrypted/password-protected source PDFs",
		Default:       appcfg.Active().Signer.PDF.AllowEncrypted,
		Type:          "boolean",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFAllowJavaScript,
		Title:         "E-Sign Allow PDF JavaScript Actions",
		Description:   "Allow JavaScript/actions in source PDFs",
		Default:       appcfg.Active().Signer.PDF.AllowJavaScriptActions,
		Type:          "boolean",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFCompatibilityMode,
		Title:         "E-Sign PDF Compatibility Mode",
		Description:   "Compatibility policy mode (strict, balanced, permissive)",
		Default:       appcfg.Active().Signer.PDF.CompatibilityMode,
		Type:          "string",
		Group:         "esign.policy",
		Enum:          []any{"strict", "balanced", "permissive"},
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPDFPipelineMode,
		Title:         "E-Sign PDF Pipeline Rollout Mode",
		Description:   "Controls staged pipeline rollout behavior (analyze_only, enforce_policy, prefer_normalized)",
		Default:       appcfg.Active().Signer.PDF.PipelineMode,
		Type:          "string",
		Group:         "esign.policy",
		Enum:          []any{"analyze_only", "enforce_policy", "prefer_normalized"},
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingSavedSignaturesLimit,
		Title:         "Signer Saved Signatures Limit",
		Description:   "Maximum saved signatures per signer and type (signature or initials)",
		Default:       settings.SavedSignaturesLimit,
		Type:          "integer",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite, coreadmin.SettingsScopeUser},
	})
	service.RegisterDefinition(coreadmin.SettingDefinition{
		Key:           settingPreviewFallbackEnabled,
		Title:         "E-Sign Preview Fallback Enabled",
		Description:   "Force signer preview bootstrap to use safe default geometry fallback",
		Default:       settings.PreviewFallbackEnabled,
		Type:          "boolean",
		Group:         "esign.policy",
		AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite},
	})

	return resolveRuntimeSettings(service)
}

func resolveRuntimeSettings(service *coreadmin.SettingsService) RuntimeSettings {
	settings := defaultRuntimeSettings()
	if service == nil {
		return settings
	}

	if value := strings.TrimSpace(resolveSettingString(service, settingEmailDefaultFromName)); value != "" {
		settings.EmailDefaultFromName = value
	}
	if value := strings.TrimSpace(resolveSettingString(service, settingEmailDefaultFromAddress)); value != "" {
		settings.EmailDefaultFromAddress = value
	}
	if value := resolveSettingInt64(service, settingTokenTTLSeconds); value > 0 {
		settings.TokenTTLSeconds = value
	}
	if value := resolveSettingInt64(service, settingPDFMaxSourceBytes); value > 0 {
		settings.MaxSourcePDFBytes = value
	} else if value := resolveSettingInt64(service, settingMaxSourceSizeBytes); value > 0 {
		settings.MaxSourcePDFBytes = value
	}
	if value := resolveSettingInt64(service, settingSavedSignaturesLimit); value > 0 {
		settings.SavedSignaturesLimit = value
	}
	settings.PreviewFallbackEnabled = resolveSettingBool(service, settingPreviewFallbackEnabled, settings.PreviewFallbackEnabled)
	return settings
}

func resolveSettingString(service *coreadmin.SettingsService, key string) string {
	if service == nil {
		return ""
	}
	resolved := service.Resolve(strings.TrimSpace(key), "")
	return strings.TrimSpace(fmt.Sprint(resolved.Value))
}

func resolveSettingInt64(service *coreadmin.SettingsService, key string) int64 {
	if service == nil {
		return 0
	}
	resolved := service.Resolve(strings.TrimSpace(key), "")
	switch raw := resolved.Value.(type) {
	case int:
		return int64(raw)
	case int32:
		return int64(raw)
	case int64:
		return raw
	case float32:
		return int64(raw)
	case float64:
		return int64(raw)
	case string:
		value := strings.TrimSpace(raw)
		if value == "" {
			return 0
		}
		var parsed int64
		_, _ = fmt.Sscan(value, &parsed)
		return parsed
	default:
		return 0
	}
}

func resolveSettingBool(service *coreadmin.SettingsService, key string, fallback bool) bool {
	if service == nil {
		return fallback
	}
	resolved := service.Resolve(strings.TrimSpace(key), "")
	switch raw := resolved.Value.(type) {
	case bool:
		return raw
	case int:
		return raw != 0
	case int32:
		return raw != 0
	case int64:
		return raw != 0
	case float32:
		return raw != 0
	case float64:
		return raw != 0
	case string:
		trimmed := strings.ToLower(strings.TrimSpace(raw))
		switch trimmed {
		case "1", "true", "yes", "on":
			return true
		case "0", "false", "no", "off":
			return false
		default:
			return fallback
		}
	default:
		return fallback
	}
}

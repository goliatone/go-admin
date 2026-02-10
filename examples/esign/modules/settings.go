package modules

import (
	"fmt"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
)

const (
	settingEmailDefaultFromName    = "esign.email.default_from_name"
	settingEmailDefaultFromAddress = "esign.email.default_from_address"
	settingTokenTTLSeconds         = "esign.policy.token_ttl_seconds"
	settingMaxSourceSizeBytes      = "esign.policy.max_source_pdf_bytes"
)

// RuntimeSettings captures e-sign runtime settings resolved from SettingsService.
type RuntimeSettings struct {
	EmailDefaultFromName    string
	EmailDefaultFromAddress string
	TokenTTLSeconds         int64
	MaxSourcePDFBytes       int64
}

func defaultRuntimeSettings() RuntimeSettings {
	return RuntimeSettings{
		EmailDefaultFromName:    "E-Sign",
		EmailDefaultFromAddress: "no-reply@example.test",
		TokenTTLSeconds:         int64((72 * time.Hour) / time.Second),
		MaxSourcePDFBytes:       10 * 1024 * 1024,
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
		Key:           settingMaxSourceSizeBytes,
		Title:         "E-Sign Max Source PDF Bytes",
		Description:   "Maximum source PDF byte size accepted for uploads",
		Default:       settings.MaxSourcePDFBytes,
		Type:          "integer",
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
	if value := resolveSettingInt64(service, settingMaxSourceSizeBytes); value > 0 {
		settings.MaxSourcePDFBytes = value
	}
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

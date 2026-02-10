package admin

import (
	"errors"
	"fmt"
	"sort"
	"strings"
)

// FeatureKey enumerates supported feature flag keys.
type FeatureKey string

const (
	FeatureDashboard           FeatureKey = "dashboard"
	FeatureSearch              FeatureKey = "search"
	FeatureExport              FeatureKey = "export"
	FeatureCMS                 FeatureKey = "cms"
	FeatureJobs                FeatureKey = "jobs"
	FeatureCommands            FeatureKey = "commands"
	FeatureSettings            FeatureKey = "settings"
	FeatureNotifications       FeatureKey = "notifications"
	FeatureMedia               FeatureKey = "media"
	FeatureBulk                FeatureKey = "bulk"
	FeaturePreferences         FeatureKey = "preferences"
	FeatureProfile             FeatureKey = "profile"
	FeatureUsers               FeatureKey = "users"
	FeatureTenants             FeatureKey = "tenants"
	FeatureOrganizations       FeatureKey = "organizations"
	FeatureTranslationExchange FeatureKey = "translations.exchange"
)

// ErrFeatureDisabled signals a disabled feature gate.
var ErrFeatureDisabled = errors.New("feature disabled")

// ErrInvalidFeatureConfig signals invalid or conflicting feature selections.
var ErrInvalidFeatureConfig = errors.New("invalid feature configuration")

// FeatureDisabledError includes the specific feature name and optional reason.
type FeatureDisabledError struct {
	Feature string
	Reason  string
}

func (e FeatureDisabledError) Error() string {
	if e.Reason != "" {
		return fmt.Sprintf("%s feature disabled: %s", e.Feature, e.Reason)
	}
	return fmt.Sprintf("%s feature disabled", e.Feature)
}

func (e FeatureDisabledError) Unwrap() error {
	return ErrFeatureDisabled
}

// FeatureDependencyError captures missing dependencies for an enabled feature.
type FeatureDependencyError struct {
	Feature string
	Missing []string
}

func (e FeatureDependencyError) Error() string {
	missing := append([]string{}, e.Missing...)
	sort.Strings(missing)
	return fmt.Sprintf("%s feature requires %s", e.Feature, strings.Join(missing, ", "))
}

func (e FeatureDependencyError) Unwrap() error {
	return ErrInvalidFeatureConfig
}

// InvalidFeatureConfigError aggregates dependency validation failures.
type InvalidFeatureConfigError struct {
	Issues []FeatureDependencyError
}

func (e InvalidFeatureConfigError) Error() string {
	if len(e.Issues) == 0 {
		return ErrInvalidFeatureConfig.Error()
	}
	parts := []string{}
	for _, issue := range e.Issues {
		parts = append(parts, issue.Error())
	}
	return fmt.Sprintf("feature configuration invalid: %s", strings.Join(parts, "; "))
}

func (e InvalidFeatureConfigError) Unwrap() error {
	return ErrInvalidFeatureConfig
}

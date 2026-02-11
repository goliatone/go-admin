package admin

import (
	"sort"
	"strings"

	fggate "github.com/goliatone/go-featuregate/gate"
)

func defaultFeatureFlagKeys() []string {
	return []string{
		string(FeatureDashboard),
		string(FeatureActivity),
		string(FeaturePreview),
		string(FeatureSearch),
		string(FeatureExport),
		string(FeatureCMS),
		string(FeatureJobs),
		string(FeatureCommands),
		string(FeatureSettings),
		string(FeatureNotifications),
		string(FeatureMedia),
		string(FeatureBulk),
		string(FeaturePreferences),
		string(FeatureProfile),
		string(FeatureUsers),
		string(FeatureTenants),
		string(FeatureOrganizations),
		string(FeatureTranslationExchange),
		string(FeatureTranslationQueue),
		"debug",
		"users.invite",
		fggate.FeatureUsersSignup,
		fggate.FeatureUsersPasswordReset,
		fggate.FeatureUsersPasswordResetFinalize,
	}
}

func normalizeFeatureFlagKeys(keys []string) []string {
	seen := map[string]bool{}
	normalized := []string{}
	for _, key := range keys {
		key = fggate.NormalizeKey(strings.TrimSpace(key))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		normalized = append(normalized, key)
	}
	sort.Strings(normalized)
	return normalized
}

func (a *Admin) featureFlagKeys() []string {
	keys := []string{}
	if a != nil {
		if len(a.config.FeatureFlagKeys) > 0 {
			keys = append(keys, a.config.FeatureFlagKeys...)
		}
		if a.registry != nil {
			for _, mod := range a.registry.Modules() {
				if mod == nil {
					continue
				}
				keys = append(keys, mod.Manifest().FeatureFlags...)
			}
		}
	}
	keys = append(keys, defaultFeatureFlagKeys()...)
	return normalizeFeatureFlagKeys(keys)
}

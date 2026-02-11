package admin

import "testing"

func TestDefaultFeatureFlagKeysIncludeAllCoreFeatureKeys(t *testing.T) {
	keys := normalizeFeatureFlagKeys(defaultFeatureFlagKeys())
	set := map[string]bool{}
	for _, key := range keys {
		set[key] = true
	}

	coreFeatures := []FeatureKey{
		FeatureDashboard,
		FeatureActivity,
		FeaturePreview,
		FeatureSearch,
		FeatureExport,
		FeatureCMS,
		FeatureJobs,
		FeatureCommands,
		FeatureSettings,
		FeatureNotifications,
		FeatureMedia,
		FeatureBulk,
		FeaturePreferences,
		FeatureProfile,
		FeatureUsers,
		FeatureTenants,
		FeatureOrganizations,
		FeatureTranslationExchange,
		FeatureTranslationQueue,
	}

	for _, feature := range coreFeatures {
		key := string(feature)
		if !set[key] {
			t.Fatalf("default feature flag keys missing core feature %q", key)
		}
	}
}

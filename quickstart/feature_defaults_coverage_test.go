package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDefaultAdminFeaturesIncludeAllCoreAdminFeatures(t *testing.T) {
	defaults := DefaultAdminFeatures()
	coreFeatures := []admin.FeatureKey{
		admin.FeatureDashboard,
		admin.FeatureActivity,
		admin.FeaturePreview,
		admin.FeatureSearch,
		admin.FeatureExport,
		admin.FeatureCMS,
		admin.FeatureJobs,
		admin.FeatureCommands,
		admin.FeatureSettings,
		admin.FeatureNotifications,
		admin.FeatureMedia,
		admin.FeatureBulk,
		admin.FeaturePreferences,
		admin.FeatureProfile,
		admin.FeatureUsers,
		admin.FeatureTenants,
		admin.FeatureOrganizations,
		admin.FeatureTranslationExchange,
		admin.FeatureTranslationQueue,
	}

	for _, feature := range coreFeatures {
		key := string(feature)
		if _, ok := defaults[key]; !ok {
			t.Fatalf("default admin features missing %q", key)
		}
	}
}

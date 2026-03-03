package setup

import "testing"

func TestShouldEnableCMSRuntimeLogsWith(t *testing.T) {
	tests := []struct {
		name           string
		isTest         bool
		testFlag       bool
		envOverride    bool
		hasEnvOverride bool
		expected       bool
	}{
		{
			name:           "production defaults to enabled",
			isTest:         false,
			testFlag:       false,
			hasEnvOverride: false,
			expected:       true,
		},
		{
			name:           "tests default to disabled",
			isTest:         true,
			testFlag:       false,
			hasEnvOverride: false,
			expected:       false,
		},
		{
			name:           "tests enable logs with explicit test flag",
			isTest:         true,
			testFlag:       true,
			hasEnvOverride: false,
			expected:       true,
		},
		{
			name:           "env override false wins",
			isTest:         true,
			testFlag:       true,
			envOverride:    false,
			hasEnvOverride: true,
			expected:       false,
		},
		{
			name:           "env override true wins",
			isTest:         true,
			testFlag:       false,
			envOverride:    true,
			hasEnvOverride: true,
			expected:       true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := shouldEnableCMSRuntimeLogsWith(tc.isTest, tc.testFlag, tc.envOverride, tc.hasEnvOverride)
			if got != tc.expected {
				t.Fatalf("shouldEnableCMSRuntimeLogsWith(%v, %v, %v, %v) = %v, want %v", tc.isTest, tc.testFlag, tc.envOverride, tc.hasEnvOverride, got, tc.expected)
			}
		})
	}
}

func TestShouldEnableCMSRuntimeLogsUsesRuntimeOverride(t *testing.T) {
	original := runtimeConfig()
	t.Cleanup(func() { ConfigureRuntime(original) })

	enabled := true
	override := original
	override.CMSRuntimeLogs = &enabled
	ConfigureRuntime(override)
	if got := shouldEnableCMSRuntimeLogs(); !got {
		t.Fatalf("expected runtime override to enable logs")
	}

	disabled := false
	override.CMSRuntimeLogs = &disabled
	ConfigureRuntime(override)
	if got := shouldEnableCMSRuntimeLogs(); got {
		t.Fatalf("expected runtime override to disable logs")
	}
}

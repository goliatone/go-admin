package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDoctorDebugEnabledFromEnv(t *testing.T) {
	t.Run("defaults to development flag when unset", func(t *testing.T) {
		t.Setenv("ADMIN_DEBUG_DOCTOR", "")
		if !DoctorDebugEnabledFromEnv(true) {
			t.Fatalf("expected doctor enabled in development by default")
		}
		if DoctorDebugEnabledFromEnv(false) {
			t.Fatalf("expected doctor disabled outside development by default")
		}
	})

	t.Run("env overrides development default", func(t *testing.T) {
		t.Setenv("ADMIN_DEBUG_DOCTOR", "false")
		if DoctorDebugEnabledFromEnv(true) {
			t.Fatalf("expected env override to disable doctor panel")
		}

		t.Setenv("ADMIN_DEBUG_DOCTOR", "true")
		if !DoctorDebugEnabledFromEnv(false) {
			t.Fatalf("expected env override to enable doctor panel")
		}
	})
}

func TestConfigureDebugPanelsDoctorDevDefault(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en", WithDebugConfig(admin.DebugConfig{Enabled: true}))

	ConfigureDebugPanels(
		&cfg,
		DebugPanelDeps{IsDevelopment: admin.BoolPtr(true)},
		DefaultDebugPanelCatalog(),
	)

	if !hasDebugPanel(cfg.Debug.Panels, admin.DebugPanelDoctor) {
		t.Fatalf("expected doctor panel in debug panels: %v", cfg.Debug.Panels)
	}
	if hasDebugPanel(cfg.Debug.ToolbarPanels, admin.DebugPanelDoctor) {
		t.Fatalf("expected doctor panel excluded from toolbar panels: %v", cfg.Debug.ToolbarPanels)
	}
}

func TestConfigureDebugPanelsDoctorProdDefaultDisabled(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en", WithDebugConfig(admin.DebugConfig{Enabled: true}))

	ConfigureDebugPanels(
		&cfg,
		DebugPanelDeps{IsDevelopment: admin.BoolPtr(false)},
		DefaultDebugPanelCatalog(),
	)

	if hasDebugPanel(cfg.Debug.Panels, admin.DebugPanelDoctor) {
		t.Fatalf("did not expect doctor panel in non-dev default config: %v", cfg.Debug.Panels)
	}
}

func TestConfigureDebugPanelsDoctorExplicitToggle(t *testing.T) {
	t.Run("explicitly disable in development", func(t *testing.T) {
		cfg := NewAdminConfig("/admin", "Admin", "en", WithDebugConfig(admin.DebugConfig{Enabled: true}))
		enabled := false
		ConfigureDebugPanels(
			&cfg,
			DebugPanelDeps{
				IsDevelopment: admin.BoolPtr(true),
				DoctorEnabled: &enabled,
			},
			DefaultDebugPanelCatalog(),
		)
		if hasDebugPanel(cfg.Debug.Panels, admin.DebugPanelDoctor) {
			t.Fatalf("expected doctor panel disabled by explicit flag: %v", cfg.Debug.Panels)
		}
	})

	t.Run("explicitly enable outside development", func(t *testing.T) {
		cfg := NewAdminConfig("/admin", "Admin", "en", WithDebugConfig(admin.DebugConfig{Enabled: true}))
		enabled := true
		ConfigureDebugPanels(
			&cfg,
			DebugPanelDeps{
				IsDevelopment: admin.BoolPtr(false),
				DoctorEnabled: &enabled,
			},
			DefaultDebugPanelCatalog(),
		)
		if !hasDebugPanel(cfg.Debug.Panels, admin.DebugPanelDoctor) {
			t.Fatalf("expected doctor panel enabled by explicit flag: %v", cfg.Debug.Panels)
		}
	})
}

func hasDebugPanel(panels []string, panelID string) bool {
	for _, panel := range panels {
		if normalizeDebugPanelID(panel) == normalizeDebugPanelID(panelID) {
			return true
		}
	}
	return false
}

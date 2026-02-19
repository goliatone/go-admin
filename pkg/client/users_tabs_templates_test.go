package client

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTabPanelActivityBranchSnapshot(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "partials/tab-panel.html")
	branch := extractTemplateBlock(
		t,
		template,
		`{% elif tab_panel.id == "activity" and tab_panel.area_code == "admin.users.detail.activity" %}`,
		`{% elif tab_panel.kind == "panel" %}`,
	)
	expected := mustReadUsersTabSnapshot(t, "tab_panel_activity_branch.snap.html")
	assertSnapshotEqual(t, "tab-panel activity branch", expected, branch)

	required := []string{
		`{% if tab_panel.unavailable %}`,
		`{% elif tab_panel.has_entries %}`,
		`{% else %}`,
		`class="timeline-entry-sentence"`,
		`data-relative-time="{{ entry.created_at }}"`,
	}
	assertContainsAll(t, branch, required...)
}

func TestDashboardUserProfileBranchSnapshot(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "dashboard_widget_content.html")
	branch := extractTemplateBlock(
		t,
		template,
		`{% elif widget.definition == "admin.widget.user_profile_overview" %}`,
		`{% elif widget.definition == "admin.widget.activity_feed" or widget.definition == "admin.widget.user_activity_feed" %}`,
	)
	expected := mustReadUsersTabSnapshot(t, "dashboard_user_profile_branch.snap.html")
	assertSnapshotEqual(t, "dashboard profile branch", expected, branch)

	required := []string{
		`{% set values = widget.data.values %}`,
		`{% if values %}`,
		`<dl class="space-y-2">`,
		`{{ default("—", val) }}`,
	}
	assertContainsAll(t, branch, required...)
	if strings.Contains(branch, `widget.data.sections`) {
		t.Fatalf("legacy sections branch should be removed from profile widget template")
	}
	if strings.Contains(branch, `field.type == "status"`) {
		t.Fatalf("legacy status field renderer should be removed from profile widget template")
	}
}

func TestUsersDetailTemplateSmokeContract(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "resources/users/detail.html")
	controllerSource := mustReadClientSourceFile(t, filepath.Join("assets", "src", "tabs", "tabs-controller.ts"))

	if got := strings.Count(template, `<link rel="stylesheet" href="{{ base_path }}/assets/dist/styles/widgets.css">`); got != 1 {
		t.Fatalf("expected widgets.css include exactly once, got %d", got)
	}
	if got := strings.Count(template, `<link rel="stylesheet" href="{{ base_path }}/assets/dist/styles/activity.css">`); got != 1 {
		t.Fatalf("expected activity.css include exactly once, got %d", got)
	}
	if strings.Contains(template, "ActivityManager") {
		t.Fatalf("users detail template must not bootstrap ActivityManager")
	}
	assertContainsAll(t, template,
		`import { initTabsController } from '{{ base_path }}/assets/dist/tabs/index.js';`,
		`initTabsController();`,
	)

	required := []string{
		`if (mode === 'hybrid')`,
		`'X-Requested-With': 'XMLHttpRequest'`,
		`if (mode === 'client')`,
		`Accept: 'application/json'`,
		`hydrateTimeElements(this.panelContainer);`,
		`window.location.href = href;`,
	}
	assertContainsAll(t, controllerSource, required...)
}

func TestUsersTabTemplateAccessibilityContract(t *testing.T) {
	activityTemplate := mustReadEmbeddedTemplate(t, "partials/tab-panel.html")
	profileTemplate := mustReadEmbeddedTemplate(t, "dashboard_widget_content.html")
	renderersSource := mustReadClientSourceFile(t, filepath.Join("assets", "src", "tabs", "renderers.ts"))

	assertContainsAll(t, activityTemplate,
		`<section class="timeline" aria-label="User activity timeline">`,
		`class="timeline-entry-avatar bg-gray-100 text-gray-700" aria-hidden="true"`,
		`<time`,
		`datetime="{{ entry.created_at }}"`,
		`title="{{ entry.created_at }}"`,
		`data-relative-time="{{ entry.created_at }}"`,
		`class="timeline-empty" role="status" aria-live="polite"`,
		`class="timeline-entry-sentence"`,
	)

	assertContainsAll(t, profileTemplate,
		`{% set values = widget.data.values %}`,
		`<dl class="space-y-2">`,
		`{{ default("—", val) }}`,
	)

	assertContainsAll(t, renderersSource,
		`class="profile-status inline-flex items-center gap-1.5" aria-label="${valueText} status"`,
		`<span class="w-2 h-2 rounded-full ${tone.dot}" aria-hidden="true"></span>`,
	)
}

func TestDashboardChartTemplateCanonicalContract(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "dashboard_widget_content.html")
	assertContainsAll(t, template,
		`{% elif widget.definition == "admin.widget.bar_chart" or widget.definition == "admin.widget.line_chart" or widget.definition == "admin.widget.pie_chart" or widget.definition == "admin.widget.gauge_chart" or widget.definition == "admin.widget.scatter_chart" %}`,
		`{% if widget.data.chart_options %}`,
		`data-echart-widget`,
		`data-chart-options`,
	)
	if strings.Contains(template, "chart_html") {
		t.Fatalf("dashboard widget template must not reference legacy chart_html payload")
	}
	if strings.Contains(template, "chart_html_fragment") {
		t.Fatalf("dashboard widget template must not reference legacy chart_html_fragment payload")
	}
}

func TestDashboardUserStatsTemplateCanonicalContract(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "dashboard_widget_content.html")
	branch := extractTemplateBlock(
		t,
		template,
		`{% if widget.definition == "admin.widget.user_stats" %}`,
		`{% elif widget.definition == "admin.widget.settings_overview" %}`,
	)
	assertContainsAll(t, branch,
		`widget.data.total`,
		`widget.data.active`,
		`widget.data.new_today`,
	)
	if strings.Contains(branch, "widget.data.values") {
		t.Fatalf("user_stats template must consume canonical user stats fields, not legacy values map")
	}
}

func TestDashboardClientHydrationCanonicalContract(t *testing.T) {
	source := mustReadClientSourceFile(t, filepath.Join("assets", "src", "dashboard", "admin-dashboard.ts"))
	assertContainsAll(t, source,
		`querySelectorAll<HTMLElement>('[data-echart-widget]')`,
		`script[data-chart-options]`,
		`ensureEChartsAssets(theme, assetsHost)`,
		`chart.setOption(options, true);`,
	)
	if strings.Contains(source, "executeChartScripts") {
		t.Fatalf("legacy chart script execution path must be removed")
	}
	if strings.Contains(source, "document.body.appendChild(newScript)") {
		t.Fatalf("dashboard hydration must not append inline chart scripts")
	}
}

func mustReadEmbeddedTemplate(t *testing.T, name string) string {
	t.Helper()

	data, err := fs.ReadFile(Templates(), name)
	if err != nil {
		t.Fatalf("read embedded template %s: %v", name, err)
	}
	return string(data)
}

func mustReadUsersTabSnapshot(t *testing.T, name string) string {
	t.Helper()

	path := filepath.Join("testdata", "users_tabs", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read snapshot %s: %v", path, err)
	}
	return string(data)
}

func mustReadClientSourceFile(t *testing.T, path string) string {
	t.Helper()

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read source file %s: %v", path, err)
	}
	return string(data)
}

func extractTemplateBlock(t *testing.T, content, startMarker, endMarker string) string {
	t.Helper()

	start := strings.Index(content, startMarker)
	if start == -1 {
		t.Fatalf("start marker not found: %s", startMarker)
	}
	end := strings.Index(content[start:], endMarker)
	if end == -1 {
		t.Fatalf("end marker not found after start: %s", endMarker)
	}
	return content[start : start+end]
}

func normalizeTemplate(content string) string {
	content = strings.ReplaceAll(content, "\r\n", "\n")
	lines := strings.Split(strings.TrimSpace(content), "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], " \t")
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func assertSnapshotEqual(t *testing.T, name, expected, got string) {
	t.Helper()

	normalizedExpected := normalizeTemplate(expected)
	normalizedGot := normalizeTemplate(got)
	if normalizedExpected == normalizedGot {
		return
	}

	t.Fatalf("%s snapshot mismatch", name)
}

func assertContainsAll(t *testing.T, content string, fragments ...string) {
	t.Helper()

	for _, fragment := range fragments {
		if strings.Contains(content, fragment) {
			continue
		}
		t.Fatalf("expected template fragment not found: %q", fragment)
	}
}

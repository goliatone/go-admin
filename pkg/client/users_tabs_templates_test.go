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
		`{% if sections and sections|length > 0 %}`,
		`{% if not field.hide_if_empty or field.value %}`,
		`{% elif field.type == "status" %}`,
		`{% elif field.type == "verified" %}`,
	}
	assertContainsAll(t, branch, required...)
	if strings.Contains(branch, `{% elif values %}`) {
		t.Fatalf("legacy values fallback branch should be removed from profile widget template")
	}
}

func TestUsersDetailTemplateSmokeContract(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "resources/users/detail.html")

	if got := strings.Count(template, `<link rel="stylesheet" href="{{ base_path }}/assets/dist/styles/widgets.css">`); got != 1 {
		t.Fatalf("expected widgets.css include exactly once, got %d", got)
	}
	if got := strings.Count(template, `<link rel="stylesheet" href="{{ base_path }}/assets/dist/styles/activity.css">`); got != 1 {
		t.Fatalf("expected activity.css include exactly once, got %d", got)
	}
	if strings.Contains(template, "ActivityManager") {
		t.Fatalf("users detail template must not bootstrap ActivityManager")
	}

	required := []string{
		`if (mode === 'hybrid')`,
		`'X-Requested-With': 'XMLHttpRequest'`,
		`if (mode === 'client')`,
		`'Accept': 'application/json'`,
		`hydrateTimeElements(panelContainer);`,
		`window.location.href = href;`,
	}
	assertContainsAll(t, template, required...)
}

func TestUsersTabTemplateAccessibilityContract(t *testing.T) {
	activityTemplate := mustReadEmbeddedTemplate(t, "partials/tab-panel.html")
	profileTemplate := mustReadEmbeddedTemplate(t, "dashboard_widget_content.html")
	detailTemplate := mustReadEmbeddedTemplate(t, "resources/users/detail.html")

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
		`class="profile-status inline-flex items-center gap-1.5" aria-label="{{ field.value|default:'unknown' }} status"`,
		`{% else %}bg-gray-400{% endif %}" aria-hidden="true"></span>`,
		`aria-hidden="true" focusable="false"`,
	)

	assertContainsAll(t, detailTemplate,
		`class="profile-status inline-flex items-center gap-1.5" aria-label="${valueText} status"`,
		`<span class="w-2 h-2 rounded-full ${tone.dot}" aria-hidden="true"></span>`,
	)
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

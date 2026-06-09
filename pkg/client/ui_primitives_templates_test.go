package client

import (
	"strings"
	"testing"
)

func TestBulkActionOverlaySupportsTopPositionHide(t *testing.T) {
	template := mustReadClientTemplate(t, "partials/bulk-action-overlay.html")

	assertContainsAll(t, template,
		`data-bulk-overlay-position="{{ overlay_position }}"`,
		`{% if overlay_position == "top" %}-translate-y-full{% else %}translate-y-full{% endif %}`,
		`data-bulk-selection-count`,
		`data-bulk-clear`,
	)

	if strings.Contains(template, `{% if count == 0 %}translate-y-full pointer-events-none`) {
		t.Fatalf("top-position bulk overlays must hide upward, not always translate down")
	}
}

func TestViewModeSwitcherEmitsPressedStateForEveryButton(t *testing.T) {
	template := mustReadClientTemplate(t, "partials/view-mode-switcher.html")

	if !strings.Contains(template, `aria-pressed="{% if is_active %}true{% else %}false{% endif %}"`) {
		t.Fatalf("button-mode view switcher should emit aria-pressed for both active and inactive buttons")
	}
	if strings.Contains(template, `{% if is_active %}aria-pressed="true"{% endif %}`) {
		t.Fatalf("button-mode view switcher should not omit aria-pressed on inactive buttons")
	}
}

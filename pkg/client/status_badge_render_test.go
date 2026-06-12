package client

import (
	"bytes"
	"io"
	"io/fs"
	"strings"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
)

// templateFSLoader adapts the embedded template FS to pongo2 so render tests
// exercise the same partials the admin view engine serves.
type templateFSLoader struct {
	fsys fs.FS
}

// Abs returns the name unchanged: includes/extends in this template tree are
// always root-relative (e.g. "partials/status-badge.html"), matching the view
// engine's loader convention.
func (l templateFSLoader) Abs(_, name string) string {
	return name
}

func (l templateFSLoader) Get(p string) (io.Reader, error) {
	data, err := fs.ReadFile(l.fsys, p)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

func renderStatusBadge(t *testing.T, ctx pongo2.Context) string {
	t.Helper()
	set := pongo2.NewSet("client-templates", templateFSLoader{fsys: Templates()})
	tpl, err := set.FromFile("partials/status-badge.html")
	if err != nil {
		t.Fatalf("parse status-badge partial: %v", err)
	}
	out, err := tpl.Execute(ctx)
	if err != nil {
		t.Fatalf("render status-badge partial: %v", err)
	}
	return out
}

func TestStatusBadgeRendersRegistryToneLabelIcon(t *testing.T) {
	out := renderStatusBadge(t, pongo2.Context{"badge_status": "in_review"})
	for _, fragment := range []string{"status-chip--warning", "In Review", "iconoir-clock", `data-status="in_review"`} {
		if !strings.Contains(out, fragment) {
			t.Fatalf("expected %q in rendered badge, got: %s", fragment, out)
		}
	}
}

func TestStatusBadgeRegistryConflictResolutions(t *testing.T) {
	cases := map[string]string{
		"in_review":         "status-chip--warning",
		"changes_requested": "status-chip--error",
		"missing_locale":    "status-chip--warning",
		"pending_review":    "status-chip--warning",
		"in_progress":       "status-chip--info",
		"blocked":           "status-chip--error",
	}
	for status, tone := range cases {
		out := renderStatusBadge(t, pongo2.Context{"badge_status": status})
		if !strings.Contains(out, tone) {
			t.Fatalf("status %q should render %s, got: %s", status, tone, out)
		}
	}
}

func TestStatusBadgeExplicitToneAndLabelWin(t *testing.T) {
	out := renderStatusBadge(t, pongo2.Context{
		"badge_status": "blocked",
		"badge_tone":   "info",
		"badge_label":  "Custom Label",
	})
	if !strings.Contains(out, "status-chip--info") {
		t.Fatalf("explicit tone must win, got: %s", out)
	}
	if !strings.Contains(out, "Custom Label") {
		t.Fatalf("explicit label must win, got: %s", out)
	}
}

func TestStatusBadgeShowIconFalseHidesIcon(t *testing.T) {
	out := renderStatusBadge(t, pongo2.Context{"badge_status": "approved", "show_icon": false})
	if strings.Contains(out, "iconoir-") {
		t.Fatalf("show_icon=false must hide the icon, got: %s", out)
	}
	// Default (no show_icon) keeps the icon.
	out = renderStatusBadge(t, pongo2.Context{"badge_status": "approved"})
	if !strings.Contains(out, "iconoir-check-circle") {
		t.Fatalf("default badge must render the registry icon, got: %s", out)
	}
}

func TestStatusBadgeUnknownStatusFallsBack(t *testing.T) {
	out := renderStatusBadge(t, pongo2.Context{"badge_status": "mystery_state"})
	if !strings.Contains(out, "status-chip--neutral") {
		t.Fatalf("unknown status must fall back to neutral, got: %s", out)
	}
	if !strings.Contains(out, "Mystery_state") {
		t.Fatalf("unknown status must fall back to a capitalized raw label, got: %s", out)
	}
}

func TestStatusBadgeRendersCount(t *testing.T) {
	out := renderStatusBadge(t, pongo2.Context{"badge_status": "changes_requested", "badge_count": 3})
	if !strings.Contains(out, `status-chip__count`) || !strings.Contains(out, ">3</span>") {
		t.Fatalf("badge_count must render inside the chip, got: %s", out)
	}
}

// TestEmbeddedTemplatesParse guards against pongo2 syntax errors anywhere in
// the embedded template tree (multi-line comments, malformed tags, bad
// include arguments), which would otherwise surface as runtime 500s.
func TestEmbeddedTemplatesParse(t *testing.T) {
	set := pongo2.NewSet("client-templates", templateFSLoader{fsys: Templates()})
	err := fs.WalkDir(Templates(), ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(p, ".html") {
			return nil
		}
		if _, parseErr := set.FromFile(p); parseErr != nil {
			t.Errorf("template %s failed to parse: %v", p, parseErr)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk templates: %v", err)
	}
}

package admin

import (
	"reflect"
	"testing"
)

func TestMergeCMSMarkdownDerivedFieldsProjectsExpectedKeys(t *testing.T) {
	values := map[string]any{
		"markdown": map[string]any{
			"body": "Body text",
			"frontmatter": map[string]any{
				"summary": "Summary from frontmatter",
				"tags":    []string{"alpha", "beta"},
			},
			"custom": map[string]any{
				"path":           "/about",
				"published_at":   "2025-10-13T10:00:00Z",
				"featured_image": "/static/media/logo.png",
				"meta": map[string]any{
					"audience": "customers",
				},
				"seo": map[string]any{
					"title":       "About Enterprise Admin",
					"description": "Meet the team building modular admin tooling for Go applications.",
				},
			},
		},
	}

	MergeCMSMarkdownDerivedFields(values)

	if got := toString(values["content"]); got != "Body text" {
		t.Fatalf("expected content from markdown body, got %q", got)
	}
	if got := toString(values["summary"]); got != "Summary from frontmatter" {
		t.Fatalf("expected summary from frontmatter, got %q", got)
	}
	if got := toString(values["excerpt"]); got != "Summary from frontmatter" {
		t.Fatalf("expected excerpt derived from summary, got %q", got)
	}
	if got := toString(values["path"]); got != "/about" {
		t.Fatalf("expected path from custom, got %q", got)
	}
	if got := toString(values["meta_title"]); got != "About Enterprise Admin" {
		t.Fatalf("expected meta_title from seo title, got %q", got)
	}
	if got := toString(values["meta_description"]); got != "Meet the team building modular admin tooling for Go applications." {
		t.Fatalf("expected meta_description from seo description, got %q", got)
	}
	if got := toString(values["published_at"]); got != "2025-10-13T10:00:00Z" {
		t.Fatalf("expected published_at from custom, got %q", got)
	}
	if got := toString(values["featured_image"]); got != "/static/media/logo.png" {
		t.Fatalf("expected featured_image from custom, got %q", got)
	}
	tags, ok := values["tags"].([]string)
	if !ok || !reflect.DeepEqual(tags, []string{"alpha", "beta"}) {
		t.Fatalf("expected tags from frontmatter, got %#v", values["tags"])
	}
}

func TestMergeCMSMarkdownDerivedFieldsPreservesExistingTopLevelValues(t *testing.T) {
	values := map[string]any{
		"summary": "Top-level summary",
		"markdown": map[string]any{
			"frontmatter": map[string]any{
				"summary": "Frontmatter summary",
			},
		},
	}

	MergeCMSMarkdownDerivedFields(values)

	if got := toString(values["summary"]); got != "Top-level summary" {
		t.Fatalf("expected top-level summary preserved, got %q", got)
	}
	if got := toString(values["excerpt"]); got != "Top-level summary" {
		t.Fatalf("expected excerpt derived from preserved summary, got %q", got)
	}
}

func TestMergeCMSMarkdownDerivedFieldsWithoutMarkdownStillNormalizesTopLevel(t *testing.T) {
	values := map[string]any{
		"excerpt": "Summary from translation",
		"seo": map[string]any{
			"title":       "SEO title",
			"description": "SEO description",
		},
	}

	MergeCMSMarkdownDerivedFields(values)

	if got := toString(values["summary"]); got != "Summary from translation" {
		t.Fatalf("expected summary derived from excerpt, got %q", got)
	}
	if got := toString(values["meta_title"]); got != "SEO title" {
		t.Fatalf("expected meta_title derived from seo, got %q", got)
	}
	if got := toString(values["meta_description"]); got != "SEO description" {
		t.Fatalf("expected meta_description derived from seo, got %q", got)
	}
}

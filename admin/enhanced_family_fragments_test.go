package admin

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFamilyDetailFragmentSelectorsAreKnownRoots(t *testing.T) {
	expected := map[FamilyDetailFragmentTarget]string{
		FamilyDetailFragmentLocaleCoverage: "[data-family-locale-coverage]",
		FamilyDetailFragmentAssignments:    "[data-family-assignments]",
		FamilyDetailFragmentPublishGate:    "[data-family-publish-gate]",
		FamilyDetailFragmentActivity:       "[data-family-activity]",
	}

	for target, selector := range expected {
		got, ok := FamilyDetailFragmentSelector(target)
		require.True(t, ok)
		assert.Equal(t, selector, got)
	}
}

func TestRenderFamilyDetailFragmentsUsesReplaceModeAndRejectsUnknownTargets(t *testing.T) {
	fragments, err := RenderFamilyDetailFragments([]FamilyDetailFragmentTarget{
		FamilyDetailFragmentLocaleCoverage,
		FamilyDetailFragmentAssignments,
	}, func(target FamilyDetailFragmentTarget) (string, error) {
		return `<section data-fragment="` + string(target) + `"></section>`, nil
	})

	require.NoError(t, err)
	require.Len(t, fragments, 2)
	assert.Equal(t, "[data-family-locale-coverage]", fragments[0].Selector)
	assert.Equal(t, EnhancedFragmentModeReplace, fragments[0].Mode)
	assert.Contains(t, fragments[0].HTML, `data-fragment="locale_coverage"`)
	assert.Equal(t, "[data-family-assignments]", fragments[1].Selector)

	_, err = RenderFamilyDetailFragments([]FamilyDetailFragmentTarget{"unknown"}, func(FamilyDetailFragmentTarget) (string, error) {
		return "<section></section>", nil
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown family detail fragment target")
}

func TestFamilyDetailTemplateContainsFragmentRoots(t *testing.T) {
	path := filepath.Join("..", "pkg", "client", "templates", "resources", "translations", "family-detail.html")
	raw, err := os.ReadFile(path)
	require.NoError(t, err)

	html := string(raw)
	for _, attr := range []string{
		"data-family-locale-coverage",
		"data-family-assignments",
		"data-family-publish-gate",
		"data-family-activity",
		`data-enhance-action="true"`,
		`method="post"`,
		`csrf_field|safe`,
	} {
		assert.Contains(t, html, attr, "template should contain %s", attr)
	}
}

func TestRenderFamilyDetailFragmentsFromDataIncludesAssignmentForms(t *testing.T) {
	fragments, err := RenderFamilyDetailFragmentsFromData(map[string]any{
		"family_id":       "tg-page-1",
		"meta":            map[string]any{"channel": "production"},
		"csrf_token":      "fragment-csrf",
		"csrf_field_name": "_csrf",
		"locale_coverage_rows": []map[string]any{{
			"locale":                "fr",
			"locale_assignment_key": "fr:localization",
			"title":                 "Page 1",
			"assignment_summary":    "Assigned to Translator",
			"assign_to_me_action": map[string]any{
				"enabled":  true,
				"endpoint": "/admin/api/translations/families/tg-page-1/assignments",
				"payload": map[string]any{
					"target_locale": "fr",
					"work_scope":    "localization",
					"assignee_id":   "translator-1",
				},
			},
			"assign_to_user_action": map[string]any{
				"enabled":  true,
				"endpoint": "/admin/api/translations/families/tg-page-1/assignments",
				"payload": map[string]any{
					"target_locale": "fr",
					"work_scope":    "localization",
				},
			},
		}},
		"active_assignments": []map[string]any{{
			"id":               "asg-fr",
			"target_locale":    "fr",
			"display_status":   "Assigned",
			"display_priority": "High",
			"display_assignee": "Translator",
			"links": map[string]any{
				"editor": map[string]any{"href": "/admin/translations/assignments/asg-fr/edit"},
			},
		}},
		"publish_gate": map[string]any{"allowed": true},
	})

	require.NoError(t, err)
	require.Len(t, fragments, 4)
	assert.Contains(t, fragments[0].HTML, `data-enhance-action="true"`)
	assert.Contains(t, fragments[0].HTML, `name="_csrf" value="fragment-csrf"`)
	assert.Contains(t, fragments[0].HTML, `name="assignee_id"`)
	assert.Contains(t, fragments[1].HTML, "Open editor")
	assert.Contains(t, fragments[2].HTML, "Ready")
	assert.Contains(t, fragments[3].HTML, "fr assignment Assigned")
}

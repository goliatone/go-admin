package renderers

import (
	"bytes"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTemplateRendererSupportsGoDashboardSignature(t *testing.T) {
	renderer, err := NewTemplateRenderer(client.Templates())
	require.NoError(t, err)

	layout := &admin.DashboardLayout{
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{ID: "w1", Definition: "admin.widget.test", Area: "admin.dashboard.main", Data: map[string]any{"value": 1}, Span: 12, Metadata: &admin.WidgetMetadata{Layout: &admin.WidgetLayout{Width: 12}}},
				},
			},
		},
	}

	var buf bytes.Buffer
	html, err := renderer.Render("dashboard_ssr.html", layout, &buf)
	require.NoError(t, err)
	assert.NotEmpty(t, html)
	assert.Greater(t, buf.Len(), 0)
}

func TestNormalizeDataRejectsControllerMapPayload(t *testing.T) {
	renderer := &TemplateRenderer{}
	result, err := renderer.normalizeData(map[string]any{
		"areas": []any{},
	})
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestNormalizeDataUnsupportedType(t *testing.T) {
	renderer := &TemplateRenderer{}
	result, err := renderer.normalizeData("invalid payload")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unsupported dashboard payload type")
}

func TestRenderDashboardLayoutIntegration(t *testing.T) {
	renderer, err := NewTemplateRenderer(client.Templates())
	require.NoError(t, err)

	layout := &admin.DashboardLayout{
		BasePath: "/admin",
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{
						ID:         "widget-stats",
						Definition: admin.WidgetUserStats,
						Area:       "admin.dashboard.main",
						Span:       12,
						Data: map[string]any{
							"total_users": 1000,
						},
					},
				},
			},
		},
	}

	var buf bytes.Buffer
	html, err := renderer.Render("dashboard_ssr.html", layout, &buf)
	require.NoError(t, err)
	assert.NotEmpty(t, html)
	assert.NotEmpty(t, buf.String())
	assert.Contains(t, html, "dashboard-state")
	assert.Contains(t, html, "widget-stats")
}

func TestRenderDoesNotEmitFloatSpanInHTML(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {
			Data: []byte(`{% for area in areas %}{% for widget in area.widgets %}<article data-span="{{ formatNumber(widget.span) }}" style="--span: {{ formatNumber(widget.span) }}"></article>{% endfor %}{% endfor %}`),
		},
	}
	renderer, err := NewTemplateRenderer(customFS)
	require.NoError(t, err)

	layout := &admin.DashboardLayout{
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{ID: "widget-1", Definition: admin.WidgetUserStats, Area: "admin.dashboard.main", Span: 6},
				},
			},
		},
	}

	var buf bytes.Buffer
	html, err := renderer.Render("dashboard_ssr.html", layout, &buf)
	require.NoError(t, err)
	assert.NotEmpty(t, html)
	assert.Contains(t, html, `data-span="6"`)
	assert.Contains(t, html, `style="--span: 6"`)
	assert.NotContains(t, html, ".000000")
	assert.NotContains(t, strings.ToLower(html), "nan")
}

func TestTemplateRendererNormalizesWidgetDataNumbersForTemplates(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {
			Data: []byte(`{% for area in areas %}{% for widget in area.widgets %}Pending: {{ formatNumber(widget.data.status_counts.pending) }}{% endfor %}{% endfor %}`),
		},
	}
	renderer, err := NewTemplateRenderer(customFS)
	require.NoError(t, err)

	layout := &admin.DashboardLayout{
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{
						ID:         "widget-1",
						Definition: admin.WidgetTranslationProgress,
						Area:       "admin.dashboard.main",
						Span:       12,
						Data: map[string]any{
							"status_counts": map[string]any{
								"pending": 1.0,
							},
						},
						Metadata: &admin.WidgetMetadata{Layout: &admin.WidgetLayout{Width: 12}},
					},
				},
			},
		},
	}

	html, err := renderer.Render("dashboard_ssr.html", layout)
	require.NoError(t, err)
	assert.NotContains(t, html, "1.000000")
}

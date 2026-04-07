package renderers

import (
	"bytes"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTemplateRendererSupportsGoDashboardSignature(t *testing.T) {
	renderer, err := NewTemplateRenderer(client.Templates())
	require.NoError(t, err)

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
						{ID: "w1", Definition: "admin.widget.test", Area: "admin.dashboard.main", Data: map[string]any{"value": 1}, Span: 12},
					},
				},
			},
		},
	}

	var buf bytes.Buffer
	html, err := renderer.RenderPage("dashboard_ssr.html", page, &buf)
	require.NoError(t, err)
	assert.NotEmpty(t, html)
	assert.Greater(t, buf.Len(), 0)
}

func TestRenderDashboardPageIntegration(t *testing.T) {
	renderer, err := NewTemplateRenderer(client.Templates())
	require.NoError(t, err)

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
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
		},
		Chrome: admin.AdminChromeState{
			BasePath: "/admin",
		},
	}

	var buf bytes.Buffer
	html, err := renderer.RenderPage("dashboard_ssr.html", page, &buf)
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

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
						{ID: "widget-1", Definition: admin.WidgetUserStats, Area: "admin.dashboard.main", Span: 6},
					},
				},
			},
		},
	}

	var buf bytes.Buffer
	html, err := renderer.RenderPage("dashboard_ssr.html", page, &buf)
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

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
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
						},
					},
				},
			},
		},
	}

	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	require.NoError(t, err)
	assert.NotContains(t, html, "1.000000")
}

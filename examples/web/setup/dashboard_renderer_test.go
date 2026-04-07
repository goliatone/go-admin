package setup

import (
	"bytes"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDashboardRendererReturnsTypedRenderer(t *testing.T) {
	renderer, err := NewDashboardRenderer()
	require.NoError(t, err)
	require.NotNil(t, renderer)

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
						{
							ID:         "widget-1",
							Definition: admin.WidgetUserStats,
							Area:       "admin.dashboard.main",
							Span:       12,
							Data: map[string]any{
								"total_users": 42,
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
}

func TestNewDashboardRendererUsesClientTemplates(t *testing.T) {
	renderer, err := NewDashboardRenderer()
	require.NoError(t, err)
	require.NotNil(t, renderer)
	assert.NotNil(t, client.Templates())
}

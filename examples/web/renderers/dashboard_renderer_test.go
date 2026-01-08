package renderers

import (
	"bytes"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTemplateRendererSupportsGoDashboardSignature(t *testing.T) {
	renderer, err := NewTemplateRenderer(client.Templates())
	if err != nil {
		t.Fatalf("renderer init: %v", err)
	}

	layout := &admin.DashboardLayout{
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{ID: "w1", Definition: "admin.widget.test", Area: "admin.dashboard.main", Data: map[string]any{"value": 1}, Metadata: &admin.WidgetMetadata{Layout: &admin.WidgetLayout{Width: 12}}},
				},
			},
		},
	}

	var buf bytes.Buffer
	if _, err := renderer.Render("dashboard_ssr.html", layout, &buf); err != nil {
		t.Fatalf("render via go-dashboard signature: %v", err)
	}
	if buf.Len() == 0 {
		t.Fatalf("expected html output")
	}
}

func TestConvertGoDashboardPayload(t *testing.T) {
	renderer := &TemplateRenderer{}

	// Simulate go-dashboard controller payload structure
	goDashboardPayload := map[string]any{
		"areas": map[string]any{
			"main": map[string]any{
				"code": "admin.dashboard.main",
				"widgets": []any{
					map[string]any{
						"id":         "widget-1",
						"definition": "admin.widget.user_stats",
						"area_code":  "admin.dashboard.main",
						"config":     map[string]any{"refresh": 30},
						"metadata": map[string]any{
							"data": map[string]any{
								"total_users":  1234,
								"active_today": 56,
							},
							"layout": map[string]any{
								"width": 6,
								"row":   0,
							},
						},
						"hidden": false,
					},
					map[string]any{
						"id":         "widget-2",
						"definition": "admin.widget.quick_actions",
						"area_code":  "admin.dashboard.main",
						"metadata": map[string]any{
							"data": map[string]any{
								"actions": []string{"create", "edit"},
							},
							"layout": map[string]any{
								"width": 6,
							},
						},
					},
				},
			},
			"sidebar": map[string]any{
				"code": "admin.dashboard.sidebar",
				"widgets": []any{
					map[string]any{
						"id":         "widget-3",
						"definition": "admin.widget.activity_feed",
						"area_code":  "admin.dashboard.sidebar",
						"metadata": map[string]any{
							"data": map[string]any{
								"items": []string{"item1", "item2"},
							},
						},
					},
				},
			},
		},
		"base_path": "/admin",
		"theme": map[string]any{
			"name":    "admin",
			"variant": "light",
		},
	}

	result := renderer.convertGoDashboardPayload(goDashboardPayload)

	// Verify structure conversion
	require.NotNil(t, result)
	assert.Equal(t, "/admin", result["base_path"])
	assert.NotNil(t, result["theme"])
	assert.NotNil(t, result["layout_json"])

	// Verify areas converted from map to slice
	areas, ok := result["areas"].([]map[string]any)
	require.True(t, ok, "areas should be a slice of maps")
	assert.Len(t, areas, 2, "should have 2 areas")

	// Find main area
	var mainArea map[string]any
	for _, area := range areas {
		if area["code"] == "admin.dashboard.main" {
			mainArea = area
			break
		}
	}
	require.NotNil(t, mainArea, "main area should exist")

	// Verify widgets in main area
	widgets, ok := mainArea["widgets"].([]map[string]any)
	require.True(t, ok, "widgets should be a slice of maps")
	assert.Len(t, widgets, 2, "main area should have 2 widgets")

	// Verify first widget conversion
	widget1 := widgets[0]
	assert.Equal(t, "widget-1", widget1["id"])
	assert.Equal(t, "admin.widget.user_stats", widget1["definition"])
	assert.Equal(t, "admin.dashboard.main", widget1["area"])
	assert.Equal(t, false, widget1["hidden"])
	assert.Equal(t, 6, widget1["span"], "span should be extracted from metadata.layout.width")

	// Verify widget data extraction from metadata.data
	widgetData, ok := widget1["data"].(map[string]any)
	require.True(t, ok, "widget data should be extracted from metadata")
	assert.Equal(t, 1234, widgetData["total_users"])
	assert.Equal(t, 56, widgetData["active_today"])

	// Verify second widget (missing explicit data field)
	widget2 := widgets[1]
	widget2Data, ok := widget2["data"].(map[string]any)
	require.True(t, ok, "widget2 data should be extracted from metadata.data")
	actions, ok := widget2Data["actions"].([]string)
	require.True(t, ok)
	assert.Len(t, actions, 2)
}

func TestConvertGoDashboardPayload_EmptyAreas(t *testing.T) {
	renderer := &TemplateRenderer{}

	payload := map[string]any{
		"areas":     map[string]any{},
		"base_path": "/admin",
	}

	result := renderer.convertGoDashboardPayload(payload)

	require.NotNil(t, result)
	areas, ok := result["areas"].([]map[string]any)
	require.True(t, ok)
	assert.Empty(t, areas)
}

func TestConvertGoDashboardPayload_WidgetWithoutMetadata(t *testing.T) {
	renderer := &TemplateRenderer{}

	payload := map[string]any{
		"areas": map[string]any{
			"main": map[string]any{
				"code": "admin.dashboard.main",
				"widgets": []any{
					map[string]any{
						"id":         "widget-1",
						"definition": "admin.widget.simple",
						"area_code":  "admin.dashboard.main",
						"data": map[string]any{
							"value": 123,
						},
					},
				},
			},
		},
	}

	result := renderer.convertGoDashboardPayload(payload)

	areas, ok := result["areas"].([]map[string]any)
	require.True(t, ok)
	require.Len(t, areas, 1)

	widgets, ok := areas[0]["widgets"].([]map[string]any)
	require.True(t, ok)
	require.Len(t, widgets, 1)

	// Should use direct data field when metadata.data doesn't exist
	widget := widgets[0]
	widgetData, ok := widget["data"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, 123, widgetData["value"])
	assert.Equal(t, 0, widget["span"], "span should be 0 when no metadata")
}

func TestWidthFromMetadata(t *testing.T) {
	tests := []struct {
		name     string
		metadata any
		expected int
	}{
		{
			name: "width in layout object",
			metadata: map[string]any{
				"layout": map[string]any{
					"width": 6,
				},
			},
			expected: 6,
		},
		{
			name: "width as float in layout",
			metadata: map[string]any{
				"layout": map[string]any{
					"width": 12.0,
				},
			},
			expected: 12,
		},
		{
			name: "width directly in metadata",
			metadata: map[string]any{
				"width": 8,
			},
			expected: 8,
		},
		{
			name:     "nil metadata",
			metadata: nil,
			expected: 0,
		},
		{
			name:     "empty metadata",
			metadata: map[string]any{},
			expected: 0,
		},
		{
			name: "metadata without width",
			metadata: map[string]any{
				"other": "value",
			},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := widthFromMetadata(tt.metadata)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestNormalizeData_GoDashboardPayload(t *testing.T) {
	renderer := &TemplateRenderer{}

	goDashboardPayload := map[string]any{
		"areas": map[string]any{
			"main": map[string]any{
				"code": "admin.dashboard.main",
				"widgets": []any{
					map[string]any{
						"id":         "widget-1",
						"definition": "admin.widget.test",
						"area_code":  "admin.dashboard.main",
						"metadata": map[string]any{
							"data": map[string]any{"count": 42},
						},
					},
				},
			},
		},
		"base_path": "/admin",
	}

	result, err := renderer.normalizeData(goDashboardPayload)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify conversion happened
	assert.Equal(t, "/admin", result["base_path"])
	areas, ok := result["areas"].([]map[string]any)
	require.True(t, ok)
	assert.NotEmpty(t, areas)
}

func TestNormalizeData_UnsupportedType(t *testing.T) {
	renderer := &TemplateRenderer{}

	unsupportedData := "invalid payload"

	result, err := renderer.normalizeData(unsupportedData)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unsupported dashboard payload type")
}

func TestRenderGoDashboardPayload_Integration(t *testing.T) {
	renderer, err := NewTemplateRenderer(client.Templates())
	require.NoError(t, err)

	// Full go-dashboard payload as would come from controller.LayoutPayload()
	goDashboardPayload := map[string]any{
		"title":       "Dashboard",
		"description": "Admin overview",
		"areas": map[string]any{
			"main": map[string]any{
				"code": "admin.dashboard.main",
				"widgets": []any{
					map[string]any{
						"id":         "widget-stats",
						"definition": "admin.widget.user_stats",
						"area_code":  "admin.dashboard.main",
						"metadata": map[string]any{
							"data": map[string]any{
								"total_users":  1000,
								"active_today": 42,
							},
							"layout": map[string]any{
								"width": 12,
							},
						},
					},
				},
			},
		},
		"ordered_areas": []map[string]any{
			{
				"slot": "main",
				"code": "admin.dashboard.main",
			},
		},
		"theme": map[string]any{
			"name":    "admin",
			"variant": "light",
		},
		"base_path": "/admin",
	}

	var buf bytes.Buffer
	html, err := renderer.Render("dashboard_ssr.html", goDashboardPayload, &buf)
	require.NoError(t, err)
	assert.NotEmpty(t, html)
	assert.Greater(t, buf.Len(), 0)

	// Verify HTML contains expected elements
	htmlStr := html
	assert.Contains(t, htmlStr, "admin.dashboard.main")
	assert.Contains(t, htmlStr, "widget-stats")
	assert.Contains(t, htmlStr, "dashboard-state")
}

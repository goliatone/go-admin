package admin

import (
	"context"
	"strings"
	"testing"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

func TestDashboardRegisterProviderCheckedValidatesTemplate(t *testing.T) {
	handler := func(AdminContext, map[string]any) (WidgetPayload, error) {
		return WidgetPayloadOf(map[string]any{"ok": true}), nil
	}
	tests := []struct {
		name     string
		template string
		wantErr  bool
	}{
		{name: "empty", template: ""},
		{name: "registered host template", template: "dashboard/widgets/showcase/record_metric.html"},
		{name: "absolute", template: "/dashboard/widgets/metric.html", wantErr: true},
		{name: "traversal", template: "dashboard/widgets/../metric.html", wantErr: true},
		{name: "backslash", template: `dashboard\widgets\metric.html`, wantErr: true},
		{name: "query", template: "dashboard/widgets/metric.html?variant=raw", wantErr: true},
		{name: "control character", template: "dashboard/widgets/metric\n.html", wantErr: true},
		{name: "outside root", template: "partials/metric.html", wantErr: true},
		{name: "wrong extension", template: "dashboard/widgets/metric.txt", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dashboard := NewDashboard()
			err := dashboard.RegisterProviderChecked(DashboardProviderSpec{
				Code:     "showcase.metric",
				Name:     "Record Metrics",
				Template: tt.template,
				Handler:  handler,
			})
			if tt.wantErr && err == nil {
				t.Fatalf("expected template %q to be rejected", tt.template)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected template %q to be accepted: %v", tt.template, err)
			}
		})
	}
}

func TestDashboardProviderPresentationDecoratorProjectsOnlyRegisteredTemplates(t *testing.T) {
	input := dashcmp.Page{Areas: []dashcmp.PageArea{{
		Code: "admin.dashboard.main",
		Widgets: []dashcmp.WidgetFrame{
			{
				ID:         "custom",
				Definition: "showcase.metric",
				Name:       "Inferred",
				Template:   "widgets/showcase_metric.html",
			},
			{
				ID:         "builtin",
				Definition: "admin.widget.user_stats",
				Template:   "widgets/user_stats.html",
			},
			{
				ID:         "unknown",
				Definition: "unknown.widget",
				Template:   "widgets/unknown_widget.html",
			},
		},
	}}}
	decorate := dashboardProviderPresentationDecorator(map[string]DashboardProviderSpec{
		"showcase.metric": {
			Code:     "showcase.metric",
			Name:     "Record Metrics",
			Template: "dashboard/widgets/showcase/record_metric.html",
		},
		"admin.widget.user_stats": {
			Code: "admin.widget.user_stats",
			Name: "User Statistics",
		},
	})

	got, err := decorate(context.Background(), dashcmp.ViewerContext{}, input)
	if err != nil {
		t.Fatalf("decorate page: %v", err)
	}
	custom := got.Areas[0].Widgets[0]
	if custom.Name != "Record Metrics" || custom.Template != "dashboard/widgets/showcase/record_metric.html" {
		t.Fatalf("unexpected custom presentation: %#v", custom)
	}
	builtin := got.Areas[0].Widgets[1]
	if builtin.Name != "User Statistics" || builtin.Template != "" {
		t.Fatalf("built-in must retain canonical rendering: %#v", builtin)
	}
	unknown := got.Areas[0].Widgets[2]
	if unknown.Template != "" {
		t.Fatalf("unknown inferred template must be cleared: %#v", unknown)
	}
	if input.Areas[0].Widgets[0].Name != "Inferred" ||
		!strings.HasPrefix(input.Areas[0].Widgets[0].Template, "widgets/") {
		t.Fatalf("decorator mutated its input: %#v", input.Areas[0].Widgets[0])
	}
}

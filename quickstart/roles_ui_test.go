package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestRoleHandlersListInjectsDataGridConfig(t *testing.T) {
	cfg := admin.Config{
		BasePath: "/admin",
		Title:    "Admin",
	}
	adm, err := admin.New(cfg, admin.Dependencies{
		Authorizer: allowAllNav{},
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	if _, err := adm.UserService().SaveRole(context.Background(), admin.RoleRecord{
		Name:    "Editor",
		RoleKey: "editor",
	}); err != nil {
		t.Fatalf("save role: %v", err)
	}

	handler := newRoleHandlersWithRoutes(
		adm,
		cfg,
		nil,
		nil,
		"resources/roles/form",
		"resources/roles/list",
		"resources/roles/detail",
		"/admin",
		adm.URLs(),
	)

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/roles/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}

		legacyTableID := strings.TrimSpace(anyToString(viewCtx["datatable_id"]))
		legacyListAPI := strings.TrimSpace(anyToString(viewCtx["list_api"]))
		legacyActionBase := strings.TrimSpace(anyToString(viewCtx["action_base"]))
		if legacyTableID != "roles" || legacyListAPI != "/admin/api/panels/roles" || legacyActionBase != "/admin/roles" {
			return false
		}

		exportCfg, ok := viewCtx["export_config"].(map[string]any)
		if !ok {
			return false
		}
		if strings.TrimSpace(anyToString(exportCfg["endpoint"])) != "/admin/exports" || strings.TrimSpace(anyToString(exportCfg["definition"])) != "roles" {
			return false
		}

		dataGridCfg, ok := viewCtx["datagrid_config"].(map[string]any)
		if !ok {
			return false
		}
		if strings.TrimSpace(anyToString(dataGridCfg["table_id"])) != "roles" {
			return false
		}
		if strings.TrimSpace(anyToString(dataGridCfg["api_endpoint"])) != "/admin/api/panels/roles" {
			return false
		}
		if strings.TrimSpace(anyToString(dataGridCfg["action_base"])) != "/admin/roles" {
			return false
		}
		if strings.TrimSpace(anyToString(dataGridCfg["column_storage_key"])) != "roles_datatable_columns" {
			return false
		}

		embeddedExport, ok := dataGridCfg["export_config"].(map[string]any)
		if !ok {
			return false
		}
		return strings.TrimSpace(anyToString(embeddedExport["endpoint"])) == "/admin/exports" &&
			strings.TrimSpace(anyToString(embeddedExport["definition"])) == "roles"
	})).Return(nil).Once()

	if err := handler.list(ctx); err != nil {
		t.Fatalf("list: %v", err)
	}
	ctx.AssertExpectations(t)
}

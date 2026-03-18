package quickstart

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

type contentEntryBulkActionContext struct {
	Primary  []admin.Action `json:"primary"`
	Overflow []admin.Action `json:"overflow"`
	BaseURL  string         `json:"base_url"`
}

func buildContentEntryBulkActionContext(
	adm *admin.Admin,
	panel *admin.Panel,
	panelName string,
	c router.Context,
	urls urlkit.Resolver,
	cfg admin.Config,
	basePath string,
) contentEntryBulkActionContext {
	result := contentEntryBulkActionContext{
		BaseURL: resolveAdminPanelAPIBulkBasePath(urls, cfg, basePath, panelName),
	}
	if panel == nil {
		return result
	}

	schema := panel.Schema()
	if len(schema.BulkActions) == 0 {
		return result
	}

	reqCtx := context.Background()
	if c != nil {
		reqCtx = c.Context()
	}
	var authorizer admin.Authorizer
	if adm != nil {
		authorizer = adm.Authorizer()
	}
	resource := strings.TrimSpace(panelName)
	for _, action := range schema.BulkActions {
		if action.Permission != "" && authorizer != nil && !authorizer.Can(reqCtx, action.Permission, resource) {
			continue
		}
		if action.Label == "" {
			action.Label = humanizeActionName(action.Name)
		}
		if action.Overflow {
			result.Overflow = append(result.Overflow, action)
			continue
		}
		result.Primary = append(result.Primary, action)
	}
	return result
}

func humanizeActionName(name string) string {
	normalized := strings.TrimSpace(name)
	if normalized == "" {
		return ""
	}
	parts := strings.FieldsFunc(normalized, func(r rune) bool {
		return r == '_' || r == '-' || r == '.'
	})
	for i, part := range parts {
		if part == "" {
			continue
		}
		lower := strings.ToLower(part)
		parts[i] = strings.ToUpper(lower[:1]) + lower[1:]
	}
	return strings.Join(parts, " ")
}

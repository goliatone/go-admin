package helpers

import (
	"context"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
)

// BulkActionContext holds pre-split bulk actions for template rendering.
type BulkActionContext struct {
	Primary  []admin.Action `json:"primary"`
	Overflow []admin.Action `json:"overflow"`
	BaseURL  string         `json:"base_url"`
}

// BuildBulkActionContext extracts bulk actions from a registered panel,
// filters by permission, and pre-splits into primary vs overflow.
func BuildBulkActionContext(adm *admin.Admin, panelName, basePath string, ctx context.Context) BulkActionContext {
	result := BulkActionContext{
		BaseURL: path.Join("/", strings.TrimSpace(basePath), "crud", panelName, "bulk"),
	}

	panel, ok := adm.Registry().Panel(panelName)
	if !ok {
		return result
	}

	schema := panel.Schema()
	authorizer := adm.Authorizer()

	for _, a := range schema.BulkActions {
		if a.Permission != "" && authorizer != nil {
			if !authorizer.Can(ctx, a.Permission, panelName) {
				continue
			}
		}
		if a.Label == "" {
			a.Label = strings.ToUpper(a.Name[:1]) + a.Name[1:]
		}
		if a.Overflow {
			result.Overflow = append(result.Overflow, a)
		} else {
			result.Primary = append(result.Primary, a)
		}
	}
	return result
}

package admin

import (
	"bytes"
	"fmt"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-formgen/pkg/model"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

var defaultAdminResources = []string{
	"admin.dashboard",
	"admin.settings",
	"admin.users",
	"admin.roles",
	"admin.activity",
	"admin.jobs",
	"admin.search",
	"admin.preferences",
	"admin.profile",
	"admin.debug",
}

var defaultActions = []string{"view", "create", "edit", "delete"}

const (
	permissionMatrixTemplate = "templates/components/permission_matrix.tmpl"
	permissionMatrixPartial  = "forms.permission-matrix"
)

func permissionMatrixRenderer(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
	if data.Template == nil {
		return fmt.Errorf("permission matrix: template renderer not configured")
	}

	templateName := permissionMatrixTemplate
	if data.ThemePartials != nil {
		if candidate := strings.TrimSpace(data.ThemePartials[permissionMatrixPartial]); candidate != "" {
			templateName = candidate
		}
	}

	resources := optionStringSlice(data.Config, "resources", defaultAdminResources)
	actions := optionStringSlice(data.Config, "actions", defaultActions)
	currentPerms := parsePermissionsMap(field.Default)
	serialized := permissionsValueFromDefault(field.Default)
	extraIgnore := optionStringSlice(data.Config, "extraIgnore", nil)
	extraIgnorePrefixes := optionStringSlice(data.Config, "extraIgnorePrefixes", nil)
	ignoreSet := make(map[string]struct{}, len(extraIgnore))
	for _, perm := range extraIgnore {
		ignoreSet[perm] = struct{}{}
	}

	knownPerms := make(map[string]struct{}, len(resources)*len(actions))
	for _, resource := range resources {
		for _, action := range actions {
			knownPerms[resource+"."+action] = struct{}{}
		}
	}

	extraPerms := make([]string, 0)
	for perm := range currentPerms {
		if _, ok := knownPerms[perm]; !ok && !isIgnoredExtraPermission(perm, ignoreSet, extraIgnorePrefixes) {
			extraPerms = append(extraPerms, perm)
		}
	}
	sort.Strings(extraPerms)
	extraPermsValue := strings.Join(extraPerms, "\n")

	fieldName := field.Name
	if fieldName == "" {
		fieldName = "permissions"
	}
	showExtra := optionBool(data.Config, "showExtra", true)

	rows := make([]map[string]any, 0, len(resources))
	for _, resource := range resources {
		cells := make([]map[string]any, 0, len(actions))
		for _, action := range actions {
			perm := resource + "." + action
			cells = append(cells, map[string]any{
				"action":  action,
				"perm":    perm,
				"checked": currentPerms[perm],
			})
		}
		rows = append(rows, map[string]any{
			"resource": resource,
			"label":    formatResourceLabel(resource),
			"cells":    cells,
		})
	}

	payload := map[string]any{
		"field":         field,
		"config":        data.Config,
		"theme":         data.Theme,
		"resources":     resources,
		"actions":       actions,
		"current_perms": currentPerms,
		"serialized":    serialized,
		"extra_perms":   extraPermsValue,
		"show_extra":    showExtra,
		"rows":          rows,
		"field_name":    fieldName,
	}
	rendered, err := data.Template.RenderTemplate(templateName, payload)
	if err != nil {
		return fmt.Errorf("permission matrix: render template %q: %w", templateName, err)
	}
	buf.WriteString(rendered)
	return nil
}

func parsePermissionsMap(value any) map[string]bool {
	perms := make(map[string]bool)
	if value == nil {
		return perms
	}

	switch v := value.(type) {
	case string:
		for _, line := range strings.Split(v, "\n") {
			p := strings.TrimSpace(line)
			if p != "" {
				perms[p] = true
			}
		}
	case []string:
		for _, p := range v {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				perms[trimmed] = true
			}
		}
	case []any:
		for _, item := range v {
			if s, ok := item.(string); ok {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					perms[trimmed] = true
				}
			}
		}
	}
	return perms
}

func optionBool(config map[string]any, key string, fallback bool) bool {
	if config == nil {
		return fallback
	}
	raw, ok := config[key]
	if !ok || raw == nil {
		return fallback
	}
	if v, ok := raw.(bool); ok {
		return v
	}
	return fallback
}

func optionStringSlice(config map[string]any, key string, fallback []string) []string {
	if config == nil {
		return fallback
	}

	raw, ok := config[key]
	if !ok || raw == nil {
		return fallback
	}

	switch v := raw.(type) {
	case []string:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		if len(out) > 0 {
			return out
		}
	case []any:
		result := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				result = append(result, strings.TrimSpace(s))
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	return fallback
}

func isIgnoredExtraPermission(permission string, ignoreSet map[string]struct{}, ignorePrefixes []string) bool {
	if permission == "" {
		return true
	}
	if _, ok := ignoreSet[permission]; ok {
		return true
	}
	for _, prefix := range ignorePrefixes {
		if prefix != "" && strings.HasPrefix(permission, prefix) {
			return true
		}
	}
	return false
}

func permissionsValueFromDefault(value any) string {
	if value == nil {
		return ""
	}

	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case []string:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return strings.Join(out, "\n")
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
		return strings.Join(out, "\n")
	}

	return ""
}

func capitalizeFirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func formatResourceLabel(resource string) string {
	parts := strings.Split(resource, ".")
	if len(parts) == 0 {
		return resource
	}
	last := parts[len(parts)-1]
	return capitalizeFirst(last)
}

func permissionMatrixScript(basePath string) string {
	assetsPrefix := path.Join(strings.TrimSuffix(strings.TrimSpace(basePath), "/"), "assets")
	if assetsPrefix == "" || assetsPrefix == "assets" {
		assetsPrefix = "/assets"
	}
	if !strings.HasPrefix(assetsPrefix, "/") {
		assetsPrefix = "/" + assetsPrefix
	}
	return path.Join(assetsPrefix, "dist/formgen/permission_matrix.js")
}

// PermissionMatrixDescriptor returns the component descriptor for registration.
func PermissionMatrixDescriptor(basePath string) components.Descriptor {
	return components.Descriptor{
		Renderer: permissionMatrixRenderer,
		Scripts: []components.Script{
			{Src: permissionMatrixScript(basePath), Defer: true, Module: true},
		},
	}
}

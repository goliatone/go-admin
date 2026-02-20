package admin

import (
	"bytes"
	"encoding/json"
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
	"admin.translations",
	"admin.esign",
}

var defaultActions = []string{
	"view",
	"create",
	"import",
	"edit",
	"delete",
	"send",
	"void",
	"download",
	"settings",
	"claim",
	"assign",
	"approve",
	"manage",
	"export",
	"import.validate",
	"import.apply",
	"import.view",
}

const (
	permissionMatrixTemplate = "templates/components/permission_matrix.tmpl"
	permissionMatrixPartial  = "forms.permission-matrix"
)

func permissionMatrixRenderer(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
	if data.Template == nil {
		return serviceNotConfiguredDomainError("permission matrix template renderer", map[string]any{"component": "permission_matrix"})
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
	extraOptions := optionStringSlice(data.Config, "extraOptions", nil)
	extraOptions = mergePermissionOptions(extraOptions, extraPerms)
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
		"extra_options": extraOptions,
		"extra_selected": append([]string{}, extraPerms...),
		"show_extra":    showExtra,
		"rows":          rows,
		"field_name":    fieldName,
	}
	rendered, err := data.Template.RenderTemplate(templateName, payload)
	if err != nil {
		return serviceUnavailableDomainError("permission matrix render template failed", map[string]any{"component": "permission_matrix", "template": templateName, "error": err.Error()})
	}
	buf.WriteString(rendered)
	return nil
}

func parsePermissionsMap(value any) map[string]bool {
	perms := make(map[string]bool)
	for _, perm := range permissionStrings(value) {
		if perm == "" {
			continue
		}
		perms[perm] = true
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
	return strings.Join(permissionStrings(value), "\n")
}

func permissionStrings(value any) []string {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case string:
		return parsePermissionString(v)
	case []string:
		return normalizePermissionSlice(v)
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return normalizePermissionSlice(out)
	default:
		return nil
	}
}

func parsePermissionString(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
		jsonList := []string{}
		if err := json.Unmarshal([]byte(trimmed), &jsonList); err == nil {
			return normalizePermissionSlice(jsonList)
		}
		inner := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(trimmed, "["), "]"))
		return parseDelimitedPermissionString(inner, true)
	}
	return parseDelimitedPermissionString(trimmed, false)
}

func parseDelimitedPermissionString(raw string, splitOnSpace bool) []string {
	if raw == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		if r == ',' || r == '\n' || r == '\r' || r == '\t' {
			return true
		}
		return splitOnSpace && r == ' '
	})
	return normalizePermissionSlice(parts)
}

func normalizePermissionSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergePermissionOptions(values ...[]string) []string {
	merged := []string{}
	seen := map[string]struct{}{}
	for _, group := range values {
		for _, value := range group {
			trimmed := strings.TrimSpace(value)
			if trimmed == "" {
				continue
			}
			if _, ok := seen[trimmed]; ok {
				continue
			}
			seen[trimmed] = struct{}{}
			merged = append(merged, trimmed)
		}
	}
	sort.Strings(merged)
	return merged
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

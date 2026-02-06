package quickstart

import (
	"encoding/json"
	"fmt"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

const defaultSettingsTemplate = "resources/settings/show"

// SettingsUIOption customizes the settings UI wiring.
type SettingsUIOption func(*settingsUIOptions)

type settingsUIOptions struct {
	template string
	active   string
	route    string
}

// WithSettingsUITemplate overrides the settings template name.
func WithSettingsUITemplate(name string) SettingsUIOption {
	return func(opts *settingsUIOptions) {
		if opts == nil {
			return
		}
		opts.template = strings.TrimSpace(name)
	}
}

// WithSettingsUIActive overrides the active navigation key.
func WithSettingsUIActive(active string) SettingsUIOption {
	return func(opts *settingsUIOptions) {
		if opts == nil {
			return
		}
		opts.active = strings.TrimSpace(active)
	}
}

// WithSettingsUIRoute overrides the URLKit admin route key.
func WithSettingsUIRoute(route string) SettingsUIOption {
	return func(opts *settingsUIOptions) {
		if opts == nil {
			return
		}
		opts.route = strings.TrimSpace(route)
	}
}

// RegisterSettingsUIRoutes registers a read-only settings page rendered from templates.
func RegisterSettingsUIRoutes[T any](
	r router.Router[T],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...SettingsUIOption,
) error {
	if r == nil || adm == nil {
		return nil
	}

	options := settingsUIOptions{
		template: defaultSettingsTemplate,
		active:   "settings",
		route:    "settings",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if strings.TrimSpace(options.template) == "" {
		options.template = defaultSettingsTemplate
	}
	if strings.TrimSpace(options.route) == "" {
		options.route = "settings"
	}
	if strings.TrimSpace(options.active) == "" {
		options.active = "settings"
	}

	spec := AdminPageSpec{
		Route:      options.route,
		Template:   options.template,
		Title:      cfg.Title,
		Active:     options.active,
		Feature:    string(admin.FeatureSettings),
		Permission: cfg.SettingsPermission,
		Guard: func(c router.Context) error {
			if adm.SettingsService() == nil {
				return fmt.Errorf("settings service not configured")
			}
			return nil
		},
		BuildContext: func(c router.Context) (router.ViewContext, error) {
			session := FilterSessionUser(BuildSessionUser(c.Context()), adm.FeatureGate())
			values := adm.SettingsService().ResolveAll(session.ID)
			groups := groupSettings(values)
			apiPath := resolveSettingsAPIPath(adm, cfg)

			return router.ViewContext{
				"resource":       "settings",
				"resource_label": "Settings",
				"groups":         groups,
				"routes": map[string]string{
					"api": apiPath,
				},
			}, nil
		},
	}

	return RegisterAdminPageRoutes(r, cfg, adm, auth, spec)
}

type settingsGroup struct {
	ID    string
	Label string
	Items []settingsItem
}

type settingsItem struct {
	Key         string
	Title       string
	Description string
	Value       string
	Scope       string
	Provenance  string
}

func groupSettings(values map[string]admin.ResolvedSetting) []settingsGroup {
	if len(values) == 0 {
		return nil
	}

	byGroup := map[string][]settingsItem{}
	for key, setting := range values {
		def := setting.Definition
		groupID := normalizeSettingsGroup(def.Group)
		item := settingsItem{
			Key:         key,
			Title:       firstNonEmptyValue(def.Title, key),
			Description: strings.TrimSpace(def.Description),
			Value:       formatSettingValue(setting.Value),
			Scope:       strings.TrimSpace(string(setting.Scope)),
			Provenance:  strings.TrimSpace(setting.Provenance),
		}
		byGroup[groupID] = append(byGroup[groupID], item)
	}

	groups := make([]settingsGroup, 0, len(byGroup))
	for groupID, items := range byGroup {
		sort.Slice(items, func(i, j int) bool {
			return strings.ToLower(items[i].Title) < strings.ToLower(items[j].Title)
		})
		groups = append(groups, settingsGroup{
			ID:    groupID,
			Label: settingsGroupLabel(groupID),
			Items: items,
		})
	}

	sort.Slice(groups, func(i, j int) bool {
		return strings.ToLower(groups[i].Label) < strings.ToLower(groups[j].Label)
	})

	return groups
}

func normalizeSettingsGroup(group string) string {
	trimmed := strings.TrimSpace(group)
	if trimmed == "" {
		return "general"
	}
	return strings.ToLower(strings.ReplaceAll(trimmed, " ", "_"))
}

func settingsGroupLabel(group string) string {
	if group == "" {
		return "General"
	}
	parts := strings.Split(group, "_")
	for i := range parts {
		part := strings.TrimSpace(parts[i])
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func formatSettingValue(value any) string {
	if value == nil {
		return "—"
	}
	switch v := value.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return "—"
		}
		return v
	case bool:
		if v {
			return "true"
		}
		return "false"
	case fmt.Stringer:
		return v.String()
	}

	if payload, err := json.Marshal(value); err == nil {
		return string(payload)
	}
	return fmt.Sprint(value)
}

func firstNonEmptyValue(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func resolveSettingsAPIPath(adm *admin.Admin, cfg admin.Config) string {
	if adm == nil {
		return ""
	}
	urls := adm.URLs()
	group := adminAPIGroupName(cfg)
	if path := resolveRoutePath(urls, group, "settings"); strings.TrimSpace(path) != "" {
		return path
	}
	base := resolveAdminAPIBasePath(urls, cfg, adm.BasePath())
	if strings.TrimSpace(base) == "" {
		return ""
	}
	return path.Join(base, "settings")
}

package helpers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	router "github.com/goliatone/go-router"
)

type adminDetailPayload struct {
	Schema struct {
		Tabs []admin.PanelTab `json:"tabs"`
	} `json:"schema"`
}

// FetchPanelTabs loads panel tabs from the admin detail API for the given record.
func FetchPanelTabs(c router.Context, cfg admin.Config, panelName, id string, adm ...*admin.Admin) ([]admin.PanelTab, error) {
	if c == nil {
		return nil, nil
	}
	if len(adm) > 0 && adm[0] != nil {
		tabs, err := adm[0].ResolvePanelTabsFromRequest(c, panelName, cfg.DefaultLocale)
		if err == nil {
			return tabs, nil
		}
	}
	host := strings.TrimSpace(c.Header("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(c.Header("Host"))
	}
	if host == "" {
		return nil, fmt.Errorf("missing host header")
	}
	scheme := strings.TrimSpace(c.Header("X-Forwarded-Proto"))
	if scheme == "" {
		scheme = "http"
	}
	endpoint := scheme + "://" + host + path.Join(cfg.BasePath, "api", panelName, id)
	req, err := http.NewRequestWithContext(c.Context(), http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if cookie := strings.TrimSpace(c.Header("Cookie")); cookie != "" {
		req.Header.Set("Cookie", cookie)
	}
	if auth := strings.TrimSpace(c.Header("Authorization")); auth != "" {
		req.Header.Set("Authorization", auth)
	}
	if userID := strings.TrimSpace(c.Header("X-User-ID")); userID != "" {
		req.Header.Set("X-User-ID", userID)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("admin detail status %d", resp.StatusCode)
	}
	var payload adminDetailPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Schema.Tabs, nil
}

// PanelTabViewOptions controls how panel tabs are mapped to template payloads.
type PanelTabViewOptions struct {
	Context      context.Context
	PanelName    string
	BasePath     string
	DetailPath   string
	Record       map[string]any
	Resolver     TabContentResolver
	ModeSelector TabRenderModeSelector
}

// BuildPanelTabViews maps admin tabs to template-friendly payloads with hrefs.
func BuildPanelTabViews(tabs []admin.PanelTab, opts PanelTabViewOptions) []map[string]any {
	if len(tabs) == 0 {
		return nil
	}
	ctx := opts.Context
	if ctx == nil {
		ctx = context.Background()
	}
	tabsForView := tabs
	if opts.DetailPath != "" && !hasTabID(tabs, "details") {
		details := admin.PanelTab{
			ID:    "details",
			Label: "Details",
			Scope: admin.PanelTabScopeDetail,
			Target: admin.PanelTabTarget{
				Type:  "path",
				Path:  opts.DetailPath,
				Panel: opts.PanelName,
			},
		}
		tabsForView = make([]admin.PanelTab, 0, len(tabs)+1)
		tabsForView = append(tabsForView, details)
		tabsForView = append(tabsForView, tabs...)
	}
	out := make([]map[string]any, 0, len(tabsForView))
	for _, tab := range tabsForView {
		spec := TabContentSpec{}
		if opts.Resolver != nil {
			resolved, err := opts.Resolver.ResolveTabContent(ctx, opts.PanelName, opts.Record, tab)
			if err == nil {
				spec = resolved
			}
		}
		inline := IsInlineTab(spec)
		href := buildPanelTabHref(tab, opts.BasePath, opts.Record)
		if inline && opts.DetailPath != "" && tab.ID != "" {
			href = buildInlineTabHref(opts.DetailPath, tab.ID)
		}
		mode := opts.ModeSelector.ModeFor(opts.PanelName, tab, spec)
		if spec.Kind == TabContentTemplate && mode == TabRenderModeClient {
			mode = TabRenderModeHybrid
		}
		if !inline {
			mode = ""
		}
		out = append(out, map[string]any{
			"id":          tab.ID,
			"label":       tab.Label,
			"label_key":   tab.LabelKey,
			"icon":        tab.Icon,
			"href":        href,
			"scope":       string(tab.Scope),
			"inline":      inline,
			"render_mode": string(mode),
		})
	}
	return out
}

func hasTabID(tabs []admin.PanelTab, id string) bool {
	id = strings.TrimSpace(id)
	if id == "" {
		return false
	}
	for _, tab := range tabs {
		if strings.EqualFold(strings.TrimSpace(tab.ID), id) {
			return true
		}
	}
	return false
}

// PanelTabHref builds the target URL for a tab target (panel/path/external).
func PanelTabHref(tab admin.PanelTab, basePath string, record map[string]any) string {
	return buildPanelTabHref(tab, basePath, record)
}

func buildPanelTabHref(tab admin.PanelTab, basePath string, record map[string]any) string {
	base := ""
	switch tab.Target.Type {
	case "panel":
		base = path.Join(basePath, tab.Target.Panel)
	case "path":
		base = strings.TrimSpace(tab.Target.Path)
		if base != "" && !strings.HasPrefix(base, "/") {
			base = path.Join(basePath, base)
		}
	case "external":
		base = strings.TrimSpace(tab.Target.Path)
	default:
		return ""
	}
	values := url.Values{}
	for key, raw := range tab.Filters {
		if resolved := resolveTabToken(raw, record); resolved != "" {
			values.Set("filter_"+key, resolved)
		}
	}
	for key, raw := range tab.Query {
		if resolved := resolveTabToken(raw, record); resolved != "" {
			values.Set(key, resolved)
		}
	}
	if encoded := values.Encode(); encoded != "" {
		return base + "?" + encoded
	}
	return base
}

func buildInlineTabHref(detailPath, tabID string) string {
	if detailPath == "" || tabID == "" {
		return detailPath
	}
	parsed, err := url.Parse(detailPath)
	if err != nil {
		return detailPath
	}
	values := parsed.Query()
	values.Set("tab", tabID)
	parsed.RawQuery = values.Encode()
	return parsed.String()
}

func resolveTabToken(value string, record map[string]any) string {
	const prefix = "{{record."
	const suffix = "}}"
	if strings.HasPrefix(value, prefix) && strings.HasSuffix(value, suffix) {
		key := strings.TrimSuffix(strings.TrimPrefix(value, prefix), suffix)
		if record == nil {
			return ""
		}
		if resolved, ok := record[key]; ok && resolved != nil {
			return fmt.Sprint(resolved)
		}
		return ""
	}
	return value
}

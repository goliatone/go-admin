package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// BreadcrumbItem represents a single rendered breadcrumb.
type BreadcrumbItem struct {
	Label   string `json:"label"`
	Href    string `json:"href,omitempty"`
	Current bool   `json:"current,omitempty"`
}

const (
	ViewKeyBreadcrumbs        = "breadcrumbs"
	ViewKeyBreadcrumbAppend   = "breadcrumb_append"
	ViewKeyBreadcrumbOverride = "breadcrumb_override"
	ViewKeyBreadcrumbActive   = "breadcrumb_active"
	ViewKeyBreadcrumbSpec     = "breadcrumb_spec"
)

// BreadcrumbRouteKind identifies the route surface being rendered.
type BreadcrumbRouteKind string

const (
	BreadcrumbRouteList   BreadcrumbRouteKind = "list"
	BreadcrumbRouteDetail BreadcrumbRouteKind = "detail"
)

// BreadcrumbSpec describes a breadcrumb trail without relying on nav structure.
type BreadcrumbSpec struct {
	Override     []BreadcrumbItem
	RootLabel    string
	RootHref     string
	Trail        []BreadcrumbItem
	CurrentLabel string
}

// Breadcrumb builds a linked breadcrumb.
func Breadcrumb(label, href string) BreadcrumbItem {
	return BreadcrumbItem{
		Label: strings.TrimSpace(label),
		Href:  strings.TrimSpace(href),
	}
}

// CurrentBreadcrumb builds a terminal breadcrumb.
func CurrentBreadcrumb(label string) BreadcrumbItem {
	return BreadcrumbItem{
		Label:   strings.TrimSpace(label),
		Current: true,
	}
}

// WithBreadcrumbAppend appends terminal breadcrumbs to the derived trail.
func WithBreadcrumbAppend(ctx router.ViewContext, items ...BreadcrumbItem) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	ctx[ViewKeyBreadcrumbAppend] = append(cloneBreadcrumbItems(viewBreadcrumbItems(ctx[ViewKeyBreadcrumbAppend])), items...)
	return ctx
}

// WithBreadcrumbOverride fully replaces the derived trail.
func WithBreadcrumbOverride(ctx router.ViewContext, items ...BreadcrumbItem) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	ctx[ViewKeyBreadcrumbOverride] = cloneBreadcrumbItems(items)
	return ctx
}

// WithBreadcrumbSpec sets an explicit breadcrumb contract for the current view.
func WithBreadcrumbSpec(ctx router.ViewContext, spec BreadcrumbSpec) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	ctx[ViewKeyBreadcrumbSpec] = cloneBreadcrumbSpec(spec)
	return ctx
}

// WithBreadcrumbAnchor overrides the active nav key used for breadcrumb derivation.
func WithBreadcrumbAnchor(ctx router.ViewContext, active string) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	ctx[ViewKeyBreadcrumbActive] = strings.TrimSpace(active)
	return ctx
}

func withResolvedBreadcrumbs(ctx router.ViewContext, navItems []map[string]any, active string) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}

	if override := cloneBreadcrumbItems(viewBreadcrumbItems(ctx[ViewKeyBreadcrumbOverride])); len(override) > 0 {
		ctx[ViewKeyBreadcrumbs] = finalizeBreadcrumbs(override)
		return ctx
	}

	if spec, ok := viewBreadcrumbSpec(ctx[ViewKeyBreadcrumbSpec]); ok {
		if items := spec.items(); len(items) > 0 {
			ctx[ViewKeyBreadcrumbs] = finalizeBreadcrumbs(items)
			return ctx
		}
	}

	anchor := strings.TrimSpace(toNavString(ctx[ViewKeyBreadcrumbActive]))
	if anchor == "" {
		anchor = strings.TrimSpace(active)
	}

	breadcrumbs := []BreadcrumbItem{}
	if anchor != "" {
		breadcrumbs = deriveBreadcrumbsFromNavEntries(navItems, anchor)
	}
	if appendItems := viewBreadcrumbItems(ctx[ViewKeyBreadcrumbAppend]); len(appendItems) > 0 {
		breadcrumbs = append(breadcrumbs, cloneBreadcrumbItems(appendItems)...)
	}
	if len(breadcrumbs) == 0 {
		delete(ctx, ViewKeyBreadcrumbs)
		return ctx
	}
	ctx[ViewKeyBreadcrumbs] = finalizeBreadcrumbs(breadcrumbs)
	return ctx
}

// ApplyPanelBreadcrumbs resolves a panel-backed breadcrumb trail without relying on menu nesting.
func ApplyPanelBreadcrumbs(ctx router.ViewContext, panel *admin.Panel, basePath, fallbackListLabel, listHref string, kind BreadcrumbRouteKind, record map[string]any) router.ViewContext {
	cfg := admin.PanelBreadcrumbConfig{}
	if panel != nil {
		cfg = panel.Breadcrumbs()
	}
	rootLabel := strings.TrimSpace(cfg.RootLabel)
	if rootLabel == "" {
		rootLabel = "Dashboard"
	}
	rootHref := strings.TrimSpace(cfg.RootHref)
	if rootHref == "" {
		rootHref = breadcrumbRootHref(basePath)
	}
	listLabel := strings.TrimSpace(cfg.ListLabel)
	if listLabel == "" {
		listLabel = strings.TrimSpace(fallbackListLabel)
	}
	spec := BreadcrumbSpec{
		RootLabel: rootLabel,
		RootHref:  rootHref,
	}
	if listLabel != "" {
		spec.Trail = append(spec.Trail, Breadcrumb(listLabel, strings.TrimSpace(listHref)))
	}
	if kind == BreadcrumbRouteDetail && cfg.ShowCurrentOnDetail {
		if label := resolvePanelDetailBreadcrumbLabel(cfg, record); label != "" {
			spec.CurrentLabel = label
		}
	}
	return WithBreadcrumbSpec(ctx, spec)
}

// DeriveBreadcrumbsFromNavEntries builds breadcrumbs from the active nav trail.
func DeriveBreadcrumbsFromNavEntries(entries []map[string]any, active string) []BreadcrumbItem {
	return finalizeBreadcrumbs(deriveBreadcrumbsFromNavEntries(entries, active))
}

func deriveBreadcrumbsFromNavEntries(entries []map[string]any, active string) []BreadcrumbItem {
	trail := findNavTrail(entries, active)
	if len(trail) == 0 {
		return nil
	}
	breadcrumbs := make([]BreadcrumbItem, 0, len(trail))
	for idx, entry := range trail {
		item, include := breadcrumbItemFromNavEntry(entry, false)
		if !include && idx == len(trail)-1 {
			item, include = breadcrumbItemFromNavEntry(entry, true)
		}
		if !include {
			continue
		}
		breadcrumbs = append(breadcrumbs, item)
	}
	return breadcrumbs
}

func findNavTrail(entries []map[string]any, active string) []map[string]any {
	active = strings.TrimSpace(active)
	if active == "" {
		return nil
	}
	for _, entry := range entries {
		if entry == nil {
			continue
		}
		key := strings.TrimSpace(toNavString(entry["key"]))
		id := strings.TrimSpace(toNavString(entry["id"]))
		if key == active || id == active || strings.HasSuffix(id, "."+active) {
			return []map[string]any{entry}
		}
		children, _ := entry["children"].([]map[string]any)
		if trail := findNavTrail(children, active); len(trail) > 0 {
			return append([]map[string]any{entry}, trail...)
		}
	}
	return nil
}

func breadcrumbItemFromNavEntry(entry map[string]any, isTerminal bool) (BreadcrumbItem, bool) {
	if entry == nil {
		return BreadcrumbItem{}, false
	}
	if hidden, ok := entry["breadcrumb_hidden"].(bool); ok && hidden {
		return BreadcrumbItem{}, false
	}
	entryType := strings.TrimSpace(toNavString(entry["type"]))
	explicitLabel := strings.TrimSpace(toNavString(entry["breadcrumb_label"]))
	explicitHref := strings.TrimSpace(toNavString(entry["breadcrumb_href"]))
	// Group nodes are structural by default. They should only render in
	// breadcrumbs when the menu definition explicitly opts in.
	if entryType == "group" && explicitLabel == "" && explicitHref == "" {
		return BreadcrumbItem{}, false
	}

	label := explicitLabel
	if label == "" {
		label = strings.TrimSpace(toNavString(entry["label"]))
	}
	if label == "" {
		label = strings.TrimSpace(toNavString(entry["group_title"]))
	}
	if label == "" {
		return BreadcrumbItem{}, false
	}

	href := explicitHref
	if href == "" {
		href = strings.TrimSpace(toNavString(entry["href"]))
	}
	if !isTerminal && href == "" {
		return BreadcrumbItem{}, false
	}

	item := BreadcrumbItem{
		Label: label,
		Href:  href,
	}
	if isTerminal {
		item.Href = ""
		item.Current = true
	}
	return item, true
}

func finalizeBreadcrumbs(items []BreadcrumbItem) []BreadcrumbItem {
	out := make([]BreadcrumbItem, 0, len(items))
	for _, item := range items {
		label := strings.TrimSpace(item.Label)
		if label == "" {
			continue
		}
		item.Label = label
		item.Href = strings.TrimSpace(item.Href)
		item.Current = false
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil
	}
	out[len(out)-1].Href = ""
	out[len(out)-1].Current = true
	return out
}

func cloneBreadcrumbItems(items []BreadcrumbItem) []BreadcrumbItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]BreadcrumbItem, len(items))
	copy(out, items)
	return out
}

func viewBreadcrumbItems(value any) []BreadcrumbItem {
	switch typed := value.(type) {
	case []BreadcrumbItem:
		return typed
	case BreadcrumbItem:
		return []BreadcrumbItem{typed}
	default:
		return nil
	}
}

func cloneBreadcrumbSpec(spec BreadcrumbSpec) BreadcrumbSpec {
	spec.Override = cloneBreadcrumbItems(spec.Override)
	spec.Trail = cloneBreadcrumbItems(spec.Trail)
	spec.RootLabel = strings.TrimSpace(spec.RootLabel)
	spec.RootHref = strings.TrimSpace(spec.RootHref)
	spec.CurrentLabel = strings.TrimSpace(spec.CurrentLabel)
	return spec
}

func viewBreadcrumbSpec(value any) (BreadcrumbSpec, bool) {
	spec, ok := value.(BreadcrumbSpec)
	if !ok {
		return BreadcrumbSpec{}, false
	}
	return cloneBreadcrumbSpec(spec), true
}

func (spec BreadcrumbSpec) items() []BreadcrumbItem {
	if len(spec.Override) > 0 {
		return cloneBreadcrumbItems(spec.Override)
	}
	items := []BreadcrumbItem{}
	if label := strings.TrimSpace(spec.RootLabel); label != "" {
		items = append(items, Breadcrumb(label, strings.TrimSpace(spec.RootHref)))
	}
	if len(spec.Trail) > 0 {
		items = append(items, cloneBreadcrumbItems(spec.Trail)...)
	}
	if label := strings.TrimSpace(spec.CurrentLabel); label != "" {
		items = append(items, CurrentBreadcrumb(label))
	}
	return items
}

func breadcrumbRootHref(basePath string) string {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		return "/"
	}
	return basePath
}

func resolvePanelDetailBreadcrumbLabel(cfg admin.PanelBreadcrumbConfig, record map[string]any) string {
	if cfg.DetailLabelResolver != nil {
		if label := strings.TrimSpace(cfg.DetailLabelResolver(record)); label != "" {
			return label
		}
	}
	return defaultRecordBreadcrumbLabel(record)
}

func defaultRecordBreadcrumbLabel(record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	for _, key := range []string{"title", "display_name", "name", "username", "slug", "id"} {
		if label := strings.TrimSpace(anyToString(record[key])); label != "" {
			return label
		}
	}
	return ""
}

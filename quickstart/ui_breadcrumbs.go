package quickstart

import (
	"strings"

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
)

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

	label := strings.TrimSpace(toNavString(entry["breadcrumb_label"]))
	if label == "" {
		label = strings.TrimSpace(toNavString(entry["label"]))
	}
	if label == "" {
		label = strings.TrimSpace(toNavString(entry["group_title"]))
	}
	if label == "" {
		return BreadcrumbItem{}, false
	}

	href := strings.TrimSpace(toNavString(entry["breadcrumb_href"]))
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

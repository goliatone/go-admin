package admin

import "strings"

// PanelTabScope defines where a tab is intended to render.
type PanelTabScope string

const (
	PanelTabScopeList   PanelTabScope = "list"
	PanelTabScopeDetail PanelTabScope = "detail"
	PanelTabScopeForm   PanelTabScope = "form"
)

// PanelTabTarget describes the navigation target for a tab.
type PanelTabTarget struct {
	Type  string `json:"type"`            // "panel" | "path" | "external"
	Panel string `json:"panel,omitempty"` // when Type == "panel"
	Path  string `json:"path,omitempty"`  // when Type == "path" or "external"
}

// PanelTab defines panel tab metadata for list/detail/form views.
type PanelTab struct {
	ID         string            `json:"id"`
	Label      string            `json:"label,omitempty"`
	LabelKey   string            `json:"label_key,omitempty"`
	Icon       string            `json:"icon,omitempty"`
	Position   int               `json:"position,omitempty"`
	Permission string            `json:"permission,omitempty"`
	Scope      PanelTabScope     `json:"scope,omitempty"`
	Target     PanelTabTarget    `json:"target"`
	Filters    map[string]string `json:"filters,omitempty"`
	Query      map[string]string `json:"query,omitempty"`
	Contexts   []string          `json:"contexts,omitempty"`
}

// PanelTabPermissionEvaluator allows custom permission checks for tabs.
type PanelTabPermissionEvaluator func(ctx AdminContext, tab PanelTab, panelName string) bool

// PanelTabCollisionHandler is invoked when a duplicate tab ID is detected.
// Return the chosen tab, or an error to abort registration/merge.
type PanelTabCollisionHandler func(panelName string, existing PanelTab, incoming PanelTab) (PanelTab, error)

func derivePanelTabID(tab PanelTab) string {
	label := strings.TrimSpace(tab.LabelKey)
	if label == "" {
		label = strings.TrimSpace(tab.Label)
	}
	label = slugifyPanelTabToken(label)
	if label == "" {
		label = "tab"
	}

	target := slugifyPanelTabToken(panelTabTargetKey(tab.Target))
	if target == "" {
		target = "target"
	}

	return label + ":" + target
}

func panelTabTargetKey(target PanelTabTarget) string {
	targetType := strings.TrimSpace(target.Type)
	if targetType == "" {
		return ""
	}
	if targetType == "panel" {
		panel := strings.TrimSpace(target.Panel)
		if panel != "" {
			return targetType + ":" + panel
		}
	}
	path := strings.TrimSpace(target.Path)
	if path != "" {
		return targetType + ":" + path
	}
	if panel := strings.TrimSpace(target.Panel); panel != "" {
		return targetType + ":" + panel
	}
	return targetType
}

func slugifyPanelTabToken(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(value))
	needsDash := false
	for i := 0; i < len(value); i++ {
		ch := value[i]
		if ch >= 'A' && ch <= 'Z' {
			ch = ch + ('a' - 'A')
		}
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			b.WriteByte(ch)
			needsDash = false
			continue
		}
		if ch == '-' || ch == '_' {
			if !needsDash {
				b.WriteByte('-')
				needsDash = true
			}
			continue
		}
		if !needsDash {
			b.WriteByte('-')
			needsDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

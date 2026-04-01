package debugpanels

import (
	"strings"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

type PanelMeta struct {
	Label string
	Icon  string
	Span  int
}

func NormalizePanelID(panel string) string {
	return strings.ToLower(strings.TrimSpace(panel))
}

func NormalizePanelIDs(panels []string) []string {
	if len(panels) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(panels))
	for _, panel := range panels {
		normalized := NormalizePanelID(panel)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func PanelMetaFor(panelID string, defaults map[string]PanelMeta, defaultSpan int) PanelMeta {
	normalized := NormalizePanelID(panelID)
	if meta, ok := defaults[normalized]; ok {
		if meta.Span <= 0 {
			meta.Span = defaultSpan
		}
		return meta
	}
	return PanelMeta{
		Label: PanelLabel(panelID),
		Span:  defaultSpan,
	}
}

func PanelLabel(panelID string) string {
	trimmed := strings.TrimSpace(panelID)
	if trimmed == "" {
		return ""
	}
	replacer := strings.NewReplacer("-", " ", "_", " ", ".", " ", "/", " ")
	parts := strings.Fields(replacer.Replace(trimmed))
	for i, part := range parts {
		lower := strings.ToLower(part)
		switch lower {
		case "sql":
			parts[i] = "SQL"
		case "id":
			parts[i] = "ID"
		default:
			parts[i] = titleCase(lower)
		}
	}
	if len(parts) == 0 {
		return titleCase(trimmed)
	}
	return strings.Join(parts, " ")
}

func titleCase(val string) string {
	val = strings.TrimSpace(val)
	if val == "" {
		return ""
	}
	return cases.Title(language.English).String(strings.ToLower(val))
}

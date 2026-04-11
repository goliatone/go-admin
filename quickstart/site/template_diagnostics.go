package site

import (
	"errors"
	"io/fs"
	"sort"
	"strconv"
	"strings"
)

type TemplateSourceKind string

const (
	TemplateSourceUnknown       TemplateSourceKind = "unknown"
	TemplateSourceHostOverlay   TemplateSourceKind = "host_overlay"
	TemplateSourcePackagedTheme TemplateSourceKind = "packaged_theme"
	TemplateSourceHostBase      TemplateSourceKind = "host_base"
	TemplateSourceBuiltIn       TemplateSourceKind = "built_in"
)

type TemplateSourceMeta struct {
	Label string             `json:"label"`
	Kind  TemplateSourceKind `json:"kind"`
}

type ResolvedTemplateSource struct {
	Label string `json:"label"`
	Kind  string `json:"kind"`
	Index int    `json:"index"`
	Path  string `json:"path"`
}

type SiteTemplatePrecedenceDiagnostic struct {
	Key                   string                   `json:"key"`
	Template              string                   `json:"template"`
	Winner                *ResolvedTemplateSource  `json:"winner,omitempty"`
	Shadowed              []ResolvedTemplateSource `json:"shadowed,omitempty"`
	Missing               bool                     `json:"missing,omitempty"`
	WinnerIsPackaged      bool                     `json:"winner_is_packaged_theme,omitempty"`
	PackagedThemeShadowed bool                     `json:"packaged_theme_shadowed,omitempty"`
}

type templateSourceMetadata interface {
	SiteTemplateSource() TemplateSourceMeta
}

type labeledTemplateFS struct {
	fs.FS
	meta TemplateSourceMeta
}

func (l labeledTemplateFS) SiteTemplateSource() TemplateSourceMeta {
	return l.meta
}

func LabelTemplateFS(fsys fs.FS, label string, kind TemplateSourceKind) fs.FS {
	if fsys == nil {
		return nil
	}
	label = strings.TrimSpace(label)
	if kind == "" {
		kind = TemplateSourceUnknown
	}
	return labeledTemplateFS{
		FS: fsys,
		meta: TemplateSourceMeta{
			Label: label,
			Kind:  kind,
		},
	}
}

func ReadTemplateSourcesFromStack(name string, stack ...fs.FS) (*ResolvedTemplateSource, []ResolvedTemplateSource, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, nil, fs.ErrNotExist
	}
	candidates := templateStackReadCandidates(name)
	found := make([]ResolvedTemplateSource, 0, len(stack))
	for index, fsys := range stack {
		if fsys == nil {
			continue
		}
		for _, candidate := range candidates {
			if _, err := fs.ReadFile(fsys, candidate); err == nil {
				found = append(found, resolvedTemplateSourceForFS(fsys, index, name))
				goto nextFS
			} else if !errors.Is(err, fs.ErrNotExist) {
				return nil, nil, err
			}
		}
	nextFS:
	}
	if len(found) == 0 {
		return nil, nil, fs.ErrNotExist
	}
	winner := found[0]
	shadowed := []ResolvedTemplateSource{}
	if len(found) > 1 {
		shadowed = append(shadowed, found[1:]...)
	}
	return &winner, shadowed, nil
}

func ResolveSiteThemeTemplateDiagnostics(siteTheme map[string]any, stack ...fs.FS) map[string]SiteTemplatePrecedenceDiagnostic {
	raw := anyMap(siteTheme["manifest_partials"])
	if len(raw) == 0 {
		return nil
	}

	keys := make([]string, 0, len(raw))
	for key := range raw {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make(map[string]SiteTemplatePrecedenceDiagnostic, len(keys))
	for _, key := range keys {
		templateName := normalizeSiteThemeTemplatePath(anyString(raw[key]))
		if templateName == "" {
			continue
		}
		diag := SiteTemplatePrecedenceDiagnostic{
			Key:      key,
			Template: templateName,
		}
		winner, shadowed, err := ReadTemplateSourcesFromStack(templateName, stack...)
		if errors.Is(err, fs.ErrNotExist) {
			diag.Missing = true
			out[key] = diag
			continue
		}
		if err != nil {
			continue
		}
		diag.Winner = winner
		diag.Shadowed = shadowed
		diag.WinnerIsPackaged = strings.EqualFold(winner.Kind, string(TemplateSourcePackagedTheme))
		for _, item := range shadowed {
			if strings.EqualFold(item.Kind, string(TemplateSourcePackagedTheme)) && !diag.WinnerIsPackaged {
				diag.PackagedThemeShadowed = true
				break
			}
		}
		out[key] = diag
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func templateStackReadCandidates(name string) []string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	out := []string{name}
	prefixed := "templates/" + strings.TrimLeft(name, "/")
	if prefixed != name {
		out = append(out, prefixed)
	}
	return out
}

func resolvedTemplateSourceForFS(fsys fs.FS, index int, name string) ResolvedTemplateSource {
	meta := TemplateSourceMeta{
		Label: "",
		Kind:  TemplateSourceUnknown,
	}
	if source, ok := fsys.(templateSourceMetadata); ok {
		meta = source.SiteTemplateSource()
	}
	label := strings.TrimSpace(meta.Label)
	if label == "" {
		label = "stack[" + strconv.Itoa(index) + "]"
	}
	kind := strings.TrimSpace(string(meta.Kind))
	if kind == "" {
		kind = string(TemplateSourceUnknown)
	}
	return ResolvedTemplateSource{
		Label: label,
		Kind:  kind,
		Index: index,
		Path:  strings.TrimSpace(name),
	}
}

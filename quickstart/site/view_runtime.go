package site

import (
	"errors"
	"io/fs"
)

// SiteViewRuntime captures resolved template loading + reload behavior.
type SiteViewRuntime struct {
	TemplateFS []fs.FS `json:"template_fs"`
	Reload     bool    `json:"reload"`
}

// ResolveViewRuntime resolves template stack + reload behavior for a given environment.
func ResolveViewRuntime(viewCfg ResolvedSiteViewConfig, environment string, defaults ...fs.FS) SiteViewRuntime {
	return SiteViewRuntime{
		TemplateFS: TemplateFSStack(viewCfg, defaults...),
		Reload:     ShouldReloadTemplates(viewCfg, environment),
	}
}

// TemplateFSStack returns a deterministic template fallback stack.
func TemplateFSStack(viewCfg ResolvedSiteViewConfig, defaults ...fs.FS) []fs.FS {
	out := make([]fs.FS, 0, len(defaults)+len(viewCfg.TemplateFS))
	for _, item := range defaults {
		if item == nil {
			continue
		}
		out = append(out, item)
	}
	for _, item := range viewCfg.TemplateFS {
		if item == nil {
			continue
		}
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// ShouldReloadTemplates reports template reload behavior for the current environment.
func ShouldReloadTemplates(viewCfg ResolvedSiteViewConfig, environment string) bool {
	if viewCfg.Reload {
		return true
	}
	if !viewCfg.ReloadInDevelopment {
		return false
	}
	env := normalizeRuntimeEnvironment(environment)
	return env != "prod"
}

// ReadTemplateFromStack reads a template file from a multi-FS stack.
func ReadTemplateFromStack(name string, stack ...fs.FS) ([]byte, error) {
	for _, fsys := range stack {
		if fsys == nil {
			continue
		}
		content, err := fs.ReadFile(fsys, name)
		if err == nil {
			return content, nil
		}
		if !errors.Is(err, fs.ErrNotExist) {
			return nil, err
		}
	}
	return nil, fs.ErrNotExist
}

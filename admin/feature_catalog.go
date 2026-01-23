package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/goliatone/go-featuregate/adapters/configadapter"
	"github.com/goliatone/go-featuregate/catalog"
	fggate "github.com/goliatone/go-featuregate/gate"
	"gopkg.in/yaml.v3"
)

// FeatureCatalog exposes the configured feature catalog.
func (a *Admin) FeatureCatalog() catalog.Catalog {
	if a == nil {
		return nil
	}
	return a.featureCatalog
}

func (a *Admin) featureFlagDescription(ctx context.Context, key string) string {
	if a == nil || a.featureCatalog == nil {
		return ""
	}
	normalized := fggate.NormalizeKey(strings.TrimSpace(key))
	if normalized == "" {
		return ""
	}
	def, ok := a.featureCatalog.Get(normalized)
	if !ok {
		return ""
	}
	resolver := a.featureCatalogResolver
	if resolver == nil {
		resolver = catalog.PlainResolver{}
	}
	locale := localeFromContext(ctx)
	if locale == "" {
		locale = a.config.DefaultLocale
	}
	text, err := resolver.Resolve(ctx, locale, def.Description)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(text)
}

func loadFeatureCatalogFile(path string) (catalog.Catalog, error) {
	if strings.TrimSpace(path) == "" {
		return nil, nil
	}
	contents, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	ext := strings.ToLower(filepath.Ext(path))
	data, err := parseFeatureCatalogContents(contents, ext)
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return nil, nil
	}
	return configadapter.NewCatalog(data), nil
}

func parseFeatureCatalogContents(raw []byte, ext string) (map[string]any, error) {
	out := map[string]any{}
	switch ext {
	case ".yaml", ".yml":
		if err := yaml.Unmarshal(raw, &out); err != nil {
			return nil, fmt.Errorf("feature catalog yaml: %w", err)
		}
	case ".json":
		if err := json.Unmarshal(raw, &out); err != nil {
			return nil, fmt.Errorf("feature catalog json: %w", err)
		}
	default:
		return nil, fmt.Errorf("feature catalog file extension %q not supported", ext)
	}
	return out, nil
}

package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
)

const (
	eSignPageConfigContractVersion = "v1"
	eSignModuleAssetPrefix         = "dist/esign/"

	eSignPageAdminLanding      = "admin.landing"
	eSignPageDocumentIngestion = "admin.documents.ingestion"
	eSignPageGoogleIntegration = "admin.integrations.google"
	eSignPageGoogleCallback    = "admin.integrations.google_callback"
	eSignPageGoogleDrivePicker = "admin.integrations.google_drive_picker"
	eSignPageSignerReview      = "signer.review"
	eSignPageSignerComplete    = "signer.complete"
	eSignPageSignerDeclined    = "signer.declined"
	eSignPageSignerError       = "signer.error"

	eSignModuleAssetAdminLanding      = "dist/esign/index.js"
	eSignModuleAssetDocumentIngestion = "dist/esign/index.js"
)

var eSignMigratedPageModuleAssets = map[string]string{
	eSignPageAdminLanding:      eSignModuleAssetAdminLanding,
	eSignPageDocumentIngestion: eSignModuleAssetDocumentIngestion,
}

type eSignPageConfig struct {
	ContractVersion string            `json:"contract_version"`
	Page            string            `json:"page"`
	ModulePath      string            `json:"module_path,omitempty"`
	BasePath        string            `json:"base_path,omitempty"`
	APIBasePath     string            `json:"api_base_path,omitempty"`
	Routes          map[string]string `json:"routes,omitempty"`
	Features        map[string]bool   `json:"features,omitempty"`
	Context         map[string]any    `json:"context,omitempty"`
}

func buildESignAdminLandingPageConfig(basePath, apiBasePath string, googleEnabled bool) eSignPageConfig {
	resolvedBasePath := normalizeESignBasePath(basePath)
	return eSignPageConfig{
		Page:        eSignPageAdminLanding,
		ModulePath:  resolveESignModulePath(resolvedBasePath, eSignModuleAssetAdminLanding),
		BasePath:    resolvedBasePath,
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Features: map[string]bool{
			"google_enabled": googleEnabled,
		},
		Routes: map[string]string{
			"documents_index":  path.Join(resolvedBasePath, "content", "esign_documents"),
			"agreements_index": path.Join(resolvedBasePath, "content", "esign_agreements"),
		},
	}
}

func buildESignDocumentIngestionPageConfig(
	basePath string,
	apiBasePath string,
	userID string,
	googleEnabled bool,
	googleConnected bool,
	routes map[string]string,
) eSignPageConfig {
	return eSignPageConfig{
		Page:        eSignPageDocumentIngestion,
		ModulePath:  resolveESignModulePath(basePath, eSignModuleAssetDocumentIngestion),
		BasePath:    normalizeESignBasePath(basePath),
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Features: map[string]bool{
			"google_enabled":   googleEnabled,
			"google_connected": googleConnected,
		},
		Routes: cloneStringMap(routes),
		Context: map[string]any{
			"user_id": strings.TrimSpace(userID),
		},
	}
}

func buildESignGoogleIntegrationPageConfig(
	page string,
	basePath string,
	apiBasePath string,
	userID string,
	googleEnabled bool,
	routes map[string]string,
) eSignPageConfig {
	return eSignPageConfig{
		Page:        strings.TrimSpace(page),
		BasePath:    normalizeESignBasePath(basePath),
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Features: map[string]bool{
			"google_enabled": googleEnabled,
		},
		Routes: cloneStringMap(routes),
		Context: map[string]any{
			"user_id": strings.TrimSpace(userID),
		},
	}
}

func buildESignSignerPageConfig(page, basePath, apiBasePath, token string) eSignPageConfig {
	return eSignPageConfig{
		Page:        strings.TrimSpace(page),
		BasePath:    normalizeESignBasePath(basePath),
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Context: map[string]any{
			"token_present": strings.TrimSpace(token) != "",
		},
	}
}

func withESignPageConfig(ctx router.ViewContext, cfg eSignPageConfig) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	normalized := normalizeESignPageConfig(cfg)
	encoded, err := json.Marshal(normalized)
	if err != nil {
		encoded = []byte("{}")
	}
	ctx["esign_page"] = normalized.Page
	ctx["esign_module_path"] = normalized.ModulePath
	ctx["esign_page_config"] = normalized
	ctx["esign_page_config_json"] = string(encoded)
	return ctx
}

func normalizeESignPageConfig(cfg eSignPageConfig) eSignPageConfig {
	cfg.ContractVersion = firstNonEmptyValue(
		strings.TrimSpace(cfg.ContractVersion),
		eSignPageConfigContractVersion,
	)
	cfg.Page = strings.TrimSpace(cfg.Page)
	cfg.BasePath = normalizeESignBasePath(cfg.BasePath)
	cfg.APIBasePath = normalizeAPIBasePath(cfg.APIBasePath)
	cfg.ModulePath = strings.TrimSpace(cfg.ModulePath)
	cfg.Routes = cloneStringMap(cfg.Routes)
	if cfg.Features == nil {
		cfg.Features = map[string]bool{}
	}
	if cfg.Context == nil {
		cfg.Context = map[string]any{}
	}
	return cfg
}

func normalizeESignBasePath(basePath string) string {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		return "/admin"
	}
	if !strings.HasPrefix(basePath, "/") {
		basePath = "/" + basePath
	}
	return path.Clean(basePath)
}

func normalizeAPIBasePath(apiBasePath string) string {
	apiBasePath = strings.TrimSpace(apiBasePath)
	if apiBasePath == "" {
		return "/admin/api/v1"
	}
	if !strings.HasPrefix(apiBasePath, "/") {
		apiBasePath = "/" + apiBasePath
	}
	return path.Clean(apiBasePath)
}

func resolveESignModulePath(basePath, moduleAssetPath string) string {
	basePath = normalizeESignBasePath(basePath)
	moduleAssetPath = strings.TrimSpace(moduleAssetPath)
	moduleAssetPath = strings.TrimPrefix(moduleAssetPath, "/")
	if moduleAssetPath == "" {
		return ""
	}
	return path.Join(basePath, "assets", moduleAssetPath)
}

func cloneStringMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		out[trimmedKey] = strings.TrimSpace(value)
	}
	return out
}

func viewContextString(ctx router.ViewContext, key, fallback string) string {
	if len(ctx) == 0 {
		return strings.TrimSpace(fallback)
	}
	raw, ok := ctx[key]
	if !ok || raw == nil {
		return strings.TrimSpace(fallback)
	}
	if value := strings.TrimSpace(rawToString(raw)); value != "" {
		return value
	}
	return strings.TrimSpace(fallback)
}

func viewContextRoutes(ctx router.ViewContext) map[string]string {
	if len(ctx) == 0 {
		return map[string]string{}
	}
	raw, ok := ctx["routes"]
	if !ok || raw == nil {
		return map[string]string{}
	}
	switch typed := raw.(type) {
	case map[string]string:
		return cloneStringMap(typed)
	case map[string]any:
		out := map[string]string{}
		for key, value := range typed {
			trimmedKey := strings.TrimSpace(key)
			if trimmedKey == "" {
				continue
			}
			out[trimmedKey] = strings.TrimSpace(rawToString(value))
		}
		return out
	default:
		return map[string]string{}
	}
}

func rawToString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case []byte:
		return string(typed)
	default:
		return strings.TrimSpace(strings.ReplaceAll(fmt.Sprint(typed), "\n", " "))
	}
}

func validateESignRuntimeAssetContracts() error {
	return validateESignRuntimeAssetContractsWithFS(client.Assets(), eSignMigratedPageModuleAssets)
}

func validateESignRuntimeAssetContractsWithFS(assetsFS fs.FS, pageModuleAssets map[string]string) error {
	if assetsFS == nil {
		return fmt.Errorf("esign runtime asset contracts: assets fs is nil")
	}
	for page, moduleAssetPath := range pageModuleAssets {
		page = strings.TrimSpace(page)
		moduleAssetPath = strings.TrimSpace(moduleAssetPath)
		if page == "" || moduleAssetPath == "" {
			return fmt.Errorf("esign runtime asset contracts: page and module path are required")
		}
		if !strings.HasPrefix(moduleAssetPath, eSignModuleAssetPrefix) {
			return fmt.Errorf(
				"esign runtime asset contracts: module asset %q for page %q must start with %q",
				moduleAssetPath,
				page,
				eSignModuleAssetPrefix,
			)
		}
		if !strings.HasSuffix(moduleAssetPath, ".js") {
			return fmt.Errorf(
				"esign runtime asset contracts: module asset %q for page %q must end with .js",
				moduleAssetPath,
				page,
			)
		}
		if _, err := fs.Stat(assetsFS, moduleAssetPath); err != nil {
			return fmt.Errorf(
				"esign runtime asset contracts: missing asset for page %q at %q: %w",
				page,
				moduleAssetPath,
				err,
			)
		}
	}
	return nil
}

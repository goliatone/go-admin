package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

const (
	eSignPageConfigContractVersion = "v1"
	eSignModuleAssetPrefix         = "dist/esign/"

	eSignPageAdminLanding      = "admin.landing"
	eSignPageDocumentIngestion = "admin.documents.ingestion"
	eSignPageAgreementForm     = "agreement-form"
	eSignPageGoogleIntegration = "admin.integrations.google"
	eSignPageGoogleCallback    = "admin.integrations.google_callback"
	eSignPageGoogleDrivePicker = "admin.integrations.google_drive_picker"
	eSignPageSourceBrowser     = "admin.sources.browser"
	eSignPageSourceDetail      = "admin.sources.detail"
	eSignPageSourceRevision    = "admin.sources.revision_inspector"
	eSignPageSourceComments    = "admin.sources.comment_inspector"
	eSignPageSourceArtifacts   = "admin.sources.artifact_inspector"
	eSignPageSourceSearch      = "admin.sources.search"
	eSignPageSignerReview      = "signer.review"
	eSignPageSignerComplete    = "signer.complete"
	eSignPageSignerDeclined    = "signer.declined"
	eSignPageSignerError       = "signer.error"

	eSignModuleAssetAdminLanding      = "dist/esign/admin-landing.js"
	eSignModuleAssetDocumentIngestion = "dist/esign/document-form.js"
	eSignModuleAssetAgreementForm     = "dist/esign/agreement-form.js"
	eSignModuleAssetGoogleIntegration = "dist/esign/google-integration.js"
	eSignModuleAssetGoogleCallback    = "dist/esign/google-callback.js"
	eSignModuleAssetGoogleDrivePicker = "dist/esign/google-drive-picker.js"
	eSignModuleAssetSourceManagement  = "dist/esign/source-management-runtime.js"
)

var eSignMigratedPageModuleAssets = map[string]string{
	eSignPageAdminLanding:      eSignModuleAssetAdminLanding,
	eSignPageDocumentIngestion: eSignModuleAssetDocumentIngestion,
	eSignPageAgreementForm:     eSignModuleAssetAgreementForm,
	eSignPageGoogleIntegration: eSignModuleAssetGoogleIntegration,
	eSignPageGoogleCallback:    eSignModuleAssetGoogleCallback,
	eSignPageGoogleDrivePicker: eSignModuleAssetGoogleDrivePicker,
	eSignPageSourceBrowser:     eSignModuleAssetSourceManagement,
	eSignPageSourceDetail:      eSignModuleAssetSourceManagement,
	eSignPageSourceRevision:    eSignModuleAssetSourceManagement,
	eSignPageSourceComments:    eSignModuleAssetSourceManagement,
	eSignPageSourceArtifacts:   eSignModuleAssetSourceManagement,
	eSignPageSourceSearch:      eSignModuleAssetSourceManagement,
}

func resolveESignPageModuleAsset(page string, fallback string) string {
	if asset := strings.TrimSpace(eSignMigratedPageModuleAssets[strings.TrimSpace(page)]); asset != "" {
		return asset
	}
	return strings.TrimSpace(fallback)
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
		ModulePath:  resolveESignModulePath(resolvedBasePath, resolveESignPageModuleAsset(eSignPageAdminLanding, eSignModuleAssetAdminLanding)),
		BasePath:    resolvedBasePath,
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Features: map[string]bool{
			"google_enabled": googleEnabled,
		},
		Routes: map[string]string{
			"documents_index":  path.Join(resolvedBasePath, "content", "esign_documents"),
			"agreements_index": path.Join(resolvedBasePath, "content", "esign_agreements"),
			"source_browser":   path.Join(resolvedBasePath, "esign", "sources"),
			"source_search":    path.Join(resolvedBasePath, "esign", "source-search"),
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
		ModulePath:  resolveESignModulePath(basePath, resolveESignPageModuleAsset(eSignPageDocumentIngestion, eSignModuleAssetDocumentIngestion)),
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

func buildESignAgreementFormPageConfig(
	basePath string,
	apiBasePath string,
	routes map[string]string,
	storageScope string,
) eSignPageConfig {
	resolvedBasePath := normalizeESignBasePath(basePath)
	resolvedAPIBase := normalizeAPIBasePath(apiBasePath)
	syncBaseURL := path.Join(resolvedAPIBase, "esign")
	return eSignPageConfig{
		Page:        eSignPageAgreementForm,
		ModulePath:  resolveESignModulePath(resolvedBasePath, resolveESignPageModuleAsset(eSignPageAgreementForm, eSignModuleAssetAgreementForm)),
		BasePath:    resolvedBasePath,
		APIBasePath: resolvedAPIBase,
		Routes:      cloneStringMap(routes),
		Context: map[string]any{
			"sync": map[string]any{
				"base_url":          syncBaseURL,
				"bootstrap_path":    path.Join(syncBaseURL, "sync", "bootstrap", "agreement-draft"),
				"client_base_path":  path.Join(resolvedBasePath, "sync-client", "sync-core"),
				"resource_kind":     "agreement_draft",
				"storage_scope":     strings.TrimSpace(storageScope),
				"action_operations": []string{"send", "start_review", "dispose"},
			},
		},
	}
}

func buildESignAgreementFormStorageScope(actorID, tenantID, orgID, routePath string) string {
	parts := []string{
		"agreement-form",
		strings.TrimSpace(tenantID),
		strings.TrimSpace(orgID),
		strings.TrimSpace(actorID),
		strings.TrimSpace(routePath),
	}
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return "afs_" + hex.EncodeToString(sum[:16])
}

func buildESignGoogleIntegrationPageConfig(
	page string,
	basePath string,
	apiBasePath string,
	userID string,
	accountID string,
	redirectURI string,
	clientID string,
	googleEnabled bool,
	routes map[string]string,
) eSignPageConfig {
	resolvedBasePath := normalizeESignBasePath(basePath)
	return eSignPageConfig{
		Page:        strings.TrimSpace(page),
		ModulePath:  resolveESignModulePath(resolvedBasePath, resolveESignPageModuleAsset(page, eSignModuleAssetGoogleIntegration)),
		BasePath:    resolvedBasePath,
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Features: map[string]bool{
			"google_enabled": googleEnabled,
		},
		Routes: cloneStringMap(routes),
		Context: map[string]any{
			"user_id":             strings.TrimSpace(userID),
			"google_account_id":   strings.TrimSpace(accountID),
			"google_redirect_uri": strings.TrimSpace(redirectURI),
			"google_client_id":    strings.TrimSpace(clientID),
		},
	}
}

func buildESignSourceManagementPageConfig(
	page string,
	basePath string,
	apiBasePath string,
	routes map[string]string,
	context map[string]any,
) eSignPageConfig {
	resolvedBasePath := normalizeESignBasePath(basePath)
	return eSignPageConfig{
		Page:        strings.TrimSpace(page),
		ModulePath:  resolveESignModulePath(resolvedBasePath, resolveESignPageModuleAsset(page, eSignModuleAssetSourceManagement)),
		BasePath:    resolvedBasePath,
		APIBasePath: normalizeAPIBasePath(apiBasePath),
		Routes:      cloneStringMap(routes),
		Features: map[string]bool{
			"source_management_enabled": true,
		},
		Context: cloneAnyMap(context),
	}
}

func enrichESignAgreementFormPageConfig(cfg eSignPageConfig, ctx router.ViewContext) eSignPageConfig {
	if cfg.Context == nil {
		cfg.Context = map[string]any{}
	}
	resourceItem := rawToMap(ctx["resource_item"])
	isEdit := rawToBool(ctx["is_edit"])

	cfg.Context["is_edit"] = isEdit
	cfg.Context["create_success"] = rawToBool(ctx["create_success"])
	cfg.Context["submit_mode"] = firstNonEmptyValue(
		viewContextString(ctx, "submit_mode", ""),
		map[bool]string{true: "form", false: "json"}[isEdit],
	)
	cfg.Context["agreement_id"] = strings.TrimSpace(rawToString(resourceItem["id"]))
	cfg.Context["active_agreement_id"] = strings.TrimSpace(rawToString(resourceItem["active_agreement_id"]))
	cfg.Context["workflow_kind"] = firstNonEmptyValue(
		strings.TrimSpace(rawToString(resourceItem["workflow_kind"])),
		"standard",
	)
	cfg.Context["root_agreement_id"] = firstNonEmptyValue(
		strings.TrimSpace(rawToString(resourceItem["root_agreement_id"])),
		strings.TrimSpace(rawToString(resourceItem["id"])),
	)
	cfg.Context["parent_agreement_id"] = strings.TrimSpace(rawToString(resourceItem["parent_agreement_id"]))
	cfg.Context["superseded_by_agreement_id"] = strings.TrimSpace(rawToString(resourceItem["superseded_by_agreement_id"]))
	cfg.Context["related_agreements"] = rawToSlice(resourceItem["related_agreements"])
	cfg.Context["initial_participants"] = rawToSlice(resourceItem["participants"])
	cfg.Context["initial_field_instances"] = rawToSlice(resourceItem["field_instances"])

	return cfg
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

func cloneAnyMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		out[trimmedKey] = value
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

func rawToBool(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		normalized := strings.TrimSpace(strings.ToLower(typed))
		return normalized == "true" || normalized == "1" || normalized == "yes"
	case []byte:
		return rawToBool(string(typed))
	default:
		return false
	}
}

func rawToMap(value any) map[string]any {
	switch typed := value.(type) {
	case map[string]any:
		if len(typed) == 0 {
			return map[string]any{}
		}
		out := make(map[string]any, len(typed))
		for key, entry := range typed {
			trimmedKey := strings.TrimSpace(key)
			if trimmedKey == "" {
				continue
			}
			out[trimmedKey] = entry
		}
		return out
	case map[string]string:
		if len(typed) == 0 {
			return map[string]any{}
		}
		out := make(map[string]any, len(typed))
		for key, entry := range typed {
			trimmedKey := strings.TrimSpace(key)
			if trimmedKey == "" {
				continue
			}
			out[trimmedKey] = strings.TrimSpace(entry)
		}
		return out
	default:
		return map[string]any{}
	}
}

func rawToSlice(value any) []any {
	switch typed := value.(type) {
	case []any:
		return append([]any(nil), typed...)
	case []map[string]any:
		out := make([]any, 0, len(typed))
		for _, entry := range typed {
			out = append(out, entry)
		}
		return out
	default:
		return []any{}
	}
}

func validateESignRuntimeAssetContracts() error {
	return validateESignRuntimeAssetContractsWithFS(resolveESignRuntimeAssetsFS(), eSignMigratedPageModuleAssets)
}

func resolveESignRuntimeAssetsFS() fs.FS {
	return resolveESignRuntimeAssetsFSWithDisk(client.Assets(), resolveESignDiskAssetsDir())
}

func resolveESignRuntimeAssetsFSWithDisk(base fs.FS, diskAssetsDir string) fs.FS {
	diskAssetsDir = strings.TrimSpace(diskAssetsDir)
	if diskAssetsDir == "" {
		return base
	}
	if _, err := os.Stat(diskAssetsDir); err != nil {
		return base
	}
	return quickstart.WithFallbackFS(os.DirFS(diskAssetsDir), base)
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

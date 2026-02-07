package admin

import (
	"io/fs"

	"github.com/goliatone/go-admin/pkg/client"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

const (
	RolesOpenAPISource  = "roles.json"
	CreateRoleOperation = "createRole"
	UpdateRoleOperation = "updateRole"
)

// NewRoleFormGenerator builds a roles form generator using embedded OpenAPI + UI schema.
func NewRoleFormGenerator(cfg Config) (*formgenorchestrator.Orchestrator, error) {
	openapiFS := client.OpenAPI()
	if openapiFS == nil {
		return nil, serviceNotConfiguredDomainError("roles openapi filesystem", map[string]any{
			"component": "roles_formgen",
		})
	}
	if _, err := fs.Stat(openapiFS, RolesOpenAPISource); err != nil {
		return nil, serviceUnavailableDomainError("missing roles openapi", map[string]any{
			"component": "roles_formgen",
			"source":    RolesOpenAPISource,
			"error":     err.Error(),
		})
	}

	formTemplatesFS, err := fs.Sub(client.Templates(), "formgen/vanilla")
	if err != nil {
		return nil, serviceUnavailableDomainError("init form templates failed", map[string]any{
			"component": "roles_formgen",
			"error":     err.Error(),
		})
	}

	componentRegistry := components.New()
	componentRegistry.MustRegister("permission-matrix", PermissionMatrixDescriptor(cfg.BasePath))

	formGen, err := newFormGenerator(openapiFS, formTemplatesFS, componentRegistry)
	if err != nil {
		return nil, err
	}

	return formGen, nil
}

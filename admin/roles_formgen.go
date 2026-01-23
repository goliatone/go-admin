package admin

import (
	"fmt"
	"io/fs"

	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
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
		return nil, fmt.Errorf("roles OpenAPI filesystem not configured")
	}
	if _, err := fs.Stat(openapiFS, RolesOpenAPISource); err != nil {
		return nil, fmt.Errorf("missing roles OpenAPI: %w", err)
	}

	formTemplatesFS, err := fs.Sub(client.Templates(), "formgen/vanilla")
	if err != nil {
		return nil, fmt.Errorf("init form templates: %w", err)
	}

	componentRegistry := components.New()
	componentRegistry.MustRegister("permission-matrix", PermissionMatrixDescriptor(cfg.BasePath))

	formGen, err := quickstart.NewFormGenerator(
		openapiFS,
		formTemplatesFS,
		quickstart.WithComponentRegistryMergeDefaults(componentRegistry),
	)
	if err != nil {
		return nil, err
	}

	return formGen, nil
}

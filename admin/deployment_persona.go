package admin

import deploymentidentity "github.com/goliatone/go-admin/pkg/go-deployment-identity"

// Maintained aliases keep persona contracts available through both admin
// import paths while the independent package remains usable without core.
type (
	DeploymentPersona              = deploymentidentity.Persona
	DeploymentPersonaVisual        = deploymentidentity.Visual
	DeploymentPersonaInput         = deploymentidentity.Input
	DeploymentPersonaGenerator     = deploymentidentity.Generator
	DeploymentPersonaGeneratorFunc = deploymentidentity.GeneratorFunc
)

const (
	DeploymentPersonaVisualMonogram = deploymentidentity.VisualKindMonogram
	DeploymentPersonaVisualImage    = deploymentidentity.VisualKindImage
	DeploymentPersonaMediaTypePNG   = deploymentidentity.MediaTypePNG
)

func NewDefaultDeploymentPersonaGenerator() DeploymentPersonaGenerator {
	return deploymentidentity.NewDefaultGenerator()
}

func ValidateDeploymentPersona(persona DeploymentPersona) (DeploymentPersona, error) {
	return deploymentidentity.Validate(persona)
}

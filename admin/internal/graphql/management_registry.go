package graphql

import (
	crud "github.com/goliatone/go-crud"
	"github.com/goliatone/go-crud/gql/registrar"
	admingraphql "github.com/goliatone/go-admin/admin/graphql"
)

// RegisterManagementSchemas registers management schema controllers into the go-crud registry.
func RegisterManagementSchemas() {
	registrar.RegisterControllers(ManagementControllers()...)
}

// ManagementControllers returns schema controllers for management entities.
func ManagementControllers() []registrar.Controller {
	return []registrar.Controller{
		crud.NewController(newSchemaRepo(schemaHandlers[admingraphql.Content]())),
		crud.NewController(newSchemaRepo(schemaHandlers[admingraphql.Page]())),
		crud.NewController(newSchemaRepo(schemaHandlers[admingraphql.ContentType]())),
	}
}

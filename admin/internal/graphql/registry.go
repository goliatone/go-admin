package graphql

import (
	delivery "github.com/goliatone/go-admin/admin/graphql"
	crud "github.com/goliatone/go-crud"
	"github.com/goliatone/go-crud/gql/registrar"
)

// RegisterDeliverySchemas registers delivery schema controllers into the go-crud registry.
func RegisterDeliverySchemas() {
	registrar.RegisterControllers(DeliveryControllers()...)
}

// DeliveryControllers returns schema controllers for delivery entities.
func DeliveryControllers() []registrar.Controller {
	routeConfig := readOnlyRouteConfig()
	return []registrar.Controller{
		crud.NewController(newSchemaRepo(schemaHandlers[delivery.Content]()), crud.WithRouteConfig[delivery.Content](routeConfig)),
		crud.NewController(newSchemaRepo(schemaHandlers[delivery.Page]()), crud.WithRouteConfig[delivery.Page](routeConfig)),
		crud.NewController(newSchemaRepo(schemaHandlers[delivery.Menu]()), crud.WithRouteConfig[delivery.Menu](routeConfig)),
	}
}

func readOnlyRouteConfig() crud.RouteConfig {
	return crud.RouteConfig{
		Operations: map[crud.CrudOperation]crud.RouteOptions{
			crud.OpCreate:      {Enabled: new(false)},
			crud.OpCreateBatch: {Enabled: new(false)},
			crud.OpUpdate:      {Enabled: new(false)},
			crud.OpUpdateBatch: {Enabled: new(false)},
			crud.OpDelete:      {Enabled: new(false)},
			crud.OpDeleteBatch: {Enabled: new(false)},
		},
	}
}

func init() {
	RegisterDeliverySchemas()
}

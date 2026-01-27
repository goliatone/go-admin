package graphql

import (
	crud "github.com/goliatone/go-crud"
	"github.com/goliatone/go-crud/gql/registrar"
	delivery "github.com/goliatone/go-admin/admin/graphql"
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
			crud.OpCreate:      {Enabled: crud.BoolPtr(false)},
			crud.OpCreateBatch: {Enabled: crud.BoolPtr(false)},
			crud.OpUpdate:      {Enabled: crud.BoolPtr(false)},
			crud.OpUpdateBatch: {Enabled: crud.BoolPtr(false)},
			crud.OpDelete:      {Enabled: crud.BoolPtr(false)},
			crud.OpDeleteBatch: {Enabled: crud.BoolPtr(false)},
		},
	}
}

func init() {
	RegisterDeliverySchemas()
}

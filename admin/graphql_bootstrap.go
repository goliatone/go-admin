package admin

import (
	"github.com/goliatone/go-crud/gql/registrar"
	"github.com/goliatone/go-admin/admin/internal/graphql"
)

// DeliveryGraphQLControllers exposes delivery schema controllers for go-crud/gql registration.
func DeliveryGraphQLControllers() []registrar.Controller {
	return graphql.DeliveryControllers()
}

// RegisterDeliveryGraphQLSchemas registers delivery schemas into the go-crud registry.
func RegisterDeliveryGraphQLSchemas() {
	graphql.RegisterDeliverySchemas()
}

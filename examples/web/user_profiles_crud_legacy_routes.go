package main

import "github.com/goliatone/go-crud"

// registerLegacyUserProfileCRUDRoutes keeps legacy plural CRUD endpoints
// for user profiles while go-crud canonical routes remain singular for item/write paths.
func registerLegacyUserProfileCRUDRoutes[T any](adapter crud.Router, controller *crud.Controller[T]) {
	if adapter == nil || controller == nil {
		return
	}

	adapter.Post("/user-profiles", controller.Create)
	adapter.Get("/user-profiles/:id", controller.Show)
	adapter.Put("/user-profiles/:id", controller.Update)
	adapter.Delete("/user-profiles/:id", controller.Delete)

	adapter.Post("/user-profiles/batch", controller.CreateBatch)
	adapter.Put("/user-profiles/batch", controller.UpdateBatch)
	adapter.Delete("/user-profiles/batch", controller.DeleteBatch)
}

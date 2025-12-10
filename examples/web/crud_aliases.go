package main

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-crud"
)

func registerCrudAliases[T any](adapter crud.Router, controller *crud.Controller[T], resources string) {
	if adapter == nil || controller == nil {
		return
	}
	resources = strings.Trim(strings.TrimSpace(resources), "/")
	if resources == "" {
		return
	}

	base := fmt.Sprintf("/%s", resources)
	itemPath := fmt.Sprintf("%s/:id", base)
	batchPath := fmt.Sprintf("%s/batch", base)

	adapter.Post(base, controller.Create)
	adapter.Get(itemPath, controller.Show)
	adapter.Put(itemPath, controller.Update)
	adapter.Delete(itemPath, controller.Delete)

	adapter.Post(batchPath, controller.CreateBatch)
	adapter.Put(batchPath, controller.UpdateBatch)
	adapter.Delete(batchPath, controller.DeleteBatch)
}

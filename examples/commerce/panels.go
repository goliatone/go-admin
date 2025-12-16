package main

import (
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

func newUserPanel(store *stores.CommerceStores) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store.Users).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "name", Label: "Name", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "loyalty_tier", Label: "Loyalty Tier", Type: "select", Options: []admin.Option{
				{Value: "gold", Label: "Gold"},
				{Value: "silver", Label: "Silver"},
				{Value: "bronze", Label: "Bronze"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "inactive", Label: "Inactive"},
			}},
		).
		FormFields(
			admin.Field{Name: "name", Label: "Name", Type: "text", Required: true},
			admin.Field{Name: "email", Label: "Email", Type: "email", Required: true},
			admin.Field{Name: "loyalty_tier", Label: "Loyalty Tier", Type: "select", Required: true, Options: []admin.Option{
				{Value: "gold", Label: "Gold"},
				{Value: "silver", Label: "Silver"},
				{Value: "bronze", Label: "Bronze"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "inactive", Label: "Inactive"},
			}},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "name", Label: "Name", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "loyalty_tier", Label: "Loyalty Tier", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
		).
		Filters(
			admin.Filter{Name: "loyalty_tier", Type: "select"},
			admin.Filter{Name: "status", Type: "select"},
		).
		Permissions(admin.PanelPermissions{
			View:   "commerce.users.view",
			Create: "commerce.users.edit",
			Edit:   "commerce.users.edit",
			Delete: "commerce.users.delete",
		})
	return builder
}

func newProductPanel(store *stores.CommerceStores) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store.Products).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "name", Label: "Name", Type: "text"},
			admin.Field{Name: "sku", Label: "SKU", Type: "text"},
			admin.Field{Name: "price", Label: "Price", Type: "number"},
			admin.Field{Name: "inventory", Label: "Inventory", Type: "number"},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "archived", Label: "Archived"},
			}},
		).
		FormFields(
			admin.Field{Name: "name", Label: "Name", Type: "text", Required: true},
			admin.Field{Name: "sku", Label: "SKU", Type: "text", Required: true},
			admin.Field{Name: "price", Label: "Price", Type: "number", Required: true},
			admin.Field{Name: "inventory", Label: "Inventory", Type: "number", Required: true},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "archived", Label: "Archived"},
			}},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "name", Label: "Name", Type: "text"},
			admin.Field{Name: "sku", Label: "SKU", Type: "text"},
			admin.Field{Name: "price", Label: "Price", Type: "number"},
			admin.Field{Name: "inventory", Label: "Inventory", Type: "number"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
		).
		Filters(admin.Filter{Name: "status", Type: "select"}).
		Permissions(admin.PanelPermissions{
			View:   "commerce.products.view",
			Create: "commerce.products.edit",
			Edit:   "commerce.products.edit",
			Delete: "commerce.products.delete",
		})
	return builder
}

func newOrderPanel(store *stores.CommerceStores) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store.Orders).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "number", Label: "Order #", Type: "text"},
			admin.Field{Name: "user_name", Label: "Customer", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "paid", Label: "Paid"},
				{Value: "fulfilled", Label: "Fulfilled"},
				{Value: "pending", Label: "Pending"},
			}},
			admin.Field{Name: "total", Label: "Total", Type: "number"},
			admin.Field{Name: "created_at", Label: "Placed At", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "number", Label: "Order #", Type: "text", Required: true},
			admin.Field{Name: "user_name", Label: "Customer", Type: "text", Required: true},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "paid", Label: "Paid"},
				{Value: "fulfilled", Label: "Fulfilled"},
				{Value: "pending", Label: "Pending"},
			}},
			admin.Field{Name: "total", Label: "Total", Type: "number", Required: true},
			admin.Field{Name: "line_items", Label: "Items", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "number", Label: "Order #", Type: "text"},
			admin.Field{Name: "user_name", Label: "Customer", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "total", Label: "Total", Type: "number"},
			admin.Field{Name: "line_items", Label: "Items", Type: "textarea"},
			admin.Field{Name: "created_at", Label: "Placed At", Type: "datetime"},
		).
		Filters(admin.Filter{Name: "status", Type: "select"}).
		Permissions(admin.PanelPermissions{
			View:   "commerce.orders.view",
			Create: "commerce.orders.edit",
			Edit:   "commerce.orders.edit",
			Delete: "commerce.orders.delete",
		})
	return builder
}

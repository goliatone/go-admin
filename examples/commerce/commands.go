package main

import (
	"context"
	"fmt"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/commerce/stores"
)

func registerCommands(adm *admin.Admin, data *stores.CommerceStores) {
	if adm == nil || data == nil || adm.Commands() == nil {
		return
	}
	adm.Commands().Register(&restockLowInventoryCommand{
		products:       data.Products,
		threshold:      5,
		restockAmount:  15,
		commandName:    "commerce.restock_low",
	})
	adm.Commands().Register(&dailyRevenueReportCommand{
		stores: data,
		name:   "commerce.daily_report",
	})
}

type restockLowInventoryCommand struct {
	products      *admin.MemoryRepository
	threshold     int
	restockAmount int
	commandName   string
}

func (c *restockLowInventoryCommand) Name() string { return c.commandName }

func (c *restockLowInventoryCommand) Execute(ctx context.Context) error {
	if c.products == nil {
		return fmt.Errorf("products repository missing")
	}
	records, _, err := c.products.List(ctx, admin.ListOptions{Page: 1, PerPage: 100})
	if err != nil {
		return err
	}
	for _, rec := range records {
		inv := toInt(rec["inventory"])
		if inv >= c.threshold {
			continue
		}
		id := stringVal(rec["id"])
		if id == "" {
			continue
		}
		_, _ = c.products.Update(ctx, id, map[string]any{"inventory": inv + c.restockAmount})
	}
	return nil
}

func (c *restockLowInventoryCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"admin", "commerce", "restock-low"},
		Description: "Restock products that fell below the threshold",
	}
}

type dailyRevenueReportCommand struct {
	stores *stores.CommerceStores
	name   string
}

func (c *dailyRevenueReportCommand) Name() string { return c.name }

func (c *dailyRevenueReportCommand) Execute(ctx context.Context) error {
	if c.stores == nil {
		return fmt.Errorf("stores missing")
	}
	_, err := c.stores.GrossRevenue(ctx)
	return err
}

func (c *dailyRevenueReportCommand) CronSpec() string {
	return "@daily"
}

func (c *dailyRevenueReportCommand) CronHandler() func() error {
	return func() error {
		return c.Execute(context.Background())
	}
}

func toInt(v any) int {
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	default:
		return 0
	}
}

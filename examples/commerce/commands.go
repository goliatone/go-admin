package main

import (
	"context"
	"fmt"

	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
)

func registerCommands(adm *admin.Admin, data *stores.CommerceStores) error {
	if adm == nil || data == nil || adm.Commands() == nil {
		return nil
	}
	bus := adm.Commands()
	if err := registerCommerceCommandFactories(bus); err != nil {
		return err
	}
	if err := bus.Register(&restockLowInventoryCommand{
		products:      data.Products,
		threshold:     5,
		restockAmount: 15,
	}); err != nil {
		return err
	}
	if err := bus.Register(&dailyRevenueReportCommand{
		stores: data,
	}); err != nil {
		return err
	}
	return nil
}

const restockLowInventoryCommandName = "commerce.restock_low"

type RestockLowInventoryMsg struct{}

func (RestockLowInventoryMsg) Type() string { return restockLowInventoryCommandName }

type restockLowInventoryCommand struct {
	products      *admin.MemoryRepository
	threshold     int
	restockAmount int
}

func (c *restockLowInventoryCommand) Execute(ctx context.Context, _ RestockLowInventoryMsg) error {
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

func (c *restockLowInventoryCommand) CLIHandler() any {
	return &admin.NoopCLIHandler{}
}

func (c *restockLowInventoryCommand) CLIOptions() admin.CLIConfig {
	return admin.CLIConfig{
		Path:        []string{"admin", "commerce", "restock-low"},
		Description: "Restock products that fell below the threshold",
	}
}

const dailyRevenueReportCommandName = "commerce.daily_report"

type DailyRevenueReportMsg struct{}

func (DailyRevenueReportMsg) Type() string { return dailyRevenueReportCommandName }

type dailyRevenueReportCommand struct {
	stores *stores.CommerceStores
}

func (c *dailyRevenueReportCommand) Execute(ctx context.Context, _ DailyRevenueReportMsg) error {
	if c.stores == nil {
		return fmt.Errorf("stores missing")
	}
	_, err := c.stores.GrossRevenue(ctx)
	return err
}

func (c *dailyRevenueReportCommand) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), DailyRevenueReportMsg{})
	}
}

func (c *dailyRevenueReportCommand) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@daily"}
}

func registerCommerceCommandFactories(bus *admin.CommandBus) error {
	if err := bus.RegisterMessageFactory(restockLowInventoryCommandName, buildRestockLowInventoryMsg); err != nil {
		return err
	}
	return bus.RegisterMessageFactory(dailyRevenueReportCommandName, buildDailyRevenueReportMsg)
}

func buildRestockLowInventoryMsg(_ map[string]any, _ []string) (RestockLowInventoryMsg, error) {
	return RestockLowInventoryMsg{}, nil
}

func buildDailyRevenueReportMsg(_ map[string]any, _ []string) (DailyRevenueReportMsg, error) {
	return DailyRevenueReportMsg{}, nil
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

package main

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/commerce/stores"
)

func registerDashboard(adm *admin.Admin, data *stores.CommerceStores) {
	dash := adm.Dashboard()
	if dash == nil || data == nil {
		return
	}
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:          "commerce.widget.sales_overview",
		Name:          "Sales Overview",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"show_revenue": true},
		CommandName:   "commerce.dashboard.sales_overview",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			orders, err := data.AllOrders(ctx.Context)
			if err != nil {
				return nil, err
			}
			products, err := data.AllProducts(ctx.Context)
			if err != nil {
				return nil, err
			}
			revenue, err := data.GrossRevenue(ctx.Context)
			if err != nil {
				return nil, err
			}
			highlight := "stable"
			if revenue > 400 {
				highlight = "up"
			}
			return map[string]any{
				"orders":       len(orders),
				"products":     len(products),
				"revenue":      revenue,
				"revenue_flag": highlight,
				"show_revenue": cfg["show_revenue"] != false,
			}, nil
		},
	})
}

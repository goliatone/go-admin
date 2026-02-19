package main

import (
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
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
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			orders, err := data.AllOrders(ctx.Context)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			products, err := data.AllProducts(ctx.Context)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			revenue, err := data.GrossRevenue(ctx.Context)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			highlight := "stable"
			if revenue > 400 {
				highlight = "up"
			}
			return admin.WidgetPayloadOf(struct {
				Orders      int     `json:"orders"`
				Products    int     `json:"products"`
				Revenue     float64 `json:"revenue"`
				RevenueFlag string  `json:"revenue_flag"`
				ShowRevenue bool    `json:"show_revenue"`
			}{
				Orders:      len(orders),
				Products:    len(products),
				Revenue:     revenue,
				RevenueFlag: highlight,
				ShowRevenue: cfg["show_revenue"] != false,
			}), nil
		},
	})
}

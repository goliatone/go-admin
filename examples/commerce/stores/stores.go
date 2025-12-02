package stores

import (
	"context"
	"fmt"
	"time"

	"github.com/goliatone/go-admin/admin"
)

// CommerceStores groups the in-memory repositories used by the commerce example.
type CommerceStores struct {
	Users    *admin.MemoryRepository
	Products *admin.MemoryRepository
	Orders   *admin.MemoryRepository
}

// Seed initializes repositories with sample data for the commerce demo.
func Seed(ctx context.Context) (*CommerceStores, error) {
	users := admin.NewMemoryRepository()
	products := admin.NewMemoryRepository()
	orders := admin.NewMemoryRepository()

	customerRecords, err := createAll(ctx, users, []map[string]any{
		{"name": "Ada Lovelace", "email": "ada@example.com", "loyalty_tier": "gold", "status": "active"},
		{"name": "Grace Hopper", "email": "grace@example.com", "loyalty_tier": "silver", "status": "active"},
		{"name": "Alan Turing", "email": "alan@example.com", "loyalty_tier": "bronze", "status": "inactive"},
	})
	if err != nil {
		return nil, fmt.Errorf("seed users: %w", err)
	}

	productRecords, err := createAll(ctx, products, []map[string]any{
		{"name": "Performance Hoodie", "sku": "HD-001", "price": 79.00, "inventory": 12, "status": "active"},
		{"name": "Everyday Backpack", "sku": "BP-002", "price": 129.00, "inventory": 6, "status": "active"},
		{"name": "Travel Bottle", "sku": "BT-003", "price": 28.00, "inventory": 30, "status": "active"},
	})
	if err != nil {
		return nil, fmt.Errorf("seed products: %w", err)
	}

	now := time.Now()
	if _, err := createAll(ctx, orders, []map[string]any{
		{
			"number":      "1001",
			"user_id":     customerRecords[0]["id"],
			"user_name":   customerRecords[0]["name"],
			"total":       208.00,
			"status":      "paid",
			"line_items":  "Performance Hoodie x1, Travel Bottle x1",
			"created_at":  now.Add(-48 * time.Hour).Format(time.RFC3339),
			"product_ids": []any{productRecords[0]["id"], productRecords[2]["id"]},
		},
		{
			"number":      "1002",
			"user_id":     customerRecords[1]["id"],
			"user_name":   customerRecords[1]["name"],
			"total":       258.00,
			"status":      "fulfilled",
			"line_items":  "Everyday Backpack x2",
			"created_at":  now.Add(-24 * time.Hour).Format(time.RFC3339),
			"product_ids": []any{productRecords[1]["id"]},
		},
		{
			"number":      "1003",
			"user_id":     customerRecords[2]["id"],
			"user_name":   customerRecords[2]["name"],
			"total":       79.00,
			"status":      "pending",
			"line_items":  "Performance Hoodie x1",
			"created_at":  now.Add(-3 * time.Hour).Format(time.RFC3339),
			"product_ids": []any{productRecords[0]["id"]},
		},
	}); err != nil {
		return nil, fmt.Errorf("seed orders: %w", err)
	}

	return &CommerceStores{
		Users:    users,
		Products: products,
		Orders:   orders,
	}, nil
}

// AllProducts returns every product record to support dashboard/search helpers.
func (s *CommerceStores) AllProducts(ctx context.Context) ([]map[string]any, error) {
	return listAll(ctx, s.Products)
}

// AllOrders returns every order record to support dashboard/search helpers.
func (s *CommerceStores) AllOrders(ctx context.Context) ([]map[string]any, error) {
	return listAll(ctx, s.Orders)
}

// AllUsers returns every user record.
func (s *CommerceStores) AllUsers(ctx context.Context) ([]map[string]any, error) {
	return listAll(ctx, s.Users)
}

// GrossRevenue sums order totals for quick dashboard stats.
func (s *CommerceStores) GrossRevenue(ctx context.Context) (float64, error) {
	orders, err := s.AllOrders(ctx)
	if err != nil {
		return 0, err
	}
	total := 0.0
	for _, order := range orders {
		switch v := order["total"].(type) {
		case float64:
			total += v
		case int:
			total += float64(v)
		}
	}
	return total, nil
}

func createAll(ctx context.Context, repo *admin.MemoryRepository, records []map[string]any) ([]map[string]any, error) {
	out := make([]map[string]any, 0, len(records))
	for _, rec := range records {
		created, err := repo.Create(ctx, rec)
		if err != nil {
			return nil, err
		}
		out = append(out, created)
	}
	return out, nil
}

func listAll(ctx context.Context, repo *admin.MemoryRepository) ([]map[string]any, error) {
	if repo == nil {
		return []map[string]any{}, nil
	}
	records, _, err := repo.List(ctx, admin.ListOptions{Page: 1, PerPage: 100})
	if err != nil {
		return nil, err
	}
	return records, nil
}

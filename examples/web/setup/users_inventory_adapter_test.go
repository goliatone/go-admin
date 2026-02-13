package setup

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	admincontract "github.com/goliatone/go-admin/quickstart/admin"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestInventoryRepositoryAdapterReturnsAccurateTotalAndPagination(t *testing.T) {
	ctx := context.Background()
	repo := setupInventoryAdapterFixture(t, 73)

	first, err := repo.ListUsers(ctx, types.UserInventoryFilter{
		Keyword:    inventoryAdapterTestUserPrefix,
		Pagination: types.Pagination{Limit: 25, Offset: 0},
	})
	if err != nil {
		t.Fatalf("list users page 1: %v", err)
	}
	if first.Total != 73 {
		t.Fatalf("expected total=73, got %d", first.Total)
	}
	if len(first.Users) != 25 {
		t.Fatalf("expected 25 users on page 1, got %d", len(first.Users))
	}
	if first.NextOffset != 25 {
		t.Fatalf("expected next offset=25, got %d", first.NextOffset)
	}
	if !first.HasMore {
		t.Fatalf("expected has_more=true on page 1")
	}

	second, err := repo.ListUsers(ctx, types.UserInventoryFilter{
		Keyword:    inventoryAdapterTestUserPrefix,
		Pagination: types.Pagination{Limit: 25, Offset: 25},
	})
	if err != nil {
		t.Fatalf("list users page 2: %v", err)
	}
	if second.Total != 73 {
		t.Fatalf("expected total=73 on page 2, got %d", second.Total)
	}
	if len(second.Users) != 25 {
		t.Fatalf("expected 25 users on page 2, got %d", len(second.Users))
	}
	if second.NextOffset != 50 {
		t.Fatalf("expected next offset=50, got %d", second.NextOffset)
	}
	if !second.HasMore {
		t.Fatalf("expected has_more=true on page 2")
	}

	largePage, err := repo.ListUsers(ctx, types.UserInventoryFilter{
		Keyword:    inventoryAdapterTestUserPrefix,
		Pagination: types.Pagination{Limit: 100, Offset: 0},
	})
	if err != nil {
		t.Fatalf("list users large page: %v", err)
	}
	if largePage.Total != 73 {
		t.Fatalf("expected total=73 on large page, got %d", largePage.Total)
	}
	if len(largePage.Users) != 73 {
		t.Fatalf("expected 73 users on large page, got %d", len(largePage.Users))
	}
	if largePage.NextOffset != 73 {
		t.Fatalf("expected next offset=73 on large page, got %d", largePage.NextOffset)
	}
	if largePage.HasMore {
		t.Fatalf("expected has_more=false on large page")
	}
}

func TestInventoryRepositoryAdapterPaginationContract(t *testing.T) {
	repo := setupInventoryAdapterFixture(t, 73)
	admincontract.AssertPaginationContract(t, inventoryListContractFunc(repo), admincontract.PaginationContractConfig{
		TotalExpected: 73,
		PerPage:       25,
		Search:        inventoryAdapterTestUserPrefix,
		UniqueKey:     "id",
	})
}

const inventoryAdapterTestUserPrefix = "inventory.user."

func setupInventoryAdapterFixture(t *testing.T, total int) types.UserInventoryRepository {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_inventory_adapter_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}
	usersRepo := deps.RepoManager.Users()
	for i := 0; i < total; i++ {
		username := fmt.Sprintf("inventory.user.%03d", i)
		if _, err := usersRepo.Create(ctx, &auth.User{
			ID:       uuid.New(),
			Username: username,
			Email:    fmt.Sprintf("%s@example.com", username),
			Role:     auth.RoleMember,
			Status:   auth.UserStatusActive,
		}); err != nil {
			t.Fatalf("seed user %d: %v", i, err)
		}
	}

	if deps.InventoryRepo == nil {
		t.Fatalf("inventory repository not configured")
	}
	return deps.InventoryRepo
}

func inventoryListContractFunc(repo types.UserInventoryRepository) admincontract.ListFunc {
	return func(ctx context.Context, opts admincontract.ListOptions) ([]map[string]any, int, error) {
		page := opts.Page
		if page <= 0 {
			page = 1
		}
		limit := opts.PerPage
		offset := 0
		if limit > 0 {
			offset = (page - 1) * limit
		}

		filter := types.UserInventoryFilter{
			Keyword:    strings.TrimSpace(opts.Search),
			Pagination: types.Pagination{Limit: limit, Offset: offset},
		}
		if role, ok := opts.Filters["role"].(string); ok {
			filter.Role = strings.TrimSpace(role)
		}
		if status, ok := opts.Filters["status"].(string); ok {
			trimmed := strings.TrimSpace(status)
			if trimmed != "" {
				filter.Statuses = []types.LifecycleState{types.LifecycleState(trimmed)}
			}
		}

		pageResult, err := repo.ListUsers(ctx, filter)
		if err != nil {
			return nil, 0, err
		}

		out := make([]map[string]any, 0, len(pageResult.Users))
		for _, user := range pageResult.Users {
			out = append(out, map[string]any{
				"id":       user.ID.String(),
				"username": user.Username,
				"email":    user.Email,
				"role":     user.Role,
				"status":   string(user.Status),
			})
		}
		return out, pageResult.Total, nil
	}
}

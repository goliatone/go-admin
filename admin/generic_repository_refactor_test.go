package admin

import (
	"context"
	"errors"
	"testing"

	admingraphql "github.com/goliatone/go-admin/admin/graphql"
)

func TestGenericPanelRepositoryAddsTenantMemberCount(t *testing.T) {
	repo := NewTenantPanelRepository(NewTenantService(NewInMemoryTenantStore()))

	record, err := repo.Create(context.Background(), map[string]any{
		"name":   "Acme",
		"slug":   "acme",
		"status": "active",
		"members": []map[string]any{
			{"user_id": "user-1", "roles": []string{"owner"}},
			{"user_id": "user-2", "roles": []string{"editor"}},
		},
	})
	if err != nil {
		t.Fatalf("create tenant: %v", err)
	}
	if got := toString(record["name"]); got != "Acme" {
		t.Fatalf("expected saved tenant name, got %q", got)
	}

	records, total, err := repo.List(context.Background(), ListOptions{})
	if err != nil {
		t.Fatalf("list tenants: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("expected one tenant, got total=%d len=%d", total, len(records))
	}
	if got := toInt(records[0]["member_count"]); got != 2 {
		t.Fatalf("expected member_count=2, got %d", got)
	}
}

func TestGenericPanelRepositoryReturnsFeatureDisabledError(t *testing.T) {
	repo := NewOrganizationPanelRepository(nil)
	_, _, err := repo.List(context.Background(), ListOptions{})
	var disabled FeatureDisabledError
	if !errors.As(err, &disabled) || disabled.Feature != string(FeatureOrganizations) {
		t.Fatalf("expected organizations feature disabled error, got %v", err)
	}
}

func TestManagementReadOnlyBatchHelpersReturnConfiguredError(t *testing.T) {
	service := NewManagementContentService(nil, DeliveryOptions{})

	if _, err := service.CreateBatch(nil, []admingraphql.Content{{ID: "content-1"}}); !errors.Is(err, errManagementReadOnly) {
		t.Fatalf("expected management read-only error from CreateBatch, got %v", err)
	}
	if _, err := service.UpdateBatch(nil, []admingraphql.Content{{ID: "content-1"}}); !errors.Is(err, errManagementReadOnly) {
		t.Fatalf("expected management read-only error from UpdateBatch, got %v", err)
	}
	if err := service.DeleteBatch(nil, []admingraphql.Content{{ID: "content-1"}}); !errors.Is(err, errManagementReadOnly) {
		t.Fatalf("expected management read-only error from DeleteBatch, got %v", err)
	}
}

func TestDeliveryReadOnlyCRUDHelpersReturnConfiguredError(t *testing.T) {
	service := NewDeliveryContentService(nil, DeliveryOptions{})

	if _, err := service.Create(nil, admingraphql.Content{ID: "content-1"}); !errors.Is(err, errDeliveryReadOnly) {
		t.Fatalf("expected delivery read-only error from Create, got %v", err)
	}
	if _, err := service.CreateBatch(nil, []admingraphql.Content{{ID: "content-1"}}); !errors.Is(err, errDeliveryReadOnly) {
		t.Fatalf("expected delivery read-only error from CreateBatch, got %v", err)
	}
	if _, err := service.Update(nil, admingraphql.Content{ID: "content-1"}); !errors.Is(err, errDeliveryReadOnly) {
		t.Fatalf("expected delivery read-only error from Update, got %v", err)
	}
	if _, err := service.UpdateBatch(nil, []admingraphql.Content{{ID: "content-1"}}); !errors.Is(err, errDeliveryReadOnly) {
		t.Fatalf("expected delivery read-only error from UpdateBatch, got %v", err)
	}
	if err := service.Delete(nil, admingraphql.Content{ID: "content-1"}); !errors.Is(err, errDeliveryReadOnly) {
		t.Fatalf("expected delivery read-only error from Delete, got %v", err)
	}
	if err := service.DeleteBatch(nil, []admingraphql.Content{{ID: "content-1"}}); !errors.Is(err, errDeliveryReadOnly) {
		t.Fatalf("expected delivery read-only error from DeleteBatch, got %v", err)
	}
}

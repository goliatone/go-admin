package stores_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/search"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
)

func TestUserStoreCRUDPropagatesChangesAndActivity(t *testing.T) {
	dsn := fmt.Sprintf("file:users_test_crud_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("failed to build user store: %v", err)
	}
	store.Teardown()
	sink := &recordingActivitySink{}
	store.WithActivitySink(sink)

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "admin-1",
		Subject: "admin@example.com",
		Role:    "admin",
	})

	created, err := store.Create(ctx, map[string]any{
		"username": "crud.user",
		"email":    "crud.user@example.com",
		"role":     "editor",
		"status":   "active",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id := fmt.Sprint(created["id"])
	if id == "" {
		t.Fatalf("expected created user to have an id")
	}

	users, total, err := store.List(ctx, admin.ListOptions{})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(users) != 1 {
		t.Fatalf("expected 1 user after create, got total=%d len=%d", total, len(users))
	}

	updated, err := store.Update(ctx, id, map[string]any{
		"email":  "updated@example.com",
		"status": "inactive",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if fmt.Sprint(updated["email"]) != "updated@example.com" {
		t.Fatalf("email not updated, got %v", updated["email"])
	}
	if fmt.Sprint(updated["status"]) != "suspended" {
		t.Fatalf("status not updated, got %v", updated["status"])
	}

	if err := store.Delete(ctx, id); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	if _, err := store.Get(ctx, id); err == nil {
		t.Fatalf("expected get to fail after delete")
	}
	_, total, _ = store.List(ctx, admin.ListOptions{})
	if total != 0 {
		t.Fatalf("expected empty store after delete, got total=%d", total)
	}

	expectedActions := []string{"created", "updated", "deleted"}
	if got := sink.actions(); len(got) != len(expectedActions) {
		t.Fatalf("expected %d activity entries, got %d", len(expectedActions), len(got))
	} else {
		for i, action := range expectedActions {
			if got[i] != action {
				t.Fatalf("activity %d: expected action %q, got %q", i, action, got[i])
			}
		}
	}
}

func TestUsersSearchAdapterReflectsStoreChanges(t *testing.T) {
	dsn := fmt.Sprintf("file:users_test_search_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("failed to build user store: %v", err)
	}
	store.Teardown()
	ctx := context.Background()

	record, err := store.Create(ctx, map[string]any{
		"username": "search.user",
		"email":    "search.user@example.com",
		"role":     "viewer",
		"status":   "active",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	userID := fmt.Sprint(record["id"])

	adapter := search.NewUsersSearchAdapter(store)

	results, err := adapter.Search(ctx, "search.user", 5)
	if err != nil {
		t.Fatalf("search failed: %v", err)
	}
	assertHasResult(t, results, userID, "search.user")

	_, err = store.Update(ctx, userID, map[string]any{
		"username": "renamed.user",
		"email":    "renamed.user@example.com",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}

	results, err = adapter.Search(ctx, "renamed.user", 5)
	if err != nil {
		t.Fatalf("search after update failed: %v", err)
	}
	assertHasResult(t, results, userID, "renamed.user")

	if err := store.Delete(ctx, userID); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	results, err = adapter.Search(ctx, "renamed.user", 5)
	if err != nil {
		t.Fatalf("search after delete failed: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected no results after delete, got %d", len(results))
	}
}

func TestUserStoreTeardownRemovesUsersBeyondLegacyPageLimit(t *testing.T) {
	dsn := fmt.Sprintf("file:users_test_teardown_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("failed to build user store: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "admin-teardown",
		Subject: "admin@example.com",
		Role:    "admin",
	})

	createTestUsers(t, store, ctx, 40)
	store.Teardown()

	_, total, err := store.List(ctx, admin.ListOptions{Page: 1, PerPage: 1})
	if err != nil {
		t.Fatalf("list after teardown failed: %v", err)
	}
	if total != 0 {
		t.Fatalf("expected total=0 after teardown, got %d", total)
	}
}

func TestUserStoreListReturnsGlobalTotalAcrossPages(t *testing.T) {
	dsn := fmt.Sprintf("file:users_test_pagination_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("failed to build user store: %v", err)
	}
	store.Teardown()

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "admin-pagination",
		Subject: "admin@example.com",
		Role:    "admin",
	})

	createTestUsers(t, store, ctx, 60)

	pageOne, total, err := store.List(ctx, admin.ListOptions{
		Page:    1,
		PerPage: 25,
	})
	if err != nil {
		t.Fatalf("page 1 list failed: %v", err)
	}
	if total != 60 {
		t.Fatalf("expected total=60 on page 1, got %d", total)
	}
	if len(pageOne) != 25 {
		t.Fatalf("expected 25 records on page 1, got %d", len(pageOne))
	}

	pageThree, total, err := store.List(ctx, admin.ListOptions{
		Page:    3,
		PerPage: 25,
	})
	if err != nil {
		t.Fatalf("page 3 list failed: %v", err)
	}
	if total != 60 {
		t.Fatalf("expected total=60 on page 3, got %d", total)
	}
	if len(pageThree) != 10 {
		t.Fatalf("expected 10 records on page 3, got %d", len(pageThree))
	}
}

func TestUserStoreListAppliesSortAndExtendedFiltersBeforePagination(t *testing.T) {
	dsn := fmt.Sprintf("file:users_test_postprocessing_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("failed to build user store: %v", err)
	}
	store.Teardown()

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "admin-postprocessing",
		Subject: "admin@example.com",
		Role:    "admin",
	})

	createTestUsers(t, store, ctx, 60)

	sortedPageOne, total, err := store.List(ctx, admin.ListOptions{
		Page:    1,
		PerPage: 10,
		SortBy:  "username",
	})
	if err != nil {
		t.Fatalf("sorted page 1 list failed: %v", err)
	}
	if total != 60 {
		t.Fatalf("expected total=60 for sorted list, got %d", total)
	}
	if len(sortedPageOne) != 10 {
		t.Fatalf("expected 10 records on sorted page 1, got %d", len(sortedPageOne))
	}
	if got := fmt.Sprint(sortedPageOne[0]["username"]); got != "user.000" {
		t.Fatalf("expected first sorted username user.000, got %s", got)
	}

	sortedPageTwo, total, err := store.List(ctx, admin.ListOptions{
		Page:    2,
		PerPage: 10,
		SortBy:  "username",
	})
	if err != nil {
		t.Fatalf("sorted page 2 list failed: %v", err)
	}
	if total != 60 {
		t.Fatalf("expected total=60 for sorted page 2, got %d", total)
	}
	if len(sortedPageTwo) != 10 {
		t.Fatalf("expected 10 records on sorted page 2, got %d", len(sortedPageTwo))
	}
	if got := fmt.Sprint(sortedPageTwo[0]["username"]); got != "user.010" {
		t.Fatalf("expected first sorted username on page 2 user.010, got %s", got)
	}

	filteredPageOne, total, err := store.List(ctx, admin.ListOptions{
		Page:    1,
		PerPage: 10,
		Filters: map[string]any{"role__in": "member"},
	})
	if err != nil {
		t.Fatalf("filtered page 1 list failed: %v", err)
	}
	if total != 30 {
		t.Fatalf("expected member filter total=30, got %d", total)
	}
	if len(filteredPageOne) != 10 {
		t.Fatalf("expected 10 member records on page 1, got %d", len(filteredPageOne))
	}

	filteredPageThree, total, err := store.List(ctx, admin.ListOptions{
		Page:    3,
		PerPage: 10,
		Filters: map[string]any{"role__in": "member"},
	})
	if err != nil {
		t.Fatalf("filtered page 3 list failed: %v", err)
	}
	if total != 30 {
		t.Fatalf("expected member filter total=30 on page 3, got %d", total)
	}
	if len(filteredPageThree) != 10 {
		t.Fatalf("expected 10 member records on page 3, got %d", len(filteredPageThree))
	}
}

func createTestUsers(t *testing.T, store *stores.UserStore, ctx context.Context, total int) {
	t.Helper()
	for i := 0; i < total; i++ {
		role := "admin"
		if i%2 == 0 {
			role = "member"
		}
		username := fmt.Sprintf("user.%03d", i)
		email := fmt.Sprintf("%s@example.com", username)
		_, err := store.Create(ctx, map[string]any{
			"username": username,
			"email":    email,
			"role":     role,
			"status":   "active",
		})
		if err != nil {
			t.Fatalf("create user %d failed: %v", i, err)
		}
	}
}

type recordingActivitySink struct {
	entries []admin.ActivityEntry
}

func (s *recordingActivitySink) Record(_ context.Context, entry admin.ActivityEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

func (s *recordingActivitySink) List(_ context.Context, limit int, _ ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	if limit <= 0 || limit > len(s.entries) {
		limit = len(s.entries)
	}
	out := make([]admin.ActivityEntry, 0, limit)
	out = append(out, s.entries[:limit]...)
	return out, nil
}

func (s *recordingActivitySink) actions() []string {
	actions := make([]string, 0, len(s.entries))
	for _, entry := range s.entries {
		actions = append(actions, entry.Action)
	}
	return actions
}

func assertHasResult(t *testing.T, results []admin.SearchResult, id string, title string) {
	t.Helper()
	for _, result := range results {
		if result.ID == id {
			if result.Title != title {
				t.Fatalf("expected result title %q for id %s, got %q", title, id, result.Title)
			}
			return
		}
	}
	t.Fatalf("expected result with id %s and title %s", id, title)
}

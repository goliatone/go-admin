package stores_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestUserProfileStore_UpdateAllowsClearingOptionalFields(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:user_profile_clear_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(ctx, dsn)
	require.NoError(t, err)

	store, err := stores.NewUserProfileStore(deps)
	require.NoError(t, err)

	adminUser, err := deps.RepoManager.Users().GetByIdentifier(ctx, "admin")
	require.NoError(t, err)
	require.NotNil(t, adminUser)

	current, err := store.Get(ctx, adminUser.ID.String())
	require.NoError(t, err)
	require.NotEmpty(t, fmt.Sprint(current["timezone"]))
	require.NotEmpty(t, fmt.Sprint(current["bio"]))

	updated, err := store.Update(ctx, adminUser.ID.String(), map[string]any{
		"timezone": "",
		"bio":      "",
	})
	require.NoError(t, err)
	require.Equal(t, "", fmt.Sprint(updated["timezone"]))
	require.Equal(t, "", fmt.Sprint(updated["bio"]))

	reloaded, err := store.Get(ctx, adminUser.ID.String())
	require.NoError(t, err)
	require.Equal(t, "", fmt.Sprint(reloaded["timezone"]))
	require.Equal(t, "", fmt.Sprint(reloaded["bio"]))
}

func TestUserProfileStore_RepositoryListRespectsOrder(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:user_profile_sort_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(ctx, dsn)
	require.NoError(t, err)

	store, err := stores.NewUserProfileStore(deps)
	require.NoError(t, err)

	now := time.Now().UTC()
	zedID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	alphaID := uuid.MustParse("ffffffff-ffff-ffff-ffff-ffffffffffff")

	_, err = deps.RepoManager.Users().Create(ctx, &auth.User{
		ID:        zedID,
		Username:  "sort.zed",
		Email:     "sort.zed@example.com",
		Role:      auth.RoleMember,
		Status:    auth.UserStatusActive,
		CreatedAt: &now,
		Metadata:  map[string]any{},
	})
	require.NoError(t, err)
	_, err = deps.RepoManager.Users().Create(ctx, &auth.User{
		ID:        alphaID,
		Username:  "sort.alpha",
		Email:     "sort.alpha@example.com",
		Role:      auth.RoleMember,
		Status:    auth.UserStatusActive,
		CreatedAt: &now,
		Metadata:  map[string]any{},
	})
	require.NoError(t, err)

	_, err = store.Create(ctx, map[string]any{
		"id":           zedID.String(),
		"display_name": "Zed",
		"email":        "sort.zed@example.com",
		"locale":       "en",
		"timezone":     "UTC",
		"bio":          "zed profile",
	})
	require.NoError(t, err)
	_, err = store.Create(ctx, map[string]any{
		"id":           alphaID.String(),
		"display_name": "Alpha",
		"email":        "sort.alpha@example.com",
		"locale":       "en",
		"timezone":     "UTC",
		"bio":          "alpha profile",
	})
	require.NoError(t, err)

	records, _, err := store.Repository().List(ctx, repository.OrderBy("display_name ASC"))
	require.NoError(t, err)

	seen := make([]uuid.UUID, 0, 2)
	for _, rec := range records {
		if rec == nil {
			continue
		}
		if rec.ID == alphaID || rec.ID == zedID {
			seen = append(seen, rec.ID)
		}
	}
	require.Equal(t, []uuid.UUID{alphaID, zedID}, seen)
}

func TestUserProfileStore_ListBeyondLegacyPageLimit(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:user_profile_many_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(ctx, dsn)
	require.NoError(t, err)

	store, err := stores.NewUserProfileStore(deps)
	require.NoError(t, err)

	now := time.Now().UTC()
	const profileCount = 40
	for i := 0; i < profileCount; i++ {
		userID := uuid.New()
		username := fmt.Sprintf("bulk.profile.user.%03d", i)
		email := fmt.Sprintf("%s@example.com", username)

		_, err = deps.RepoManager.Users().Create(ctx, &auth.User{
			ID:        userID,
			Username:  username,
			Email:     email,
			Role:      auth.RoleMember,
			Status:    auth.UserStatusActive,
			CreatedAt: &now,
			Metadata:  map[string]any{},
		})
		require.NoError(t, err)

		_, err = store.Create(ctx, map[string]any{
			"id":           userID.String(),
			"display_name": fmt.Sprintf("bulkprofile-%03d", i),
			"email":        email,
			"locale":       "en",
			"timezone":     "UTC",
			"bio":          "bulk profile seed",
		})
		require.NoError(t, err)
	}

	records, total, err := store.List(ctx, admin.ListOptions{
		Page:    1,
		PerPage: 100,
		Filters: map[string]any{"display_name__ilike": "bulkprofile-"},
	})
	require.NoError(t, err)
	require.Equal(t, profileCount, total)
	require.Len(t, records, profileCount)
}

package stores

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/uptrace/bun"
)

// DataStores holds all in-memory or CMS-backed data stores.
type DataStores struct {
	Users        *UserStore
	Pages        PageRepository
	Posts        PostRepository
	Media        *MediaStore
	Stats        *StatsStore
	PageRecords  repository.Repository[*PageRecord]
	PostRecords  repository.Repository[*PostRecord]
	MediaRecords repository.Repository[*MediaRecord]
}

// UserDependencies wires DB-backed user storage and related services.
type UserDependencies struct {
	DB             *bun.DB
	RepoManager    auth.RepositoryManager
	AuthRepo       types.AuthRepository
	InventoryRepo  types.UserInventoryRepository
	RoleRegistry   types.RoleRegistry
	ActivitySink   types.ActivitySink
	ActivityRepo   types.ActivityRepository
	ProfileRepo    types.ProfileRepository
	PreferenceRepo types.PreferenceRepository
}

// Initialize creates and seeds all data stores backed by the CMS content service (pages/posts)
// and Bun for user/media data.
func Initialize(contentSvc admin.CMSContentService, defaultLocale string, userDeps UserDependencies) (*DataStores, error) {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	if contentSvc == nil {
		return nil, fmt.Errorf("cms content service is required")
	}

	contentDB, err := SetupContentDatabase(context.Background(), "")
	if err != nil {
		return nil, err
	}

	userStore, err := NewUserStore(userDeps)
	if err != nil {
		return nil, err
	}

	pageStore := NewCMSPageStore(contentSvc, defaultLocale)
	postStore := NewCMSPostStore(contentSvc, defaultLocale)
	mediaStore, err := NewMediaStore(contentDB)
	if err != nil {
		return nil, err
	}

	pageRepo := repository.MustNewRepository[*PageRecord](contentDB, pageModelHandlers())
	postRepo := repository.MustNewRepository[*PostRecord](contentDB, postModelHandlers())

	stores := &DataStores{
		Users:        userStore,
		Pages:        pageStore,
		Posts:        postStore,
		Media:        mediaStore,
		Stats:        NewStatsStore(),
		PageRecords:  pageRepo,
		PostRecords:  postRepo,
		MediaRecords: mediaStore.repo,
	}

	stores.Pages.Seed()
	stores.Posts.Seed()
	stores.Media.Seed()
	stores.Stats.Seed()

	return stores, nil
}

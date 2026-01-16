package stores

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/uptrace/bun"
)

// DataStores holds all in-memory or CMS-backed data stores.
type DataStores struct {
	Users        *UserStore
	UserProfiles *UserProfileStore
	Pages        PageRepository
	Posts        PostRepository
	Media        *MediaStore
	Stats        *StatsStore
	PageRecords  repository.Repository[*PageRecord]
	PostRecords  repository.Repository[*PostRecord]
	MediaRecords repository.Repository[*MediaRecord]
}

// InitOptions configures initialization for data stores.
type InitOptions struct {
	RepoOptions        []repository.Option
	PersistenceOptions []persistence.ClientOption
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
func Initialize(contentSvc admin.CMSContentService, defaultLocale string, userDeps UserDependencies, repoOptions ...repository.Option) (*DataStores, error) {
	return InitializeWithOptions(contentSvc, defaultLocale, userDeps, InitOptions{RepoOptions: repoOptions})
}

// InitializeWithOptions creates and seeds data stores with persistence options applied.
func InitializeWithOptions(contentSvc admin.CMSContentService, defaultLocale string, userDeps UserDependencies, opts InitOptions) (*DataStores, error) {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	if contentSvc == nil {
		return nil, fmt.Errorf("cms content service is required")
	}

	contentDB, err := SetupContentDatabase(context.Background(), "", opts.PersistenceOptions...)
	if err != nil {
		return nil, err
	}

	userStore, err := NewUserStore(userDeps)
	if err != nil {
		return nil, err
	}
	profileStore, err := NewUserProfileStore(userDeps)
	if err != nil {
		return nil, err
	}

	pageStore := NewCMSPageStore(contentSvc, defaultLocale)
	postStore := NewCMSPostStore(contentSvc, defaultLocale)
	mediaStore, err := NewMediaStore(contentDB, opts.RepoOptions...)
	if err != nil {
		return nil, err
	}

	pageRepo := repository.MustNewRepositoryWithOptions[*PageRecord](contentDB, pageModelHandlers(), opts.RepoOptions...)
	postRepo := repository.MustNewRepositoryWithOptions[*PostRecord](contentDB, postModelHandlers(), opts.RepoOptions...)

	stores := &DataStores{
		Users:        userStore,
		UserProfiles: profileStore,
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

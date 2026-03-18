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
	Users        *UserStore                          `json:"users"`
	UserProfiles *UserProfileStore                   `json:"user_profiles"`
	Pages        PageRepository                      `json:"pages"`
	Posts        PostRepository                      `json:"posts"`
	Templates    *TemplateStore                      `json:"templates"`
	Media        *MediaStore                         `json:"media"`
	Stats        *StatsStore                         `json:"stats"`
	PageRecords  repository.Repository[*PageRecord]  `json:"page_records"`
	PostRecords  repository.Repository[*PostRecord]  `json:"post_records"`
	MediaRecords repository.Repository[*MediaRecord] `json:"media_records"`
}

// InitOptions configures initialization for data stores.
type InitOptions struct {
	RepoOptions        []repository.Option        `json:"repo_options"`
	PersistenceOptions []persistence.ClientOption `json:"persistence_options"`
}

// UserDependencies wires DB-backed user storage and related services.
type UserDependencies struct {
	DB             *bun.DB                       `json:"db"`
	RepoManager    auth.RepositoryManager        `json:"repo_manager"`
	AuthRepo       types.AuthRepository          `json:"auth_repo"`
	InventoryRepo  types.UserInventoryRepository `json:"inventory_repo"`
	RoleRegistry   types.RoleRegistry            `json:"role_registry"`
	ActivitySink   types.ActivitySink            `json:"activity_sink"`
	ActivityRepo   types.ActivityRepository      `json:"activity_repo"`
	ProfileRepo    types.ProfileRepository       `json:"profile_repo"`
	PreferenceRepo types.PreferenceRepository    `json:"preference_repo"`
	SecureLinks    types.SecureLinkManager       `json:"secure_links"`
	UserTokenRepo  types.UserTokenRepository     `json:"user_token_repo"`
	ResetRepo      types.PasswordResetRepository `json:"reset_repo"`
}

// Initialize creates all data stores backed by the CMS content service (pages/posts)
// and Bun for user/media data.
func Initialize(contentSvc admin.CMSContentService, defaultLocale string, userDeps UserDependencies, repoOptions ...repository.Option) (*DataStores, error) {
	return InitializeWithOptions(contentSvc, defaultLocale, userDeps, InitOptions{RepoOptions: repoOptions})
}

// InitializeWithOptions creates data stores with persistence options applied.
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
	templateStore := NewTemplateStore(contentDB)
	mediaStore, err := NewMediaStore(contentDB, opts.RepoOptions...)
	if err != nil {
		return nil, err
	}

	pageRepo := newStoreRepository[*PageRecord](contentDB, pageModelHandlers(), storeRepositoryPaginationNoDefault, opts.RepoOptions...)
	postRepo := newStoreRepository[*PostRecord](contentDB, postModelHandlers(), storeRepositoryPaginationNoDefault, opts.RepoOptions...)

	stores := &DataStores{
		Users:        userStore,
		UserProfiles: profileStore,
		Pages:        pageStore,
		Posts:        postStore,
		Templates:    templateStore,
		Media:        mediaStore,
		Stats:        NewStatsStore(),
		PageRecords:  pageRepo,
		PostRecords:  postRepo,
		MediaRecords: mediaStore.repo,
	}

	return stores, nil
}

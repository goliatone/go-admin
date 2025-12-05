package stores

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// DataStores holds all in-memory or CMS-backed data stores.
type DataStores struct {
	Users *UserStore
	Pages PageRepository
	Posts PostRepository
	Media *MediaStore
	Stats *StatsStore
}

// Initialize creates and seeds all data stores. When a CMS content service is
// provided, pages and posts are backed by go-cms via CMS adapters; otherwise
// the in-memory stores are used.
func Initialize(contentSvc admin.CMSContentService, defaultLocale string) (*DataStores, error) {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}

	userStore, err := NewUserStore()
	if err != nil {
		return nil, err
	}

	pageStore := PageRepository(NewPageStore())
	postStore := PostRepository(NewPostStore())
	if contentSvc != nil {
		if cmsPages := NewCMSPageStore(contentSvc, defaultLocale); cmsPages != nil {
			pageStore = cmsPages
		}
		if cmsPosts := NewCMSPostStore(contentSvc, defaultLocale); cmsPosts != nil {
			postStore = cmsPosts
		}
	}

	stores := &DataStores{
		Users: userStore,
		Pages: pageStore,
		Posts: postStore,
		Media: NewMediaStore(),
		Stats: NewStatsStore(),
	}

	stores.Users.Seed()
	stores.Pages.Seed()
	stores.Posts.Seed()
	stores.Media.Seed()
	stores.Stats.Seed()

	return stores, nil
}

package stores

// DataStores holds all in-memory data stores.
type DataStores struct {
	Users *UserStore
	Pages *PageStore
	Posts *PostStore
	Media *MediaStore
	Stats *StatsStore
}

// Initialize creates and seeds all data stores.
func Initialize() (*DataStores, error) {
	userStore, err := NewUserStore()
	if err != nil {
		return nil, err
	}

	stores := &DataStores{
		Users: userStore,
		Pages: NewPageStore(),
		Posts: NewPostStore(),
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

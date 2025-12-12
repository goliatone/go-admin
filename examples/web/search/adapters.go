package search

import (
	"context"
	"fmt"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// usersSearchAdapter searches users
type usersSearchAdapter struct {
	store *stores.UserStore
}

// NewUsersSearchAdapter creates a new users search adapter
func NewUsersSearchAdapter(store *stores.UserStore) *usersSearchAdapter {
	return &usersSearchAdapter{store: store}
}

func (a *usersSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	if limit <= 0 {
		limit = 10
	}
	results := []admin.SearchResult{}
	users, _, err := a.store.List(ctx, admin.ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	if err != nil {
		return nil, err
	}
	for _, user := range users {
		results = append(results, admin.SearchResult{
			Type:        "users",
			ID:          fmt.Sprintf("%v", user["id"]),
			Title:       fmt.Sprintf("%v", user["username"]),
			Description: fmt.Sprintf("Email: %v", user["email"]),
			URL:         fmt.Sprintf("/admin/users/%v", user["id"]),
			Icon:        "user",
		})
	}
	return results, nil
}

func (a *usersSearchAdapter) Permission() string {
	return "admin.users.view"
}

// pagesSearchAdapter searches pages
type pagesSearchAdapter struct {
	store stores.PageRepository
}

// NewPagesSearchAdapter creates a new pages search adapter
func NewPagesSearchAdapter(store stores.PageRepository) *pagesSearchAdapter {
	return &pagesSearchAdapter{store: store}
}

func (a *pagesSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	pages, _, _ := a.store.List(ctx, admin.ListOptions{
		Filters: map[string]any{"_search": query, "status": "published"},
		PerPage: limit,
	})
	for _, page := range pages {
		results = append(results, admin.SearchResult{
			Type:        "pages",
			ID:          fmt.Sprintf("%v", page["id"]),
			Title:       fmt.Sprintf("%v", page["title"]),
			Description: fmt.Sprintf("Slug: %v", page["slug"]),
			URL:         fmt.Sprintf("/admin/pages/%v", page["id"]),
			Icon:        "file",
		})
	}
	return results, nil
}

func (a *pagesSearchAdapter) Permission() string {
	return "admin.pages.view"
}

// postsSearchAdapter searches posts
type postsSearchAdapter struct {
	store stores.PostRepository
}

// NewPostsSearchAdapter creates a new posts search adapter
func NewPostsSearchAdapter(store stores.PostRepository) *postsSearchAdapter {
	return &postsSearchAdapter{store: store}
}

func (a *postsSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	posts, _, _ := a.store.List(ctx, admin.ListOptions{
		Filters: map[string]any{"_search": query, "status": "published"},
		PerPage: limit,
	})
	for _, post := range posts {
		results = append(results, admin.SearchResult{
			Type:        "posts",
			ID:          fmt.Sprintf("%v", post["id"]),
			Title:       fmt.Sprintf("%v", post["title"]),
			Description: fmt.Sprintf("By %v in %v", post["author"], post["category"]),
			URL:         fmt.Sprintf("/admin/posts/%v", post["id"]),
			Icon:        "file-text",
		})
	}
	return results, nil
}

func (a *postsSearchAdapter) Permission() string {
	return "admin.posts.view"
}

// mediaSearchAdapter searches media
type mediaSearchAdapter struct {
	store *stores.MediaStore
}

// NewMediaSearchAdapter creates a new media search adapter
func NewMediaSearchAdapter(store *stores.MediaStore) *mediaSearchAdapter {
	return &mediaSearchAdapter{store: store}
}

func (a *mediaSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	media, _, _ := a.store.List(ctx, admin.ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	for _, m := range media {
		results = append(results, admin.SearchResult{
			Type:        "media",
			ID:          fmt.Sprintf("%v", m["id"]),
			Title:       fmt.Sprintf("%v", m["filename"]),
			Description: fmt.Sprintf("Type: %v, Size: %v", m["type"], m["size"]),
			URL:         fmt.Sprintf("/admin/media/%v", m["id"]),
			Icon:        "image",
			Thumbnail:   fmt.Sprintf("%v", m["url"]),
		})
	}
	return results, nil
}

func (a *mediaSearchAdapter) Permission() string {
	return "admin.media.view"
}

package admin

import (
	"context"
	"testing"
)

func TestCMSContentRepositoryPersistsNavigationFields(t *testing.T) {
	repo := NewCMSContentRepository(NewInMemoryContentService())
	created, err := repo.Create(context.Background(), map[string]any{
		"title":        "Post",
		"slug":         "post",
		"locale":       "en",
		"content_type": "post",
		"status":       "draft",
		"_navigation": map[string]any{
			"site.main": "show",
		},
		"effective_menu_locations": []string{"site.main"},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	nav, _ := created["_navigation"].(map[string]any)
	if toString(nav["site.main"]) != "show" {
		t.Fatalf("expected _navigation.site.main=show, got %+v", created["_navigation"])
	}
	locations := toStringSlice(created["effective_menu_locations"])
	if len(locations) != 1 || locations[0] != "site.main" {
		t.Fatalf("expected effective_menu_locations=[site.main], got %+v", created["effective_menu_locations"])
	}

	id := toString(created["id"])
	record, err := repo.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	recordNav, _ := record["_navigation"].(map[string]any)
	if toString(recordNav["site.main"]) != "show" {
		t.Fatalf("expected persisted _navigation.site.main=show, got %+v", record["_navigation"])
	}
}

func TestCMSPageRepositoryPersistsNavigationFields(t *testing.T) {
	repo := NewCMSPageRepository(NewInMemoryContentService())
	created, err := repo.Create(context.Background(), map[string]any{
		"title":  "Home",
		"slug":   "/home",
		"locale": "en",
		"_navigation": map[string]any{
			"site.footer": "show",
		},
		"effective_menu_locations": []string{"site.footer"},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	nav, _ := created["_navigation"].(map[string]any)
	if toString(nav["site.footer"]) != "show" {
		t.Fatalf("expected _navigation.site.footer=show, got %+v", created["_navigation"])
	}
	locations := toStringSlice(created["effective_menu_locations"])
	if len(locations) != 1 || locations[0] != "site.footer" {
		t.Fatalf("expected effective_menu_locations=[site.footer], got %+v", created["effective_menu_locations"])
	}

	id := toString(created["id"])
	record, err := repo.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	recordNav, _ := record["_navigation"].(map[string]any)
	if toString(recordNav["site.footer"]) != "show" {
		t.Fatalf("expected persisted _navigation.site.footer=show, got %+v", record["_navigation"])
	}
}

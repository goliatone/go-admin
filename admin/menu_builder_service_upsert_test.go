package admin

import (
	"context"
	"errors"
	"testing"
)

type recordingMenuUpsertService struct {
	current       *Menu
	createErr     error
	menuErr       error
	deleteErrByID map[string]error
	addCalls      []MenuItem
	deleteCalls   []string
}

func (s *recordingMenuUpsertService) CreateMenu(_ context.Context, code string) (*Menu, error) {
	if s.createErr != nil {
		return nil, s.createErr
	}
	if s.current == nil {
		s.current = &Menu{Code: code, Slug: NormalizeMenuSlug(code), ID: MenuUUIDFromSlug(code)}
	}
	return s.current, nil
}

func (s *recordingMenuUpsertService) AddMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	item.Menu = menuCode
	s.addCalls = append(s.addCalls, item)
	if s.current == nil {
		s.current = &Menu{Code: menuCode, Slug: NormalizeMenuSlug(menuCode), ID: MenuUUIDFromSlug(menuCode)}
	}
	s.current.Items = append(s.current.Items, item)
	return nil
}

func (s *recordingMenuUpsertService) UpdateMenuItem(context.Context, string, MenuItem) error {
	return nil
}

func (s *recordingMenuUpsertService) DeleteMenuItem(_ context.Context, _ string, id string) error {
	s.deleteCalls = append(s.deleteCalls, id)
	if err, ok := s.deleteErrByID[id]; ok {
		return err
	}
	if s.current == nil {
		return ErrNotFound
	}
	filtered := make([]MenuItem, 0, len(s.current.Items))
	for _, item := range s.current.Items {
		if item.ID == id {
			continue
		}
		filtered = append(filtered, item)
	}
	s.current.Items = filtered
	return nil
}

func (s *recordingMenuUpsertService) ReorderMenu(context.Context, string, []string) error {
	return nil
}

func (s *recordingMenuUpsertService) Menu(_ context.Context, code, locale string) (*Menu, error) {
	if s.menuErr != nil {
		return nil, s.menuErr
	}
	if s.current == nil {
		return &Menu{Code: code, Slug: NormalizeMenuSlug(code), ID: MenuUUIDFromSlug(code), Items: nil}, nil
	}
	out := *s.current
	out.Code = code
	items := make([]MenuItem, len(s.current.Items))
	copy(items, s.current.Items)
	for i := range items {
		items[i].Locale = locale
	}
	out.Items = items
	return &out, nil
}

func (s *recordingMenuUpsertService) MenuByLocation(ctx context.Context, location, locale string) (*Menu, error) {
	return s.Menu(ctx, location, locale)
}

func TestMenuBuilderServiceUpsertMenuItemsReturnsMenuReadFailure(t *testing.T) {
	svc := &recordingMenuUpsertService{menuErr: errors.New("load current menu failed")}
	builder := NewMenuBuilderService()

	_, err := builder.UpsertMenuItems(context.Background(), svc, "admin.main", []MenuItem{
		{ID: "new-root", Label: "New Root", Target: map[string]any{"path": "/new"}},
	}, "en")
	if !errors.Is(err, svc.menuErr) {
		t.Fatalf("expected menu read error %v, got %v", svc.menuErr, err)
	}
	if len(svc.deleteCalls) != 0 {
		t.Fatalf("expected no root deletions after menu read failure, got %+v", svc.deleteCalls)
	}
	if len(svc.addCalls) != 0 {
		t.Fatalf("expected no item upserts after menu read failure, got %+v", svc.addCalls)
	}
}

func TestMenuBuilderServiceUpsertMenuItemsReturnsRootDeleteFailure(t *testing.T) {
	deleteErr := errors.New("delete root failed")
	svc := &recordingMenuUpsertService{
		current: &Menu{
			Code: "admin.main",
			Slug: NormalizeMenuSlug("admin.main"),
			ID:   MenuUUIDFromSlug("admin.main"),
			Items: []MenuItem{
				{ID: "root", Menu: "admin.main", Label: "Existing Root", Target: map[string]any{"path": "/old"}},
			},
		},
		deleteErrByID: map[string]error{"root": deleteErr},
	}
	builder := NewMenuBuilderService()

	_, err := builder.UpsertMenuItems(context.Background(), svc, "admin.main", []MenuItem{
		{ID: "new-root", Label: "New Root", Target: map[string]any{"path": "/new"}},
	}, "en")
	if !errors.Is(err, deleteErr) {
		t.Fatalf("expected root delete error %v, got %v", deleteErr, err)
	}
	if len(svc.deleteCalls) != 1 || svc.deleteCalls[0] != "root" {
		t.Fatalf("expected one attempted root delete, got %+v", svc.deleteCalls)
	}
	if len(svc.addCalls) != 0 {
		t.Fatalf("expected no item upserts after root delete failure, got %+v", svc.addCalls)
	}
	if len(svc.current.Items) != 1 || svc.current.Items[0].ID != "root" {
		t.Fatalf("expected existing root to remain after delete failure, got %+v", svc.current.Items)
	}
}

func TestMenuBuilderServiceUpsertMenuItemsReplacesExistingRoots(t *testing.T) {
	svc := &recordingMenuUpsertService{
		current: &Menu{
			Code: "admin.main",
			Slug: NormalizeMenuSlug("admin.main"),
			ID:   MenuUUIDFromSlug("admin.main"),
			Items: []MenuItem{
				{ID: "old-root", Menu: "admin.main", Label: "Old Root", Target: map[string]any{"path": "/old"}},
			},
		},
	}
	builder := NewMenuBuilderService()

	menu, err := builder.UpsertMenuItems(context.Background(), svc, "admin.main", []MenuItem{
		{
			ID:     "new-root",
			Label:  "New Root",
			Target: map[string]any{"path": "/new"},
			Children: []MenuItem{
				{ID: "new-child", Label: "New Child", Target: map[string]any{"path": "/new/child"}},
			},
		},
	}, "en")
	if err != nil {
		t.Fatalf("upsert menu items: %v", err)
	}
	if len(svc.deleteCalls) != 1 || svc.deleteCalls[0] != "old-root" {
		t.Fatalf("expected existing root to be deleted before upsert, got %+v", svc.deleteCalls)
	}
	if len(svc.addCalls) != 2 {
		t.Fatalf("expected root and child add calls, got %+v", svc.addCalls)
	}
	if menu == nil || len(menu.Items) != 2 {
		t.Fatalf("expected rebuilt menu with root and child, got %+v", menu)
	}
	if menu.Items[0].ID != "new-root" || menu.Items[1].ID != "new-child" {
		t.Fatalf("unexpected final menu items: %+v", menu.Items)
	}
}

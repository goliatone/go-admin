package cmsboot

import (
	"context"
	"errors"
	"testing"
)

type stubContainer struct {
	widget       CMSWidgetService
	menu         CMSMenuService
	content      CMSContentService
	contentTypes CMSContentTypeService
}

func (s stubContainer) WidgetService() CMSWidgetService   { return s.widget }
func (s stubContainer) MenuService() CMSMenuService       { return s.menu }
func (s stubContainer) ContentService() CMSContentService { return s.content }
func (s stubContainer) ContentTypeService() CMSContentTypeService {
	return s.contentTypes
}

type stubWidgetService struct{}

func (stubWidgetService) RegisterAreaDefinition(context.Context, WidgetAreaDefinition) error {
	return nil
}
func (stubWidgetService) RegisterDefinition(context.Context, WidgetDefinition) error { return nil }
func (stubWidgetService) DeleteDefinition(context.Context, string) error             { return nil }
func (stubWidgetService) Areas() []WidgetAreaDefinition                              { return nil }
func (stubWidgetService) Definitions() []WidgetDefinition                            { return nil }
func (stubWidgetService) SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	return &instance, nil
}
func (stubWidgetService) DeleteInstance(context.Context, string) error { return nil }
func (stubWidgetService) ListInstances(context.Context, WidgetInstanceFilter) ([]WidgetInstance, error) {
	return nil, nil
}

type stubMenuService struct {
	created []string
	err     error
}

func (s *stubMenuService) CreateMenu(_ context.Context, code string) (*Menu, error) {
	if s.err != nil {
		return nil, s.err
	}
	s.created = append(s.created, code)
	return &Menu{Code: code}, nil
}
func (*stubMenuService) AddMenuItem(context.Context, string, MenuItem) error    { return nil }
func (*stubMenuService) UpdateMenuItem(context.Context, string, MenuItem) error { return nil }
func (*stubMenuService) DeleteMenuItem(context.Context, string, string) error   { return nil }
func (*stubMenuService) ReorderMenu(context.Context, string, []string) error    { return nil }
func (*stubMenuService) Menu(context.Context, string, string) (*Menu, error)    { return &Menu{}, nil }
func (*stubMenuService) MenuByLocation(context.Context, string, string) (*Menu, error) {
	return &Menu{}, nil
}

type stubContentService struct{}

func (stubContentService) Pages(context.Context, string) ([]CMSPage, error)       { return nil, nil }
func (stubContentService) Page(context.Context, string, string) (*CMSPage, error) { return nil, nil }
func (stubContentService) CreatePage(context.Context, CMSPage) (*CMSPage, error)  { return nil, nil }
func (stubContentService) UpdatePage(context.Context, CMSPage) (*CMSPage, error)  { return nil, nil }
func (stubContentService) DeletePage(context.Context, string) error               { return nil }
func (stubContentService) Contents(context.Context, string) ([]CMSContent, error) { return nil, nil }
func (stubContentService) Content(context.Context, string, string) (*CMSContent, error) {
	return nil, nil
}
func (stubContentService) CreateContent(context.Context, CMSContent) (*CMSContent, error) {
	return nil, nil
}
func (stubContentService) UpdateContent(context.Context, CMSContent) (*CMSContent, error) {
	return nil, nil
}
func (stubContentService) DeleteContent(context.Context, string) error { return nil }
func (stubContentService) BlockDefinitions(context.Context) ([]CMSBlockDefinition, error) {
	return nil, nil
}
func (stubContentService) CreateBlockDefinition(context.Context, CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return nil, nil
}
func (stubContentService) UpdateBlockDefinition(context.Context, CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return nil, nil
}
func (stubContentService) DeleteBlockDefinition(context.Context, string) error { return nil }
func (stubContentService) BlockDefinitionVersions(context.Context, string) ([]CMSBlockDefinitionVersion, error) {
	return nil, nil
}
func (stubContentService) BlocksForContent(context.Context, string, string) ([]CMSBlock, error) {
	return nil, nil
}
func (stubContentService) SaveBlock(context.Context, CMSBlock) (*CMSBlock, error) { return nil, nil }
func (stubContentService) DeleteBlock(context.Context, string) error              { return nil }
func (stubContentService) ContentTypes(context.Context) ([]CMSContentType, error) { return nil, nil }
func (stubContentService) ContentType(context.Context, string) (*CMSContentType, error) {
	return nil, nil
}
func (stubContentService) ContentTypeBySlug(context.Context, string) (*CMSContentType, error) {
	return nil, nil
}
func (stubContentService) CreateContentType(context.Context, CMSContentType) (*CMSContentType, error) {
	return nil, nil
}
func (stubContentService) UpdateContentType(context.Context, CMSContentType) (*CMSContentType, error) {
	return nil, nil
}
func (stubContentService) DeleteContentType(context.Context, string) error { return nil }

func TestEnsureSkipsWhenDisabled(t *testing.T) {
	widget := stubWidgetService{}
	menu := &stubMenuService{}
	menuSvc := CMSMenuService(menu)
	content := stubContentService{}
	container := stubContainer{widget: widget, menu: menu, content: content, contentTypes: content}
	builderCalled := 0
	fallbackCalled := 0

	res, err := Ensure(context.Background(), EnsureOptions{
		Container:      container,
		WidgetService:  widget,
		MenuService:    menuSvc,
		ContentService: content,
		RequireCMS:     false,
		BuildContainer: func(ctx context.Context) (CMSContainer, error) {
			builderCalled++
			return nil, nil
		},
		FallbackContainer: func() CMSContainer {
			fallbackCalled++
			return nil
		},
	})
	if err != nil {
		t.Fatalf("ensure returned error: %v", err)
	}
	if builderCalled != 0 || fallbackCalled != 0 {
		t.Fatalf("expected no builder or fallback when CMS not required")
	}
	if res.Container == nil || res.MenuService == nil || res.WidgetService == nil || res.ContentService == nil || res.ContentTypeService == nil {
		t.Fatalf("expected existing services to be preserved")
	}
}

func TestEnsureUsesBuilderWhenMissing(t *testing.T) {
	widget := stubWidgetService{}
	menu := &stubMenuService{}
	content := stubContentService{}
	built := stubContainer{widget: widget, menu: menu, content: content, contentTypes: content}
	res, err := Ensure(context.Background(), EnsureOptions{
		RequireCMS: true,
		BuildContainer: func(ctx context.Context) (CMSContainer, error) {
			return built, nil
		},
	})
	if err != nil {
		t.Fatalf("ensure returned error: %v", err)
	}
	if res.Container != built {
		t.Fatalf("expected builder container to be used")
	}
	if res.MenuService != menu || res.WidgetService != widget || res.ContentService != content || res.ContentTypeService != content {
		t.Fatalf("expected services from builder to be used")
	}
}

func TestEnsureFallsBackWhenBuilderUnavailable(t *testing.T) {
	fallback := stubContainer{widget: stubWidgetService{}, menu: &stubMenuService{}, content: stubContentService{}, contentTypes: stubContentService{}}
	res, err := Ensure(context.Background(), EnsureOptions{
		RequireCMS: true,
		FallbackContainer: func() CMSContainer {
			return fallback
		},
	})
	if err != nil {
		t.Fatalf("ensure returned error: %v", err)
	}
	if res.Container != fallback {
		t.Fatalf("expected fallback container to be used")
	}
	if res.MenuService == nil || res.WidgetService == nil || res.ContentService == nil || res.ContentTypeService == nil {
		t.Fatalf("expected services from fallback to be set")
	}
}

func TestEnsurePropagatesBuilderError(t *testing.T) {
	_, err := Ensure(context.Background(), EnsureOptions{
		RequireCMS: true,
		BuildContainer: func(ctx context.Context) (CMSContainer, error) {
			return nil, errors.New("boom")
		},
	})
	if err == nil || err.Error() != "boom" {
		t.Fatalf("expected builder error propagated, got %v", err)
	}
}

func TestBootstrapMenuCreatesMenu(t *testing.T) {
	menu := &stubMenuService{}
	if err := BootstrapMenu(context.Background(), menu, "admin.main"); err != nil {
		t.Fatalf("bootstrap menu returned error: %v", err)
	}
	if len(menu.created) != 1 || menu.created[0] != "admin.main" {
		t.Fatalf("expected menu created with code, got %+v", menu.created)
	}
}

func TestBootstrapMenuSkipsWhenMissingService(t *testing.T) {
	if err := BootstrapMenu(context.Background(), nil, ""); err != nil {
		t.Fatalf("expected nil error when service missing, got %v", err)
	}
}

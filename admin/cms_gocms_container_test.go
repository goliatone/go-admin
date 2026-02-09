package admin

import (
	"context"
	"testing"

	cms "github.com/goliatone/go-cms"
	cmswidgets "github.com/goliatone/go-cms/widgets"
	"github.com/google/uuid"
)

func TestResolveGoCMSWidgetServicePrefersTypedWidgetServiceProvider(t *testing.T) {
	provider := typedWidgetServiceProviderWithIncompatibleWidgets{
		svc: testPublicWidgetService{},
	}

	adapted := resolveGoCMSWidgetService(provider)
	if adapted == nil {
		t.Fatal("expected typed widget service provider to resolve")
	}
}

func TestResolveGoCMSWidgetServicePrefersTypedWidgetsProvider(t *testing.T) {
	provider := typedWidgetsProviderWithIncompatibleWidgetService{
		svc: testPublicWidgetService{},
	}

	adapted := resolveGoCMSWidgetService(provider)
	if adapted == nil {
		t.Fatal("expected typed widgets provider to resolve")
	}
}

type typedWidgetServiceProviderWithIncompatibleWidgets struct {
	svc cms.WidgetService
}

func (p typedWidgetServiceProviderWithIncompatibleWidgets) WidgetService() cms.WidgetService {
	return p.svc
}

func (typedWidgetServiceProviderWithIncompatibleWidgets) Widgets(_ string) cms.WidgetService {
	panic("resolveGoCMSWidgetService should not call reflective Widgets() fallback")
}

type typedWidgetsProviderWithIncompatibleWidgetService struct {
	svc cms.WidgetService
}

func (p typedWidgetsProviderWithIncompatibleWidgetService) Widgets() cms.WidgetService {
	return p.svc
}

func (typedWidgetsProviderWithIncompatibleWidgetService) WidgetService(_ string) cms.WidgetService {
	panic("resolveGoCMSWidgetService should not call reflective WidgetService() fallback")
}

// testPublicWidgetService implements the public go-cms widgets.Service contract.
type testPublicWidgetService struct{}

func (testPublicWidgetService) RegisterDefinition(context.Context, cmswidgets.RegisterDefinitionInput) (*cmswidgets.Definition, error) {
	return &cmswidgets.Definition{ID: uuid.New(), Name: "widget", Schema: map[string]any{}}, nil
}

func (testPublicWidgetService) GetDefinition(context.Context, uuid.UUID) (*cmswidgets.Definition, error) {
	return &cmswidgets.Definition{ID: uuid.New(), Name: "widget", Schema: map[string]any{}}, nil
}

func (testPublicWidgetService) ListDefinitions(context.Context) ([]*cmswidgets.Definition, error) {
	return nil, nil
}

func (testPublicWidgetService) DeleteDefinition(context.Context, cmswidgets.DeleteDefinitionRequest) error {
	return nil
}

func (testPublicWidgetService) SyncRegistry(context.Context) error {
	return nil
}

func (testPublicWidgetService) CreateInstance(context.Context, cmswidgets.CreateInstanceInput) (*cmswidgets.Instance, error) {
	return &cmswidgets.Instance{ID: uuid.New()}, nil
}

func (testPublicWidgetService) UpdateInstance(context.Context, cmswidgets.UpdateInstanceInput) (*cmswidgets.Instance, error) {
	return &cmswidgets.Instance{ID: uuid.New()}, nil
}

func (testPublicWidgetService) GetInstance(context.Context, uuid.UUID) (*cmswidgets.Instance, error) {
	return &cmswidgets.Instance{ID: uuid.New()}, nil
}

func (testPublicWidgetService) ListInstancesByDefinition(context.Context, uuid.UUID) ([]*cmswidgets.Instance, error) {
	return nil, nil
}

func (testPublicWidgetService) ListInstancesByArea(context.Context, string) ([]*cmswidgets.Instance, error) {
	return nil, nil
}

func (testPublicWidgetService) ListAllInstances(context.Context) ([]*cmswidgets.Instance, error) {
	return nil, nil
}

func (testPublicWidgetService) DeleteInstance(context.Context, cmswidgets.DeleteInstanceRequest) error {
	return nil
}

func (testPublicWidgetService) AddTranslation(context.Context, cmswidgets.AddTranslationInput) (*cmswidgets.Translation, error) {
	return &cmswidgets.Translation{}, nil
}

func (testPublicWidgetService) UpdateTranslation(context.Context, cmswidgets.UpdateTranslationInput) (*cmswidgets.Translation, error) {
	return &cmswidgets.Translation{}, nil
}

func (testPublicWidgetService) GetTranslation(context.Context, uuid.UUID, uuid.UUID) (*cmswidgets.Translation, error) {
	return &cmswidgets.Translation{}, nil
}

func (testPublicWidgetService) DeleteTranslation(context.Context, cmswidgets.DeleteTranslationRequest) error {
	return nil
}

func (testPublicWidgetService) RegisterAreaDefinition(context.Context, cmswidgets.RegisterAreaDefinitionInput) (*cmswidgets.AreaDefinition, error) {
	return &cmswidgets.AreaDefinition{}, nil
}

func (testPublicWidgetService) ListAreaDefinitions(context.Context) ([]*cmswidgets.AreaDefinition, error) {
	return nil, nil
}

func (testPublicWidgetService) AssignWidgetToArea(context.Context, cmswidgets.AssignWidgetToAreaInput) ([]*cmswidgets.AreaPlacement, error) {
	return nil, nil
}

func (testPublicWidgetService) RemoveWidgetFromArea(context.Context, cmswidgets.RemoveWidgetFromAreaInput) error {
	return nil
}

func (testPublicWidgetService) ReorderAreaWidgets(context.Context, cmswidgets.ReorderAreaWidgetsInput) ([]*cmswidgets.AreaPlacement, error) {
	return nil, nil
}

func (testPublicWidgetService) ResolveArea(context.Context, cmswidgets.ResolveAreaInput) ([]*cmswidgets.ResolvedWidget, error) {
	return nil, nil
}

func (testPublicWidgetService) EvaluateVisibility(context.Context, *cmswidgets.Instance, cmswidgets.VisibilityContext) (bool, error) {
	return true, nil
}

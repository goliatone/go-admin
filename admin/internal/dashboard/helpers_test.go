package dashboard

import (
	"context"
	"testing"
)

type widgetServiceSyncSpy struct {
	definitions map[string]WidgetDefinition
	syncCalls   []WidgetDefinition
}

func newWidgetServiceSyncSpy() *widgetServiceSyncSpy {
	return &widgetServiceSyncSpy{definitions: map[string]WidgetDefinition{}}
}

func (s *widgetServiceSyncSpy) RegisterAreaDefinition(context.Context, WidgetAreaDefinition) error {
	return nil
}

func (s *widgetServiceSyncSpy) RegisterDefinition(context.Context, WidgetDefinition) error {
	return nil
}

func (s *widgetServiceSyncSpy) SyncDefinition(_ context.Context, def WidgetDefinition) (*WidgetDefinitionSyncResult, error) {
	s.syncCalls = append(s.syncCalls, def)
	status := WidgetDefinitionSyncStatusCreated
	if existing, ok := s.definitions[def.Code]; ok {
		status = WidgetDefinitionSyncStatusUpdated
		if existing.Name == def.Name && len(existing.Schema) == len(def.Schema) {
			status = WidgetDefinitionSyncStatusUnchanged
		}
	}
	s.definitions[def.Code] = def
	return &WidgetDefinitionSyncResult{Definition: def, Status: status}, nil
}

func (s *widgetServiceSyncSpy) DeleteDefinition(context.Context, string) error {
	return nil
}

func (s *widgetServiceSyncSpy) Areas() []WidgetAreaDefinition {
	return nil
}

func (s *widgetServiceSyncSpy) Definitions() []WidgetDefinition {
	out := make([]WidgetDefinition, 0, len(s.definitions))
	for _, def := range s.definitions {
		out = append(out, def)
	}
	return out
}

func (s *widgetServiceSyncSpy) SaveInstance(context.Context, WidgetInstance) (*WidgetInstance, error) {
	return nil, nil
}

func (s *widgetServiceSyncSpy) DeleteInstance(context.Context, string) error {
	return nil
}

func (s *widgetServiceSyncSpy) ListInstances(context.Context, WidgetInstanceFilter) ([]WidgetInstance, error) {
	return nil, nil
}

func TestRegisterDefaultWidgetsSyncsDefinitionsEvenWhenSomeAlreadyExist(t *testing.T) {
	svc := newWidgetServiceSyncSpy()
	svc.definitions["admin.widget.user_stats"] = WidgetDefinition{
		Code:   "admin.widget.user_stats",
		Name:   "Outdated Name",
		Schema: map[string]any{"legacy": true},
	}

	if err := RegisterDefaultWidgets(svc, FeatureFlags{CMS: true, Dashboard: true}, nil); err != nil {
		t.Fatalf("register default widgets: %v", err)
	}

	if len(svc.syncCalls) == 0 {
		t.Fatalf("expected sync calls for default widget definitions")
	}
	if len(svc.definitions) < 3 {
		t.Fatalf("expected default widget definitions to be synced, got %d", len(svc.definitions))
	}
	if got := svc.definitions["admin.widget.user_stats"].Name; got == "Outdated Name" {
		t.Fatalf("expected existing definition to be refreshed through sync, got %q", got)
	}
}

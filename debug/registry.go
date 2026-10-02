// Package debug preserves the Debug panel facade over neutral console primitives.
package debug

import (
	"context"
	consolecore "github.com/goliatone/go-admin/console"
)

type PanelSnapshotFunc = consolecore.PanelSnapshotFunc
type PanelClearFunc = consolecore.PanelClearFunc
type PanelClearCheckFunc = consolecore.PanelClearCheckFunc
type PanelActionHandler = consolecore.PanelActionHandler
type PanelActionHandlerResolver = consolecore.PanelActionHandlerResolver
type PanelDefinitionFilter = consolecore.PanelDefinitionFilter
type PanelUI = consolecore.PanelUI
type PanelUIViews = consolecore.PanelUIViews
type PanelUIView = consolecore.PanelUIView
type PanelUICount = consolecore.PanelUICount
type PanelUIFilter = consolecore.PanelUIFilter
type PanelUIEventPolicy = consolecore.PanelUIEventPolicy
type PanelUIActionLayout = consolecore.PanelUIActionLayout
type PanelUIAction = consolecore.PanelUIAction
type PanelUIActionForm = consolecore.PanelUIActionForm
type PanelUIActionField = consolecore.PanelUIActionField
type PanelUIActionOption = consolecore.PanelUIActionOption
type PanelUIActionOptionSource = consolecore.PanelUIActionOptionSource
type PanelUIColumn = consolecore.PanelUIColumn
type PanelUIField = consolecore.PanelUIField
type PanelUIMetric = consolecore.PanelUIMetric
type PanelActionRequest = consolecore.PanelActionRequest
type PanelActionResult = consolecore.PanelActionResult
type PanelActionEvent = consolecore.PanelActionEvent
type PanelConfig = consolecore.PanelConfig
type PanelDefinition = consolecore.PanelDefinition
type PanelRegistration = consolecore.PanelRegistration
type PanelRegistry = consolecore.PanelRegistry

const (
	PanelUISchemaVersion    = consolecore.PanelUISchemaVersion
	PanelRendererMetrics    = consolecore.PanelRendererMetrics
	PanelRendererKeyValue   = consolecore.PanelRendererKeyValue
	PanelRendererIdentity   = consolecore.PanelRendererIdentity
	PanelRendererTable      = consolecore.PanelRendererTable
	PanelRendererStatusList = consolecore.PanelRendererStatusList
	PanelRendererTimeline   = consolecore.PanelRendererTimeline
	PanelRendererJSON       = consolecore.PanelRendererJSON
	PanelRendererStack      = consolecore.PanelRendererStack
	PanelStackLayoutGrid    = consolecore.PanelStackLayoutGrid
	PanelCountArrayLength   = consolecore.PanelCountArrayLength
	PanelCountObjectKeys    = consolecore.PanelCountObjectKeys
	PanelCountTruthy        = consolecore.PanelCountTruthy
	PanelCountNumber        = consolecore.PanelCountNumber
	PanelFilterSearch       = consolecore.PanelFilterSearch
	PanelFilterSelect       = consolecore.PanelFilterSelect
	PanelFilterCheckbox     = consolecore.PanelFilterCheckbox
	PanelEventReplace       = consolecore.PanelEventReplace
	PanelEventAppend        = consolecore.PanelEventAppend
	PanelEventMerge         = consolecore.PanelEventMerge
	PanelEventUpsert        = consolecore.PanelEventUpsert
	PanelActionLayoutList   = consolecore.PanelActionLayoutList
	PanelActionLayoutSelect = consolecore.PanelActionLayoutSelect
)

func NewPanelUI(console, toolbar *PanelUIView) *PanelUI {
	return consolecore.NewPanelUI(console, toolbar)
}

func PanelView(renderer, bind string) *PanelUIView { return consolecore.PanelView(renderer, bind) }

func MetricsView(bind string) *PanelUIView { return consolecore.MetricsView(bind) }

func KeyValueView(bind string) *PanelUIView { return consolecore.KeyValueView(bind) }

func IdentityView(bind string) *PanelUIView { return consolecore.IdentityView(bind) }

func GridStackView(sections ...PanelUIView) *PanelUIView {
	return consolecore.GridStackView(sections...)
}

func TableView(bind string) *PanelUIView { return consolecore.TableView(bind) }

func StatusListView(bind string) *PanelUIView { return consolecore.StatusListView(bind) }

func TimelineView(bind string) *PanelUIView { return consolecore.TimelineView(bind) }

func JSONView(bind string) *PanelUIView { return consolecore.JSONView(bind) }

func StackView(sections ...PanelUIView) *PanelUIView { return consolecore.StackView(sections...) }

func NewPanelRegistry() *PanelRegistry { return consolecore.NewPanelRegistry() }

// DefaultRegistry returns the legacy Debug-only registry. New consoles require an explicit registry.
func DefaultRegistry() *PanelRegistry { return defaultRegistry }

var defaultRegistry = NewPanelRegistry()

// RegisterPanel registers a panel in the default registry.
func RegisterPanel(id string, config PanelConfig) error {
	return defaultRegistry.Register(id, config)
}

// UnregisterPanel removes a panel from the default registry.
func UnregisterPanel(id string) {
	defaultRegistry.Unregister(id)
}

// Panel retrieves a registered panel from the default registry.
func Panel(id string) (PanelRegistration, bool) {
	return defaultRegistry.Registration(id)
}

// PanelDefinitionFor retrieves panel metadata from the default registry.
func PanelDefinitionFor(id string) (PanelDefinition, bool) {
	reg, ok := defaultRegistry.Registration(id)
	if !ok {
		return PanelDefinition{}, false
	}
	return reg.Definition, true
}

// PanelDefinitionForContext retrieves panel metadata adapted for a request context.
func PanelDefinitionForContext(ctx context.Context, id string) (PanelDefinition, bool) {
	return defaultRegistry.DefinitionForContext(ctx, id)
}

// PanelDefinitions returns definitions for all registered panels.
func PanelDefinitions() []PanelDefinition {
	return defaultRegistry.Definitions()
}

// PanelDefinitionsWithContext returns definitions adapted for a request context.
func PanelDefinitionsWithContext(ctx context.Context) []PanelDefinition {
	return defaultRegistry.DefinitionsWithContext(ctx)
}

// PanelRegistrations returns all registered panels with hooks.
func PanelRegistrations() []PanelRegistration {
	return defaultRegistry.Registrations()
}

// PanelsForEventType returns panel IDs that subscribe to an event type.
func PanelsForEventType(eventType string) []string {
	return defaultRegistry.PanelsForEventType(eventType)
}

// SetRegistryVersion sets a version identifier for the default registry.
func SetRegistryVersion(version string) {
	defaultRegistry.SetVersion(version)
}

// RegistryVersion returns the default registry version identifier.
func RegistryVersion() string {
	return defaultRegistry.Version()
}

func PanelDefinitionHasAction(def PanelDefinition, actionID string) bool {
	return consolecore.PanelDefinitionHasAction(def, actionID)
}

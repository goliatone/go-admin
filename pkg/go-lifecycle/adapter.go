package lifecycle

import (
	"context"
	"fmt"
)

// StartStopModule is the compatibility shape used by many host apps.
type StartStopModule interface {
	Name() string
	Priority() int
	Start(context.Context) error
	Stop(context.Context) error
}

// Registerer is implemented by lifecycle-aware modules.
type Registerer interface {
	RegisterLifecycle(*Registry)
}

// RegisterModule adapts a module into lifecycle tasks. Lifecycle-aware modules
// own their task registration and are not also adapted through Start/Stop.
func RegisterModule(registry *Registry, module StartStopModule) error {
	if registry == nil {
		return fmt.Errorf("lifecycle: registry is nil")
	}
	if module == nil {
		return fmt.Errorf("lifecycle: module is nil")
	}
	if aware, ok := module.(Registerer); ok {
		aware.RegisterLifecycle(registry)
		return nil
	}
	name := module.Name()
	priority := module.Priority()
	if err := registry.Register(Task{
		Name:     name + ".start",
		Phase:    PhasePreBind,
		Priority: priority,
		Policy:   ErrorPolicyFatal,
		Run:      module.Start,
	}); err != nil {
		return err
	}
	return registry.Register(Task{
		Name:     name + ".stop",
		Phase:    PhaseShutdown,
		Priority: priority,
		Policy:   ErrorPolicyDegraded,
		Run:      module.Stop,
	})
}

package admin

import "context"

const commandRunDebugEventType = "command_run"

// StartCommandRunRuntime constructs and starts the command-run runtime once.
// Hosts must start injected drivers before calling this method.
func (a *Admin) StartCommandRunRuntime(ctx context.Context, config CommandRunRuntimeConfig) error {
	if a == nil {
		return nil
	}
	a.commandRunRuntimeMu.Lock()
	defer a.commandRunRuntimeMu.Unlock()
	if a.commandRunRuntime != nil {
		return a.commandRunRuntime.Start(ctx)
	}
	runtime, err := NewCommandRunRuntime(config)
	if err != nil {
		return err
	}
	if err := runtime.Start(ctx); err != nil {
		_ = runtime.Close(context.Background())
		return err
	}
	a.commandRunRuntime = runtime
	return nil
}

// CommandRunRuntime returns the configured runtime for diagnostics, snapshots,
// and explicit host shutdown.
func (a *Admin) CommandRunRuntime() *CommandRunRuntime {
	if a == nil {
		return nil
	}
	a.commandRunRuntimeMu.Lock()
	defer a.commandRunRuntimeMu.Unlock()
	return a.commandRunRuntime
}

// CloseCommandRunRuntime is the explicit host cleanup path. Hosts should call
// it before closing injected transport drivers or routers.
func (a *Admin) CloseCommandRunRuntime(ctx context.Context) error {
	if a == nil {
		return nil
	}
	a.commandRunRuntimeMu.Lock()
	runtime := a.commandRunRuntime
	a.commandRunRuntimeMu.Unlock()
	if runtime == nil {
		return nil
	}
	return runtime.Close(ctx)
}

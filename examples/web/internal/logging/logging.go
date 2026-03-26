package logging

import (
	"strings"
	"sync"

	coreadmin "github.com/goliatone/go-admin/admin"
	glog "github.com/goliatone/go-logger/glog"
)

var state = struct {
	mu       sync.RWMutex
	provider coreadmin.LoggerProvider
	logger   coreadmin.Logger
}{
	provider: glog.ProviderFromLogger(glog.Nop()),
	logger:   glog.Nop(),
}

// Configure wires the shared logger/provider used by the web example packages.
func Configure(provider coreadmin.LoggerProvider, logger coreadmin.Logger) {
	provider, logger = glog.Resolve("examples.web", provider, logger)
	state.mu.Lock()
	state.provider = provider
	state.logger = logger
	state.mu.Unlock()
}

// Named resolves a named logger from the shared web example logger provider.
func Named(name string) coreadmin.Logger {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "examples.web"
	}

	state.mu.RLock()
	provider := state.provider
	logger := state.logger
	state.mu.RUnlock()

	if provider != nil {
		if resolved := provider.GetLogger(name); resolved != nil {
			return resolved
		}
	}

	return glog.Ensure(logger)
}

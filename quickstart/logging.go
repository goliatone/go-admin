package quickstart

import (
	"strings"
	"sync"

	"github.com/goliatone/go-admin/admin"
	glog "github.com/goliatone/go-logger/glog"
)

var quickstartLoggerState = struct {
	mu       sync.RWMutex
	provider admin.LoggerProvider
	logger   admin.Logger
}{
	provider: glog.ProviderFromLogger(glog.Nop()),
	logger:   glog.Nop(),
}

func resolveQuickstartLoggerDependencies(provider admin.LoggerProvider, logger admin.Logger) (admin.LoggerProvider, admin.Logger) {
	return glog.Resolve("quickstart", provider, logger)
}

func ensureQuickstartLogger(logger admin.Logger) admin.Logger {
	return glog.Ensure(logger)
}

func setQuickstartDefaultLoggerDependencies(provider admin.LoggerProvider, logger admin.Logger) {
	provider, logger = resolveQuickstartLoggerDependencies(provider, logger)
	quickstartLoggerState.mu.Lock()
	quickstartLoggerState.provider = provider
	quickstartLoggerState.logger = logger
	quickstartLoggerState.mu.Unlock()
}

func quickstartDefaultLoggerDependencies() (admin.LoggerProvider, admin.Logger) {
	quickstartLoggerState.mu.RLock()
	provider := quickstartLoggerState.provider
	logger := quickstartLoggerState.logger
	quickstartLoggerState.mu.RUnlock()
	return provider, logger
}

func resolveQuickstartNamedLogger(name string, provider admin.LoggerProvider, fallback admin.Logger) admin.Logger {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "quickstart"
	}
	if provider == nil {
		if fallback != nil {
			provider = glog.ProviderFromLogger(fallback)
		} else {
			defaultProvider, defaultLogger := quickstartDefaultLoggerDependencies()
			provider = defaultProvider
			fallback = defaultLogger
		}
	}
	if provider != nil {
		if resolved := provider.GetLogger(name); resolved != nil {
			return resolved
		}
	}
	return ensureQuickstartLogger(fallback)
}

func resolveQuickstartAdminLogger(adm *admin.Admin, name string, provider admin.LoggerProvider, fallback admin.Logger) admin.Logger {
	if adm != nil {
		return adm.NamedLogger(name)
	}
	return resolveQuickstartNamedLogger(name, provider, fallback)
}

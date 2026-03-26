package main

import (
	"strings"
	"sync"

	"github.com/goliatone/go-admin/pkg/admin"
	glog "github.com/goliatone/go-logger/glog"
)

var commerceLoggerState = struct {
	mu       sync.RWMutex
	provider admin.LoggerProvider
	logger   admin.Logger
}{
	provider: glog.ProviderFromLogger(glog.Nop()),
	logger:   glog.Nop(),
}

func configureCommerceLogging(provider admin.LoggerProvider, logger admin.Logger) {
	provider, logger = glog.Resolve("examples.commerce", provider, logger)
	commerceLoggerState.mu.Lock()
	commerceLoggerState.provider = provider
	commerceLoggerState.logger = logger
	commerceLoggerState.mu.Unlock()
}

func commerceNamedLogger(name string) admin.Logger {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "examples.commerce"
	}

	commerceLoggerState.mu.RLock()
	provider := commerceLoggerState.provider
	logger := commerceLoggerState.logger
	commerceLoggerState.mu.RUnlock()

	if provider != nil {
		if resolved := provider.GetLogger(name); resolved != nil {
			return resolved
		}
	}

	return glog.Ensure(logger)
}

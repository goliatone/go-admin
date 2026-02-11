package admin

import (
	"strings"

	glog "github.com/goliatone/go-logger/glog"
)

// Logger is a go-logger compatible leveled logger contract.
type Logger = glog.Logger

// LoggerProvider resolves named loggers.
type LoggerProvider = glog.LoggerProvider

// FieldsLogger is an optional structured logging extension.
type FieldsLogger = glog.FieldsLogger

func resolveLoggerDependencies(provider LoggerProvider, logger Logger) (LoggerProvider, Logger) {
	return glog.Resolve("admin", provider, logger)
}

func ensureLogger(logger Logger) Logger {
	return glog.Ensure(logger)
}

func resolveNamedLogger(name string, provider LoggerProvider, fallback Logger) Logger {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "admin"
	}
	if provider != nil {
		if resolved := provider.GetLogger(name); resolved != nil {
			return resolved
		}
	}
	return ensureLogger(fallback)
}

func adminScopedLogger(admin *Admin, name string) Logger {
	if admin == nil {
		return ensureLogger(nil)
	}
	return admin.loggerFor(name)
}

func (a *Admin) loggerFor(name string) Logger {
	if a == nil {
		return ensureLogger(nil)
	}
	return resolveNamedLogger(name, a.loggerProvider, a.logger)
}

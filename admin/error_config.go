package admin

// ErrorConfig controls how errors are presented to clients.
type ErrorConfig struct {
	// DevMode enables developer-friendly error responses.
	DevMode bool
	// IncludeStackTrace controls stack trace inclusion when DevMode is false.
	IncludeStackTrace bool
	// ExposeInternalMessages allows internal error messages to reach clients.
	ExposeInternalMessages bool
	// InternalMessage is the default message for internal errors when not exposed.
	InternalMessage string
}

const defaultInternalErrorMessage = "An unexpected error occurred"

func normalizeErrorConfig(cfg ErrorConfig, debug DebugConfig) ErrorConfig {
	if !cfg.DevMode && debug.Enabled {
		cfg.DevMode = true
	}
	if cfg.InternalMessage == "" {
		cfg.InternalMessage = defaultInternalErrorMessage
	}
	if !cfg.ExposeInternalMessages && cfg.DevMode {
		cfg.ExposeInternalMessages = true
	}
	return cfg
}

func (cfg ErrorConfig) includeStackTrace() bool {
	return cfg.DevMode || cfg.IncludeStackTrace
}

package admin

// ErrorConfig controls how errors are presented to clients.
type ErrorConfig struct {
	// DevMode enables developer-friendly error responses.
	DevMode bool `json:"dev_mode"`
	// IncludeStackTrace controls stack trace inclusion when DevMode is false.
	IncludeStackTrace bool `json:"include_stack_trace"`
	// ExposeInternalMessages allows internal error messages to reach clients.
	ExposeInternalMessages bool `json:"expose_internal_messages"`
	// InternalMessage is the default message for internal errors when not exposed.
	InternalMessage string `json:"internal_message"`
	// SourceContextLines controls how many lines of source code to show around errors.
	// Default is 7 lines before and after.
	SourceContextLines int `json:"source_context_lines"`
	// MaxStackFrames limits the number of stack frames to display.
	// Default is 20 frames.
	MaxStackFrames int `json:"max_stack_frames"`
	// ShowRequestHeaders includes HTTP headers in dev error pages.
	ShowRequestHeaders bool `json:"show_request_headers"`
	// ShowRequestBody includes request body in dev error pages.
	ShowRequestBody bool `json:"show_request_body"`
	// ShowEnvironment includes environment info in dev error pages.
	ShowEnvironment bool `json:"show_environment"`
	// AppVersion is displayed in the error page environment section.
	AppVersion string `json:"app_version"`
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
	if cfg.SourceContextLines <= 0 {
		cfg.SourceContextLines = 7
	}
	if cfg.MaxStackFrames <= 0 {
		cfg.MaxStackFrames = 20
	}
	// Enable all dev features by default when DevMode is on
	if cfg.DevMode {
		if !cfg.ShowRequestHeaders {
			cfg.ShowRequestHeaders = true
		}
		if !cfg.ShowEnvironment {
			cfg.ShowEnvironment = true
		}
	}
	return cfg
}

func (cfg ErrorConfig) includeStackTrace() bool {
	return cfg.DevMode || cfg.IncludeStackTrace
}

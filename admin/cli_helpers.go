package admin

// NoopCLIHandler is a placeholder for CLI commands without a dedicated CLI implementation.
type NoopCLIHandler struct{}

func (NoopCLIHandler) Run() error { return nil }

// Package admin provides the public facade for go-admin.
//
// This package is intentionally thin: it forwards to the internal orchestrator
// implemented in github.com/goliatone/go-admin/admin.
//
// New modules should use CommandBus.NewRegistrationSet with RegisterSetCommand
// and a RegisterSetContextMessageFactory variant. A committed set publishes one
// validated, owner-scoped runtime generation and returns an idempotently
// closeable handle. The legacy RegisterCommand and RegisterMessageFactory
// helpers remain source compatible and use the process-global go-command path.
//
// Context-aware factories receive normalized effective dispatch options in
// their context. Treat payload identity and scope fields as untrusted; use
// authenticated context for authorization. Queued adapters persist only safe
// DispatchRunContext fields and workers rehydrate them around
// dispatcher.RunObservedCommand.
package admin

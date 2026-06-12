// Package lifecycle provides framework-neutral startup and shutdown
// orchestration for hosted Go applications.
//
// The package intentionally depends only on the Go standard library. It can be
// incubated inside go-admin and later moved to a standalone module with import
// path updates only.
//
// Hosts own listener binding. A typical integration runs pre-bind tasks, binds
// the HTTP listener, proves the listener is accepting requests, marks the runner
// serving, and then runs post-bind, ready, and background work.
package lifecycle

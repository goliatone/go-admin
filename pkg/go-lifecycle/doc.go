// Package lifecycle provides framework-neutral startup and shutdown
// orchestration for hosted Go applications.
//
// The package intentionally depends only on the Go standard library. It can be
// incubated inside go-admin and later copied to a standalone repository without
// carrying go-admin or third-party dependencies.
//
// Hosts own listener binding. A typical integration runs pre-bind tasks, binds
// the HTTP listener, proves the listener is accepting requests, marks the runner
// serving, and then runs post-bind, ready, and background work.
package lifecycle

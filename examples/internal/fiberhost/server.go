// Package fiberhost owns the long-lived connections of the native examples.
package fiberhost

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-router"
)

type Server struct {
	router.Server[*fiber.App]
	routes   *ownedRouter
	mu       sync.Mutex
	stopping bool
	sockets  map[ownedSocket]context.CancelFunc
	drained  chan struct{}
}

type ownedSocket interface {
	router.WebSocketContext
	router.WebSocketReadInterrupter
}

func New(server router.Server[*fiber.App]) *Server {
	s := &Server{Server: server, sockets: make(map[ownedSocket]context.CancelFunc)}
	s.routes = newOwnedRouter(server.Router(), s)
	return s
}

func (s *Server) Router() router.Router[*fiber.App] { return s.routes }

func (s *Server) Shutdown(ctx context.Context) error {
	s.mu.Lock()
	if !s.stopping {
		s.stopping = true
		s.drained = make(chan struct{})
		if len(s.sockets) == 0 {
			close(s.drained)
		}
	}
	drained := s.drained
	sockets := make(map[ownedSocket]context.CancelFunc, len(s.sockets))
	maps.Copy(sockets, s.sockets)
	s.mu.Unlock()
	var errs []error
	for socket, cancel := range sockets {
		cancel()
		if err := socket.InterruptRead(); err != nil && socket.IsWebSocket() {
			errs = append(errs, err)
		}
	}
	// Worker cleanup closes this shared notification. A timed-out attempt
	// leaves no waiting goroutine, and later attempts can still observe drain.
	select {
	case <-drained:
	case <-ctx.Done():
		errs = append(errs, ctx.Err())
	}
	return errors.Join(append(errs, s.Server.Shutdown(ctx))...)
}

func ServeUntilSignal(server interface {
	Serve(string) error
	Shutdown(context.Context) error
}, address string, beforeDrain func(context.Context) error, afterDrain func(context.Context) error) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	served := make(chan error, 1)
	go func() { served <- server.Serve(address) }()
	var serveErr error
	finished := false
	select {
	case serveErr = <-served:
		finished = true
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var beforeErr error
	if beforeDrain != nil {
		beforeErr = runBounded(shutdownCtx, beforeDrain)
	}
	shutdownErr := server.Shutdown(shutdownCtx)
	if !finished {
		select {
		case serveErr = <-served:
		case <-shutdownCtx.Done():
			serveErr = shutdownCtx.Err()
		}
	}
	var afterErr error
	if beforeErr == nil && shutdownErr == nil && afterDrain != nil {
		afterErr = runBounded(shutdownCtx, afterDrain)
	}
	return errors.Join(serveErr, beforeErr, shutdownErr, afterErr)
}

type ownedRouter struct {
	*router.FiberV3Router
	owner *Server
}

func newOwnedRouter(routes router.Router[*fiber.App], owner *Server) *ownedRouter {
	native, ok := routes.(*router.FiberV3Router)
	if !ok || native == nil {
		panic(fmt.Sprintf("native example requires a non-nil *router.FiberV3Router, got %T", routes))
	}
	return &ownedRouter{FiberV3Router: native, owner: owner}
}

func (r *ownedRouter) Group(prefix string) router.Router[*fiber.App] {
	return newOwnedRouter(r.FiberV3Router.Group(prefix), r.owner)
}
func (r *ownedRouter) Mount(prefix string) router.Router[*fiber.App] {
	return newOwnedRouter(r.FiberV3Router.Mount(prefix), r.owner)
}
func (r *ownedRouter) WithGroup(prefix string, cb func(router.Router[*fiber.App])) router.Router[*fiber.App] {
	cb(r.Group(prefix))
	return r
}
func (r *ownedRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	r.FiberV3Router.Use(m...)
	return r
}
func (r *ownedRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	r.FiberV3Router.WithLogger(logger)
	return r
}
func (r *ownedRouter) Static(prefix, root string, cfg ...router.Static) router.Router[*fiber.App] {
	r.FiberV3Router.Static(prefix, root, cfg...)
	return r
}
func (r *ownedRouter) WebSocket(path string, cfg router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	return r.FiberV3Router.WebSocket(path, cfg, func(ws router.WebSocketContext) error {
		return r.owner.handleWebSocket(ws, handler)
	})
}

func (s *Server) handleWebSocket(ws router.WebSocketContext, handler func(router.WebSocketContext) error) (err error) {
	reader, ok := ws.(ownedSocket)
	if !ok {
		return fmt.Errorf("native example requires websocket read interruption")
	}
	ctx, cancel := context.WithCancel(ws.Context())
	s.mu.Lock()
	if s.stopping {
		s.mu.Unlock()
		cancel()
		return ws.Close()
	}
	s.sockets[reader] = cancel
	s.mu.Unlock()
	ws.SetContext(ctx)
	defer func() {
		cancel()
		err = errors.Join(err, ws.Close())
		s.mu.Lock()
		delete(s.sockets, reader)
		if s.stopping && len(s.sockets) == 0 {
			close(s.drained)
		}
		s.mu.Unlock()
	}()
	return handler(ws)
}

func runBounded(ctx context.Context, operation func(context.Context) error) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	result := make(chan error, 1)
	go func() { result <- operation(ctx) }()
	select {
	case err := <-result:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Package fiberhost owns the long-lived connections of the native examples.
package fiberhost

import (
	"context"
	"errors"
	"fmt"
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
	sockets  map[router.WebSocketReadInterrupter]context.CancelFunc
	workers  sync.WaitGroup
}

func New(server router.Server[*fiber.App]) *Server {
	s := &Server{Server: server, sockets: make(map[router.WebSocketReadInterrupter]context.CancelFunc)}
	s.routes = &ownedRouter{FiberV3Router: server.Router().(*router.FiberV3Router), owner: s}
	return s
}

func (s *Server) Router() router.Router[*fiber.App] { return s.routes }

func (s *Server) Shutdown(ctx context.Context) error {
	s.mu.Lock()
	s.stopping = true
	sockets := make(map[router.WebSocketReadInterrupter]context.CancelFunc, len(s.sockets))
	for socket, cancel := range s.sockets {
		sockets[socket] = cancel
	}
	s.mu.Unlock()
	var errs []error
	for socket, cancel := range sockets {
		cancel()
		if err := socket.InterruptRead(); err != nil && socket.(router.WebSocketContext).IsWebSocket() {
			errs = append(errs, err)
		}
	}
	joined := make(chan struct{})
	go func() { s.workers.Wait(); close(joined) }()
	select {
	case <-joined:
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

func (r *ownedRouter) Group(prefix string) router.Router[*fiber.App] {
	return &ownedRouter{r.FiberV3Router.Group(prefix).(*router.FiberV3Router), r.owner}
}
func (r *ownedRouter) Mount(prefix string) router.Router[*fiber.App] {
	return &ownedRouter{r.FiberV3Router.Mount(prefix).(*router.FiberV3Router), r.owner}
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
	return r.FiberV3Router.WebSocket(path, cfg, func(ws router.WebSocketContext) (err error) {
		reader, ok := ws.(router.WebSocketReadInterrupter)
		if !ok {
			return fmt.Errorf("native example requires websocket read interruption")
		}
		ctx, cancel := context.WithCancel(ws.Context())
		r.owner.mu.Lock()
		if r.owner.stopping {
			r.owner.mu.Unlock()
			cancel()
			return ws.Close()
		}
		r.owner.sockets[reader] = cancel
		r.owner.workers.Add(1)
		r.owner.mu.Unlock()
		ws.SetContext(ctx)
		defer func() {
			cancel()
			err = errors.Join(err, ws.Close())
			r.owner.mu.Lock()
			delete(r.owner.sockets, reader)
			r.owner.mu.Unlock()
			r.owner.workers.Done()
		}()
		return handler(ws)
	})
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

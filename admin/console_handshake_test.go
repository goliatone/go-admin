package admin

import (
	"context"
	"errors"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestConsolePreUpgradePreservesAuthenticationResponse(t *testing.T) {
	var revoked, execute atomic.Bool
	host := consoleTestHost(t, "data", &revoked, &execute)
	host.routes.Live = "/data/ws"
	rt := &stubWebSocketRouter{}
	host.registerLive(rt, func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error { return c.JSON(401, map[string]string{"code": "AUTHENTICATION_REQUIRED"}) }
	})
	c := router.NewMockContext()
	c.On("JSON", http.StatusUnauthorized, mock.Anything).Return(nil)
	_, err := rt.routeForPath(host.routes.Live).config.OnPreUpgrade(c)
	if !errors.Is(err, router.ErrWebSocketUpgradeHandled) || c.StatusCodeM != 401 {
		t.Fatal("auth response overwritten", err, c.StatusCodeM)
	}
	c.AssertExpectations(t)
}

func TestConsoleSocketStopsAndJoinsReaderOnPeerClose(t *testing.T) {
	var revoked, execute atomic.Bool
	h := consoleTestHost(t, "data", &revoked, &execute)
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)
	done := make(chan error, 1)
	go func() {
		done <- h.watchLiveSocket(ws, context.Background(), consoleTestIdentity("data"), []string{"operations"})
	}()
	waitForDebugWebSocketSignal(t, ws.readStarted, "console reader start")
	ws.releaseOnce.Do(func() { close(ws.readReleased) })
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("peer close retained console subscriber")
	}
	if ws.readActive.Load() {
		t.Fatal("console returned before reader stopped")
	}
}

func TestConsoleSocketCancellationQuiescesReader(t *testing.T) {
	var revoked, execute atomic.Bool
	h := consoleTestHost(t, "data", &revoked, &execute)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)
	done := make(chan error, 1)
	go func() { done <- h.watchLiveSocket(ws, ctx, consoleTestIdentity("data"), []string{"operations"}) }()
	waitForDebugWebSocketSignal(t, ws.readStarted, "console reader start")
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("canceled console retained reader")
	}
	if ws.readActive.Load() || ws.interruptCalls.Load() != 1 {
		t.Fatal("console read teardown did not join once")
	}
}

package rpccontract

import (
	"context"
	"net"
)

// Serve serves the quickstart RPC routes mounted on the host-supplied router and returns an explicit stop
// function. Call Close after stopping the listener to release owned handlers.
func (h *Host) Serve(listener net.Listener) (func(context.Context) error, <-chan error, error) {
	done := make(chan error, 1)
	go func() { done <- h.serve(listener) }()
	return h.stop, done, nil
}

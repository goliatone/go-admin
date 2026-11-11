package rpccontract

import (
	"context"
	"net"
)

// Serve validates the finalized routes before serving the host-owned listener.
// Call Close after stopping the listener to release owned command registrations.
func (h *Host) Serve(listener net.Listener) (func(context.Context) error, <-chan error, error) {
	if err := h.prepare(); err != nil {
		return nil, nil, err
	}
	done := make(chan error, 1)
	go func() { done <- h.serve(listener) }()
	return h.stop, done, nil
}

package quickstart

import (
	"context"
	"time"

	"github.com/goliatone/go-job/queue"
)

// Native lease heartbeats are canceled at delivery completion but may still be
// returning from I/O after Worker.Stop. Count each queue operation independently
// so Seal also waits for those writes, without changing native lease/retry rules.
type durableGatedExportQueue struct {
	native queue.Dequeuer
	gate   *DurableExportRecoveryGate
}

func (q *durableGatedExportQueue) Dequeue(ctx context.Context) (queue.Delivery, error) {
	ctx, done, _, e := q.gate.enter(ctx)
	if e != nil {
		return nil, e
	}
	defer done()
	d, e := q.native.Dequeue(ctx)
	if e != nil || d == nil {
		return d, e
	}
	return &durableGatedExportDelivery{Delivery: d, gate: q.gate}, nil
}

type durableGatedExportDelivery struct {
	queue.Delivery
	gate *DurableExportRecoveryGate
}

func (d *durableGatedExportDelivery) Ack(ctx context.Context) error {
	ctx, done, _, e := d.gate.enter(ctx)
	if e != nil {
		return e
	}
	defer done()
	return d.Delivery.Ack(ctx)
}
func (d *durableGatedExportDelivery) Nack(ctx context.Context, opts queue.NackOptions) error {
	ctx, done, _, e := d.gate.enter(ctx)
	if e != nil {
		return e
	}
	defer done()
	return d.Delivery.Nack(ctx, opts)
}
func (d *durableGatedExportDelivery) ExtendLease(ctx context.Context, ttl time.Duration) error {
	ctx, done, _, e := d.gate.enter(ctx)
	if e != nil {
		return e
	}
	defer done()
	ext, ok := d.Delivery.(queue.LeaseExtender)
	if !ok {
		return queue.ErrLeaseExtensionUnsupported
	}
	return ext.ExtendLease(ctx, ttl)
}
func (d *durableGatedExportDelivery) Attempts() int {
	if a, ok := d.Delivery.(interface{ Attempts() int }); ok {
		return a.Attempts()
	}
	return 0
}

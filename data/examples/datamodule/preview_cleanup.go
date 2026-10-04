package datamodule

import (
	"context"
	"log/slog"
	"time"

	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
)

// RuntimeOptions supplies one clock to the durable adapter and service tests.
// Cleanup is always enabled; the interval is bounded to at most one minute.
type RuntimeOptions struct {
	Store                  sqlitestore.Options
	PreviewCleanupInterval time.Duration
}

func (o *RuntimeOptions) normalize() error {
	if o.PreviewCleanupInterval == 0 {
		o.PreviewCleanupInterval = time.Minute
	}
	if o.PreviewCleanupInterval < time.Millisecond || o.PreviewCleanupInterval > time.Minute {
		return data.Error(data.CodeInvalid)
	}
	return nil
}

func (r *Runtime) startPreviewCleanup(interval time.Duration) {
	ctx, cancel := context.WithCancel(context.Background())
	r.cleanupCancel = cancel
	r.cleanupDone = make(chan struct{})
	go func() {
		defer close(r.cleanupDone)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				sweep, done := context.WithTimeout(ctx, 5*time.Second)
				err := r.PrunePreviews(sweep, data.PreviewMaxPrune)
				done()
				if err != nil && ctx.Err() == nil {
					slog.Warn("preview expiry cleanup failed; retrying next interval", "error", err)
				}
			}
		}
	}()
}

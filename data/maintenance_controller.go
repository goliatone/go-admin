package data

import (
	"context"
	"time"
)

// RunMaintenance runs in the host-owned lifecycle. Dispatch must use the same
// registered Ensure command as manual callers, under a trusted delegated actor.
// No background work is started by DataModule or a status/read request.
func RunMaintenance(ctx context.Context, dispatch func(context.Context) (MaintenanceResult, error), report func(error)) error {
	if dispatch == nil {
		return Error(CodeInvalid)
	}
	timer := time.NewTimer(0)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
		}
		attempt, cancel := context.WithTimeout(ctx, 8*time.Minute)
		result, err := dispatch(attempt)
		cancel()
		if err != nil && ctx.Err() == nil && report != nil {
			report(err)
		}
		delay := time.Minute
		if err == nil && !result.Record.Due.IsZero() {
			remaining := time.Until(result.Record.Due)
			if remaining > 0 && remaining < delay {
				delay = remaining
			}
		}
		timer.Reset(delay)
	}
}

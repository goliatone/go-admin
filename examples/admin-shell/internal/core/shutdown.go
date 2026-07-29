package core

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/goliatone/go-admin/examples/admin-shell/config"
	"github.com/goliatone/go-admin/pkg/admin"
	golifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	commandregistry "github.com/goliatone/go-command/registry"
)

const defaultShutdownTimeout = 10 * time.Second

type shutdownOperation func(context.Context) error

func configuredShutdownTimeout(cfg *config.AppConfig) time.Duration {
	if cfg == nil || cfg.Server.ShutdownTimeoutSeconds <= 0 {
		return defaultShutdownTimeout
	}
	return time.Duration(cfg.Server.ShutdownTimeoutSeconds) * time.Second
}

// coordinateShutdown preserves lifecycle's incomplete-shutdown contract:
// shared admin resources close only after lifecycle completion is known.
func coordinateShutdown(
	ctx context.Context,
	serverShutdown shutdownOperation,
	lifecycleShutdown shutdownOperation,
	adminShutdown shutdownOperation,
) error {
	if ctx == nil {
		ctx = context.Background()
	}
	var errs []error
	if serverShutdown != nil {
		err, _ := runShutdownOperation(ctx, serverShutdown)
		if err != nil {
			errs = append(errs, fmt.Errorf("shutdown server: %w", err))
		}
	}

	var lifecycleErr error
	if lifecycleShutdown != nil {
		var completed bool
		lifecycleErr, completed = runShutdownOperation(ctx, lifecycleShutdown)
		if !completed {
			lifecycleErr = &golifecycle.ShutdownIncompleteError{
				Cause: ctx.Err(),
				Stage: golifecycle.ShutdownStageTasks,
			}
		}
		if lifecycleErr != nil {
			errs = append(errs, fmt.Errorf("shutdown admin lifecycle: %w", lifecycleErr))
		}
	}

	var incomplete *golifecycle.ShutdownIncompleteError
	if errors.As(lifecycleErr, &incomplete) || ctx.Err() != nil {
		if len(errs) == 0 && ctx.Err() != nil {
			errs = append(errs, ctx.Err())
		}
		return errors.Join(errs...)
	}
	if adminShutdown != nil {
		err, _ := runShutdownOperation(ctx, adminShutdown)
		if err != nil {
			errs = append(errs, fmt.Errorf("shutdown admin runtime: %w", err))
		}
	}
	return errors.Join(errs...)
}

func runShutdownOperation(
	ctx context.Context,
	operation shutdownOperation,
) (error, bool) {
	if operation == nil {
		return nil, true
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return err, false
	}
	result := make(chan error, 1)
	go func() {
		result <- operation(ctx)
	}()
	select {
	case err := <-result:
		return err, true
	case <-ctx.Done():
		select {
		case err := <-result:
			return err, true
		default:
			return ctx.Err(), false
		}
	}
}

func (c *Core) shutdownAdminRuntime(ctx context.Context) error {
	if c == nil {
		return nil
	}
	c.adminShutdownMu.Lock()
	defer c.adminShutdownMu.Unlock()
	if c.adminShutdownComplete {
		return nil
	}
	if c.Admin == nil {
		c.adminShutdownComplete = true
		return nil
	}
	if err := stopAdminRuntime(ctx, c.Admin); err != nil {
		return err
	}
	c.adminShutdownComplete = true
	return nil
}

func stopAdminRuntime(ctx context.Context, adm *admin.Admin) error {
	if adm != nil && adm.Commands() != nil {
		adm.Commands().Reset()
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return commandregistry.Stop(ctx)
}

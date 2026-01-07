package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

// AdminOption customizes NewAdmin behavior.
type AdminOption func(*adminOptions)

type adminOptions struct {
	ctx   context.Context
	deps  admin.Dependencies
	flags *AdapterFlags
}

// WithAdminContext sets the context used when resolving adapter hooks.
func WithAdminContext(ctx context.Context) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		if ctx != nil {
			opts.ctx = ctx
		}
	}
}

// WithAdminDependencies sets the admin dependencies passed to admin.New.
func WithAdminDependencies(deps admin.Dependencies) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.deps = deps
	}
}

// WithAdapterFlags overrides env-driven adapter flag resolution.
func WithAdapterFlags(flags AdapterFlags) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.flags = &flags
	}
}

// NewAdmin constructs an admin instance with adapter wiring applied.
func NewAdmin(cfg admin.Config, hooks AdapterHooks, opts ...AdminOption) (*admin.Admin, AdapterResult, error) {
	options := adminOptions{
		ctx: context.Background(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	var result AdapterResult
	if options.flags != nil {
		cfg, result = ConfigureAdaptersWithFlags(options.ctx, cfg, hooks, *options.flags)
	} else {
		cfg, result = ConfigureAdapters(options.ctx, cfg, hooks)
	}
	adm, err := admin.New(cfg, options.deps)
	if err != nil {
		return nil, result, err
	}
	ApplyAdapterIntegrations(adm, &result, hooks)
	return adm, result, nil
}

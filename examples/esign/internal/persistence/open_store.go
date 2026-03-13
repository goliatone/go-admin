package persistence

import (
	"context"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

// OpenStore bootstraps a relational store and returns a cleanup that closes all handles.
func OpenStore(ctx context.Context, cfg appcfg.Config) (stores.Store, func() error, error) {
	bootstrap, err := Bootstrap(ctx, cfg)
	if err != nil {
		return nil, nil, err
	}
	store, storeCleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		_ = bootstrap.Close()
		return nil, nil, err
	}
	return store, func() error {
		if storeCleanup != nil {
			if err := storeCleanup(); err != nil {
				_ = bootstrap.Close()
				return err
			}
		}
		return bootstrap.Close()
	}, nil
}

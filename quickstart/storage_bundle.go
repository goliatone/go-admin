package quickstart

import (
	"context"

	"github.com/goliatone/go-uploader"
)

type StorageBundleConfig struct {
	Provider         uploader.ProviderConfig
	ValidateProvider bool
	Validator        *uploader.Validator
	Logger           uploader.Logger
}

type StorageBundle struct {
	Provider uploader.Uploader
	Manager  *uploader.Manager
}

func NewStorageBundle(ctx context.Context, cfg StorageBundleConfig) (*StorageBundle, error) {
	factoryOpts := []uploader.ProviderFactoryOption{}
	managerOpts := []uploader.Option{}
	if cfg.Logger != nil {
		factoryOpts = append(factoryOpts, uploader.WithProviderFactoryLogger(cfg.Logger))
		managerOpts = append(managerOpts, uploader.WithLogger(cfg.Logger))
	}

	provider, err := uploader.NewProvider(ctx, cfg.Provider, factoryOpts...)
	if err != nil {
		return nil, err
	}
	if cfg.ValidateProvider {
		if validator, ok := provider.(uploader.ProviderValidator); ok {
			if err := validator.Validate(ctx); err != nil {
				return nil, err
			}
		}
	}
	if cfg.Validator != nil {
		managerOpts = append(managerOpts, uploader.WithValidator(cfg.Validator))
	}
	managerOpts = append(managerOpts, uploader.WithProvider(provider))
	return &StorageBundle{
		Provider: provider,
		Manager:  uploader.NewManager(managerOpts...),
	}, nil
}

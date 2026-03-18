package quickstart

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/goliatone/go-uploader"
)

func TestNewStorageBundleBuildsFSProviderAndManager(t *testing.T) {
	bundle, err := NewStorageBundle(context.Background(), StorageBundleConfig{
		Provider: uploader.ProviderConfig{
			Backend: uploader.BackendFS,
			FS: uploader.FSConfig{
				BasePath: t.TempDir(),
			},
		},
	})
	if err != nil {
		t.Fatalf("NewStorageBundle returned error: %v", err)
	}
	if bundle == nil {
		t.Fatal("expected non-nil bundle")
	}
	if bundle.Provider == nil {
		t.Fatal("expected provider to be configured")
	}
	if bundle.Manager == nil {
		t.Fatal("expected manager to be configured")
	}
}

func TestNewStorageBundleValidateProviderReturnsError(t *testing.T) {
	basePath := filepath.Join(t.TempDir(), "storage-cache")
	bundle, err := NewStorageBundle(context.Background(), StorageBundleConfig{
		Provider: uploader.ProviderConfig{
			Backend: uploader.BackendFS,
			FS: uploader.FSConfig{
				BasePath: basePath,
			},
		},
		ValidateProvider: true,
	})
	if err != nil {
		t.Fatalf("expected missing fs base path to be prepared, got %v", err)
	}
	if bundle == nil || bundle.Provider == nil || bundle.Manager == nil {
		t.Fatal("expected validated bundle to be created")
	}
}

func TestNewStorageBundleRejectsUnsupportedBackend(t *testing.T) {
	_, err := NewStorageBundle(context.Background(), StorageBundleConfig{
		Provider: uploader.ProviderConfig{
			Backend: uploader.Backend("bogus"),
			FS: uploader.FSConfig{
				BasePath: t.TempDir(),
			},
		},
	})
	if err == nil {
		t.Fatal("expected unsupported backend error")
	}
}

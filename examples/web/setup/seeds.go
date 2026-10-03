package setup

import (
	"context"
	"fmt"
	"io/fs"
	"path"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/goliatone/go-admin/examples/web/data"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/goliatone/hashid/pkg/hashid"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dbfixture"
)

// SeedGroup scopes which fixture folder to load.
type SeedGroup string

const (
	SeedGroupUsers SeedGroup = "users"
	SeedGroupCMS   SeedGroup = "cms"
)

// SeedConfig controls fixture loading behavior.
type SeedConfig struct {
	Enabled          bool `json:"enabled"`
	Truncate         bool `json:"truncate"`
	IgnoreDuplicates bool `json:"ignore_duplicates"`
}

// DefaultSeedConfig returns baseline fixture loading behavior.
func DefaultSeedConfig() SeedConfig {
	return SeedConfig{
		Enabled:          true,
		Truncate:         false,
		IgnoreDuplicates: true,
	}
}

// ResolveSeedConfig normalizes seed settings for the current runtime profile.
func ResolveSeedConfig(cfg SeedConfig, production bool) SeedConfig {
	if production {
		cfg.Enabled = false
	}
	return cfg
}

func isProductionEnv() bool {
	env := strings.ToLower(strings.TrimSpace(runtimeConfig().AppEnv))
	return env == "production" || env == "prod"
}

type seedState struct {
	mu     sync.Mutex
	loaded bool
}

var seedOnce sync.Map

// LoadSeedGroup loads fixtures for a specific group (users, cms).
func LoadSeedGroup(ctx context.Context, client *persistence.Client, cfg SeedConfig, group SeedGroup) error {
	if client == nil || !cfg.Enabled {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	fsys, err := seedFS(group)
	if err != nil {
		return err
	}

	load := func() error {
		RegisterSeedModelsOnDB(client.DB())
		return loadSeedFixtures(ctx, client.DB(), fsys, cfg)
	}

	if cfg.Truncate {
		return load()
	}

	key := seedKey(client, group)
	stateAny, _ := seedOnce.LoadOrStore(key, &seedState{})
	state := stateAny.(*seedState)
	state.mu.Lock()
	defer state.mu.Unlock()
	if state.loaded {
		return nil
	}
	if err := load(); err != nil {
		return err
	}
	state.loaded = true
	return nil
}

// loadSeedFixtures uses Bun's per-row insert hook so duplicates do not abort
// the remaining fixtures. DO NOTHING preserves existing rows and still rejects
// foreign-key, check, and not-null violations (unlike SQLite INSERT OR IGNORE).
func loadSeedFixtures(ctx context.Context, db *bun.DB, fsys fs.FS, cfg SeedConfig) error {
	opts := []dbfixture.FixtureOption{dbfixture.WithTemplateFuncs(seedTemplateFuncs())}
	if cfg.Truncate {
		opts = append(opts, dbfixture.WithTruncateTables())
	}
	if cfg.IgnoreDuplicates {
		opts = append(opts, dbfixture.WithBeforeInsert(func(_ context.Context, data *dbfixture.BeforeInsertData) error {
			data.Query.On("CONFLICT DO NOTHING")
			return nil
		}))
	}
	fixtures := dbfixture.New(db, opts...)
	return fs.WalkDir(fsys, ".", func(name string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		switch strings.ToLower(path.Ext(name)) {
		case ".yaml", ".yml", ".json":
			if err := fixtures.Load(ctx, fsys, name); err != nil {
				return fmt.Errorf("load seed fixture %s: %w", name, err)
			}
		}
		return nil
	})
}

func seedFS(group SeedGroup) (fs.FS, error) {
	fsys := data.SeedsFS()
	if strings.TrimSpace(string(group)) == "" {
		return fsys, nil
	}
	sub, err := fs.Sub(fsys, string(group))
	if err != nil {
		return nil, err
	}
	return sub, nil
}

func seedKey(client *persistence.Client, group SeedGroup) string {
	dsn := ""
	if client != nil {
		if cfg := client.Config(); cfg != nil {
			dsn = strings.TrimSpace(cfg.GetServer())
		}
	}
	if dsn == "" {
		dsn = "default"
	}
	return dsn + "|" + string(group)
}

func seedTemplateFuncs() template.FuncMap {
	return template.FuncMap{
		"hashid": func(identifier reflect.Value) (string, error) {
			return hashid.New(seedValueToString(identifier))
		},
		"now": func() string {
			return time.Now().UTC().Format(time.RFC3339)
		},
		"uuid": func() string {
			return uuid.NewString()
		},
		"hashpwd": func(identifier reflect.Value) (string, error) {
			str := seedValueToString(identifier)
			out, err := hashPassword(str)
			if err != nil {
				return "", fmt.Errorf("failed to generate password hash for value '%s': %w", str, err)
			}
			return out, nil
		},
	}
}

func seedValueToString(v reflect.Value) string {
	if !v.IsValid() {
		return ""
	}
	switch v.Kind() {
	case reflect.Bool:
		return strconv.FormatBool(v.Bool())
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(v.Int(), 10)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return strconv.FormatUint(v.Uint(), 10)
	case reflect.Float32:
		return strconv.FormatFloat(v.Float(), 'g', -1, 32)
	case reflect.Float64:
		return strconv.FormatFloat(v.Float(), 'g', -1, 64)
	}
	return fmt.Sprintf("%v", v.Interface())
}

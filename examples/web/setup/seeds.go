package setup

import (
	"context"
	"io/fs"
	"os"
	"strconv"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/goliatone/go-admin/examples/web/data"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/google/uuid"
)

// SeedGroup scopes which fixture folder to load.
type SeedGroup string

const (
	SeedGroupUsers SeedGroup = "users"
	SeedGroupCMS   SeedGroup = "cms"
)

// SeedConfig controls fixture loading behavior.
type SeedConfig struct {
	Enabled          bool
	Truncate         bool
	IgnoreDuplicates bool
}

// SeedConfigFromEnv builds the seed config from environment variables.
func SeedConfigFromEnv() SeedConfig {
	cfg := SeedConfig{
		Enabled:          true,
		Truncate:         false,
		IgnoreDuplicates: true,
	}
	if isProductionEnv() {
		cfg.Enabled = false
	}
	if val := strings.TrimSpace(os.Getenv("ADMIN_SEEDS")); val != "" {
		if parsed, err := strconv.ParseBool(val); err == nil {
			cfg.Enabled = parsed
		}
	}
	if val := strings.TrimSpace(os.Getenv("ADMIN_SEEDS_TRUNCATE")); val != "" {
		if parsed, err := strconv.ParseBool(val); err == nil {
			cfg.Truncate = parsed
		}
	}
	if val := strings.TrimSpace(os.Getenv("ADMIN_SEEDS_IGNORE_DUPLICATES")); val != "" {
		if parsed, err := strconv.ParseBool(val); err == nil {
			cfg.IgnoreDuplicates = parsed
		}
	}
	return cfg
}

func isProductionEnv() bool {
	return strings.EqualFold(os.Getenv("GO_ENV"), "production") || strings.EqualFold(os.Getenv("ENV"), "production")
}

type seedState struct {
	once sync.Once
	err  error
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
		fixtures := client.RegisterFixtures(fsys)
		fixtures.AddOptions(persistence.WithTemplateFuncs(seedTemplateFuncs()))
		if cfg.Truncate {
			fixtures.AddOptions(persistence.WithTrucateTables())
		}
		err := fixtures.Load(ctx)
		if err != nil && cfg.IgnoreDuplicates && isDuplicateSeedError(err) {
			return nil
		}
		return err
	}

	if cfg.Truncate {
		return load()
	}

	key := seedKey(client, group)
	stateAny, _ := seedOnce.LoadOrStore(key, &seedState{})
	state := stateAny.(*seedState)
	state.once.Do(func() {
		state.err = load()
	})
	return state.err
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
		"now": func() string {
			return time.Now().UTC().Format(time.RFC3339)
		},
		"uuid": func() string {
			return uuid.NewString()
		},
	}
}

func isDuplicateSeedError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique constraint failed") ||
		strings.Contains(msg, "duplicate key value violates unique constraint")
}

package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/uptrace/bun"
)

const (
	commandStatus           = "status"
	commandUp               = "up"
	commandDown             = "down"
	commandRollbackAll      = "rollback-all"
	commandValidateDialects = "validate-dialects"
	commandValidateFixtures = "validate-fixtures"
	commandHelp             = "help"
)

type options struct {
	Command    string
	ConfigPath string
	Timeout    time.Duration
}

type migrationStatus struct {
	AppliedCount int
	Latest       migrationEntry
	HasLatest    bool
}

type migrationEntry struct {
	Name       string    `bun:"name"`
	GroupID    int64     `bun:"group_id"`
	MigratedAt time.Time `bun:"migrated_at"`
}

func main() {
	opts, err := parseArgs(os.Args[1:])
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "error: %v\n\n", err)
		printUsage(os.Stderr)
		os.Exit(2)
	}
	if opts.Command == commandHelp {
		printUsage(os.Stdout)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), opts.Timeout)
	defer cancel()

	cfg, err := loadConfig(ctx, opts.ConfigPath)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "error: load config: %v\n", err)
		os.Exit(1)
	}

	handles, err := esignpersistence.OpenClient(ctx, cfg)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "error: open persistence client: %v\n", err)
		os.Exit(1)
	}
	defer func() {
		if cerr := handles.Close(); cerr != nil {
			_, _ = fmt.Fprintf(os.Stderr, "warn: close persistence client: %v\n", cerr)
		}
	}()

	if err := runCommand(ctx, opts, handles); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func parseArgs(args []string) (options, error) {
	opts := options{
		Command: commandHelp,
		Timeout: 30 * time.Second,
	}
	remaining := make([]string, 0, len(args))
	for i := 0; i < len(args); i++ {
		arg := strings.TrimSpace(args[i])
		switch arg {
		case "", " ":
			continue
		case "-h", "--help":
			opts.Command = commandHelp
			return opts, nil
		case "-config", "--config":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("%s requires a path value", arg)
			}
			i++
			opts.ConfigPath = strings.TrimSpace(args[i])
		case "-timeout", "--timeout":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("%s requires a duration value", arg)
			}
			i++
			duration, err := time.ParseDuration(strings.TrimSpace(args[i]))
			if err != nil {
				return opts, fmt.Errorf("parse timeout %q: %w", args[i], err)
			}
			if duration <= 0 {
				return opts, fmt.Errorf("timeout must be greater than zero")
			}
			opts.Timeout = duration
		default:
			remaining = append(remaining, arg)
		}
	}

	if len(remaining) == 0 {
		opts.Command = commandHelp
		return opts, nil
	}
	opts.Command = strings.ToLower(strings.TrimSpace(remaining[0]))
	switch opts.Command {
	case commandStatus, commandUp, commandDown, commandRollbackAll, commandValidateDialects, commandValidateFixtures:
	default:
		return opts, fmt.Errorf("unsupported command %q", opts.Command)
	}
	if len(remaining) > 1 {
		return opts, fmt.Errorf("command %q does not accept positional arguments", opts.Command)
	}
	return opts, nil
}

func loadConfig(_ context.Context, configPath string) (appcfg.Config, error) {
	configPath = strings.TrimSpace(configPath)
	if configPath == "" {
		return appcfg.Load()
	}
	return appcfg.Load(configPath)
}

func runCommand(ctx context.Context, opts options, handles *esignpersistence.ClientHandles) error {
	switch opts.Command {
	case commandStatus:
		return runStatus(ctx, handles)
	case commandUp:
		return runUp(ctx, handles)
	case commandDown:
		return runDown(ctx, handles)
	case commandRollbackAll:
		return runRollbackAll(ctx, handles)
	case commandValidateDialects:
		return runValidateDialects(ctx, handles)
	case commandValidateFixtures:
		return runValidateFixtures(ctx, handles)
	default:
		return fmt.Errorf("unsupported command %q", opts.Command)
	}
}

func runStatus(ctx context.Context, handles *esignpersistence.ClientHandles) error {
	if handles == nil || handles.Client == nil {
		return fmt.Errorf("persistence client is not configured")
	}
	if err := esignpersistence.CheckConnectivity(ctx, handles.Client); err != nil {
		return err
	}
	if err := handles.Client.ValidateDialects(ctx); err != nil {
		return fmt.Errorf("dialect validation failed: %w", err)
	}

	status, err := readMigrationStatus(ctx, handles.BunDB)
	if err != nil {
		if isMissingMigrationStateError(err) {
			fmt.Printf("dialect: %s\n", handles.Dialect)
			fmt.Printf("dsn: %s\n", redactDSN(handles.DSN))
			fmt.Printf("applied_migrations: 0\n")
			fmt.Printf("latest_migration: none\n")
			return nil
		}
		return fmt.Errorf("read migration status: %w", err)
	}

	fmt.Printf("dialect: %s\n", handles.Dialect)
	fmt.Printf("dsn: %s\n", redactDSN(handles.DSN))
	fmt.Printf("applied_migrations: %d\n", status.AppliedCount)
	if status.HasLatest {
		fmt.Printf(
			"latest_migration: name=%s group_id=%d migrated_at=%s\n",
			strings.TrimSpace(status.Latest.Name),
			status.Latest.GroupID,
			status.Latest.MigratedAt.UTC().Format(time.RFC3339),
		)
	} else {
		fmt.Printf("latest_migration: none\n")
	}
	return nil
}

func runUp(ctx context.Context, handles *esignpersistence.ClientHandles) error {
	if err := runValidateDialects(ctx, handles); err != nil {
		return err
	}
	if err := handles.Client.Migrate(ctx); err != nil {
		return fmt.Errorf("migrate up: %w", err)
	}
	reportMigrationGroup("applied_group", handles.Client.Report())
	return nil
}

func runDown(ctx context.Context, handles *esignpersistence.ClientHandles) error {
	if err := assertRollbackSafety(handles); err != nil {
		return err
	}
	if err := runValidateDialects(ctx, handles); err != nil {
		return err
	}
	if err := handles.Client.Rollback(ctx); err != nil {
		return fmt.Errorf("rollback latest group: %w", err)
	}
	reportMigrationGroup("rolled_back_group", handles.Client.Report())
	return nil
}

func runRollbackAll(ctx context.Context, handles *esignpersistence.ClientHandles) error {
	if err := assertRollbackSafety(handles); err != nil {
		return err
	}
	if err := runValidateDialects(ctx, handles); err != nil {
		return err
	}
	if err := handles.Client.RollbackAll(ctx); err != nil {
		return fmt.Errorf("rollback all groups: %w", err)
	}
	reportMigrationGroup("rolled_back_group", handles.Client.Report())
	return nil
}

func runValidateDialects(ctx context.Context, handles *esignpersistence.ClientHandles) error {
	if handles == nil || handles.Client == nil {
		return fmt.Errorf("persistence client is not configured")
	}
	if err := handles.Client.ValidateDialects(ctx); err != nil {
		return fmt.Errorf("validate dialect contracts: %w", err)
	}
	fmt.Printf("dialect validation passed (dialect=%s)\n", handles.Dialect)
	return nil
}

func runValidateFixtures(ctx context.Context, handles *esignpersistence.ClientHandles) error {
	if handles == nil || handles.Client == nil || handles.BunDB == nil {
		return fmt.Errorf("persistence client is not configured")
	}
	if err := handles.Client.ValidateDialects(ctx); err != nil {
		return fmt.Errorf("validate dialect contracts: %w", err)
	}
	if err := handles.Client.Migrate(ctx); err != nil {
		return fmt.Errorf("apply migrations for fixture validation: %w", err)
	}

	tx, err := handles.BunDB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin validation transaction: %w", err)
	}
	scope := stores.Scope{
		TenantID: "tenant-fixture-validation",
		OrgID:    "org-fixture-validation",
	}
	fx, err := stores.SeedCoreFixtures(ctx, tx, scope)
	if err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("seed fixtures in validation transaction: %w", err)
	}

	var documents int
	if err := tx.NewRaw(
		`SELECT COUNT(1) FROM documents WHERE tenant_id = ? AND org_id = ?`,
		scope.TenantID,
		scope.OrgID,
	).Scan(ctx, &documents); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("verify fixture inserts: %w", err)
	}
	if documents < 1 {
		_ = tx.Rollback()
		return fmt.Errorf("fixture validation did not insert expected documents")
	}

	if err := tx.Rollback(); err != nil && !errors.Is(err, sql.ErrTxDone) {
		return fmt.Errorf("rollback validation transaction: %w", err)
	}
	fmt.Printf("fixture validation passed (agreement_id=%s)\n", strings.TrimSpace(fx.AgreementID))
	return nil
}

func readMigrationStatus(ctx context.Context, db *bun.DB) (migrationStatus, error) {
	if db == nil {
		return migrationStatus{}, fmt.Errorf("bun db is nil")
	}
	status := migrationStatus{}
	if err := db.NewRaw(`SELECT COUNT(1) FROM bun_migrations`).Scan(ctx, &status.AppliedCount); err != nil {
		return migrationStatus{}, err
	}
	if status.AppliedCount <= 0 {
		return status, nil
	}
	if err := db.NewSelect().
		Table("bun_migrations").
		Column("name", "group_id", "migrated_at").
		OrderExpr("id DESC").
		Limit(1).
		Scan(ctx, &status.Latest); err != nil {
		return migrationStatus{}, err
	}
	status.HasLatest = strings.TrimSpace(status.Latest.Name) != ""
	return status, nil
}

func reportMigrationGroup(label string, group fmt.Stringer) {
	label = strings.TrimSpace(label)
	if label == "" {
		label = "migration_group"
	}
	if group == nil {
		fmt.Printf("%s: none\n", label)
		return
	}
	fmt.Printf("%s: %s\n", label, strings.TrimSpace(group.String()))
}

func isMissingMigrationStateError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	if msg == "" {
		return false
	}
	return strings.Contains(msg, "no such table") ||
		strings.Contains(msg, "does not exist") ||
		strings.Contains(msg, "undefined table")
}

func redactDSN(raw string) string {
	dsn := strings.TrimSpace(raw)
	if dsn == "" {
		return ""
	}
	if parsed, err := url.Parse(dsn); err == nil && parsed != nil && parsed.User != nil {
		username := parsed.User.Username()
		if username != "" {
			parsed.User = url.UserPassword(username, "***")
		} else {
			parsed.User = url.User("***")
		}
		return parsed.String()
	}

	parts := strings.Fields(dsn)
	for i, part := range parts {
		lower := strings.ToLower(strings.TrimSpace(part))
		if strings.HasPrefix(lower, "password=") {
			parts[i] = "password=***"
		}
	}
	return strings.Join(parts, " ")
}

func printUsage(out io.Writer) {
	if out == nil {
		out = os.Stdout
	}
	_, _ = fmt.Fprintln(out, "Usage:")
	_, _ = fmt.Fprintln(out, "  go run ./examples/esign/cmd/migrate [--config <path>] [--timeout <duration>] <command>")
	_, _ = fmt.Fprintln(out, "")
	_, _ = fmt.Fprintln(out, "Commands:")
	_, _ = fmt.Fprintln(out, "  status             Print migration status for the configured runtime database.")
	_, _ = fmt.Fprintln(out, "  up                 Apply pending migrations.")
	_, _ = fmt.Fprintln(out, "  down               Roll back the most recently applied migration group.")
	_, _ = fmt.Fprintln(out, "  rollback-all       Roll back all applied migration groups.")
	_, _ = fmt.Fprintln(out, "  validate-dialects  Validate migration dialect contracts (postgres/sqlite).")
	_, _ = fmt.Fprintln(out, "  validate-fixtures  Apply migrations, seed fixtures in a transaction, and roll back.")
	_, _ = fmt.Fprintln(out, "")
	_, _ = fmt.Fprintln(out, "Examples:")
	_, _ = fmt.Fprintln(out, "  go run ./examples/esign/cmd/migrate status")
	_, _ = fmt.Fprintln(out, "  go run ./examples/esign/cmd/migrate --config examples/esign/config/app.json up")
}

func assertRollbackSafety(handles *esignpersistence.ClientHandles) error {
	if handles == nil {
		return fmt.Errorf("persistence client is not configured")
	}
	if handles.Dialect == esignpersistence.DialectSQLite {
		return fmt.Errorf(
			"rollback commands are disabled for sqlite to prevent partial rollback with the current ordered-source migration set; use a postgres target",
		)
	}
	return nil
}

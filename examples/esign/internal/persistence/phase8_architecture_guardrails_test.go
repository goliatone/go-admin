package persistence

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

func TestPhase8GuardrailNoDialectBranchingOutsidePersistenceLayers(t *testing.T) {
	repoRoot := phase8RepoRoot(t)
	targets := []string{
		"examples/esign/modules",
		"examples/esign/services",
		"examples/esign/handlers",
		"examples/esign/main.go",
		"examples/esign/runtime_web.go",
		"examples/esign/services_module_setup.go",
	}
	files := phase8GoFiles(t, repoRoot, targets...)
	pattern := regexp.MustCompile(`(?m)^\s*(if|switch)\b[^\n]*(RepositoryDialect|DialectSQLite|DialectPostgres)\b|^\s*case\s+[^\n]*(RepositoryDialect|DialectSQLite|DialectPostgres|"sqlite"|"postgres")`)
	phase8AssertNoPatternMatches(t, repoRoot, files, pattern, "dialect branching must stay inside persistence/config layers")
}

func TestPhase8GuardrailNoModuleLevelMigrationExecution(t *testing.T) {
	repoRoot := phase8RepoRoot(t)
	files := phase8GoFiles(t, repoRoot,
		"examples/esign/modules",
		"examples/esign/services",
		"examples/esign/handlers",
		"examples/esign/main.go",
		"examples/esign/runtime_web.go",
		"examples/esign/services_module_setup.go",
	)
	pattern := regexp.MustCompile(`(?m)\.Migrate\(|RegisterDialectMigrations\(|RegisterSQLMigrations\(|RegisterOrderedMigrationSources\(`)
	phase8AssertNoPatternMatches(t, repoRoot, files, pattern, "module/runtime layers must not execute/register migrations directly")
}

func TestPhase8GuardrailNoDirectSQLOpenOutsidePersistenceBoundary(t *testing.T) {
	repoRoot := phase8RepoRoot(t)
	files := phase8GoFiles(t, repoRoot,
		"examples/esign/modules",
		"examples/esign/services",
		"examples/esign/handlers",
		"examples/esign/main.go",
		"examples/esign/runtime_web.go",
		"examples/esign/services_module_setup.go",
	)
	pattern := regexp.MustCompile(`(?m)\bsql\.Open\(`)
	phase8AssertNoPatternMatches(t, repoRoot, files, pattern, "direct sql.Open must stay inside persistence adapter/bootstrap boundaries")
}

func TestPhase8GuardrailNoAdHocMigrationPlannerUsageOutsidePersistence(t *testing.T) {
	repoRoot := phase8RepoRoot(t)
	files := phase8GoFiles(t, repoRoot, "examples/esign")
	allowed := map[string]bool{
		filepath.Clean("examples/esign/internal/persistence/bootstrap.go"):  true,
		filepath.Clean("examples/esign/internal/persistence/migrations.go"): true,
		filepath.Clean("examples/esign/cmd/migrate/main.go"):                true,
		filepath.Clean("examples/esign/stores/migrations.go"):               true,
	}
	pattern := regexp.MustCompile(`(?m)\.Migrate\(|RegisterDialectMigrations\(|RegisterSQLMigrations\(|RegisterOrderedMigrationSources\(`)
	violations := make([]string, 0)
	for _, file := range files {
		rel := phase8Rel(repoRoot, file)
		if allowed[filepath.Clean(rel)] {
			continue
		}
		payload, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", rel, err)
		}
		if pattern.Match(payload) {
			violations = append(violations, rel)
		}
	}
	if len(violations) > 0 {
		t.Fatalf("ad-hoc migration planner usage detected outside persistence boundaries: %v", violations)
	}
}

func TestPhase8GuardrailLegacyDSNAliasesAreIgnoredByRuntimeDialectResolution(t *testing.T) {
	sqliteCfg := appcfg.Defaults()
	sqliteCfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	sqliteCfg.SQLite.DSN = ""
	sqliteCfg.Databases.ESignDSN = "file:/tmp/legacy.sqlite?_busy_timeout=5000&_foreign_keys=on"
	if _, err := resolveDSN(*sqliteCfg, DialectSQLite); err == nil {
		t.Fatalf("expected sqlite resolveDSN failure when sqlite.dsn is missing and only legacy alias is set")
	}

	postgresCfg := appcfg.Defaults()
	postgresCfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	postgresCfg.Postgres.DSN = ""
	postgresCfg.Databases.ESignDSN = "postgres://legacy:legacy@localhost:5432/esign?sslmode=disable"
	if _, err := resolveDSN(*postgresCfg, DialectPostgres); err == nil {
		t.Fatalf("expected postgres resolveDSN failure when postgres.dsn is missing and only legacy alias is set")
	}

	ignoredAliasCfg := appcfg.Defaults()
	ignoredAliasCfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	ignoredAliasCfg.SQLite.DSN = "file:/tmp/sqlite-safe.sqlite?_busy_timeout=5000&_foreign_keys=on"
	ignoredAliasCfg.Databases.ESignDSN = "postgres://legacy:legacy@localhost:5432/esign?sslmode=disable"
	dsn, err := resolveDSN(*ignoredAliasCfg, DialectSQLite)
	if err != nil {
		t.Fatalf("expected explicit sqlite.dsn to resolve even with conflicting legacy alias present: %v", err)
	}
	if dsn != ignoredAliasCfg.SQLite.DSN {
		t.Fatalf("expected resolveDSN to return sqlite.dsn %q, got %q", ignoredAliasCfg.SQLite.DSN, dsn)
	}
}

func phase8RepoRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("resolve caller path")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..", ".."))
	return root
}

func phase8GoFiles(t *testing.T, repoRoot string, targets ...string) []string {
	t.Helper()
	files := make([]string, 0, 128)
	seen := map[string]bool{}
	for _, target := range targets {
		target = strings.TrimSpace(target)
		if target == "" {
			continue
		}
		abs := filepath.Join(repoRoot, filepath.FromSlash(target))
		info, err := os.Stat(abs)
		if err != nil {
			t.Fatalf("stat %s: %v", target, err)
		}
		if info.IsDir() {
			err := filepath.WalkDir(abs, func(path string, d os.DirEntry, walkErr error) error {
				if walkErr != nil {
					return walkErr
				}
				if d == nil || d.IsDir() {
					return nil
				}
				name := strings.ToLower(strings.TrimSpace(d.Name()))
				if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
					return nil
				}
				if !seen[path] {
					files = append(files, path)
					seen[path] = true
				}
				return nil
			})
			if err != nil {
				t.Fatalf("walk %s: %v", target, err)
			}
			continue
		}
		if strings.HasSuffix(strings.ToLower(abs), ".go") && !strings.HasSuffix(strings.ToLower(abs), "_test.go") && !seen[abs] {
			files = append(files, abs)
			seen[abs] = true
		}
	}
	return files
}

func phase8AssertNoPatternMatches(t *testing.T, repoRoot string, files []string, pattern *regexp.Regexp, message string) {
	t.Helper()
	if pattern == nil {
		t.Fatalf("guardrail pattern is nil")
	}
	violations := make([]string, 0)
	for _, file := range files {
		payload, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", phase8Rel(repoRoot, file), err)
		}
		if pattern.Match(payload) {
			violations = append(violations, phase8Rel(repoRoot, file))
		}
	}
	if len(violations) > 0 {
		t.Fatalf("%s: %v", message, violations)
	}
}

func phase8Rel(repoRoot, file string) string {
	file = filepath.Clean(file)
	repoRoot = filepath.Clean(repoRoot)
	if rel, err := filepath.Rel(repoRoot, file); err == nil {
		return filepath.ToSlash(strings.TrimSpace(rel))
	}
	return filepath.ToSlash(file)
}

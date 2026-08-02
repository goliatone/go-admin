package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestMailpitInitFailsClosedWhenOpenSSLFails(t *testing.T) {
	target := t.TempDir()
	fakeBin := t.TempDir()
	writeExecutable(t, filepath.Join(fakeBin, "openssl"), "#!/usr/bin/env bash\nexit 19\n")

	cmd := mailpitInitCommand(t, target, fakeBin)
	if output, err := cmd.CombinedOutput(); err == nil {
		t.Fatalf("Mailpit init succeeded after openssl failure: %s", output)
	}

	for _, name := range []string{"priv_key.pem", "pub_cert.pem", "development.txt"} {
		if _, err := os.Stat(filepath.Join(target, name)); !os.IsNotExist(err) {
			t.Fatalf("partial Mailpit artifact %s remains after failure (stat error: %v)", name, err)
		}
	}
	if matches, err := filepath.Glob(filepath.Join(target, ".tls.*")); err != nil || len(matches) != 0 {
		t.Fatalf("temporary Mailpit directories after failure = %#v, error = %v", matches, err)
	}
}

func TestMailpitInitPublishesCompleteMaterialWithRestrictiveModes(t *testing.T) {
	target := t.TempDir()
	fakeBin := t.TempDir()
	writeExecutable(t, filepath.Join(fakeBin, "openssl"), `#!/usr/bin/env bash
set -eu
keyout=""
certout=""
while (($#)); do
    case "$1" in
        -keyout) keyout="$2"; shift 2 ;;
        -out) certout="$2"; shift 2 ;;
        *) shift ;;
    esac
done
printf 'test-private-key\n' > "$keyout"
printf 'test-certificate\n' > "$certout"
`)

	cmd := mailpitInitCommand(t, target, fakeBin)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Mailpit init failed: %v: %s", err, output)
	}

	wantModes := map[string]os.FileMode{
		"priv_key.pem":    0o600,
		"pub_cert.pem":    0o644,
		"development.txt": 0o600,
	}
	for name, wantMode := range wantModes {
		info, err := os.Stat(filepath.Join(target, name))
		if err != nil {
			t.Fatalf("stat %s: %v", name, err)
		}
		if got := info.Mode().Perm(); got != wantMode {
			t.Fatalf("mode for %s = %o, want %o", name, got, wantMode)
		}
	}
}

func TestMailpitStartupStopsWhenInitializationFails(t *testing.T) {
	taskfile, err := os.ReadFile("taskfile")
	if err != nil {
		t.Fatal(err)
	}
	testRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(testRoot, "taskfile"), taskfile, 0o700); err != nil {
		t.Fatal(err)
	}
	writeExecutable(t, filepath.Join(testRoot, "ops", "mailpit", "init.sh"), "#!/usr/bin/env bash\nexit 23\n")
	writeExecutable(t, filepath.Join(testRoot, "bin", "lgr"), "#!/usr/bin/env bash\nexit 0\n")
	marker := filepath.Join(testRoot, "mailpit-called")
	writeExecutable(t, filepath.Join(testRoot, "bin", "mailpit"), "#!/usr/bin/env bash\nprintf called > \"$MAILPIT_CALLED\"\n")

	cmd := exec.Command("bash", filepath.Join(testRoot, "taskfile"), "dev:smtp")
	cmd.Dir = testRoot
	cmd.Env = append(os.Environ(), "MAILPIT_CALLED="+marker)
	if output, err := cmd.CombinedOutput(); err == nil {
		t.Fatalf("dev:smtp succeeded after initialization failure: %s", output)
	}
	if _, err := os.Stat(marker); !os.IsNotExist(err) {
		t.Fatalf("Mailpit was started after initialization failure (stat error: %v)", err)
	}
}

func mailpitInitCommand(t *testing.T, target, fakeBin string) *exec.Cmd {
	t.Helper()
	script, err := filepath.Abs(filepath.Join("ops", "mailpit", "init.sh"))
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("bash", script, target)
	cmd.Env = environmentWithPath(fakeBin + string(os.PathListSeparator) + os.Getenv("PATH"))
	return cmd
}

func environmentWithPath(path string) []string {
	environment := make([]string, 0, len(os.Environ())+1)
	for _, variable := range os.Environ() {
		if !strings.HasPrefix(variable, "PATH=") {
			environment = append(environment, variable)
		}
	}
	return append(environment, "PATH="+path)
}

func writeExecutable(t *testing.T, path, contents string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o755); err != nil {
		t.Fatal(err)
	}
}

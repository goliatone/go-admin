package services

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestInterpolateRemediationArgsAllowsInputOutputTokens(t *testing.T) {
	args, err := interpolateRemediationArgs([]string{"-i={in}", "-o={out}"}, "/tmp/input.pdf", "/tmp/output.pdf")
	if err != nil {
		t.Fatalf("interpolateRemediationArgs: %v", err)
	}
	if len(args) != 2 {
		t.Fatalf("expected 2 args, got %d", len(args))
	}
	if args[0] != "-i=/tmp/input.pdf" {
		t.Fatalf("unexpected interpolated input arg: %q", args[0])
	}
	if args[1] != "-o=/tmp/output.pdf" {
		t.Fatalf("unexpected interpolated output arg: %q", args[1])
	}
}

func TestInterpolateRemediationArgsRejectsUnknownTokens(t *testing.T) {
	_, err := interpolateRemediationArgs([]string{"{in}", "{evil}"}, "/tmp/input.pdf", "/tmp/output.pdf")
	if err == nil {
		t.Fatal("expected unknown token validation error")
	}
	if !strings.Contains(err.Error(), "not allowed") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestInterpolateRemediationArgsRejectsUnresolvedBraces(t *testing.T) {
	_, err := interpolateRemediationArgs([]string{"{in"}, "/tmp/input.pdf", "/tmp/output.pdf")
	if err == nil {
		t.Fatal("expected unresolved token syntax error")
	}
	if !strings.Contains(err.Error(), "unresolved token syntax") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestExternalPDFRemediationRunnerCapturesBoundedLogs(t *testing.T) {
	script := createExecutableScript(t, `#!/bin/sh
set -eu
in="$1"
out="$2"
cp "$in" "$out"
i=0
while [ "$i" -lt 64 ]; do
	printf 'A'
	printf 'B' >&2
	i=$((i+1))
done
`)
	template := PDFRemediationCommandTemplate{
		Bin:         script,
		Args:        []string{"{in}", "{out}"},
		Timeout:     10 * time.Second,
		MaxPDFBytes: 1 << 20,
		MaxLogBytes: 16,
	}
	runner, err := NewExternalPDFRemediationRunner(template, []string{filepath.Base(script)})
	if err != nil {
		t.Fatalf("NewExternalPDFRemediationRunner: %v", err)
	}

	source := GenerateDeterministicPDF(1)
	result, err := runner.Run(context.Background(), PDFRemediationRunInput{SourcePDF: source})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if !bytes.Equal(result.OutputPDF, source) {
		t.Fatalf("expected output payload to match copied source")
	}
	if !result.StdoutTrimmed || !result.StderrTrimmed {
		t.Fatalf("expected stdout/stderr truncation flags, got stdout=%v stderr=%v", result.StdoutTrimmed, result.StderrTrimmed)
	}
	if len(result.Stdout) != 16 || len(result.Stderr) != 16 {
		t.Fatalf("expected bounded stdout/stderr length 16, got %d/%d", len(result.Stdout), len(result.Stderr))
	}
}

func TestExternalPDFRemediationRunnerRejectsOversizedOutput(t *testing.T) {
	script := createExecutableScript(t, `#!/bin/sh
set -eu
out="$2"
: > "$out"
i=0
while [ "$i" -lt 32 ]; do
	printf 'X' >> "$out"
	i=$((i+1))
done
`)
	template := PDFRemediationCommandTemplate{
		Bin:         script,
		Args:        []string{"{in}", "{out}"},
		Timeout:     10 * time.Second,
		MaxPDFBytes: 8,
		MaxLogBytes: 64,
	}
	runner, err := NewExternalPDFRemediationRunner(template, []string{filepath.Base(script)})
	if err != nil {
		t.Fatalf("NewExternalPDFRemediationRunner: %v", err)
	}

	_, err = runner.Run(context.Background(), PDFRemediationRunInput{SourcePDF: GenerateDeterministicPDF(1)})
	if err == nil {
		t.Fatal("expected max_pdf_bytes enforcement error")
	}
	if !strings.Contains(err.Error(), "exceeds max_pdf_bytes") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func createExecutableScript(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "remediate-script.sh")
	if err := os.WriteFile(path, []byte(content), 0o755); err != nil {
		t.Fatalf("write script: %v", err)
	}
	return path
}

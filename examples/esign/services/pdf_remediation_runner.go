package services

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const (
	defaultPDFRemediationTimeout  = 15 * time.Second
	defaultPDFRemediationMaxPDF   = int64(100 * 1024 * 1024)
	defaultPDFRemediationMaxLog   = 256 * 1024
	pdfRemediationTokenInputPath  = "{in}"
	pdfRemediationTokenOutputPath = "{out}"
)

var remediationArgTokenPattern = regexp.MustCompile(`\{[^{}]+\}`)

// PDFRemediationCommandTemplate defines a safe external conversion command template.
type PDFRemediationCommandTemplate struct {
	Bin         string
	Args        []string
	Timeout     time.Duration
	MaxPDFBytes int64
	MaxLogBytes int
}

// Validate checks command safety bounds and executable allowlist policy.
func (t PDFRemediationCommandTemplate) Validate(allowlist []string) error {
	bin := strings.TrimSpace(t.Bin)
	if bin == "" {
		return fmt.Errorf("pdf remediation command bin is required")
	}
	if len(t.Args) == 0 {
		return fmt.Errorf("pdf remediation command args are required")
	}
	if t.Timeout <= 0 {
		return fmt.Errorf("pdf remediation command timeout must be > 0")
	}
	if t.MaxPDFBytes <= 0 {
		return fmt.Errorf("pdf remediation command max_pdf_bytes must be > 0")
	}
	if t.MaxLogBytes <= 0 {
		return fmt.Errorf("pdf remediation command max_log_bytes must be > 0")
	}
	if !isAllowedRemediationExecutable(bin, allowlist) {
		return fmt.Errorf("pdf remediation command bin %q is not allowlisted", bin)
	}
	if _, err := exec.LookPath(bin); err != nil {
		return fmt.Errorf("pdf remediation command bin %q is unavailable: %w", bin, err)
	}
	if _, err := interpolateRemediationArgs(t.Args, "input.pdf", "output.pdf"); err != nil {
		return err
	}
	return nil
}

// Normalize returns a template with stable default bounds applied.
func (t PDFRemediationCommandTemplate) Normalize() PDFRemediationCommandTemplate {
	t.Bin = strings.TrimSpace(t.Bin)
	t.Args = append([]string{}, t.Args...)
	if t.Timeout <= 0 {
		t.Timeout = defaultPDFRemediationTimeout
	}
	if t.MaxPDFBytes <= 0 {
		t.MaxPDFBytes = defaultPDFRemediationMaxPDF
	}
	if t.MaxLogBytes <= 0 {
		t.MaxLogBytes = defaultPDFRemediationMaxLog
	}
	return t
}

func isAllowedRemediationExecutable(bin string, allowlist []string) bool {
	binID := remediationExecutableID(bin)
	if binID == "" {
		return false
	}
	for _, raw := range allowlist {
		if remediationExecutableID(raw) == binID {
			return true
		}
	}
	return false
}

func remediationExecutableID(bin string) string {
	bin = strings.TrimSpace(bin)
	if bin == "" {
		return ""
	}
	return strings.ToLower(filepath.Base(bin))
}

// PDFRemediationRunInput contains source bytes for one conversion attempt.
type PDFRemediationRunInput struct {
	SourcePDF []byte
}

// PDFRemediationRunResult contains converted payload and bounded process logs.
type PDFRemediationRunResult struct {
	OutputPDF      []byte
	Stdout         string
	Stderr         string
	StdoutTrimmed  bool
	StderrTrimmed  bool
	CompletedAt    time.Time
	ExecutionDelay time.Duration
}

// PDFRemediationRunner runs external remediation safely using exec.CommandContext.
type PDFRemediationRunner interface {
	Run(ctx context.Context, input PDFRemediationRunInput) (PDFRemediationRunResult, error)
}

// ExternalPDFRemediationRunner executes a pre-validated command template without shell expansion.
type ExternalPDFRemediationRunner struct {
	template PDFRemediationCommandTemplate
}

// NewExternalPDFRemediationRunner validates and constructs the external runner.
func NewExternalPDFRemediationRunner(template PDFRemediationCommandTemplate, allowlist []string) (*ExternalPDFRemediationRunner, error) {
	template = template.Normalize()
	if err := template.Validate(allowlist); err != nil {
		return nil, err
	}
	return &ExternalPDFRemediationRunner{template: template}, nil
}

func (r *ExternalPDFRemediationRunner) Run(ctx context.Context, input PDFRemediationRunInput) (PDFRemediationRunResult, error) {
	if r == nil {
		return PDFRemediationRunResult{}, fmt.Errorf("pdf remediation runner is not configured")
	}
	source := append([]byte{}, input.SourcePDF...)
	if len(source) == 0 {
		return PDFRemediationRunResult{}, fmt.Errorf("pdf remediation source payload is required")
	}

	tempDir, err := os.MkdirTemp("", "esign-pdf-remediate-*")
	if err != nil {
		return PDFRemediationRunResult{}, fmt.Errorf("create remediation temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.pdf")
	outputPath := filepath.Join(tempDir, "output.pdf")
	if err := os.WriteFile(inputPath, source, 0o600); err != nil {
		return PDFRemediationRunResult{}, fmt.Errorf("write remediation input: %w", err)
	}

	args, err := interpolateRemediationArgs(r.template.Args, inputPath, outputPath)
	if err != nil {
		return PDFRemediationRunResult{}, err
	}

	timeout := r.template.Timeout
	opCtx := ctx
	cancel := func() {}
	if timeout > 0 {
		opCtx, cancel = context.WithTimeout(ctx, timeout)
	}
	defer cancel()

	stdout := newLimitedBuffer(r.template.MaxLogBytes)
	stderr := newLimitedBuffer(r.template.MaxLogBytes)
	startedAt := time.Now().UTC()
	cmd := exec.CommandContext(opCtx, r.template.Bin, args...)
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	if err := cmd.Run(); err != nil {
		if opCtx.Err() == context.DeadlineExceeded {
			return PDFRemediationRunResult{}, fmt.Errorf("pdf remediation command timed out after %s", timeout)
		}
		return PDFRemediationRunResult{}, fmt.Errorf("pdf remediation command failed: %w", err)
	}

	info, err := os.Stat(outputPath)
	if err != nil {
		return PDFRemediationRunResult{}, fmt.Errorf("stat remediation output: %w", err)
	}
	if info.Size() <= 0 {
		return PDFRemediationRunResult{}, fmt.Errorf("pdf remediation output is empty")
	}
	if info.Size() > r.template.MaxPDFBytes {
		return PDFRemediationRunResult{}, fmt.Errorf("pdf remediation output exceeds max_pdf_bytes")
	}
	payload, err := os.ReadFile(outputPath)
	if err != nil {
		return PDFRemediationRunResult{}, fmt.Errorf("read remediation output: %w", err)
	}

	return PDFRemediationRunResult{
		OutputPDF:      payload,
		Stdout:         stdout.String(),
		Stderr:         stderr.String(),
		StdoutTrimmed:  stdout.Truncated(),
		StderrTrimmed:  stderr.Truncated(),
		CompletedAt:    time.Now().UTC(),
		ExecutionDelay: time.Since(startedAt),
	}, nil
}

func interpolateRemediationArgs(args []string, inputPath, outputPath string) ([]string, error) {
	out := make([]string, 0, len(args))
	for _, raw := range args {
		value := strings.TrimSpace(raw)
		matches := remediationArgTokenPattern.FindAllString(value, -1)
		for _, token := range matches {
			switch token {
			case pdfRemediationTokenInputPath:
				value = strings.ReplaceAll(value, token, inputPath)
			case pdfRemediationTokenOutputPath:
				value = strings.ReplaceAll(value, token, outputPath)
			default:
				return nil, fmt.Errorf("pdf remediation command arg token %q is not allowed", token)
			}
		}
		if strings.ContainsAny(value, "{}") {
			return nil, fmt.Errorf("pdf remediation command arg %q contains unresolved token syntax", raw)
		}
		out = append(out, value)
	}
	return out, nil
}

type limitedBuffer struct {
	max       int
	truncated bool
	buffer    bytes.Buffer
}

func newLimitedBuffer(max int) *limitedBuffer {
	if max <= 0 {
		max = defaultPDFRemediationMaxLog
	}
	return &limitedBuffer{max: max}
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if b == nil {
		return len(p), nil
	}
	if b.max <= 0 {
		b.truncated = true
		return len(p), nil
	}
	remaining := b.max - b.buffer.Len()
	if remaining <= 0 {
		b.truncated = true
		return len(p), nil
	}
	if len(p) > remaining {
		_, _ = b.buffer.Write(p[:remaining])
		b.truncated = true
		return len(p), nil
	}
	_, _ = b.buffer.Write(p)
	return len(p), nil
}

func (b *limitedBuffer) String() string {
	if b == nil {
		return ""
	}
	return b.buffer.String()
}

func (b *limitedBuffer) Truncated() bool {
	return b != nil && b.truncated
}

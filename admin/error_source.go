package admin

import (
	"bufio"
	"go/build"
	"math"
	"path/filepath"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// SourceContext holds source code lines around an error location.
type SourceContext struct {
	File       string       `json:"file"`
	Line       int          `json:"line"`
	StartLine  int          `json:"start_line"`
	Lines      []SourceLine `json:"lines"`
	Function   string       `json:"function,omitempty"`
	Language   string       `json:"language,omitempty"`
	Snippet    string       `json:"snippet,omitempty"`
	RelPath    string       `json:"rel_path,omitempty"`
	IsAppCode  bool         `json:"is_app_code"`
	CanOpenIDE bool         `json:"can_open_ide"`
}

// SourceLine represents a single line of source code.
type SourceLine struct {
	Number    int    `json:"number"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error"`
	IsContext bool   `json:"is_context"`
}

// StackFrameInfo holds enriched stack frame data.
type StackFrameInfo struct {
	File       string         `json:"file"`
	Line       int            `json:"line"`
	Function   string         `json:"function"`
	Package    string         `json:"package,omitempty"`
	IsAppCode  bool           `json:"is_app_code"`
	IsExpanded bool           `json:"is_expanded"`
	Source     *SourceContext `json:"source,omitempty"`
	IDELink    string         `json:"ide_link,omitempty"`
}

// DevErrorContext holds all developer-friendly error context.
type DevErrorContext struct {
	ErrorMessage    string           `json:"error_message"`
	ErrorType       string           `json:"error_type,omitempty"`
	TextCode        string           `json:"text_code,omitempty"`
	Category        string           `json:"category,omitempty"`
	PrimarySource   *SourceContext   `json:"primary_source,omitempty"`
	StackFrames     []StackFrameInfo `json:"stack_frames,omitempty"`
	RequestInfo     *RequestInfo     `json:"request_info,omitempty"`
	EnvironmentInfo *EnvironmentInfo `json:"environment_info,omitempty"`
	Metadata        map[string]any   `json:"metadata,omitempty"`
}

// RequestInfo holds HTTP request details.
type RequestInfo struct {
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	FullURL     string            `json:"full_url,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	QueryParams map[string]string `json:"query_params,omitempty"`
	FormData    map[string]string `json:"form_data,omitempty"`
	Body        string            `json:"body,omitempty"`
	ContentType string            `json:"content_type,omitempty"`
	RemoteIP    string            `json:"remote_ip,omitempty"`
	UserAgent   string            `json:"user_agent,omitempty"`
}

// EnvironmentInfo holds runtime environment details.
type EnvironmentInfo struct {
	GoVersion   string                      `json:"go_version,omitempty"`
	AppVersion  string                      `json:"app_version,omitempty"`
	Environment string                      `json:"environment,omitempty"`
	Debug       bool                        `json:"debug"`
	ConfigVars  map[string]string           `json:"config_vars,omitempty"`
	Deployment  *DeploymentIdentitySnapshot `json:"deployment,omitempty"`
}

// ExtractSourceContext reads source code around the given file and line.
// contextLines specifies how many lines to show before and after the error line.
func ExtractSourceContext(filePath string, errorLine, contextLines int) *SourceContext {
	return extractSourceContext(filePath, errorLine, contextLines, ErrorConfig{})
}

func extractSourceContext(filePath string, errorLine, contextLines int, cfg ErrorConfig) *SourceContext {
	if filePath == "" || errorLine <= 0 {
		return nil
	}

	file, err := primitives.OpenTrustedFile(filePath)
	if err != nil {
		return nil
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			return
		}
	}()

	startLine := max(errorLine-contextLines, 1)
	endLine := errorLine + contextLines

	var lines []SourceLine
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		if lineNum < startLine {
			continue
		}
		if lineNum > endLine {
			break
		}

		lines = append(lines, SourceLine{
			Number:    lineNum,
			Content:   scanner.Text(),
			IsError:   lineNum == errorLine,
			IsContext: lineNum != errorLine,
		})
	}

	if len(lines) == 0 {
		return nil
	}

	return &SourceContext{
		File:       filePath,
		Line:       errorLine,
		StartLine:  startLine,
		Lines:      lines,
		Language:   detectLanguage(filePath),
		RelPath:    extractRelativePath(filePath),
		IsAppCode:  classifyStackFrame(filePath, "", cfg).SourceEligible,
		CanOpenIDE: true,
	}
}

// EnrichStackFrames adds source context to stack frames.
func EnrichStackFrames(frames []StackFrameInfo, contextLines int, maxFrames int) []StackFrameInfo {
	return EnrichStackFramesWithConfig(frames, ErrorConfig{
		SourceContextLines: contextLines,
		MaxStackFrames:     maxFrames,
	})
}

func EnrichStackFramesWithConfig(frames []StackFrameInfo, cfg ErrorConfig) []StackFrameInfo {
	if len(frames) == 0 {
		return frames
	}
	if cfg.SourceContextLines <= 0 {
		cfg.SourceContextLines = 7
	}
	if cfg.MaxStackFrames <= 0 {
		cfg.MaxStackFrames = 20
	}

	enriched := make([]StackFrameInfo, 0, len(frames))
	appFrameCount := 0

	for i, frame := range frames {
		if cfg.MaxStackFrames > 0 && i >= cfg.MaxStackFrames {
			break
		}

		classification := classifyStackFrame(frame.File, frame.Function, cfg)
		frame.IsAppCode = classification.SourceEligible
		frame.Package = extractPackage(frame.Function)
		frame.IDELink = buildIDELink(frame.File, frame.Line)

		// Only extract source for first few app frames to limit I/O
		if frame.IsAppCode && appFrameCount < 3 {
			frame.Source = extractSourceContext(frame.File, frame.Line, cfg.SourceContextLines, cfg)
			frame.IsExpanded = appFrameCount == 0
			appFrameCount++
		}

		enriched = append(enriched, frame)
	}

	return enriched
}

func selectPrimarySource(frames []StackFrameInfo, cfg ErrorConfig) *SourceContext {
	var selected *StackFrameInfo
	selectedRank := math.MaxInt
	for i := range frames {
		frame := &frames[i]
		classification := classifyStackFrame(frame.File, frame.Function, cfg)
		if !classification.PrimaryEligible {
			continue
		}
		if classification.Rank < selectedRank {
			selected = frame
			selectedRank = classification.Rank
		}
	}
	if selected == nil {
		for i := range frames {
			frame := &frames[i]
			if isInternalLocation(frame.File, frame.Function) {
				continue
			}
			selected = frame
			break
		}
	}
	if selected == nil && len(frames) > 0 {
		selected = &frames[0]
	}
	if selected == nil {
		return nil
	}
	if selected.Source != nil {
		return selected.Source
	}
	return extractSourceContext(selected.File, selected.Line, cfg.SourceContextLines, cfg)
}

// detectLanguage determines the programming language from file extension.
func detectLanguage(filePath string) string {
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".go":
		return "go"
	case ".html", ".htm":
		return "html"
	case ".js":
		return "javascript"
	case ".ts":
		return "typescript"
	case ".css":
		return "css"
	case ".json":
		return "json"
	case ".yaml", ".yml":
		return "yaml"
	case ".sql":
		return "sql"
	case ".sh", ".bash":
		return "bash"
	default:
		return "text"
	}
}

type stackFrameClassification struct {
	Rank            int
	SourceEligible  bool
	PrimaryEligible bool
}

func classifyStackFrame(filePath, fn string, cfg ErrorConfig) stackFrameClassification {
	const (
		rankAppRoot       = 100
		rankHost          = 200
		rankRouteBoundary = 300
		rankGoAdmin       = 400
		rankLibrary       = 900
	)
	if filePath == "" {
		return stackFrameClassification{Rank: rankLibrary}
	}
	if isInternalLocation(filePath, fn) {
		return stackFrameClassification{Rank: rankLibrary, SourceEligible: false, PrimaryEligible: false}
	}
	if isLibraryPath(filePath, fn) {
		return stackFrameClassification{Rank: rankLibrary, SourceEligible: false, PrimaryEligible: false}
	}
	for idx, root := range cfg.AppRoots {
		if pathWithinRoot(filePath, root) {
			return stackFrameClassification{Rank: rankAppRoot + idx, SourceEligible: true, PrimaryEligible: true}
		}
	}
	if isGoAdminRouteBoundary(filePath) {
		return stackFrameClassification{Rank: rankRouteBoundary, SourceEligible: true, PrimaryEligible: true}
	}
	if isGoAdminPath(filePath) {
		return stackFrameClassification{Rank: rankGoAdmin, SourceEligible: true, PrimaryEligible: true}
	}
	return stackFrameClassification{Rank: rankHost, SourceEligible: true, PrimaryEligible: true}
}

func isLibraryPath(filePath, fn string) bool {
	if strings.HasPrefix(fn, "runtime.") {
		return true
	}
	if strings.HasPrefix(fn, "testing.") {
		return true
	}
	if isStandardLibrarySourcePath(filePath) {
		return true
	}
	return containsAny(filePath,
		"/go/pkg/mod/",
		"/vendor/",
		"@v",
		"/runtime/",
		"/libexec/src/",
		"/go-errors/",
		"/go-router/",
		"/fiber/",
		"/fasthttp/",
	)
}

func isStandardLibrarySourcePath(filePath string) bool {
	cleanFile := filepath.ToSlash(filepath.Clean(filePath))
	gorootSrc := filepath.ToSlash(filepath.Join(build.Default.GOROOT, "src"))
	if slashPathWithinRoot(cleanFile, gorootSrc) {
		return true
	}

	for _, marker := range []string{
		"/usr/local/go/src/",
		"/usr/lib/go/src/",
		"/usr/lib/golang/src/",
		"/opt/go/src/",
	} {
		if _, after, ok := strings.Cut(cleanFile, marker); ok && looksStandardLibraryImportPath(after) {
			return true
		}
	}
	return false
}

func slashPathWithinRoot(cleanFile, cleanRoot string) bool {
	cleanFile = strings.TrimRight(cleanFile, "/")
	cleanRoot = strings.TrimRight(cleanRoot, "/")
	if cleanFile == "" || cleanRoot == "" {
		return false
	}
	return cleanFile == cleanRoot || strings.HasPrefix(cleanFile, cleanRoot+"/")
}

func looksStandardLibraryImportPath(importPath string) bool {
	importPath = strings.Trim(strings.TrimSpace(importPath), "/")
	if importPath == "" {
		return false
	}
	first, _, _ := strings.Cut(importPath, "/")
	return first != "" && !strings.Contains(first, ".")
}

func isGoAdminRouteBoundary(filePath string) bool {
	return hasSuffixAny(filePath,
		"/quickstart/content_entry_routes_crud.go",
		"/quickstart/content_entry_routes_query_detail.go",
		"/admin/internal/boot/step_panels.go",
	)
}

func isGoAdminPath(filePath string) bool {
	return strings.Contains(filePath, "github.com/goliatone/go-admin/") ||
		strings.Contains(filePath, "/go-admin/")
}

func pathWithinRoot(filePath, root string) bool {
	root = strings.TrimSpace(root)
	if root == "" {
		return false
	}
	cleanFile := filepath.Clean(filePath)
	cleanRoot := filepath.Clean(root)
	if cleanFile == cleanRoot {
		return true
	}
	prefix := cleanRoot
	if !strings.HasSuffix(prefix, string(filepath.Separator)) {
		prefix += string(filepath.Separator)
	}
	return strings.HasPrefix(cleanFile, prefix)
}

func containsAny(value string, parts ...string) bool {
	for _, part := range parts {
		if strings.Contains(value, part) {
			return true
		}
	}
	return false
}

// extractRelativePath attempts to extract a clean relative path.
func extractRelativePath(filePath string) string {
	// Try to find common project markers
	markers := []string{"/src/github.com/", "/src/", "/go/src/"}
	for _, marker := range markers {
		if _, after, ok := strings.Cut(filePath, marker); ok {
			return after
		}
	}

	// Check for go module path pattern
	if _, after, ok := strings.Cut(filePath, "/go/pkg/mod/"); ok {
		return after
	}

	// Return basename with parent directory
	dir := filepath.Dir(filePath)
	parent := filepath.Base(dir)
	base := filepath.Base(filePath)
	return parent + "/" + base
}

// extractPackage extracts the package name from a function signature.
func extractPackage(fn string) string {
	if fn == "" {
		return ""
	}

	// Remove function name and keep package path
	if idx := strings.LastIndex(fn, "."); idx != -1 {
		pkg := fn[:idx]
		// Remove receiver if present (e.g., (*Type).Method)
		if before, _, ok := strings.Cut(pkg, "("); ok {
			if dotIdx := strings.LastIndex(before, "."); dotIdx != -1 {
				return pkg[:dotIdx]
			}
		}
		return pkg
	}
	return fn
}

// buildIDELink creates a VS Code compatible file link.
func buildIDELink(filePath string, line int) string {
	if filePath == "" {
		return ""
	}
	return "vscode://file" + filePath + ":" + itoa(line)
}

// itoa converts int to string without importing strconv.
func itoa(i int) string {
	if i == 0 {
		return "0"
	}

	neg := i < 0
	if neg {
		i = -i
	}

	var buf [20]byte
	pos := len(buf)

	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}

	if neg {
		pos--
		buf[pos] = '-'
	}

	return string(buf[pos:])
}

package admin

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
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
	ErrorMessage   string            `json:"error_message"`
	ErrorType      string            `json:"error_type,omitempty"`
	TextCode       string            `json:"text_code,omitempty"`
	Category       string            `json:"category,omitempty"`
	PrimarySource  *SourceContext    `json:"primary_source,omitempty"`
	StackFrames    []StackFrameInfo  `json:"stack_frames,omitempty"`
	RequestInfo    *RequestInfo      `json:"request_info,omitempty"`
	EnvironmentInfo *EnvironmentInfo `json:"environment_info,omitempty"`
	Metadata       map[string]any    `json:"metadata,omitempty"`
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
	GoVersion   string            `json:"go_version,omitempty"`
	AppVersion  string            `json:"app_version,omitempty"`
	Environment string            `json:"environment,omitempty"`
	Debug       bool              `json:"debug"`
	ConfigVars  map[string]string `json:"config_vars,omitempty"`
}

// ExtractSourceContext reads source code around the given file and line.
// contextLines specifies how many lines to show before and after the error line.
func ExtractSourceContext(filePath string, errorLine, contextLines int) *SourceContext {
	if filePath == "" || errorLine <= 0 {
		return nil
	}

	file, err := os.Open(filePath)
	if err != nil {
		return nil
	}
	defer file.Close()

	startLine := errorLine - contextLines
	if startLine < 1 {
		startLine = 1
	}
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
		IsAppCode:  isApplicationCode(filePath),
		CanOpenIDE: true,
	}
}

// EnrichStackFrames adds source context to stack frames.
func EnrichStackFrames(frames []StackFrameInfo, contextLines int, maxFrames int) []StackFrameInfo {
	if len(frames) == 0 {
		return frames
	}

	enriched := make([]StackFrameInfo, 0, len(frames))
	appFrameCount := 0

	for i, frame := range frames {
		if maxFrames > 0 && i >= maxFrames {
			break
		}

		frame.IsAppCode = isApplicationCode(frame.File)
		frame.Package = extractPackage(frame.Function)
		frame.IDELink = buildIDELink(frame.File, frame.Line)

		// Only extract source for first few app frames to limit I/O
		if frame.IsAppCode && appFrameCount < 3 {
			frame.Source = ExtractSourceContext(frame.File, frame.Line, contextLines)
			frame.IsExpanded = appFrameCount == 0
			appFrameCount++
		}

		enriched = append(enriched, frame)
	}

	return enriched
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

// isApplicationCode determines if a file path is application code vs framework/library.
func isApplicationCode(filePath string) bool {
	if filePath == "" {
		return false
	}

	// Framework/library indicators
	frameworkIndicators := []string{
		"/go/pkg/mod/",
		"/vendor/",
		"@v",
		"/runtime/",
		"/go-errors/",
		"/go-router/",
		"/fiber/",
		"/fasthttp/",
	}

	for _, indicator := range frameworkIndicators {
		if strings.Contains(filePath, indicator) {
			return false
		}
	}

	// Application code indicators
	appIndicators := []string{
		"/src/",
		"/admin/",
		"/examples/",
		"/cmd/",
		"/internal/",
		"/pkg/",
	}

	for _, indicator := range appIndicators {
		if strings.Contains(filePath, indicator) {
			return true
		}
	}

	return true
}

// extractRelativePath attempts to extract a clean relative path.
func extractRelativePath(filePath string) string {
	// Try to find common project markers
	markers := []string{"/src/github.com/", "/src/", "/go/src/"}
	for _, marker := range markers {
		if idx := strings.Index(filePath, marker); idx != -1 {
			return filePath[idx+len(marker):]
		}
	}

	// Check for go module path pattern
	if idx := strings.Index(filePath, "/go/pkg/mod/"); idx != -1 {
		return filePath[idx+12:]
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
		if parenIdx := strings.Index(pkg, "("); parenIdx != -1 {
			if dotIdx := strings.LastIndex(pkg[:parenIdx], "."); dotIdx != -1 {
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

package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/format"
	"go/token"
	"go/types"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"golang.org/x/tools/go/packages"
)

const (
	defaultCorePath = "github.com/goliatone/go-admin/admin"
	coreAlias       = "core"
)

type importRegistry struct {
	aliasToPath map[string]string
	pathToAlias map[string]string
}

func newImportRegistry() *importRegistry {
	return &importRegistry{
		aliasToPath: map[string]string{},
		pathToAlias: map[string]string{},
	}
}

func (r *importRegistry) register(path, preferred string) string {
	if alias, ok := r.pathToAlias[path]; ok {
		return alias
	}
	alias := sanitizeIdent(preferred)
	if alias == "" {
		alias = sanitizeIdent(pathBase(path))
	}
	if alias == "" {
		alias = "pkg"
	}
	base := alias
	for i := 2; ; i++ {
		existingPath, inUse := r.aliasToPath[alias]
		if !inUse {
			break
		}
		if existingPath == path {
			break
		}
		alias = fmt.Sprintf("%s%d", base, i)
	}
	r.aliasToPath[alias] = path
	r.pathToAlias[path] = alias
	return alias
}

func (r *importRegistry) registerFixed(path, alias string) {
	r.aliasToPath[alias] = path
	r.pathToAlias[path] = alias
}

func (r *importRegistry) list() []importSpec {
	out := make([]importSpec, 0, len(r.pathToAlias))
	for path, alias := range r.pathToAlias {
		out = append(out, importSpec{alias: alias, path: path})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].path == out[j].path {
			return out[i].alias < out[j].alias
		}
		return out[i].path < out[j].path
	})
	return out
}

type importSpec struct {
	alias string
	path  string
}

func main() {
	var (
		corePath  string
		output    string
		verify    bool
		printInfo bool
	)

	flag.StringVar(&corePath, "core", defaultCorePath, "import path for the core admin package")
	flag.StringVar(&output, "out", "pkg/admin/facade.go", "output path for generated facade")
	flag.BoolVar(&verify, "verify", false, "verify output is up to date instead of writing")
	flag.BoolVar(&printInfo, "audit", false, "print export audit summary")
	flag.Parse()

	generated, summary, err := buildFacade(corePath)
	if err != nil {
		fatal(err)
	}

	if printInfo {
		fmt.Fprintf(os.Stderr, "facadegen audit: const=%d var=%d type=%d func=%d manual=%d\n", summary.constCount, summary.varCount, summary.typeCount, summary.funcCount, summary.manualCount)
	}

	outputPath := output
	if !filepath.IsAbs(outputPath) {
		outputPath = filepath.Clean(outputPath)
	}

	existing, readErr := os.ReadFile(outputPath)
	if readErr != nil && !os.IsNotExist(readErr) {
		fatal(readErr)
	}

	if verify {
		if !bytes.Equal(existing, generated) {
			fatal(fmt.Errorf("generated facade is stale: run `go generate ./pkg/admin` to regenerate %s", output))
		}
		return
	}

	if bytes.Equal(existing, generated) {
		return
	}

	if err := os.WriteFile(outputPath, generated, 0o644); err != nil {
		fatal(err)
	}
}

type facadeSummary struct {
	constCount  int
	varCount    int
	typeCount   int
	funcCount   int
	manualCount int
}

func buildFacade(corePath string) ([]byte, facadeSummary, error) {
	cfg := &packages.Config{
		Mode: packages.NeedTypes | packages.NeedTypesSizes | packages.NeedName,
	}
	pkgs, err := packages.Load(cfg, corePath)
	if err != nil {
		return nil, facadeSummary{}, err
	}
	if packages.PrintErrors(pkgs) > 0 {
		return nil, facadeSummary{}, fmt.Errorf("failed loading package %s", corePath)
	}
	if len(pkgs) != 1 {
		return nil, facadeSummary{}, fmt.Errorf("expected 1 package for %s, got %d", corePath, len(pkgs))
	}

	pkg := pkgs[0]
	scope := pkg.Types.Scope()
	names := scope.Names()

	imports := newImportRegistry()
	imports.registerFixed(corePath, coreAlias)

	renderType := func(t types.Type) string {
		qualifier := func(other *types.Package) string {
			if other == nil {
				return ""
			}
			if other.Path() == corePath {
				return ""
			}
			return imports.register(other.Path(), other.Name())
		}
		return types.TypeString(t, qualifier)
	}

	constNames := make([]string, 0)
	varNames := make([]string, 0)
	typeDecls := make([]string, 0)
	funcDecls := make([]string, 0)
	hasIntPtr := false

	for _, name := range names {
		if !token.IsExported(name) {
			continue
		}
		obj := scope.Lookup(name)
		switch typed := obj.(type) {
		case *types.Const:
			constNames = append(constNames, name)
		case *types.Var:
			varNames = append(varNames, name)
		case *types.TypeName:
			tparamsDecl, tparamsUse := renderTypeParams(typeParamsOfTypeName(typed), renderType)
			typeDecls = append(typeDecls, fmt.Sprintf("\t%s%s = %s.%s%s", name, tparamsDecl, coreAlias, name, tparamsUse))
		case *types.Func:
			if name == "IntPtr" {
				hasIntPtr = true
			}
			sig, ok := typed.Type().(*types.Signature)
			if !ok {
				return nil, facadeSummary{}, fmt.Errorf("expected function signature for %s", name)
			}
			decl, err := renderFuncDecl(name, sig, renderType)
			if err != nil {
				return nil, facadeSummary{}, err
			}
			funcDecls = append(funcDecls, decl)
		}
	}

	sort.Strings(constNames)
	sort.Strings(varNames)
	sort.Strings(typeDecls)
	sort.Strings(funcDecls)

	manualDecls := make([]string, 0, 1)
	if !hasIntPtr {
		manualDecls = append(manualDecls, "func IntPtr(v int) *int {\n\treturn &v\n}")
	}

	var buf strings.Builder
	buf.WriteString("// Code generated by go run ../../tools/facadegen; DO NOT EDIT.\n")
	buf.WriteString("// Source of truth: exported API surface from github.com/goliatone/go-admin/admin.\n")
	buf.WriteString("\n")
	buf.WriteString("package admin\n")
	buf.WriteString("\n")

	importSpecs := imports.list()
	if len(importSpecs) > 0 {
		buf.WriteString("import (\n")
		for _, spec := range importSpecs {
			if spec.alias == "" || spec.alias == pathBase(spec.path) {
				buf.WriteString(fmt.Sprintf("\t\"%s\"\n", spec.path))
				continue
			}
			buf.WriteString(fmt.Sprintf("\t%s \"%s\"\n", spec.alias, spec.path))
		}
		buf.WriteString(")\n\n")
	}

	if len(constNames) > 0 {
		buf.WriteString("const (\n")
		for _, name := range constNames {
			buf.WriteString(fmt.Sprintf("\t%s = %s.%s\n", name, coreAlias, name))
		}
		buf.WriteString(")\n\n")
	}

	if len(varNames) > 0 {
		buf.WriteString("var (\n")
		for _, name := range varNames {
			buf.WriteString(fmt.Sprintf("\t%s = %s.%s\n", name, coreAlias, name))
		}
		buf.WriteString(")\n\n")
	}

	if len(typeDecls) > 0 {
		buf.WriteString("type (\n")
		for _, decl := range typeDecls {
			buf.WriteString(decl)
			buf.WriteByte('\n')
		}
		buf.WriteString(")\n\n")
	}

	for i, decl := range funcDecls {
		buf.WriteString(decl)
		buf.WriteByte('\n')
		if i != len(funcDecls)-1 {
			buf.WriteByte('\n')
		}
	}

	if len(manualDecls) > 0 {
		if len(funcDecls) > 0 {
			buf.WriteString("\n\n")
		}
		buf.WriteString("// ---- MANUAL COMPATIBILITY SECTION (MINIMAL) ----\n")
		buf.WriteString("// IntPtr is retained for backward compatibility with existing pkg/admin consumers.\n")
		for i, decl := range manualDecls {
			buf.WriteString(decl)
			if i != len(manualDecls)-1 {
				buf.WriteString("\n\n")
			}
		}
		buf.WriteString("\n// ---- END MANUAL COMPATIBILITY SECTION ----\n")
	}

	formatted, err := format.Source([]byte(buf.String()))
	if err != nil {
		return nil, facadeSummary{}, fmt.Errorf("format generated facade: %w", err)
	}

	summary := facadeSummary{
		constCount:  len(constNames),
		varCount:    len(varNames),
		typeCount:   len(typeDecls),
		funcCount:   len(funcDecls),
		manualCount: len(manualDecls),
	}
	return formatted, summary, nil
}

func renderFuncDecl(name string, sig *types.Signature, renderType func(types.Type) string) (string, error) {
	tparamsDecl, tparamsUse := renderTypeParams(sig.TypeParams(), renderType)
	paramDecl, callArgs := renderParamDecl(sig, renderType)
	resultDecl := renderResultDecl(sig, renderType)

	call := fmt.Sprintf("%s.%s%s(%s)", coreAlias, name, tparamsUse, callArgs)
	var body string
	if sig.Results().Len() > 0 {
		body = "\treturn " + call
	} else {
		body = "\t" + call
	}

	return fmt.Sprintf("func %s%s(%s)%s {\n%s\n}", name, tparamsDecl, paramDecl, resultDecl, body), nil
}

func renderParamDecl(sig *types.Signature, renderType func(types.Type) string) (string, string) {
	params := sig.Params()
	if params == nil || params.Len() == 0 {
		return "", ""
	}

	declParts := make([]string, 0, params.Len())
	callParts := make([]string, 0, params.Len())
	used := map[string]int{}

	for i := range params.Len() {
		param := params.At(i)
		name := sanitizeParamName(param.Name(), i)
		if count := used[name]; count > 0 {
			name = fmt.Sprintf("%s%d", name, count+1)
		}
		used[name]++

		typeText := renderType(param.Type())
		callName := name

		if sig.Variadic() && i == params.Len()-1 {
			if slice, ok := param.Type().(*types.Slice); ok {
				typeText = "..." + renderType(slice.Elem())
				callName += "..."
			}
		}

		declParts = append(declParts, fmt.Sprintf("%s %s", name, typeText))
		callParts = append(callParts, callName)
	}

	return strings.Join(declParts, ", "), strings.Join(callParts, ", ")
}

func renderResultDecl(sig *types.Signature, renderType func(types.Type) string) string {
	results := sig.Results()
	if results == nil || results.Len() == 0 {
		return ""
	}
	parts := make([]string, 0, results.Len())
	for i := range results.Len() {
		parts = append(parts, renderType(results.At(i).Type()))
	}
	if len(parts) == 1 {
		return " " + parts[0]
	}
	return " (" + strings.Join(parts, ", ") + ")"
}

func renderTypeParams(tparams *types.TypeParamList, renderType func(types.Type) string) (string, string) {
	if tparams == nil || tparams.Len() == 0 {
		return "", ""
	}
	declParts := make([]string, 0, tparams.Len())
	useParts := make([]string, 0, tparams.Len())
	used := map[string]int{}
	for i := range tparams.Len() {
		tp := tparams.At(i)
		name := tp.Obj().Name()
		if name == "" || name == "_" {
			name = fmt.Sprintf("T%d", i+1)
		}
		if count := used[name]; count > 0 {
			name = fmt.Sprintf("%s%d", name, count+1)
		}
		used[name]++

		constraint := strings.TrimSpace(renderType(tp.Constraint()))
		if constraint == "" {
			constraint = "any"
		}
		declParts = append(declParts, fmt.Sprintf("%s %s", name, constraint))
		useParts = append(useParts, name)
	}
	return "[" + strings.Join(declParts, ", ") + "]", "[" + strings.Join(useParts, ", ") + "]"
}

func typeParamsOfTypeName(obj *types.TypeName) *types.TypeParamList {
	switch named := obj.Type().(type) {
	case *types.Named:
		return named.TypeParams()
	case *types.Alias:
		return named.TypeParams()
	default:
		return nil
	}
}

func sanitizeParamName(name string, index int) string {
	name = strings.TrimSpace(name)
	if name == "" || name == "_" {
		return fmt.Sprintf("arg%d", index+1)
	}
	if token.Lookup(name).IsKeyword() {
		return fmt.Sprintf("%sArg", name)
	}
	return name
}

func sanitizeIdent(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	var b strings.Builder
	for i, r := range s {
		if r == '_' || (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (i > 0 && r >= '0' && r <= '9') {
			b.WriteRune(r)
			continue
		}
		if i == 0 && r >= '0' && r <= '9' {
			b.WriteByte('p')
			b.WriteRune(r)
			continue
		}
		b.WriteByte('_')
	}
	out := b.String()
	if out == "" {
		return ""
	}
	if token.Lookup(out).IsKeyword() {
		out += "Pkg"
	}
	if out == coreAlias {
		out = out + "Pkg"
	}
	return out
}

func pathBase(path string) string {
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return ""
	}
	parts := strings.Split(trimmed, "/")
	return parts[len(parts)-1]
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "facadegen:", err)
	os.Exit(1)
}

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

	if err := os.WriteFile(outputPath, generated, 0o600); err != nil {
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
	pkg, err := loadFacadePackage(corePath)
	if err != nil {
		return nil, facadeSummary{}, err
	}
	builder := newFacadeBuilder(corePath)
	if collectErr := builder.collect(pkg.Types.Scope()); collectErr != nil {
		return nil, facadeSummary{}, collectErr
	}
	builder.sort()
	manualDecls := builder.manualDecls()

	source := renderFacadeSource(builder, manualDecls)
	formatted, err := format.Source(source)
	if err != nil {
		return nil, facadeSummary{}, fmt.Errorf("format generated facade: %w", err)
	}

	return formatted, facadeSummary{
		constCount:  len(builder.constNames),
		varCount:    len(builder.varNames),
		typeCount:   len(builder.typeDecls),
		funcCount:   len(builder.funcDecls),
		manualCount: len(manualDecls),
	}, nil
}

func loadFacadePackage(corePath string) (*packages.Package, error) {
	cfg := &packages.Config{
		Mode: packages.NeedTypes | packages.NeedTypesSizes | packages.NeedName,
	}
	pkgs, err := packages.Load(cfg, corePath)
	if err != nil {
		return nil, err
	}
	if packages.PrintErrors(pkgs) > 0 {
		return nil, fmt.Errorf("failed loading package %s", corePath)
	}
	if len(pkgs) != 1 {
		return nil, fmt.Errorf("expected 1 package for %s, got %d", corePath, len(pkgs))
	}
	return pkgs[0], nil
}

type facadeBuilder struct {
	corePath   string
	imports    *importRegistry
	renderType func(types.Type) string

	constNames []string
	varNames   []string
	typeDecls  []string
	funcDecls  []string
	hasIntPtr  bool
}

func newFacadeBuilder(corePath string) *facadeBuilder {
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
	return &facadeBuilder{
		corePath:   corePath,
		imports:    imports,
		renderType: renderType,
	}
}

func (b *facadeBuilder) collect(scope *types.Scope) error {
	for _, name := range scope.Names() {
		if !token.IsExported(name) {
			continue
		}
		if err := b.collectObject(name, scope.Lookup(name)); err != nil {
			return err
		}
	}
	return nil
}

func (b *facadeBuilder) collectObject(name string, obj types.Object) error {
	switch typed := obj.(type) {
	case *types.Const:
		b.constNames = append(b.constNames, name)
	case *types.Var:
		b.varNames = append(b.varNames, name)
	case *types.TypeName:
		tparamsDecl, tparamsUse := renderTypeParams(typeParamsOfTypeName(typed), b.renderType)
		b.typeDecls = append(b.typeDecls, fmt.Sprintf("\t%s%s = %s.%s%s", name, tparamsDecl, coreAlias, name, tparamsUse))
	case *types.Func:
		return b.collectFunc(name, typed)
	}
	return nil
}

func (b *facadeBuilder) collectFunc(name string, fn *types.Func) error {
	if name == "IntPtr" {
		b.hasIntPtr = true
	}
	sig, ok := fn.Type().(*types.Signature)
	if !ok {
		return fmt.Errorf("expected function signature for %s", name)
	}
	if !isFacadeExportableSignature(sig, b.corePath) {
		return nil
	}
	decl, err := renderFuncDecl(name, sig, b.renderType)
	if err != nil {
		return err
	}
	b.funcDecls = append(b.funcDecls, decl)
	return nil
}

func (b *facadeBuilder) sort() {
	sort.Strings(b.constNames)
	sort.Strings(b.varNames)
	sort.Strings(b.typeDecls)
	sort.Strings(b.funcDecls)
}

func (b *facadeBuilder) manualDecls() []string {
	manualDecls := make([]string, 0, 1)
	if !b.hasIntPtr {
		manualDecls = append(manualDecls, "func IntPtr(v int) *int {\n\treturn &v\n}")
	}
	return manualDecls
}

func renderFacadeSource(builder *facadeBuilder, manualDecls []string) []byte {
	var buf strings.Builder
	buf.WriteString("// Code generated by go run ../../tools/facadegen; DO NOT EDIT.\n")
	buf.WriteString("// Source of truth: exported API surface from github.com/goliatone/go-admin/admin.\n")
	buf.WriteString("\n")
	buf.WriteString("package admin\n")
	buf.WriteString("\n")
	writeImportSection(&buf, builder.imports.list())
	writeAliasBlock(&buf, "const", builder.constNames, func(name string) string {
		return fmt.Sprintf("\t%s = %s.%s", name, coreAlias, name)
	})
	writeAliasBlock(&buf, "var", builder.varNames, func(name string) string {
		return fmt.Sprintf("\t%s = %s.%s", name, coreAlias, name)
	})
	writeAliasBlock(&buf, "type", builder.typeDecls, func(decl string) string {
		return decl
	})
	writeFuncDecls(&buf, builder.funcDecls)
	writeManualDecls(&buf, builder.funcDecls, manualDecls)
	return []byte(buf.String())
}

func writeImportSection(buf *strings.Builder, importSpecs []importSpec) {
	if len(importSpecs) > 0 {
		buf.WriteString("import (\n")
		for _, spec := range importSpecs {
			if spec.alias == "" || spec.alias == pathBase(spec.path) {
				fmt.Fprintf(buf, "\t\"%s\"\n", spec.path)
				continue
			}
			fmt.Fprintf(buf, "\t%s \"%s\"\n", spec.alias, spec.path)
		}
		buf.WriteString(")\n\n")
	}
}

func writeAliasBlock(buf *strings.Builder, keyword string, values []string, render func(string) string) {
	if len(values) == 0 {
		return
	}
	fmt.Fprintf(buf, "%s (\n", keyword)
	for _, value := range values {
		buf.WriteString(render(value))
		buf.WriteByte('\n')
	}
	buf.WriteString(")\n\n")
}

func writeFuncDecls(buf *strings.Builder, funcDecls []string) {
	for i, decl := range funcDecls {
		buf.WriteString(decl)
		buf.WriteByte('\n')
		if i != len(funcDecls)-1 {
			buf.WriteByte('\n')
		}
	}
}

func writeManualDecls(buf *strings.Builder, funcDecls []string, manualDecls []string) {
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
	for v := range results.Variables() {
		parts = append(parts, renderType(v.Type()))
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

func isFacadeExportableSignature(sig *types.Signature, corePath string) bool {
	if sig == nil {
		return true
	}
	seen := map[types.Type]bool{}
	return isFacadeExportableTuple(sig.Params(), corePath, seen) &&
		isFacadeExportableTuple(sig.Results(), corePath, seen) &&
		isFacadeExportableTypeParams(sig.TypeParams(), corePath, seen)
}

func isFacadeExportableTuple(tuple *types.Tuple, corePath string, seen map[types.Type]bool) bool {
	if tuple == nil {
		return true
	}
	for v := range tuple.Variables() {
		if !isFacadeExportableType(v.Type(), corePath, seen) {
			return false
		}
	}
	return true
}

func isFacadeExportableTypeParams(params *types.TypeParamList, corePath string, seen map[types.Type]bool) bool {
	if params == nil {
		return true
	}
	for tparam := range params.TypeParams() {
		if !isFacadeExportableType(tparam.Constraint(), corePath, seen) {
			return false
		}
	}
	return true
}

func isFacadeExportableType(t types.Type, corePath string, seen map[types.Type]bool) bool {
	if t == nil {
		return true
	}
	if seen[t] {
		return true
	}
	seen[t] = true

	switch typed := t.(type) {
	case *types.Alias, *types.Named:
		return isFacadeExportableNamedLike(typed, corePath, seen)
	case *types.Array, *types.Chan, *types.Pointer, *types.Slice:
		return isFacadeExportableElemType(typed, corePath, seen)
	case *types.Basic, *types.Signature:
		return isFacadeExportableDirectType(typed, corePath)
	case *types.Interface:
		return isFacadeExportableInterface(typed, corePath, seen)
	case *types.Map, *types.Struct, *types.Tuple, *types.Union:
		return isFacadeExportableCompositeType(typed, corePath, seen)
	case *types.TypeParam:
		return isFacadeExportableType(typed.Constraint(), corePath, seen)
	default:
		return true
	}
}

func isCorePrivateObject(obj *types.TypeName, corePath string) bool {
	return obj != nil && obj.Pkg() != nil && obj.Pkg().Path() == corePath && !obj.Exported()
}

func isFacadeExportableNamedLike(t types.Type, corePath string, seen map[types.Type]bool) bool {
	switch typed := t.(type) {
	case *types.Alias:
		if isCorePrivateObject(typed.Obj(), corePath) {
			return false
		}
		return isFacadeExportableType(typed.Rhs(), corePath, seen)
	case *types.Named:
		return isFacadeExportableNamed(typed, corePath, seen)
	default:
		return true
	}
}

func isFacadeExportableDirectType(t types.Type, corePath string) bool {
	signature, ok := t.(*types.Signature)
	return !ok || isFacadeExportableSignature(signature, corePath)
}

func isFacadeExportableElemType(t types.Type, corePath string, seen map[types.Type]bool) bool {
	switch typed := t.(type) {
	case *types.Array:
		return isFacadeExportableType(typed.Elem(), corePath, seen)
	case *types.Chan:
		return isFacadeExportableType(typed.Elem(), corePath, seen)
	case *types.Pointer:
		return isFacadeExportableType(typed.Elem(), corePath, seen)
	case *types.Slice:
		return isFacadeExportableType(typed.Elem(), corePath, seen)
	default:
		return true
	}
}

func isFacadeExportableInterface(t *types.Interface, corePath string, seen map[types.Type]bool) bool {
	for etyp := range t.EmbeddedTypes() {
		if !isFacadeExportableType(etyp, corePath, seen) {
			return false
		}
	}
	for method := range t.Methods() {
		signature, ok := method.Type().(*types.Signature)
		if !ok || !isFacadeExportableSignature(signature, corePath) {
			return false
		}
	}
	return true
}

func isFacadeExportableNamed(t *types.Named, corePath string, seen map[types.Type]bool) bool {
	if isCorePrivateObject(t.Obj(), corePath) {
		return false
	}
	args := t.TypeArgs()
	if args == nil {
		return true
	}
	for arg := range args.Types() {
		if !isFacadeExportableType(arg, corePath, seen) {
			return false
		}
	}
	return true
}

func isFacadeExportableCompositeType(t types.Type, corePath string, seen map[types.Type]bool) bool {
	switch typed := t.(type) {
	case *types.Map:
		return isFacadeExportableType(typed.Key(), corePath, seen) &&
			isFacadeExportableType(typed.Elem(), corePath, seen)
	case *types.Struct:
		return isFacadeExportableStruct(typed, corePath, seen)
	case *types.Tuple:
		return isFacadeExportableTuple(typed, corePath, seen)
	case *types.Union:
		return isFacadeExportableUnion(typed, corePath, seen)
	default:
		return true
	}
}

func isFacadeExportableStruct(t *types.Struct, corePath string, seen map[types.Type]bool) bool {
	for field := range t.Fields() {
		if !isFacadeExportableType(field.Type(), corePath, seen) {
			return false
		}
	}
	return true
}

func isFacadeExportableUnion(t *types.Union, corePath string, seen map[types.Type]bool) bool {
	for term := range t.Terms() {
		if !isFacadeExportableType(term.Type(), corePath, seen) {
			return false
		}
	}
	return true
}

func sanitizeIdent(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	var b strings.Builder
	for i, r := range s {
		writeIdentRune(&b, i, r)
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

func writeIdentRune(b *strings.Builder, index int, r rune) {
	if isIdentRune(index, r) {
		b.WriteRune(r)
		return
	}
	if index == 0 && isASCIIDigit(r) {
		b.WriteByte('p')
		b.WriteRune(r)
		return
	}
	b.WriteByte('_')
}

func isIdentRune(index int, r rune) bool {
	return r == '_' || isASCIILetter(r) || (index > 0 && isASCIIDigit(r))
}

func isASCIILetter(r rune) bool {
	return (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z')
}

func isASCIIDigit(r rune) bool {
	return r >= '0' && r <= '9'
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

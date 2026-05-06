package client

import (
	"os"
	"strings"
	"testing"
)

func TestMediaPageTemplateUsesPageLevelScroll(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/media/page.html")

	if !strings.Contains(template, `<div class="flex-1 overflow-y-auto p-6 sm:p-8">`) {
		t.Fatalf("expected media page wrapper to own vertical scrolling")
	}
	if strings.Contains(template, `<div class="flex-1 overflow-hidden p-6 sm:p-8">`) {
		t.Fatalf("media page wrapper must not reintroduce fixed-height clipping")
	}

	rootClass := mediaTemplateClassFor(t, template, "data-media-page-root")
	mediaRequireClasses(t, "media page root", rootClass,
		"grid",
		"w-full",
		"min-w-0",
		"grid-cols-1",
		"items-start",
		"xl:grid-cols-[minmax(0,1fr)_360px]",
	)
	mediaRejectClasses(t, "media page root", rootClass, "h-full")
}

func TestMediaPageTemplateKeepsGridAndDetailsNaturalHeight(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/media/page.html")

	gridClass := mediaTemplateClassFor(t, template, "data-media-grid")
	mediaRequireClasses(t, "media grid", gridClass,
		"grid",
		"min-w-0",
		"grid-cols-[repeat(auto-fill,minmax(220px,1fr))]",
		"content-start",
	)
	mediaRejectClasses(t, "media grid", gridClass, "flex-1", "min-h-0", "overflow-auto")

	detailShellClass := mediaTemplateClassFor(t, template, "data-media-detail-shell")
	mediaRequireClasses(t, "media detail shell", detailShellClass,
		"flex",
		"w-full",
		"min-w-0",
		"flex-col",
		"self-start",
	)
	mediaRejectClasses(t, "media detail shell", detailShellClass, "min-h-0")

	detailEmptyClass := mediaTemplateClassFor(t, template, "data-media-detail-empty")
	mediaRejectClasses(t, "empty detail panel", detailEmptyClass, "flex-1", "overflow-auto")

	detailClass := mediaTemplateClassFor(t, template, "data-media-detail>")
	mediaRequireClasses(t, "detail panel", detailClass, "hidden")
	mediaRejectClasses(t, "detail panel", detailClass, "flex-1", "overflow-auto")
}

func TestMediaPageTemplatePreservesListOverflowOwnership(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/media/page.html")

	listClass := mediaTemplateClassFor(t, template, "data-media-list>")
	mediaRequireClasses(t, "media list shell", listClass, "min-w-0", "overflow-hidden")
	mediaRejectClasses(t, "media list shell", listClass, "min-h-0")

	mediaRequireFragments(t, template,
		`<div class="w-full overflow-x-auto">`,
		`<table class="w-full min-w-[760px] text-sm">`,
		`<h3 class="text-lg font-semibold text-gray-900 break-all" data-media-detail-name>`,
		`<p class="text-sm text-gray-500 mt-1 break-all" data-media-detail-url>`,
	)
	if strings.Contains(template, "overflow-auto h-full") {
		t.Fatalf("list table wrapper must not own full-height vertical scrolling")
	}

	mediaRequireFragments(t, template, `class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center"`)

	if strings.Contains(template, "lg:min-w") {
		t.Fatalf("filter controls must shrink instead of forcing page-level horizontal overflow")
	}
}

func TestMediaPageTemplatePreservesRuntimeMarkers(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/media/page.html")

	mediaRequireFragments(t, template,
		"data-media-page-root",
		`data-media-view="{{ media_view }}"`,
		`data-media-gallery-path="{{ media_gallery_path }}"`,
		`data-media-list-path="{{ media_list_path }}"`,
		`data-media-library-path="{{ media_library_path }}"`,
		`data-media-item-path="{{ media_item_path }}"`,
		`data-media-resolve-path="{{ media_resolve_path }}"`,
		`data-media-upload-path="{{ media_upload_path }}"`,
		`data-media-presign-path="{{ media_presign_path }}"`,
		`data-media-confirm-path="{{ media_confirm_path }}"`,
		`data-media-capabilities-path="{{ media_capabilities_path }}"`,
		`data-media-default-value-mode="{{ media_default_value_mode }}"`,
		"data-media-search",
		"data-media-type-filter",
		"data-media-status-filter",
		"data-media-sort",
		"data-media-grid",
		"data-media-list",
		"data-media-list-body",
		"data-media-select-all",
		"data-media-footer",
		"data-media-count-label",
		"data-media-load-more",
		"data-media-loading",
		"data-media-empty",
		"data-media-no-results",
		"data-media-error",
		"data-media-status",
		"data-media-upload-trigger",
		"data-media-upload-input",
		"data-media-upload-empty",
		"data-media-selection-bar",
		"data-media-selected-count",
		"data-media-clear-selection",
		"data-media-bulk-delete",
		"data-media-detail-empty",
		"data-media-detail",
		"data-media-detail-preview",
		"data-media-detail-name",
		"data-media-detail-url",
		"data-media-detail-type",
		"data-media-detail-status-label",
		"data-media-detail-size",
		"data-media-detail-date",
		"data-media-detail-form",
		"data-media-save-button",
		"data-media-copy-url",
		"data-media-delete",
		"data-media-detail-error",
		"data-media-detail-feedback",
	)
}

func TestMediaPageScriptBindsPageLevelControls(t *testing.T) {
	source, err := os.ReadFile("assets/src/media/index.ts")
	if err != nil {
		t.Fatalf("read media source: %v", err)
	}
	script := string(source)

	mediaRequireFragments(t, script,
		"import { appendCSRFHeader } from '../shared/transport/http-client';",
		"function byMediaPage",
		"appendCSRFHeader(url, options, headers);",
		"uploadInput: byMediaPage<HTMLInputElement>(root, '[data-media-upload-input]')",
		"uploadTrigger: byMediaPage<HTMLButtonElement>(root, '[data-media-upload-trigger]')",
		"selectionBar: byMediaPage(root, '[data-media-selection-bar]')",
		"selectionCount: byMediaPage(root, '[data-media-selected-count]')",
		"clearSelection: byMediaPage<HTMLButtonElement>(root, '[data-media-clear-selection]')",
		"bulkDelete: byMediaPage<HTMLButtonElement>(root, '[data-media-bulk-delete]')",
	)
}

func mediaTemplateClassFor(t *testing.T, template, marker string) string {
	t.Helper()

	tag := mediaTemplateTagFor(t, template, marker)
	classStart := strings.Index(tag, `class="`)
	if classStart < 0 {
		return ""
	}
	classStart += len(`class="`)
	markerIndex := strings.Index(tag, marker)
	if markerIndex < 0 {
		t.Fatalf("expected marker %q in tag %q", marker, tag)
	}
	classEnd := strings.LastIndex(tag[:markerIndex], `"`)
	if classEnd < 0 {
		t.Fatalf("unterminated class attribute for marker %q in tag %q", marker, tag)
	}
	if classEnd < classStart {
		closingOffset := strings.Index(tag[markerIndex:], `"`)
		if closingOffset < 0 {
			t.Fatalf("unterminated class attribute for marker %q in tag %q", marker, tag)
		}
		classEnd = markerIndex + closingOffset
	}
	return tag[classStart:classEnd]
}

func mediaTemplateTagFor(t *testing.T, template, marker string) string {
	t.Helper()

	markerIndex := strings.Index(template, marker)
	if markerIndex < 0 {
		t.Fatalf("expected marker %q in media page template", marker)
	}
	tagStart := strings.LastIndex(template[:markerIndex], "<")
	if tagStart < 0 {
		t.Fatalf("expected opening tag before marker %q", marker)
	}
	tagEnd := strings.Index(template[markerIndex:], ">")
	if tagEnd < 0 {
		t.Fatalf("expected closing tag after marker %q", marker)
	}
	return template[tagStart : markerIndex+tagEnd+1]
}

func mediaRequireClasses(t *testing.T, label, class string, expected ...string) {
	t.Helper()

	for _, item := range expected {
		if !mediaClassListContains(class, item) {
			t.Fatalf("expected %s class %q in %q", label, item, class)
		}
	}
}

func mediaRejectClasses(t *testing.T, label, class string, rejected ...string) {
	t.Helper()

	for _, item := range rejected {
		if mediaClassListContains(class, item) {
			t.Fatalf("did not expect %s class %q in %q", label, item, class)
		}
	}
}

func mediaClassListContains(class, item string) bool {
	for _, field := range strings.Fields(class) {
		if field == item {
			return true
		}
	}
	return false
}

func mediaRequireFragments(t *testing.T, template string, fragments ...string) {
	t.Helper()

	for _, fragment := range fragments {
		if !strings.Contains(template, fragment) {
			t.Fatalf("expected media page template fragment %q", fragment)
		}
	}
}

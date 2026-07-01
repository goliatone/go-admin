package site

import (
	"context"
	"errors"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ErrContentURLRedirectChainUpdaterRequired reports capture inputs that require
// chain flattening without providing a chain updater capability.
var ErrContentURLRedirectChainUpdaterRequired = errors.New("content URL redirect chain updater required")

// ContentURLRedirectChange describes a public content URL move that a host
// application may persist as a historical redirect.
type ContentURLRedirectChange struct {
	ContentID         string         `json:"content_id"`
	ContentTypeSlug   string         `json:"content_type_slug"`
	Locale            string         `json:"locale"`
	SiteKey           string         `json:"site_key"`
	ContentChannel    string         `json:"content_channel"`
	OldContentChannel string         `json:"old_content_channel,omitempty"`
	NewContentChannel string         `json:"new_content_channel,omitempty"`
	OldPath           string         `json:"old_path"`
	NewPath           string         `json:"new_path"`
	StatusCode        int            `json:"status_code"`
	Reason            string         `json:"reason"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

// ContentURLRedirectRecorder records host-owned historical URL redirects.
type ContentURLRedirectRecorder interface {
	RecordContentURLRedirect(context.Context, ContentURLRedirectChange) (*ContentURLRedirect, error)
}

// ContentURLRedirectChainUpdater lets stores flatten existing chains after a
// content move is recorded.
type ContentURLRedirectChainUpdater interface {
	FlattenContentURLRedirectChain(context.Context, ContentURLRedirectChange) error
}

// ContentURLRedirectSourceOwnerLookup identifies the source path being checked
// for active content ownership.
type ContentURLRedirectSourceOwnerLookup struct {
	Path           string `json:"path"`
	SiteKey        string `json:"site_key"`
	ContentChannel string `json:"content_channel"`
	Locale         string `json:"locale"`
}

// ContentURLRedirectSourceOwner describes active content that currently owns a
// path in the same site scope.
type ContentURLRedirectSourceOwner struct {
	ContentID       string `json:"content_id"`
	ContentTypeSlug string `json:"content_type_slug"`
	Locale          string `json:"locale"`
	ContentChannel  string `json:"content_channel"`
}

// ContentURLRedirectSourceOwnerLookupService checks whether a redirect source
// path is already owned by active content.
type ContentURLRedirectSourceOwnerLookupService interface {
	LookupContentURLRedirectSourceOwner(context.Context, ContentURLRedirectSourceOwnerLookup) (*ContentURLRedirectSourceOwner, error)
}

// ContentURLRedirectCaptureInput configures single-record redirect capture for
// host content update flows.
type ContentURLRedirectCaptureInput struct {
	SiteConfig              ResolvedSiteConfig
	OldContent              admin.CMSContent
	NewContent              admin.CMSContent
	ContentType             admin.CMSContentType
	Locale                  string
	SiteKey                 string
	ContentChannel          string
	PathShape               ContentURLRedirectPathShape
	IncludeBase             bool
	IncludeLocale           bool
	StatusCode              int
	Reason                  string
	Metadata                map[string]any
	Recorder                ContentURLRedirectRecorder
	ChainUpdater            ContentURLRedirectChainUpdater
	ChainPolicy             ContentURLRedirectChainPolicy
	SourceOwnerLookup       ContentURLRedirectSourceOwnerLookupService
	ContinueOnRecorderError bool
	AllowContentChannelMove bool
}

// ContentURLRedirectCaptureResult reports whether a change was recorded or why
// it was skipped.
type ContentURLRedirectCaptureResult struct {
	OldPath     ContentDeliveryPathResult `json:"old_path"`
	NewPath     ContentDeliveryPathResult `json:"new_path"`
	Change      *ContentURLRedirectChange `json:"change,omitempty"`
	Redirect    *ContentURLRedirect       `json:"redirect,omitempty"`
	Recorded    bool                      `json:"recorded"`
	Skipped     bool                      `json:"skipped"`
	SkipReason  string                    `json:"skip_reason,omitempty"`
	RecordError error                     `json:"-"`
	ChainError  error                     `json:"-"`
	ChainStatus string                    `json:"chain_status,omitempty"`
	SourceOwner *ContentURLRedirectSourceOwner
}

// ContentURLRedirectBulkMode controls whether bulk capture stops at the first
// record failure or returns per-record outcomes.
type ContentURLRedirectBulkMode string

const (
	ContentURLRedirectBulkFailFast   ContentURLRedirectBulkMode = "fail_fast"
	ContentURLRedirectBulkBestEffort ContentURLRedirectBulkMode = "best_effort"
)

// ContentURLRedirectChainPolicy controls whether capture may record a redirect
// when chain-flattening support is unavailable.
type ContentURLRedirectChainPolicy string

const (
	ContentURLRedirectChainOptional ContentURLRedirectChainPolicy = "optional"
	ContentURLRedirectChainRequired ContentURLRedirectChainPolicy = "required"
)

// ContentURLRedirectPathShape controls whether capture stores runtime-public
// paths or caller-specified explicit path shapes.
type ContentURLRedirectPathShape string

const (
	ContentURLRedirectPathRuntimePublic ContentURLRedirectPathShape = "runtime_public"
	ContentURLRedirectPathExplicit      ContentURLRedirectPathShape = "explicit"
)

// ContentURLRedirectBulkItem describes one affected record for route-affecting
// bulk capture.
type ContentURLRedirectBulkItem struct {
	OldContent        admin.CMSContent              `json:"old_content"`
	NewContent        admin.CMSContent              `json:"new_content"`
	OldContentType    admin.CMSContentType          `json:"old_content_type"`
	NewContentType    admin.CMSContentType          `json:"new_content_type"`
	Locale            string                        `json:"locale"`
	SiteKey           string                        `json:"site_key"`
	ContentChannel    string                        `json:"content_channel"`
	OldContentChannel string                        `json:"old_content_channel,omitempty"`
	NewContentChannel string                        `json:"new_content_channel,omitempty"`
	Metadata          map[string]any                `json:"metadata,omitempty"`
	PathShape         ContentURLRedirectPathShape   `json:"path_shape,omitempty"`
	IncludeBase       *bool                         `json:"include_base,omitempty"`
	IncludeLocale     *bool                         `json:"include_locale,omitempty"`
	StatusCode        int                           `json:"status_code"`
	Reason            string                        `json:"reason"`
	ChainPolicy       ContentURLRedirectChainPolicy `json:"chain_policy,omitempty"`
}

// ContentURLRedirectBulkCaptureInput configures route-affecting bulk capture.
type ContentURLRedirectBulkCaptureInput struct {
	BeforeSiteConfig        ResolvedSiteConfig
	AfterSiteConfig         ResolvedSiteConfig
	Items                   []ContentURLRedirectBulkItem
	Recorder                ContentURLRedirectRecorder
	ChainUpdater            ContentURLRedirectChainUpdater
	SourceOwnerLookup       ContentURLRedirectSourceOwnerLookupService
	Mode                    ContentURLRedirectBulkMode
	IncludeBase             bool
	IncludeLocale           bool
	StatusCode              int
	Reason                  string
	SiteKey                 string
	ContentChannel          string
	BeforeContentChannel    string
	AfterContentChannel     string
	Metadata                map[string]any
	PathShape               ContentURLRedirectPathShape
	ChainPolicy             ContentURLRedirectChainPolicy
	ContinueOnRecorderError bool
}

// ContentURLRedirectBulkItemResult reports the capture outcome for one item.
type ContentURLRedirectBulkItemResult struct {
	Index      int                             `json:"index"`
	Status     string                          `json:"status"`
	Result     ContentURLRedirectCaptureResult `json:"result"`
	Error      error                           `json:"-"`
	SkipReason string                          `json:"skip_reason,omitempty"`
}

// ContentURLRedirectBulkCaptureResult reports aggregate and per-record outcomes.
type ContentURLRedirectBulkCaptureResult struct {
	Items     []ContentURLRedirectBulkItemResult `json:"items"`
	Recorded  int                                `json:"recorded"`
	Skipped   int                                `json:"skipped"`
	Failed    int                                `json:"failed"`
	Processed int                                `json:"processed"`
}

// CaptureContentURLRedirect compares old and new effective delivery paths for a
// single content record and records a historical redirect when the public path
// changed.
func CaptureContentURLRedirect(ctx context.Context, input ContentURLRedirectCaptureInput) (ContentURLRedirectCaptureResult, error) {
	includeBase, includeLocale := contentURLRedirectCapturePathFlags(input.PathShape, input.IncludeBase, input.IncludeLocale)
	oldPath, err := ResolveContentDeliveryPath(ctx, ContentDeliveryPathInput{
		SiteConfig:     input.SiteConfig,
		Content:        input.OldContent,
		ContentType:    input.ContentType,
		Locale:         input.Locale,
		ContentChannel: input.ContentChannel,
		IncludeBase:    includeBase,
		IncludeLocale:  includeLocale,
	})
	if err != nil {
		return ContentURLRedirectCaptureResult{}, err
	}
	newPath, err := ResolveContentDeliveryPath(ctx, ContentDeliveryPathInput{
		SiteConfig:     input.SiteConfig,
		Content:        input.NewContent,
		ContentType:    input.ContentType,
		Locale:         input.Locale,
		ContentChannel: input.ContentChannel,
		IncludeBase:    includeBase,
		IncludeLocale:  includeLocale,
	})
	if err != nil {
		return ContentURLRedirectCaptureResult{}, err
	}
	return captureContentURLRedirectWithPaths(ctx, input, oldPath, newPath)
}

// CaptureContentURLRedirectBulk compares many old/new resolver contexts and
// records historical redirects for each valid public URL move.
func CaptureContentURLRedirectBulk(ctx context.Context, input ContentURLRedirectBulkCaptureInput) (ContentURLRedirectBulkCaptureResult, error) {
	mode := input.Mode
	if mode == "" {
		mode = ContentURLRedirectBulkFailFast
	}
	out := ContentURLRedirectBulkCaptureResult{
		Items: make([]ContentURLRedirectBulkItemResult, 0, len(input.Items)),
	}
	for index, item := range input.Items {
		itemResult, err := captureContentURLRedirectBulkItem(ctx, input, item, index)
		out.Items = append(out.Items, itemResult)
		out.Processed++
		switch itemResult.Status {
		case "recorded":
			out.Recorded++
		case "skipped":
			out.Skipped++
		case "failed":
			out.Failed++
		}
		if err != nil && mode != ContentURLRedirectBulkBestEffort {
			return out, err
		}
	}
	return out, nil
}

func captureContentURLRedirectWithPaths(
	ctx context.Context,
	input ContentURLRedirectCaptureInput,
	oldPath ContentDeliveryPathResult,
	newPath ContentDeliveryPathResult,
) (ContentURLRedirectCaptureResult, error) {
	result := ContentURLRedirectCaptureResult{OldPath: oldPath, NewPath: newPath}
	if reason := contentURLRedirectCaptureSkipReason(input, oldPath, newPath); reason != "" {
		result.Skipped = true
		result.SkipReason = reason
		return result, nil
	}

	change := ContentURLRedirectChange{
		ContentID:         strings.TrimSpace(firstNonEmpty(input.NewContent.ID, input.OldContent.ID)),
		ContentTypeSlug:   strings.TrimSpace(firstNonEmpty(input.NewContent.ContentTypeSlug, input.OldContent.ContentTypeSlug, input.ContentType.Slug, input.ContentType.Name)),
		Locale:            strings.TrimSpace(newPath.Locale),
		SiteKey:           strings.TrimSpace(input.SiteKey),
		ContentChannel:    strings.TrimSpace(newPath.ContentChannel),
		OldContentChannel: strings.TrimSpace(oldPath.ContentChannel),
		NewContentChannel: strings.TrimSpace(newPath.ContentChannel),
		OldPath:           oldPath.PublicPath,
		NewPath:           newPath.PublicPath,
		StatusCode:        contentURLRedirectStatusCode(input.StatusCode),
		Reason:            strings.TrimSpace(input.Reason),
		Metadata:          cloneAnyMap(input.Metadata),
	}
	result.Change = &change
	if input.Recorder == nil {
		result.Skipped = true
		result.SkipReason = "missing_recorder"
		return result, nil
	}
	if input.ChainPolicy == ContentURLRedirectChainRequired && input.ChainUpdater == nil {
		result.ChainStatus = "required_missing"
		result.ChainError = ErrContentURLRedirectChainUpdaterRequired
		return result, ErrContentURLRedirectChainUpdaterRequired
	}
	if ownerConflict, err := contentURLRedirectSourceOwnerConflict(ctx, input, change); err != nil {
		return result, err
	} else if ownerConflict != nil {
		result.Skipped = true
		result.SkipReason = "source_owner_conflict"
		result.SourceOwner = ownerConflict
		return result, nil
	}
	redirect, err := input.Recorder.RecordContentURLRedirect(ctx, change)
	if err != nil {
		result.RecordError = err
		if input.ContinueOnRecorderError {
			return result, nil
		}
		return result, err
	}
	result.Redirect = redirect
	result.Recorded = true
	if input.ChainUpdater == nil {
		result.ChainStatus = "skipped"
		return result, nil
	}
	if err := input.ChainUpdater.FlattenContentURLRedirectChain(ctx, change); err != nil {
		result.ChainError = err
		if input.ContinueOnRecorderError {
			result.ChainStatus = "failed"
			return result, nil
		}
		return result, err
	}
	result.ChainStatus = "flattened"
	return result, nil
}

func captureContentURLRedirectBulkItem(
	ctx context.Context,
	input ContentURLRedirectBulkCaptureInput,
	item ContentURLRedirectBulkItem,
	index int,
) (ContentURLRedirectBulkItemResult, error) {
	includeBase, includeLocale := contentURLRedirectBulkPathFlags(input, item)
	oldContentType, newContentType := contentURLRedirectBulkContentTypes(item)
	oldContentChannel, newContentChannel := contentURLRedirectBulkContentChannels(input, item)
	oldPath, err := resolveBulkContentDeliveryPath(ctx, input.BeforeSiteConfig, item.OldContent, oldContentType, item, oldContentChannel, includeBase, includeLocale)
	if err != nil {
		return ContentURLRedirectBulkItemResult{Index: index, Status: "failed", Error: err}, err
	}
	newPath, err := resolveBulkContentDeliveryPath(ctx, input.AfterSiteConfig, item.NewContent, newContentType, item, newContentChannel, includeBase, includeLocale)
	if err != nil {
		return ContentURLRedirectBulkItemResult{Index: index, Status: "failed", Result: ContentURLRedirectCaptureResult{OldPath: oldPath}, Error: err}, err
	}
	captureInput := contentURLRedirectBulkCaptureInput(input, item, newContentType, newContentChannel, contentURLRedirectPathChannelsDiffer(oldPath, newPath), includeBase, includeLocale)
	result, err := captureContentURLRedirectWithPaths(ctx, captureInput, oldPath, newPath)
	status, err := contentURLRedirectBulkItemStatus(result, err)
	return ContentURLRedirectBulkItemResult{
		Index:      index,
		Status:     status,
		Result:     result,
		Error:      err,
		SkipReason: result.SkipReason,
	}, err
}

func contentURLRedirectCaptureSkipReason(input ContentURLRedirectCaptureInput, oldPath, newPath ContentDeliveryPathResult) string {
	for _, reason := range []string{
		contentURLRedirectCaptureContentSkipReason(input),
		contentURLRedirectCapturePathSkipReason(oldPath, newPath),
		contentURLRedirectCaptureScopeSkipReason(input, oldPath, newPath),
	} {
		if reason != "" {
			return reason
		}
	}
	return ""
}

func contentURLRedirectCaptureContentSkipReason(input ContentURLRedirectCaptureInput) string {
	oldID := strings.TrimSpace(input.OldContent.ID)
	newID := strings.TrimSpace(input.NewContent.ID)
	if oldID != "" && newID != "" && oldID != newID {
		return "content_id_mismatch"
	}
	oldType := strings.TrimSpace(firstNonEmpty(input.OldContent.ContentTypeSlug, input.OldContent.ContentType, input.ContentType.Slug, input.ContentType.Name))
	newType := strings.TrimSpace(firstNonEmpty(input.NewContent.ContentTypeSlug, input.NewContent.ContentType, input.ContentType.Slug, input.ContentType.Name))
	if oldType != "" && newType != "" && !strings.EqualFold(oldType, newType) {
		return "content_type_mismatch"
	}
	if !publishedStatus(input.OldContent.Status) || !publishedStatus(input.NewContent.Status) {
		return "not_public"
	}
	return ""
}

func contentURLRedirectCapturePathSkipReason(oldPath, newPath ContentDeliveryPathResult) string {
	if !oldPath.PublicRoutable || !newPath.PublicRoutable {
		return "not_public_routable"
	}
	if strings.TrimSpace(oldPath.PublicPath) == "" || strings.TrimSpace(newPath.PublicPath) == "" {
		return "empty_path"
	}
	if normalizeLocalePath(oldPath.CanonicalPath) == normalizeLocalePath(newPath.CanonicalPath) &&
		normalizeLocalePath(oldPath.PublicPath) == normalizeLocalePath(newPath.PublicPath) {
		return "unchanged_path"
	}
	return ""
}

func contentURLRedirectCaptureScopeSkipReason(input ContentURLRedirectCaptureInput, oldPath, newPath ContentDeliveryPathResult) string {
	if oldPath.Locale != "" && newPath.Locale != "" && !strings.EqualFold(oldPath.Locale, newPath.Locale) {
		return "locale_mismatch"
	}
	if !input.AllowContentChannelMove && contentURLRedirectPathChannelsDiffer(oldPath, newPath) {
		return "content_channel_mismatch"
	}
	return ""
}

func contentURLRedirectPathChannelsDiffer(oldPath, newPath ContentDeliveryPathResult) bool {
	return oldPath.ContentChannel != "" && newPath.ContentChannel != "" && !strings.EqualFold(oldPath.ContentChannel, newPath.ContentChannel)
}

func contentURLRedirectBulkPathFlags(input ContentURLRedirectBulkCaptureInput, item ContentURLRedirectBulkItem) (bool, bool) {
	pathShape := input.PathShape
	if item.PathShape != "" {
		pathShape = item.PathShape
	}
	includeBase, includeLocale := contentURLRedirectCapturePathFlags(pathShape, input.IncludeBase, input.IncludeLocale)
	if item.IncludeBase != nil {
		includeBase = *item.IncludeBase
	}
	if item.IncludeLocale != nil {
		includeLocale = *item.IncludeLocale
	}
	return includeBase, includeLocale
}

func contentURLRedirectBulkContentTypes(item ContentURLRedirectBulkItem) (admin.CMSContentType, admin.CMSContentType) {
	oldContentType := item.OldContentType
	if contentURLRedirectContentTypeEmpty(oldContentType) {
		oldContentType = item.NewContentType
	}
	newContentType := item.NewContentType
	if contentURLRedirectContentTypeEmpty(newContentType) {
		newContentType = item.OldContentType
	}
	return oldContentType, newContentType
}

func contentURLRedirectBulkContentChannels(input ContentURLRedirectBulkCaptureInput, item ContentURLRedirectBulkItem) (string, string) {
	legacyContentChannel := firstNonEmpty(item.ContentChannel, input.ContentChannel)
	oldContentChannel := firstNonEmpty(item.OldContentChannel, input.BeforeContentChannel, legacyContentChannel)
	newContentChannel := firstNonEmpty(item.NewContentChannel, input.AfterContentChannel, legacyContentChannel)
	return oldContentChannel, newContentChannel
}

func contentURLRedirectContentTypeEmpty(contentType admin.CMSContentType) bool {
	return strings.TrimSpace(contentType.ID) == "" &&
		strings.TrimSpace(contentType.Slug) == "" &&
		strings.TrimSpace(contentType.Name) == ""
}

func resolveBulkContentDeliveryPath(
	ctx context.Context,
	siteCfg ResolvedSiteConfig,
	content admin.CMSContent,
	contentType admin.CMSContentType,
	item ContentURLRedirectBulkItem,
	contentChannel string,
	includeBase bool,
	includeLocale bool,
) (ContentDeliveryPathResult, error) {
	return ResolveContentDeliveryPath(ctx, ContentDeliveryPathInput{
		SiteConfig:     siteCfg,
		Content:        content,
		ContentType:    contentType,
		Locale:         item.Locale,
		ContentChannel: contentChannel,
		IncludeBase:    includeBase,
		IncludeLocale:  includeLocale,
	})
}

func contentURLRedirectBulkCaptureInput(
	input ContentURLRedirectBulkCaptureInput,
	item ContentURLRedirectBulkItem,
	contentType admin.CMSContentType,
	contentChannel string,
	allowContentChannelMove bool,
	includeBase bool,
	includeLocale bool,
) ContentURLRedirectCaptureInput {
	return ContentURLRedirectCaptureInput{
		SiteConfig:              input.AfterSiteConfig,
		OldContent:              item.OldContent,
		NewContent:              item.NewContent,
		ContentType:             contentType,
		Locale:                  item.Locale,
		SiteKey:                 firstNonEmpty(item.SiteKey, input.SiteKey),
		ContentChannel:          contentChannel,
		PathShape:               ContentURLRedirectPathExplicit,
		IncludeBase:             includeBase,
		IncludeLocale:           includeLocale,
		StatusCode:              firstNonZero(item.StatusCode, input.StatusCode),
		Reason:                  firstNonEmpty(item.Reason, input.Reason),
		Metadata:                firstNonEmptyMap(item.Metadata, input.Metadata),
		Recorder:                input.Recorder,
		ChainUpdater:            input.ChainUpdater,
		ChainPolicy:             contentURLRedirectBulkChainPolicy(input, item),
		SourceOwnerLookup:       input.SourceOwnerLookup,
		ContinueOnRecorderError: input.ContinueOnRecorderError || input.Mode == ContentURLRedirectBulkBestEffort,
		AllowContentChannelMove: allowContentChannelMove,
	}
}

func contentURLRedirectBulkChainPolicy(input ContentURLRedirectBulkCaptureInput, item ContentURLRedirectBulkItem) ContentURLRedirectChainPolicy {
	if item.ChainPolicy != "" {
		return item.ChainPolicy
	}
	return input.ChainPolicy
}

func contentURLRedirectBulkItemStatus(result ContentURLRedirectCaptureResult, err error) (string, error) {
	if result.Skipped {
		return "skipped", err
	}
	err = firstNonNilError(err, result.RecordError, result.ChainError)
	if err != nil {
		return "failed", err
	}
	return "recorded", nil
}

func contentURLRedirectSourceOwnerConflict(
	ctx context.Context,
	input ContentURLRedirectCaptureInput,
	change ContentURLRedirectChange,
) (*ContentURLRedirectSourceOwner, error) {
	if input.SourceOwnerLookup == nil {
		return nil, nil
	}
	for _, contentChannel := range contentURLRedirectSourceOwnerLookupChannels(change) {
		owner, err := input.SourceOwnerLookup.LookupContentURLRedirectSourceOwner(ctx, ContentURLRedirectSourceOwnerLookup{
			Path:           change.OldPath,
			SiteKey:        change.SiteKey,
			ContentChannel: contentChannel,
			Locale:         change.Locale,
		})
		if err != nil {
			return nil, err
		}
		if owner == nil {
			continue
		}
		if !contentURLRedirectSourceOwnerMatchesChange(owner, change, contentChannel) {
			return owner, nil
		}
	}
	return nil, nil
}

func contentURLRedirectCapturePathFlags(shape ContentURLRedirectPathShape, includeBase bool, includeLocale bool) (bool, bool) {
	switch shape {
	case ContentURLRedirectPathExplicit:
		return includeBase, includeLocale
	default:
		return true, true
	}
}

func contentURLRedirectSourceOwnerLookupChannels(change ContentURLRedirectChange) []string {
	channels := make([]string, 0, 2)
	for _, contentChannel := range []string{
		firstNonEmpty(change.OldContentChannel, change.ContentChannel),
		firstNonEmpty(change.NewContentChannel, change.ContentChannel),
	} {
		contentChannel = strings.TrimSpace(contentChannel)
		if len(channels) == 0 || !strings.EqualFold(channels[0], contentChannel) {
			channels = append(channels, contentChannel)
		}
	}
	return channels
}

func contentURLRedirectSourceOwnerMatchesChange(owner *ContentURLRedirectSourceOwner, change ContentURLRedirectChange, contentChannel string) bool {
	if owner == nil {
		return true
	}
	if !contentURLRedirectScopeFieldMatches(owner.ContentID, change.ContentID, false) {
		return false
	}
	if !contentURLRedirectScopeFieldMatches(owner.ContentTypeSlug, change.ContentTypeSlug, true) {
		return false
	}
	if !contentURLRedirectScopeFieldMatches(owner.Locale, change.Locale, true) {
		return false
	}
	if !contentURLRedirectScopeFieldMatches(owner.ContentChannel, contentChannel, true) {
		return false
	}
	return true
}

func contentURLRedirectScopeFieldMatches(ownerValue string, changeValue string, caseInsensitive bool) bool {
	ownerValue = strings.TrimSpace(ownerValue)
	changeValue = strings.TrimSpace(changeValue)
	if ownerValue == "" {
		return true
	}
	if changeValue == "" {
		return false
	}
	if caseInsensitive {
		return strings.EqualFold(ownerValue, changeValue)
	}
	return ownerValue == changeValue
}

func firstNonZero(values ...int) int {
	for _, value := range values {
		if value != 0 {
			return value
		}
	}
	return 0
}

func firstNonEmptyMap(values ...map[string]any) map[string]any {
	for _, value := range values {
		if len(value) > 0 {
			return value
		}
	}
	return nil
}

func firstNonNilError(values ...error) error {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

package admin

import (
	"encoding/json"
	"net/http"
	"strings"

	crud "github.com/goliatone/go-crud"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const EnhancedMutationResponseVersion = 1

const (
	EnhancedFragmentModeReplace = "replace"
	EnhancedMutationMediaType   = "application/vnd.admin.enhanced+json"
)

type EnhancedActionNegotiationConfig struct {
	RequestHeader      string   `json:"request_header,omitempty"`
	RequestHeaderValue string   `json:"request_header_value,omitempty"`
	RequestMediaTypes  []string `json:"request_media_types,omitempty"`
	ResponseMediaType  string   `json:"response_media_type,omitempty"`
}

type EnhancedActionRuntimeOptions struct {
	RequestHeader      string `json:"request_header,omitempty"`
	RequestHeaderValue string `json:"request_header_value,omitempty"`
	Accept             string `json:"accept,omitempty"`
}

func DefaultEnhancedActionNegotiationConfig() EnhancedActionNegotiationConfig {
	return EnhancedActionNegotiationConfig{
		RequestHeader:      crud.EnhancedRequestHeader,
		RequestHeaderValue: crud.EnhancedRequestHeaderValue,
		RequestMediaTypes:  []string{EnhancedMutationMediaType, crud.EnhancedMutationMediaType},
		ResponseMediaType:  EnhancedMutationMediaType,
	}
}

func normalizeEnhancedActionNegotiationConfig(cfg EnhancedActionNegotiationConfig) EnhancedActionNegotiationConfig {
	defaults := DefaultEnhancedActionNegotiationConfig()
	if strings.TrimSpace(cfg.RequestHeader) == "" {
		cfg.RequestHeader = defaults.RequestHeader
	}
	if strings.TrimSpace(cfg.RequestHeaderValue) == "" {
		cfg.RequestHeaderValue = defaults.RequestHeaderValue
	}
	if len(cfg.RequestMediaTypes) == 0 {
		cfg.RequestMediaTypes = append([]string{}, defaults.RequestMediaTypes...)
	} else {
		mediaTypes := make([]string, 0, len(cfg.RequestMediaTypes))
		for _, mediaType := range cfg.RequestMediaTypes {
			if mediaType = strings.TrimSpace(mediaType); mediaType != "" {
				mediaTypes = append(mediaTypes, mediaType)
			}
		}
		if len(mediaTypes) == 0 {
			mediaTypes = append([]string{}, defaults.RequestMediaTypes...)
		}
		cfg.RequestMediaTypes = mediaTypes
	}
	if strings.TrimSpace(cfg.ResponseMediaType) == "" {
		cfg.ResponseMediaType = defaults.ResponseMediaType
	}
	return cfg
}

func EnhancedActionRuntimeOptionsFromConfig(cfg EnhancedActionNegotiationConfig) EnhancedActionRuntimeOptions {
	cfg = normalizeEnhancedActionNegotiationConfig(cfg)
	return EnhancedActionRuntimeOptions{
		RequestHeader:      cfg.RequestHeader,
		RequestHeaderValue: cfg.RequestHeaderValue,
		Accept:             cfg.ResponseMediaType,
	}
}

func enhancedMutationNegotiationConfig() crud.MutationNegotiationConfig {
	return enhancedMutationNegotiationConfigFromAdminConfig(DefaultEnhancedActionNegotiationConfig())
}

func enhancedMutationNegotiationConfigFromAdminConfig(cfg EnhancedActionNegotiationConfig) crud.MutationNegotiationConfig {
	cfg = normalizeEnhancedActionNegotiationConfig(cfg)
	return crud.MutationNegotiationConfig{
		EnhancedHeader:      cfg.RequestHeader,
		EnhancedHeaderValue: cfg.RequestHeaderValue,
		EnhancedMediaTypes:  append([]string{}, cfg.RequestMediaTypes...),
	}
}

func detectEnhancedMutationRequest(ctx any) crud.MutationRequest {
	return crud.DetectMutationRequestWithConfig(ctx, enhancedMutationNegotiationConfig())
}

func detectEnhancedMutationRequestWithConfig(ctx any, cfg EnhancedActionNegotiationConfig) crud.MutationRequest {
	return crud.DetectMutationRequestWithConfig(ctx, enhancedMutationNegotiationConfigFromAdminConfig(cfg))
}

func (a *Admin) enhancedActionNegotiationConfig() EnhancedActionNegotiationConfig {
	if a == nil {
		return DefaultEnhancedActionNegotiationConfig()
	}
	return normalizeEnhancedActionNegotiationConfig(a.config.EnhancedActions)
}

func (a *Admin) detectEnhancedMutationRequest(ctx any) crud.MutationRequest {
	return detectEnhancedMutationRequestWithConfig(ctx, a.enhancedActionNegotiationConfig())
}

func (a *Admin) enhancedActionResponseMediaType() string {
	return a.enhancedActionNegotiationConfig().ResponseMediaType
}

func (a *Admin) EnhancedActionRuntimeOptions() EnhancedActionRuntimeOptions {
	return EnhancedActionRuntimeOptionsFromConfig(a.enhancedActionNegotiationConfig())
}

type EnhancedToast struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type EnhancedFragment struct {
	Selector string `json:"selector"`
	Mode     string `json:"mode"`
	HTML     string `json:"html"`
}

type EnhancedMutationError struct {
	Message  string            `json:"message"`
	Code     int               `json:"code,omitempty"`
	TextCode string            `json:"text_code,omitempty"`
	Category string            `json:"category,omitempty"`
	Fields   map[string]string `json:"fields,omitempty"`
	Meta     map[string]any    `json:"meta,omitempty"`
}

type MutationPresentation struct {
	Version   int                    `json:"version"`
	OK        bool                   `json:"ok"`
	Status    int                    `json:"-"`
	Toasts    []EnhancedToast        `json:"toasts,omitempty"`
	Fragments []EnhancedFragment     `json:"fragments,omitempty"`
	Focus     string                 `json:"focus,omitempty"`
	Redirect  string                 `json:"redirect,omitempty"`
	Error     *EnhancedMutationError `json:"error,omitempty"`
	Meta      map[string]any         `json:"meta,omitempty"`
}

type MutationFallback struct {
	Redirect string
	Status   int
	Toast    *EnhancedToast
	JSON     any
}

type EnhancedMutationResponder struct {
	ErrorPresenter ErrorPresenter
	MediaType      string
}

func NewEnhancedMutationResponder(presenter ...ErrorPresenter) EnhancedMutationResponder {
	responder := EnhancedMutationResponder{ErrorPresenter: DefaultErrorPresenter(), MediaType: EnhancedMutationMediaType}
	if len(presenter) > 0 {
		responder.ErrorPresenter = presenter[0]
	}
	return responder
}

func (r EnhancedMutationResponder) WithMediaType(mediaType string) EnhancedMutationResponder {
	if strings.TrimSpace(mediaType) != "" {
		r.MediaType = strings.TrimSpace(mediaType)
	}
	return r
}

func (r EnhancedMutationResponder) mediaType() string {
	if mediaType := strings.TrimSpace(r.MediaType); mediaType != "" {
		return mediaType
	}
	return EnhancedMutationMediaType
}

func NewMutationPresentation(opts ...func(*MutationPresentation)) MutationPresentation {
	presentation := MutationPresentation{
		Version: EnhancedMutationResponseVersion,
		OK:      true,
		Status:  http.StatusOK,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&presentation)
		}
	}
	return normalizeMutationPresentation(presentation)
}

func WithMutationToast(toast EnhancedToast) func(*MutationPresentation) {
	return func(p *MutationPresentation) {
		if strings.TrimSpace(toast.Message) == "" {
			return
		}
		if strings.TrimSpace(toast.Type) == "" {
			toast.Type = "info"
		}
		p.Toasts = append(p.Toasts, toast)
	}
}

func WithMutationFragment(fragment EnhancedFragment) func(*MutationPresentation) {
	return func(p *MutationPresentation) {
		fragment.Selector = strings.TrimSpace(fragment.Selector)
		if fragment.Selector == "" {
			return
		}
		if strings.TrimSpace(fragment.Mode) == "" {
			fragment.Mode = EnhancedFragmentModeReplace
		}
		p.Fragments = append(p.Fragments, fragment)
	}
}

func WithMutationFocus(selector string) func(*MutationPresentation) {
	return func(p *MutationPresentation) {
		p.Focus = strings.TrimSpace(selector)
	}
}

func WithMutationRedirect(redirect string) func(*MutationPresentation) {
	return func(p *MutationPresentation) {
		p.Redirect = strings.TrimSpace(redirect)
	}
}

func WithMutationStatus(status int) func(*MutationPresentation) {
	return func(p *MutationPresentation) {
		if status > 0 {
			p.Status = status
		}
	}
}

func (r EnhancedMutationResponder) Respond(c router.Context, req crud.MutationRequest, presentation MutationPresentation, fallback MutationFallback) error {
	presentation = normalizeMutationPresentation(presentation)
	if fallback.Status == 0 {
		fallback.Status = presentation.Status
	}
	if fallback.Status == 0 {
		fallback.Status = http.StatusOK
	}

	switch req.Mode {
	case crud.MutationResponseModeEnhanced:
		return writeEnhancedMutationJSON(c, presentation.Status, r.mediaType(), presentation)
	case crud.MutationResponseModeHTML:
		applyMutationFlash(c, fallback.Toast, presentation.Toasts)
		redirect := firstNonEmpty(strings.TrimSpace(fallback.Redirect), strings.TrimSpace(presentation.Redirect), c.Referer(), "/")
		status := fallback.Status
		if status < http.StatusMultipleChoices || status >= http.StatusBadRequest {
			status = http.StatusSeeOther
		}
		return c.Redirect(redirect, status)
	default:
		if fallback.JSON != nil {
			return c.JSON(fallback.Status, fallback.JSON)
		}
		return c.JSON(fallback.Status, presentation)
	}
}

func (r EnhancedMutationResponder) RespondError(c router.Context, req crud.MutationRequest, err error, fallback MutationFallback) error {
	presenter := r.ErrorPresenter
	if presenter.Mappers == nil {
		presenter = DefaultErrorPresenter()
	}
	mapped, status := presenter.PresentWithContext(c, err)
	if mapped == nil {
		mapped = goerrors.New(defaultInternalErrorMessage, goerrors.CategoryInternal).WithCode(status)
	}
	if status == 0 {
		status = http.StatusInternalServerError
	}
	errPresentation := MutationPresentation{
		Version: EnhancedMutationResponseVersion,
		OK:      false,
		Status:  status,
		Error:   enhancedMutationErrorFromMapped(mapped),
	}
	if fallback.Toast != nil {
		errPresentation.Toasts = append(errPresentation.Toasts, *fallback.Toast)
	} else {
		errPresentation.Toasts = append(errPresentation.Toasts, EnhancedToast{Type: "error", Message: mapped.Message})
	}
	if strings.TrimSpace(fallback.Redirect) != "" {
		errPresentation.Redirect = strings.TrimSpace(fallback.Redirect)
	}

	switch req.Mode {
	case crud.MutationResponseModeEnhanced:
		return writeEnhancedMutationJSON(c, status, r.mediaType(), errPresentation)
	case crud.MutationResponseModeHTML:
		applyMutationFlash(c, fallback.Toast, errPresentation.Toasts)
		redirect := firstNonEmpty(strings.TrimSpace(fallback.Redirect), c.Referer(), "/")
		return c.Redirect(redirect, http.StatusSeeOther)
	default:
		if fallback.JSON != nil {
			status := fallback.Status
			if status == 0 {
				status = http.StatusOK
			}
			return c.JSON(status, fallback.JSON)
		}
		return writeError(c, err)
	}
}

func writeEnhancedMutationJSON(c router.Context, status int, mediaType string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	c.SetHeader("Content-Type", mediaType)
	return c.Status(status).Send(body)
}

func normalizeMutationPresentation(presentation MutationPresentation) MutationPresentation {
	if presentation.Version == 0 {
		presentation.Version = EnhancedMutationResponseVersion
	}
	if presentation.Status == 0 {
		presentation.Status = http.StatusOK
	}
	for idx := range presentation.Fragments {
		presentation.Fragments[idx].Selector = strings.TrimSpace(presentation.Fragments[idx].Selector)
		if strings.TrimSpace(presentation.Fragments[idx].Mode) == "" {
			presentation.Fragments[idx].Mode = EnhancedFragmentModeReplace
		}
	}
	return presentation
}

func enhancedMutationErrorFromMapped(mapped *goerrors.Error) *EnhancedMutationError {
	if mapped == nil {
		return &EnhancedMutationError{Message: defaultInternalErrorMessage, Code: http.StatusInternalServerError}
	}
	fields := mapped.ValidationMap()
	if len(fields) == 0 {
		fields = enhancedMutationFieldsFromMeta(mapped.Metadata)
	}
	return &EnhancedMutationError{
		Message:  strings.TrimSpace(mapped.Message),
		Code:     mapped.Code,
		TextCode: strings.TrimSpace(mapped.TextCode),
		Category: strings.TrimSpace(string(mapped.Category)),
		Fields:   fields,
		Meta:     mapped.Metadata,
	}
}

func enhancedMutationFieldsFromMeta(meta map[string]any) map[string]string {
	if len(meta) == 0 {
		return nil
	}
	fields := map[string]string{}
	if field := strings.TrimSpace(toString(meta["field"])); field != "" {
		fields[field] = firstNonEmpty(strings.TrimSpace(toString(meta["message"])), "invalid value")
	}
	for key, value := range extractMap(meta["fields"]) {
		if field := strings.TrimSpace(key); field != "" {
			fields[field] = firstNonEmpty(strings.TrimSpace(toString(value)), "invalid value")
		}
	}
	if len(fields) == 0 {
		return nil
	}
	return fields
}

func applyMutationFlash(c router.Context, fallback *EnhancedToast, toasts []EnhancedToast) {
	if c == nil {
		return
	}
	toast := EnhancedToast{}
	if fallback != nil {
		toast = *fallback
	} else if len(toasts) > 0 {
		toast = toasts[0]
	}
	if strings.TrimSpace(toast.Message) == "" {
		return
	}
	if strings.TrimSpace(toast.Type) == "" {
		toast.Type = "info"
	}
	c.Set("go_admin_flash", map[string]any{
		"type":    toast.Type,
		"message": toast.Message,
	})
	c.SetHeader("X-GoAdmin-Flash-Type", toast.Type)
	c.SetHeader("X-GoAdmin-Flash-Message", toast.Message)
}

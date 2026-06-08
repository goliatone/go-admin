package admin

import (
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

func enhancedMutationNegotiationConfig() crud.MutationNegotiationConfig {
	return crud.MutationNegotiationConfig{
		EnhancedHeader:      crud.EnhancedRequestHeader,
		EnhancedHeaderValue: crud.EnhancedRequestHeaderValue,
		EnhancedMediaTypes:  []string{EnhancedMutationMediaType, crud.EnhancedMutationMediaType},
	}
}

func detectEnhancedMutationRequest(ctx any) crud.MutationRequest {
	return crud.DetectMutationRequestWithConfig(ctx, enhancedMutationNegotiationConfig())
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
}

func NewEnhancedMutationResponder(presenter ...ErrorPresenter) EnhancedMutationResponder {
	responder := EnhancedMutationResponder{ErrorPresenter: DefaultErrorPresenter()}
	if len(presenter) > 0 {
		responder.ErrorPresenter = presenter[0]
	}
	return responder
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
		c.SetHeader("Content-Type", EnhancedMutationMediaType)
		return c.JSON(presentation.Status, presentation)
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
		c.SetHeader("Content-Type", EnhancedMutationMediaType)
		return c.JSON(status, errPresentation)
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

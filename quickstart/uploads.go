package quickstart

import (
	"context"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"path"
	"path/filepath"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
)

const defaultUploadFormField = "file"
const defaultUploadPublicURLTTL = 15 * time.Minute

// UploadAuthorizeFunc validates whether the request context can upload files.
// Return a non-nil error to block the upload.
type UploadAuthorizeFunc func(context.Context) error

// UploadPublicURLFunc builds the public URL returned in the JSON response.
type UploadPublicURLFunc func(basePath string, meta *uploader.FileMeta) string

// UploadResponseFunc customizes the JSON response payload.
type UploadResponseFunc func(publicURL string, meta *uploader.FileMeta) any

// UploadSubdirResolver resolves the upload subdirectory for the current request.
type UploadSubdirResolver func(router.Context) string

// UploadHandlerConfig configures a multipart upload endpoint backed by go-uploader.
type UploadHandlerConfig struct {
	BasePath            string               `json:"base_path"`
	DiskAssetsDir       string               `json:"disk_assets_dir"`
	FormField           string               `json:"form_field"`
	UploadSubdir        string               `json:"upload_subdir"`
	ResolveUploadSubdir UploadSubdirResolver `json:"resolve_upload_subdir"`
	MaxFileSize         int64                `json:"max_file_size"`
	AllowedMimeTypes    map[string]bool      `json:"allowed_mime_types"`
	AllowedImageFormats map[string]bool      `json:"allowed_image_formats"`
	Provider            uploader.Uploader    `json:"provider"`
	Validator           *uploader.Validator  `json:"validator"`
	Manager             *uploader.Manager    `json:"manager"`
	Authorize           UploadAuthorizeFunc  `json:"authorize"`
	PublicURL           UploadPublicURLFunc  `json:"public_url"`
	Response            UploadResponseFunc   `json:"response"`
}

// NewUploadHandler returns a generic multipart upload handler.
func NewUploadHandler(cfg UploadHandlerConfig) router.HandlerFunc {
	assetsDir := strings.TrimSpace(cfg.DiskAssetsDir)
	if assetsDir == "" {
		assetsDir = filepath.Join("pkg", "client", "assets")
	}
	uploadSubdir := strings.Trim(strings.TrimSpace(cfg.UploadSubdir), "/")
	formField := strings.TrimSpace(cfg.FormField)
	if formField == "" {
		formField = defaultUploadFormField
	}
	basePath := strings.TrimSpace(cfg.BasePath)

	manager := cfg.Manager
	if manager == nil {
		validator := cfg.Validator
		if validator == nil {
			validator = buildUploadValidator(cfg)
		}
		provider := cfg.Provider
		if provider == nil {
			provider = uploader.NewFSProvider(assetsDir).WithURLPrefix(resolveDefaultUploadURLPrefix(basePath))
		}
		manager = uploader.NewManager(
			uploader.WithProvider(provider),
			uploader.WithValidator(validator),
		)
	}

	return func(c router.Context) error {
		if c == nil {
			return router.NewBadRequestError("Missing request context")
		}
		if cfg.Authorize != nil {
			if err := cfg.Authorize(c.Context()); err != nil {
				return err
			}
		}
		resolvedUploadSubdir := uploadSubdir
		if cfg.ResolveUploadSubdir != nil {
			resolvedUploadSubdir = strings.Trim(strings.TrimSpace(cfg.ResolveUploadSubdir(c)), "/")
		}
		if resolvedUploadSubdir == "" {
			return router.NewBadRequestError("Upload destination is not configured")
		}

		file, err := c.FormFile(formField)
		if err != nil {
			return router.NewBadRequestError("No file provided or invalid file")
		}
		ensureUploadContentType(file, cfg.AllowedMimeTypes)

		meta, err := manager.HandleFile(c.Context(), file, resolvedUploadSubdir)
		if err != nil {
			// go-uploader v0.3 validates magic numbers for image formats only.
			// For non-image allowed uploads (e.g. PDFs), fall back to direct provider upload.
			if !isInvalidFileContentError(err) {
				return err
			}
			meta, err = handleUploadFileWithoutContentSniff(c.Context(), manager, file, resolvedUploadSubdir)
			if err != nil {
				return err
			}
		}

		publicURL := resolveUploadPublicURL(c.Context(), manager, basePath, meta)
		if cfg.PublicURL != nil {
			if customURL := strings.TrimSpace(cfg.PublicURL(basePath, meta)); customURL != "" {
				publicURL = customURL
			}
		}

		payload := any(map[string]string{"url": publicURL})
		if cfg.Response != nil {
			payload = cfg.Response(publicURL, meta)
		}

		return c.JSON(http.StatusOK, payload)
	}
}

func resolveDefaultUploadURLPrefix(basePath string) string {
	return path.Join("/", strings.TrimSpace(basePath), "assets")
}

func resolveUploadPublicURL(ctx context.Context, manager *uploader.Manager, basePath string, meta *uploader.FileMeta) string {
	if meta == nil {
		return resolveDefaultUploadURLPrefix(basePath)
	}
	if manager != nil && strings.TrimSpace(meta.Name) != "" {
		if url, err := manager.GetPresignedURL(ctx, meta.Name, defaultUploadPublicURLTTL); err == nil {
			if trimmed := strings.TrimSpace(url); trimmed != "" {
				return trimmed
			}
		}
	}
	if url := strings.TrimSpace(meta.URL); isBrowserAccessibleUploadURL(url) {
		return url
	}
	if name := strings.TrimSpace(meta.Name); name != "" {
		return path.Join(resolveDefaultUploadURLPrefix(basePath), name)
	}
	return resolveDefaultUploadURLPrefix(basePath)
}

func isBrowserAccessibleUploadURL(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}
	if strings.HasPrefix(value, "/") {
		return true
	}
	return strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://")
}

func buildUploadValidator(cfg UploadHandlerConfig) *uploader.Validator {
	opts := []uploader.ValidatorOption{}
	if cfg.MaxFileSize > 0 {
		opts = append(opts, uploader.WithUploadMaxFileSize(cfg.MaxFileSize))
	}
	if len(cfg.AllowedMimeTypes) > 0 {
		opts = append(opts, uploader.WithAllowedMimeTypes(cloneUploadBoolMap(cfg.AllowedMimeTypes)))
	}
	if len(cfg.AllowedImageFormats) > 0 {
		opts = append(opts, uploader.WithAllowedImageFormats(cloneUploadBoolMap(cfg.AllowedImageFormats)))
	}
	return uploader.NewValidator(opts...)
}

func cloneUploadBoolMap(in map[string]bool) map[string]bool {
	if len(in) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func ensureUploadContentType(file *multipart.FileHeader, allowed map[string]bool) {
	if file == nil {
		return
	}
	if file.Header == nil {
		file.Header = textproto.MIMEHeader{}
	}
	contentType := strings.TrimSpace(file.Header.Get("Content-Type"))
	if contentType != "" && (len(allowed) == 0 || allowed[contentType]) {
		return
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		return
	}
	guessed := strings.TrimSpace(mime.TypeByExtension(ext))
	if guessed == "" {
		return
	}
	if semi := strings.IndexByte(guessed, ';'); semi > -1 {
		guessed = guessed[:semi]
	}
	guessed = strings.TrimSpace(guessed)
	if guessed != "" {
		file.Header.Set("Content-Type", guessed)
	}
}

func isInvalidFileContentError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(strings.ToUpper(err.Error()), "INVALID_FILE_CONTENT")
}

func handleUploadFileWithoutContentSniff(ctx context.Context, manager *uploader.Manager, file *multipart.FileHeader, uploadSubdir string) (*uploader.FileMeta, error) {
	if manager == nil || file == nil {
		return nil, router.NewBadRequestError("Invalid upload request")
	}
	reader, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = reader.Close()
	}()
	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}
	contentType := strings.TrimSpace(file.Header.Get("Content-Type"))
	name, err := uploader.RandomName(file, uploadSubdir)
	if err != nil {
		return nil, err
	}
	url, err := manager.UploadFile(ctx, name, content, uploader.WithContentType(contentType))
	if err != nil {
		return nil, err
	}
	return &uploader.FileMeta{
		Content:      content,
		ContentType:  contentType,
		Name:         name,
		OriginalName: file.Filename,
		Size:         file.Size,
		URL:          url,
	}, nil
}

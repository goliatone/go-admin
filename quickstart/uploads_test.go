package quickstart

import (
	"bytes"
	"context"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type uploadMemoryProvider struct {
	files map[string][]byte
}

func (p *uploadMemoryProvider) UploadFile(_ context.Context, path string, content []byte, _ ...uploader.UploadOption) (string, error) {
	if p.files == nil {
		p.files = map[string][]byte{}
	}
	p.files[path] = append([]byte{}, content...)
	return "/memory/" + path, nil
}

func (p *uploadMemoryProvider) GetFile(_ context.Context, path string) ([]byte, error) {
	if p.files == nil {
		return nil, errors.New("not found")
	}
	content, ok := p.files[path]
	if !ok {
		return nil, errors.New("not found")
	}
	return append([]byte{}, content...), nil
}

func (p *uploadMemoryProvider) DeleteFile(_ context.Context, path string) error {
	delete(p.files, path)
	return nil
}

func (p *uploadMemoryProvider) GetPresignedURL(_ context.Context, path string, _ time.Duration) (string, error) {
	return "/memory/" + path, nil
}

func TestNewUploadHandlerUploadsFileAndReturnsPublicURL(t *testing.T) {
	assetsDir := t.TempDir()
	fileHeader := mustUploadTestFileHeader(t, "file", "avatar.png", textproto.MIMEHeader{}, []byte{0x89, 0x50, 0x4E, 0x47, 0x00, 0x00})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("FormFile", "file").Return(fileHeader, nil)

	var uploadedURL string
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		payload, ok := args.Get(1).(map[string]string)
		require.True(t, ok)
		uploadedURL = payload["url"]
	})

	handler := NewUploadHandler(UploadHandlerConfig{
		BasePath:      "/admin",
		DiskAssetsDir: assetsDir,
		UploadSubdir:  "uploads/users/profile-pictures",
		MaxFileSize:   5 * 1024 * 1024,
		AllowedMimeTypes: map[string]bool{
			"image/png": true,
		},
		AllowedImageFormats: map[string]bool{
			".png": true,
		},
	})

	err := handler(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, uploadedURL)
	require.True(t, strings.HasPrefix(uploadedURL, "/admin/assets/uploads/users/profile-pictures/"), uploadedURL)
	require.True(t, strings.HasSuffix(uploadedURL, ".png"), uploadedURL)

	rel := strings.TrimPrefix(uploadedURL, "/admin/assets/")
	_, statErr := os.Stat(filepath.Join(assetsDir, filepath.FromSlash(rel)))
	require.NoError(t, statErr)
}

func TestNewUploadHandlerRunsAuthorizationCallback(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())

	denyErr := errors.New("forbidden")
	handler := NewUploadHandler(UploadHandlerConfig{
		DiskAssetsDir: t.TempDir(),
		UploadSubdir:  "uploads/users/profile-pictures",
		Authorize: func(context.Context) error {
			return denyErr
		},
	})

	err := handler(ctx)
	require.ErrorIs(t, err, denyErr)
}

func TestNewUploadHandlerReturnsBadRequestWhenFileMissing(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("FormFile", "file").Return((*multipart.FileHeader)(nil), errors.New("missing file"))

	handler := NewUploadHandler(UploadHandlerConfig{
		DiskAssetsDir: t.TempDir(),
		UploadSubdir:  "uploads/users/profile-pictures",
	})

	err := handler(ctx)
	require.Error(t, err)
	require.Contains(t, strings.ToLower(err.Error()), "no file")
}

func TestNewUploadHandlerResolvesUploadSubdirPerRequest(t *testing.T) {
	assetsDir := t.TempDir()
	fileHeader := mustUploadTestFileHeader(t, "file", "contract.pdf", textproto.MIMEHeader{}, []byte("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Type /Page >>\nendobj\n%%EOF"))

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("FormFile", "file").Return(fileHeader, nil)

	var uploadedURL string
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		payload, ok := args.Get(1).(map[string]string)
		require.True(t, ok)
		uploadedURL = payload["url"]
	})

	handler := NewUploadHandler(UploadHandlerConfig{
		BasePath:      "/admin",
		DiskAssetsDir: assetsDir,
		FormField:     "file",
		ResolveUploadSubdir: func(c router.Context) string {
			return filepath.ToSlash(filepath.Join("tenant", "tenant-42", "org", "org-77", "docs"))
		},
		MaxFileSize: 5 * 1024 * 1024,
		AllowedMimeTypes: map[string]bool{
			"application/pdf": true,
		},
		AllowedImageFormats: map[string]bool{
			".pdf": true,
		},
	})

	err := handler(ctx)
	require.NoError(t, err)
	require.Contains(t, uploadedURL, "/admin/assets/tenant/tenant-42/org/org-77/docs/")
	require.True(t, strings.HasSuffix(uploadedURL, ".pdf"), uploadedURL)
}

func TestNewUploadHandlerDoesNotRequireLocalDirectoryWhenManagerInjected(t *testing.T) {
	fileHeader := mustUploadTestFileHeader(t, "file", "contract.pdf", textproto.MIMEHeader{}, []byte("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Type /Page >>\nendobj\n%%EOF"))

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("FormFile", "file").Return(fileHeader, nil)

	var payload map[string]string
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		var ok bool
		payload, ok = args.Get(1).(map[string]string)
		require.True(t, ok)
	})

	manager := uploader.NewManager(
		uploader.WithProvider(&uploadMemoryProvider{}),
		uploader.WithValidator(uploader.NewValidator(
			uploader.WithAllowedMimeTypes(map[string]bool{"application/pdf": true}),
			uploader.WithAllowedImageFormats(map[string]bool{".pdf": true}),
		)),
	)
	handler := NewUploadHandler(UploadHandlerConfig{
		BasePath:      "/admin",
		DiskAssetsDir: "/root/should/not/be/touched",
		UploadSubdir:  "tenant/demo/org/demo/docs",
		Manager:       manager,
		AllowedMimeTypes: map[string]bool{
			"application/pdf": true,
		},
		AllowedImageFormats: map[string]bool{
			".pdf": true,
		},
	})

	err := handler(ctx)
	require.NoError(t, err)
	require.NotNil(t, payload)
	require.Contains(t, payload["url"], "/memory/tenant/demo/org/demo/docs/")
}

func mustUploadTestFileHeader(t *testing.T, fieldName, filename string, extraHeaders textproto.MIMEHeader, content []byte) *multipart.FileHeader {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	headers := make(textproto.MIMEHeader)
	headers.Set("Content-Disposition", `form-data; name="`+fieldName+`"; filename="`+filename+`"`)
	for key, values := range extraHeaders {
		for _, value := range values {
			headers.Add(key, value)
		}
	}
	part, err := writer.CreatePart(headers)
	require.NoError(t, err)

	_, err = part.Write(content)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	require.NoError(t, req.ParseMultipartForm(10<<20))

	_, fh, err := req.FormFile(fieldName)
	require.NoError(t, err)
	require.NotNil(t, fh)
	return fh
}

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

	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

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

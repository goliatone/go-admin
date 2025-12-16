package handlers

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

	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestProfilePictureUploadHandlerUnauthorized(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())

	err := ProfilePictureUploadHandler("/admin", t.TempDir())(ctx)
	require.Error(t, err)

	var appErr *goerrors.Error
	require.True(t, errors.As(err, &appErr))
	require.Equal(t, goerrors.CodeUnauthorized, appErr.Code)
}

func TestProfilePictureUploadHandlerForbidden(t *testing.T) {
	ctx := router.NewMockContext()
	claims := &authlib.JWTClaims{UID: "user-1", UserRole: "guest"}
	reqCtx := authlib.WithClaimsContext(context.Background(), claims)

	ctx.On("Context").Return(reqCtx)

	err := ProfilePictureUploadHandler("/admin", t.TempDir())(ctx)
	require.Error(t, err)

	var appErr *goerrors.Error
	require.True(t, errors.As(err, &appErr))
	require.Equal(t, goerrors.CodeForbidden, appErr.Code)
}

func TestProfilePictureUploadHandlerUploadsPNG(t *testing.T) {
	assetsDir := t.TempDir()

	ctx := router.NewMockContext()
	claims := &authlib.JWTClaims{UID: "user-1", UserRole: "admin"}
	reqCtx := authlib.WithClaimsContext(context.Background(), claims)

	fileHeader := mustMultipartFileHeader(t, "file", "avatar.png", textproto.MIMEHeader{
		"Content-Type": []string{"image/png"},
	}, []byte{0x89, 0x50, 0x4E, 0x47, 0x00, 0x00})

	ctx.On("Context").Return(reqCtx)
	ctx.On("FormFile", "file").Return(fileHeader, nil)

	var uploadedURL string
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		payload, ok := args.Get(1).(map[string]string)
		require.True(t, ok)
		uploadedURL = payload["url"]
	})

	err := ProfilePictureUploadHandler("/admin", assetsDir)(ctx)
	require.NoError(t, err)

	require.NotEmpty(t, uploadedURL)
	require.True(t, strings.HasPrefix(uploadedURL, "/admin/assets/uploads/users/profile-pictures/"), uploadedURL)
	require.True(t, strings.HasSuffix(uploadedURL, ".png"), uploadedURL)

	rel := strings.TrimPrefix(uploadedURL, "/admin/assets/")
	_, statErr := os.Stat(filepath.Join(assetsDir, filepath.FromSlash(rel)))
	require.NoError(t, statErr)
}

func TestProfilePictureUploadHandlerGuessesContentTypeWhenMissing(t *testing.T) {
	assetsDir := t.TempDir()

	ctx := router.NewMockContext()
	claims := &authlib.JWTClaims{UID: "user-1", UserRole: "admin"}
	reqCtx := authlib.WithClaimsContext(context.Background(), claims)

	fileHeader := mustMultipartFileHeader(t, "file", "avatar.png", textproto.MIMEHeader{}, []byte{0x89, 0x50, 0x4E, 0x47, 0x00, 0x00})

	ctx.On("Context").Return(reqCtx)
	ctx.On("FormFile", "file").Return(fileHeader, nil)
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	err := ProfilePictureUploadHandler("/admin", assetsDir)(ctx)
	require.NoError(t, err)
}

func mustMultipartFileHeader(t *testing.T, fieldName, filename string, extraHeaders textproto.MIMEHeader, content []byte) *multipart.FileHeader {
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

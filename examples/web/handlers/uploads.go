package handlers

import (
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
)

const (
	userProfilePictureUploadField   = "file"
	userProfilePictureUploadsSubdir = "uploads/users/profile-pictures"
	userProfilePictureMaxSize       = 5 * 1024 * 1024
)

var allowedProfilePictureMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

var allowedProfilePictureExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
}

func ProfilePictureUploadHandler(basePath string, diskAssetsDir string) router.HandlerFunc {
	return func(c router.Context) error {
		if c == nil {
			return goerrors.New("missing context", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("UNAUTHORIZED")
		}

		ctx := c.Context()
		claims, ok := authlib.GetClaims(ctx)
		if !ok || claims == nil {
			return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("UNAUTHORIZED")
		}

		if !(authlib.Can(ctx, "admin.users", "edit") || authlib.Can(ctx, "admin.users", "create")) {
			return goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		}

		assetsDir := strings.TrimSpace(diskAssetsDir)
		if assetsDir == "" {
			assetsDir = filepath.Join("examples", "web", "assets")
		}
		if err := os.MkdirAll(filepath.Join(assetsDir, "uploads", "users", "profile-pictures"), 0o755); err != nil {
			return err
		}

		file, err := c.FormFile(userProfilePictureUploadField)
		if err != nil {
			return router.NewBadRequestError("No file provided or invalid file")
		}

		contentType := strings.TrimSpace(file.Header.Get("Content-Type"))
		if contentType == "" {
			if guessed := mime.TypeByExtension(strings.ToLower(filepath.Ext(file.Filename))); guessed != "" {
				if semi := strings.IndexByte(guessed, ';'); semi > -1 {
					guessed = guessed[:semi]
				}
				contentType = strings.TrimSpace(guessed)
				if contentType != "" {
					file.Header.Set("Content-Type", contentType)
				}
			}
		}

		validator := uploader.NewValidator(
			uploader.WithUploadMaxFileSize(userProfilePictureMaxSize),
			uploader.WithAllowedMimeTypes(allowedProfilePictureMimeTypes),
			uploader.WithAllowedImageFormats(allowedProfilePictureExtensions),
		)

		provider := uploader.NewFSProvider(assetsDir)
		manager := uploader.NewManager(
			uploader.WithProvider(provider),
			uploader.WithValidator(validator),
		)

		meta, err := manager.HandleFile(ctx, file, userProfilePictureUploadsSubdir)
		if err != nil {
			return err
		}

		publicURL := path.Join(basePath, "assets", meta.Name)
		return c.JSON(http.StatusOK, map[string]string{"url": publicURL})
	}
}

package handlers

import (
	"context"

	quickstart "github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const (
	userProfilePictureUploadField   = "file"
	userProfilePictureUploadsSubdir = "uploads/users/profile-pictures"
	userProfilePictureMaxSize       = 5 * 1024 * 1024

	featuredImageUploadField   = "file"
	featuredImageUploadsSubdir = "uploads/media/featured-images"
	featuredImageMaxSize       = 5 * 1024 * 1024
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

var allowedFeaturedImageMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

var allowedFeaturedImageExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
}

func ProfilePictureUploadHandler(basePath string, diskAssetsDir string) router.HandlerFunc {
	return quickstart.NewUploadHandler(quickstart.UploadHandlerConfig{
		BasePath:            basePath,
		DiskAssetsDir:       diskAssetsDir,
		FormField:           userProfilePictureUploadField,
		UploadSubdir:        userProfilePictureUploadsSubdir,
		MaxFileSize:         userProfilePictureMaxSize,
		AllowedMimeTypes:    allowedProfilePictureMimeTypes,
		AllowedImageFormats: allowedProfilePictureExtensions,
		Authorize:           authorizeProfilePictureUpload,
	})
}

func FeaturedImageUploadHandler(basePath string, diskAssetsDir string) router.HandlerFunc {
	return quickstart.NewUploadHandler(quickstart.UploadHandlerConfig{
		BasePath:            basePath,
		DiskAssetsDir:       diskAssetsDir,
		FormField:           featuredImageUploadField,
		UploadSubdir:        featuredImageUploadsSubdir,
		MaxFileSize:         featuredImageMaxSize,
		AllowedMimeTypes:    allowedFeaturedImageMimeTypes,
		AllowedImageFormats: allowedFeaturedImageExtensions,
		Authorize:           authorizeFeaturedImageUpload,
	})
}

func authorizeProfilePictureUpload(ctx context.Context) error {
	if err := ensureUploadClaims(ctx); err != nil {
		return err
	}
	if authlib.Can(ctx, "admin.users", "edit") || authlib.Can(ctx, "admin.users", "create") {
		return nil
	}
	return uploadForbiddenError()
}

func authorizeFeaturedImageUpload(ctx context.Context) error {
	if err := ensureUploadClaims(ctx); err != nil {
		return err
	}
	if authlib.Can(ctx, "admin.posts", "edit") || authlib.Can(ctx, "admin.posts", "create") ||
		authlib.Can(ctx, "admin.pages", "edit") || authlib.Can(ctx, "admin.pages", "create") {
		return nil
	}
	return uploadForbiddenError()
}

func ensureUploadClaims(ctx context.Context) error {
	if ctx == nil {
		return uploadUnauthorizedError()
	}
	claims, ok := authlib.GetClaims(ctx)
	if !ok || claims == nil {
		return uploadUnauthorizedError()
	}
	return nil
}

func uploadUnauthorizedError() error {
	return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
		WithCode(goerrors.CodeUnauthorized).
		WithTextCode("UNAUTHORIZED")
}

func uploadForbiddenError() error {
	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

package admin

import (
	"errors"
	"net/http"
	"testing"

	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	goerrors "github.com/goliatone/go-errors"
)

func TestBrowserCSRFInternalFailureKeepsGenericServerSemantics(t *testing.T) {
	cause := errors.New("secure key backend detail")
	err := browserCSRFInternalError(cause)
	var structured *goerrors.Error
	if !goerrors.As(err, &structured) {
		t.Fatalf("expected structured browser CSRF error, got %T", err)
	}
	if structured.Code != http.StatusInternalServerError {
		t.Fatalf("expected server-error status, got %d", structured.Code)
	}
	if structured.Message != "Browser request protection is temporarily unavailable." {
		t.Fatalf("unexpected public message %q", structured.Message)
	}
	if structured.Message == cause.Error() {
		t.Fatal("internal failure message exposed the cause")
	}
}

func TestBrowserCSRFOnlyRecoversRequestValidationFailures(t *testing.T) {
	for _, err := range []error{csrfmw.ErrTokenMissing, csrfmw.ErrTokenMismatch, csrfmw.ErrTokenExpired} {
		if !isRecoverableBrowserCSRFFailure(err) {
			t.Fatalf("expected %v to be recoverable", err)
		}
	}
	for _, err := range []error{csrfmw.ErrSecureKeyMissing, csrfmw.ErrSessionKeyMissing, errors.New("storage unavailable")} {
		if isRecoverableBrowserCSRFFailure(err) {
			t.Fatalf("expected %v to retain server-error behavior", err)
		}
	}
}

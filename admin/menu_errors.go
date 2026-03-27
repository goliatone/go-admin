package admin

import (
	"errors"
	"fmt"
	"strings"

	cms "github.com/goliatone/go-cms"
)

// ErrMenuTargetNotFound signals that a menu mutation targeted a missing menu or menu item.
var ErrMenuTargetNotFound = errors.New("menu target not found")

func normalizeMenuTargetError(err error) error {
	if err == nil {
		return nil
	}
	if isMenuTargetMissing(err) {
		return err
	}
	if errors.Is(err, cms.ErrMenuNotFound) || looksLikeCMSMenuItemNotFound(err) {
		return fmt.Errorf("%w: %v", ErrMenuTargetNotFound, err)
	}
	return err
}

func isMenuTargetMissing(err error) bool {
	return errors.Is(err, ErrMenuTargetNotFound) || errors.Is(err, ErrNotFound)
}

func looksLikeCMSMenuItemNotFound(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	return strings.HasPrefix(msg, "cms: menu item ") && strings.HasSuffix(msg, " not found")
}

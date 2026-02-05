package admin

import (
	"errors"
	"strings"
)

// TODO: This is an ugly hack, we should be able to do better
func isMenuItemMissing(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, ErrNotFound) {
		return true
	}
	return strings.Contains(strings.ToLower(err.Error()), "menu item not found")
}

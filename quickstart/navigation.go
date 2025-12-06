package quickstart

import (
	"context"
	"fmt"
	"log"
	"os"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// MenuResetter allows backends (including persistent ones) to expose a reset hook.
type MenuResetter interface {
	ResetMenu(ctx context.Context, code string) error
}

// MenuResetterContext matches backends that expose a context-aware reset with a distinct name.
type MenuResetterContext interface {
	ResetMenuContext(ctx context.Context, code string) error
}

// MenuResetterNoContext matches legacy in-memory reset signatures.
type MenuResetterNoContext interface {
	ResetMenu(code string)
}

// ErrResetUnsupported is returned when a reset was requested but the backend does not expose a reset hook.
var ErrResetUnsupported = fmt.Errorf("menu reset unsupported by backend")

// SeedNavigationOptions drives the quickstart menu seeding workflow.
type SeedNavigationOptions struct {
	MenuSvc    admin.CMSMenuService
	MenuCode   string
	Items      []admin.MenuItem
	Reset      bool
	ResetEnv   string
	Locale     string
	Logf       func(format string, args ...any)
	SkipLogger bool
}

// SeedNavigation seeds a menu with idempotent, deterministic ordering.
func SeedNavigation(ctx context.Context, opts SeedNavigationOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}
	menuCode := strings.TrimSpace(opts.MenuCode)
	if menuCode == "" {
		menuCode = "admin.main"
	}
	resetEnv := opts.ResetEnv
	if resetEnv == "" {
		resetEnv = "RESET_NAV_MENU"
	}
	reset := opts.Reset || strings.EqualFold(os.Getenv(resetEnv), "true")
	logf := opts.Logf
	if logf == nil && !opts.SkipLogger {
		logf = log.Printf
	}

	if reset {
		if err := resetMenu(ctx, opts.MenuSvc, menuCode); err != nil && err != ErrResetUnsupported {
			return err
		}
		if err := opts.MenuSvcRecreate(ctx, menuCode); err != nil {
			return err
		}
		if logf != nil {
			logf("[nav seed] reset menu %s", menuCode)
		}
	} else {
		if err := opts.MenuSvcRecreate(ctx, menuCode); err != nil {
			return err
		}
	}

	existing := map[string]bool{}
	if menu, err := opts.MenuSvc.Menu(ctx, menuCode, opts.Locale); err == nil && menu != nil {
		for _, item := range menu.Items {
			collectMenuIDs(item, existing)
		}
	}

	for _, item := range opts.Items {
		item = normalizeMenuItem(item, menuCode)
		if existing[item.ID] {
			continue
		}
		if err := opts.MenuSvc.AddMenuItem(ctx, menuCode, item); err != nil {
			return err
		}
		existing[item.ID] = true
	}

	return nil
}

// MenuSvcRecreate ensures a menu exists, creating it when missing.
func (opts SeedNavigationOptions) MenuSvcRecreate(ctx context.Context, code string) error {
	if _, err := opts.MenuSvc.CreateMenu(ctx, code); err != nil {
		if _, fetchErr := opts.MenuSvc.Menu(ctx, code, opts.Locale); fetchErr != nil {
			return err
		}
	}
	return nil
}

func resetMenu(ctx context.Context, svc admin.CMSMenuService, code string) error {
	if r, ok := svc.(MenuResetter); ok {
		return r.ResetMenu(ctx, code)
	}
	if r, ok := svc.(MenuResetterContext); ok {
		return r.ResetMenuContext(ctx, code)
	}
	if r, ok := svc.(MenuResetterNoContext); ok {
		r.ResetMenu(code)
		return nil
	}
	return ErrResetUnsupported
}

func normalizeMenuItem(item admin.MenuItem, menuCode string) admin.MenuItem {
	item.Menu = menuCode
	if strings.TrimSpace(item.ID) == "" {
		if key, ok := item.Target["key"].(string); ok && strings.TrimSpace(key) != "" {
			item.ID = strings.TrimSpace(key)
		} else {
			item.ID = strings.Trim(path.Join(item.ParentID, strings.ToLower(strings.ReplaceAll(item.Label, " ", "-"))), "/")
		}
	}
	return item
}

func collectMenuIDs(item admin.MenuItem, set map[string]bool) {
	if set == nil {
		return
	}
	if strings.TrimSpace(item.ID) != "" {
		set[item.ID] = true
	}
	for _, child := range item.Children {
		collectMenuIDs(child, set)
	}
}

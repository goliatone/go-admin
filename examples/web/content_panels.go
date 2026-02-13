package main

import (
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

// ensureCoreContentPanels guarantees pages/posts panels exist even when
// dynamic CMS content-type panel registration is unavailable.
func ensureCoreContentPanels(adm *admin.Admin, pages stores.PageRepository, posts stores.PostRepository) error {
	if adm == nil || adm.Registry() == nil {
		return fmt.Errorf("admin registry is required")
	}

	specs := []struct {
		name     string
		required string
		builder  func() *admin.PanelBuilder
	}{
		{
			name:     "pages",
			required: "pages store is required",
			builder: func() *admin.PanelBuilder {
				if pages == nil {
					return nil
				}
				return setup.NewPagesPanelBuilder(pages)
			},
		},
		{
			name:     "posts",
			required: "posts store is required",
			builder: func() *admin.PanelBuilder {
				if posts == nil {
					return nil
				}
				return setup.NewPostsPanelBuilder(posts)
			},
		},
	}

	for _, spec := range specs {
		if panel, ok := adm.Registry().Panel(spec.name); ok && panel != nil {
			continue
		}
		builder := spec.builder()
		if builder == nil {
			return errors.New(spec.required)
		}
		if _, err := adm.RegisterPanel(spec.name, builder); err != nil {
			return fmt.Errorf("register %s panel: %w", spec.name, err)
		}
	}
	if err := ensureCoreContentPanelCommandWiring(adm, pages, posts); err != nil {
		return err
	}

	return nil
}

func ensureCoreContentPanelCommandWiring(adm *admin.Admin, pages stores.PageRepository, posts stores.PostRepository) error {
	if adm == nil {
		return nil
	}
	bus := adm.Commands()
	if bus == nil {
		return nil
	}

	if err := commands.RegisterPageCommandFactories(bus); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register page command factories: %w", err)
	}
	if err := commands.RegisterPostCommandFactories(bus); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register post command factories: %w", err)
	}

	if _, err := admin.RegisterCommand(bus, commands.NewPagePublishCommand(pages)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register pages.publish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPageBulkPublishCommand(pages)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register pages.bulk_publish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPageBulkUnpublishCommand(pages)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register pages.bulk_unpublish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkPublishCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_publish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkUnpublishCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_unpublish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkScheduleCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_schedule command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkArchiveCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_archive command: %w", err)
	}

	return nil
}

func isDuplicateRegistrationError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	return strings.Contains(msg, "already registered") || strings.Contains(msg, "already exists")
}

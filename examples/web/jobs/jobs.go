package jobs

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
)

// databaseBackupJob performs database backups
type databaseBackupJob struct {
	runCount int
}

// NewDatabaseBackupJob creates a new database backup job
func NewDatabaseBackupJob() *databaseBackupJob {
	return &databaseBackupJob{}
}

func (j *databaseBackupJob) Name() string {
	return "jobs.database_backup"
}

func (j *databaseBackupJob) Execute(ctx context.Context, _ DatabaseBackupMsg) error {
	j.runCount++
	log.Printf("Running database backup (run #%d)...", j.runCount)
	return nil
}

func (j *databaseBackupJob) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), DatabaseBackupMsg{})
	}
}

func (j *databaseBackupJob) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@daily"}
}

// cacheCleanupJob performs cache cleanup
type cacheCleanupJob struct{}

// NewCacheCleanupJob creates a new cache cleanup job
func NewCacheCleanupJob() *cacheCleanupJob {
	return &cacheCleanupJob{}
}

func (j *cacheCleanupJob) Name() string {
	return "jobs.cache_cleanup"
}

func (j *cacheCleanupJob) Execute(ctx context.Context, _ CacheCleanupMsg) error {
	log.Println("Cleaning up cache...")
	return nil
}

func (j *cacheCleanupJob) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), CacheCleanupMsg{})
	}
}

func (j *cacheCleanupJob) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@hourly"}
}

// contentExportJob exports content
type contentExportJob struct {
	stores *stores.DataStores
}

// NewContentExportJob creates a new content export job
func NewContentExportJob(dataStores *stores.DataStores) *contentExportJob {
	return &contentExportJob{stores: dataStores}
}

func (j *contentExportJob) Name() string {
	return "jobs.content_export"
}

func (j *contentExportJob) Execute(ctx context.Context, _ ContentExportMsg) error {
	log.Println("Exporting content...")
	return nil
}

func (j *contentExportJob) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), ContentExportMsg{})
	}
}

func (j *contentExportJob) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@weekly"}
}

// inactiveUsersCleanupJob cleans up inactive users
type inactiveUsersCleanupJob struct {
	store *stores.UserStore
}

// NewInactiveUsersCleanupJob creates a new inactive users cleanup job
func NewInactiveUsersCleanupJob(userStore *stores.UserStore) *inactiveUsersCleanupJob {
	return &inactiveUsersCleanupJob{store: userStore}
}

func (j *inactiveUsersCleanupJob) Name() string {
	return "jobs.inactive_users_cleanup"
}

func (j *inactiveUsersCleanupJob) Execute(ctx context.Context, _ InactiveUsersCleanupMsg) error {
	log.Println("Cleaning up inactive users...")
	return nil
}

func (j *inactiveUsersCleanupJob) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), InactiveUsersCleanupMsg{})
	}
}

func (j *inactiveUsersCleanupJob) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@monthly"}
}

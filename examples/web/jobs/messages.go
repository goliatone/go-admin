package jobs

type DatabaseBackupMsg struct{}

func (DatabaseBackupMsg) Type() string { return "jobs.database_backup" }

type CacheCleanupMsg struct{}

func (CacheCleanupMsg) Type() string { return "jobs.cache_cleanup" }

type ContentExportMsg struct{}

func (ContentExportMsg) Type() string { return "jobs.content_export" }

type InactiveUsersCleanupMsg struct{}

func (InactiveUsersCleanupMsg) Type() string { return "jobs.inactive_users_cleanup" }

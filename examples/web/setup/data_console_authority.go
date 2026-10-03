package setup

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"

	"github.com/goliatone/go-admin/data"
)

// The example's authorization epoch is per actor, not a hash of current grants.
// SQLite triggers advance it in the SAME transaction as every authority change,
// including direct SQL and revoke/restore between requests. Tombstones survive
// account deletion; observation never advances an epoch or resolves grants.
func ensurePreviewAuthorityEpochs(ctx context.Context, db *sql.DB) (err error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	for _, statement := range previewAuthoritySchema() {
		if _, err = tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func previewAuthoritySchema() []string {
	bumpActor := func(actor string) string {
		return fmt.Sprintf(`INSERT INTO data_preview_authority_epochs(actor, incarnation, revision)
   VALUES (%s, lower(hex(randomblob(16))), 1)
   ON CONFLICT(actor) DO UPDATE SET revision=revision+1;`, actor)
	}
	bumpRole := `INSERT INTO data_preview_authority_epochs(actor, incarnation, revision)
  SELECT DISTINCT user_id, lower(hex(randomblob(16))), 1 FROM user_custom_roles WHERE role_id=OLD.id
  ON CONFLICT(actor) DO UPDATE SET revision=revision+1;`
	return []string{
		`CREATE TABLE IF NOT EXISTS data_preview_authority_epochs (
   actor TEXT PRIMARY KEY, incarnation TEXT NOT NULL,
   revision INTEGER NOT NULL CHECK(typeof(revision)='integer' AND revision>=0))`,
		`INSERT INTO data_preview_authority_epochs(actor, incarnation, revision)
   SELECT id, lower(hex(randomblob(16))), 0 FROM users WHERE true
   ON CONFLICT(actor) DO NOTHING`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_account_insert AFTER INSERT ON users BEGIN ` + bumpActor("NEW.id") + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_account_delete BEFORE DELETE ON users BEGIN ` + bumpActor("OLD.id") + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_account_update AFTER UPDATE OF status,user_role,metadata,deleted_at ON users
   WHEN OLD.status IS NOT NEW.status OR OLD.user_role IS NOT NEW.user_role OR OLD.metadata IS NOT NEW.metadata OR OLD.deleted_at IS NOT NEW.deleted_at
   BEGIN ` + bumpActor("OLD.id") + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_assignment_insert AFTER INSERT ON user_custom_roles BEGIN ` + bumpActor("NEW.user_id") + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_assignment_delete BEFORE DELETE ON user_custom_roles BEGIN ` + bumpActor("OLD.user_id") + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_assignment_update AFTER UPDATE ON user_custom_roles BEGIN ` + bumpActor("OLD.user_id") + bumpActor("NEW.user_id") + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_role_update AFTER UPDATE OF permissions,tenant_id,org_id,is_system,role_key ON custom_roles
   WHEN OLD.permissions IS NOT NEW.permissions OR OLD.tenant_id IS NOT NEW.tenant_id OR OLD.org_id IS NOT NEW.org_id OR OLD.is_system IS NOT NEW.is_system OR OLD.role_key IS NOT NEW.role_key
   BEGIN ` + bumpRole + ` END`,
		`CREATE TRIGGER IF NOT EXISTS data_preview_role_delete BEFORE DELETE ON custom_roles BEGIN ` + bumpRole + ` END`,
	}
}

var _ data.InsightAuthorizationRevision = DataConsoleAccess{}

func (a DataConsoleAccess) InsightAuthorizationRevision(ctx context.Context, p data.Principal) (string, error) {
	if ctx == nil || a.Users.DB == nil || !p.Valid() {
		return "", data.Error(data.CodeUnavailable)
	}
	var incarnation string
	var revision int64
	err := a.Users.DB.QueryRowContext(ctx, `SELECT incarnation,revision FROM data_preview_authority_epochs WHERE actor=?`, p.ActorID).Scan(&incarnation, &revision)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", data.Error(data.CodeDenied)
		}
		return "", errors.Join(data.Error(data.CodeProvider), err)
	}
	return "web-authority:" + incarnation + ":" + strconv.FormatInt(revision, 10), ctx.Err()
}

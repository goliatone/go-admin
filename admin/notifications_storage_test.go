package admin

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-notifications/pkg/domain"
	"github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestNotificationMemoryRepositoriesSharedCRUD(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("definition repository", func(t *testing.T) {
		t.Parallel()

		repo := newMemoryDefinitionRepository()
		record := domain.NotificationDefinition{Code: "welcome"}

		require.NoError(t, repo.Create(ctx, &record))
		require.NotEqual(t, uuid.Nil, record.ID)

		loaded, err := repo.GetByID(ctx, record.ID)
		require.NoError(t, err)
		require.Equal(t, record.Code, loaded.Code)

		byCode, err := repo.GetByCode(ctx, "WELCOME")
		require.NoError(t, err)
		require.Equal(t, record.ID, byCode.ID)

		record.Name = "Welcome"
		require.NoError(t, repo.Update(ctx, &record))

		result, err := repo.List(ctx, store.ListOptions{})
		require.NoError(t, err)
		require.Len(t, result.Items, 1)
		require.Equal(t, record.Name, result.Items[0].Name)

		require.NoError(t, repo.SoftDelete(ctx, record.ID))

		_, err = repo.GetByID(ctx, record.ID)
		require.ErrorIs(t, err, store.ErrNotFound)

		all, err := repo.List(ctx, store.ListOptions{IncludeSoftDeleted: true})
		require.NoError(t, err)
		require.Len(t, all.Items, 1)
		require.False(t, all.Items[0].DeletedAt.IsZero())
	})

	t.Run("template repository", func(t *testing.T) {
		t.Parallel()

		repo := newMemoryTemplateRepository()
		first := domain.NotificationTemplate{Code: "welcome", Locale: "en", Channel: "email"}
		second := domain.NotificationTemplate{Code: "welcome", Locale: "es", Channel: "email"}

		require.NoError(t, repo.Create(ctx, &first))
		require.NoError(t, repo.Create(ctx, &second))

		found, err := repo.GetByCodeAndLocale(ctx, "WELCOME", "EN", "EMAIL")
		require.NoError(t, err)
		require.Equal(t, first.ID, found.ID)

		listed, err := repo.ListByCode(ctx, "welcome", store.ListOptions{})
		require.NoError(t, err)
		require.Len(t, listed.Items, 2)
	})
}

func TestNotificationMemoryRepositoriesSpecializedOperations(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("event repository", func(t *testing.T) {
		t.Parallel()

		repo := newMemoryEventRepository()
		pending := domain.NotificationEvent{Status: domain.EventStatusPending}
		complete := domain.NotificationEvent{Status: "sent"}

		require.NoError(t, repo.Create(ctx, &pending))
		require.NoError(t, repo.Create(ctx, &complete))

		items, err := repo.ListPending(ctx, 10)
		require.NoError(t, err)
		require.Len(t, items, 1)
		require.Equal(t, pending.ID, items[0].ID)

		require.NoError(t, repo.UpdateStatus(ctx, pending.ID, "processed"))
		updated, err := repo.GetByID(ctx, pending.ID)
		require.NoError(t, err)
		require.Equal(t, "processed", updated.Status)
	})

	t.Run("message and attempt repositories", func(t *testing.T) {
		t.Parallel()

		messageRepo := newMemoryMessageRepository()
		attemptRepo := newMemoryAttemptRepository()
		eventID := uuid.New()
		message := domain.NotificationMessage{EventID: eventID}

		require.NoError(t, messageRepo.Create(ctx, &message))

		messages, err := messageRepo.ListByEvent(ctx, eventID)
		require.NoError(t, err)
		require.Len(t, messages, 1)
		require.Equal(t, message.ID, messages[0].ID)

		attempt := domain.DeliveryAttempt{MessageID: message.ID}
		require.NoError(t, attemptRepo.Create(ctx, &attempt))

		attempts, err := attemptRepo.ListByMessage(ctx, message.ID)
		require.NoError(t, err)
		require.Len(t, attempts, 1)
		require.Equal(t, attempt.ID, attempts[0].ID)
	})

	t.Run("preference repository", func(t *testing.T) {
		t.Parallel()

		repo := newMemoryPreferenceRepository()
		pref := domain.NotificationPreference{
			SubjectType:    "user",
			SubjectID:      "42",
			DefinitionCode: "welcome",
			Channel:        "email",
		}

		require.NoError(t, repo.Create(ctx, &pref))

		found, err := repo.GetBySubject(ctx, "USER", "42", "WELCOME", "EMAIL")
		require.NoError(t, err)
		require.Equal(t, pref.ID, found.ID)
	})

	t.Run("inbox repository", func(t *testing.T) {
		t.Parallel()

		repo := newMemoryInboxRepository()
		first := domain.InboxItem{UserID: "user-1", Unread: true}
		second := domain.InboxItem{UserID: "user-1", Unread: true}

		require.NoError(t, repo.Create(ctx, &first))
		require.NoError(t, repo.Create(ctx, &second))

		listed, err := repo.ListByUser(ctx, "USER-1", store.ListOptions{})
		require.NoError(t, err)
		require.Len(t, listed.Items, 2)

		count, err := repo.CountUnread(ctx, "user-1")
		require.NoError(t, err)
		require.Equal(t, 2, count)

		require.NoError(t, repo.MarkRead(ctx, first.ID, true))
		readItem, err := repo.GetByID(ctx, first.ID)
		require.NoError(t, err)
		require.False(t, readItem.Unread)
		require.False(t, readItem.ReadAt.IsZero())

		until := time.Now().Add(2 * time.Hour)
		require.NoError(t, repo.Snooze(ctx, first.ID, until))
		snoozed, err := repo.GetByID(ctx, first.ID)
		require.NoError(t, err)
		require.WithinDuration(t, until.UTC(), snoozed.SnoozedUntil, time.Second)

		require.NoError(t, repo.Dismiss(ctx, second.ID))
		dismissed, err := repo.GetByID(ctx, second.ID)
		require.NoError(t, err)
		require.False(t, dismissed.DismissedAt.IsZero())

		count, err = repo.CountUnread(ctx, "user-1")
		require.NoError(t, err)
		require.Zero(t, count)
	})
}

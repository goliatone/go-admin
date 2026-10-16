package quickstart

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"time"

	exportjob "github.com/goliatone/go-export/adapters/job"
	exportcmd "github.com/goliatone/go-export/command"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/goliatone/go-job/queue/adapters/postgres"
	"github.com/goliatone/go-job/queue/worker"
)

func (h *DurableExportHost) background(ctx context.Context, work ExportBackgroundWork) (context.Context, export.Actor, error) {
	trusted, a, err := h.cfg.ResolveBackground(ctx, work)
	if err != nil {
		return nil, export.Actor{}, err
	}
	if trusted == nil || a.ID == "" {
		return nil, export.Actor{}, durableExportDenied()
	}
	ns, err := h.cfg.Namespace(trusted, a)
	if err != nil {
		return nil, export.Actor{}, err
	}
	if ns == "" || (work.Namespace != "" && work.Namespace != ns) {
		return nil, export.Actor{}, durableExportDenied()
	}
	return trusted, a, nil
}

func (h *DurableExportHost) configureWorker() error {
	h.tasks = map[string]job.Task{}
	generate := exportjob.NewGenerateTask(exportjob.TaskConfig{Dispatch: func(ctx context.Context, m exportcmd.GenerateExport) error {
		ctx, a, err := h.background(ctx, ExportBackgroundWork{Kind: ExportBackgroundGenerate, ExportID: m.ExportID})
		if err != nil {
			return err
		}
		// Persisted actors are untrusted routing hints; current policy supplies
		// the command actor. Native replay uses the persisted request itself.
		m.Actor = a
		return exportcmd.NewGenerateExportHandler(h).Execute(ctx, m)
	}})
	h.tasks[generate.GetID()] = generate
	if h.Webhooks != nil {
		task, err := exportjob.NewWebhookTask(exportjob.WebhookTaskConfig{
			Resolve: func(ctx context.Context, m *job.ExecutionMessage) (context.Context, export.Actor, error) {
				var payload exportcmd.DeliverWebhook
				if err := decodeDurableExportPayload(m, &payload); err != nil {
					return nil, export.Actor{}, err
				}
				return h.background(ctx, ExportBackgroundWork{Kind: ExportBackgroundWebhook, ExportID: payload.ExportID})
			},
			Dispatch: func(ctx context.Context, m exportcmd.DeliverWebhook) error {
				return (&exportcmd.DeliverWebhookHandler{Service: h.Webhooks}).Execute(ctx, m)
			},
		})
		if err != nil {
			return err
		}
		h.tasks[task.GetID()] = task
	}
	h.Worker = worker.NewWorker(postgres.NewAdapter(h.Queue), worker.WithConcurrency(h.cfg.WorkerConcurrency), worker.WithRetryPolicy(h.cfg.RetryPolicy), worker.WithTaskCommanderRetries(false))
	for _, task := range h.tasks {
		if err := h.Worker.Register(task); err != nil {
			return err
		}
	}
	return nil
}

// ExecuteMessage uses the same trusted task dispatch as the native worker. It
// does not acknowledge a queue receipt; the queue consumer owns ACK/NACK/leases.
func (h *DurableExportHost) ExecuteMessage(ctx context.Context, m *job.ExecutionMessage) error {
	if m == nil {
		return durableExportInvalid("export job message required")
	}
	task, ok := h.tasks[m.JobID]
	if !ok {
		return durableExportInvalid("unregistered durable export task")
	}
	executor, ok := task.(interface {
		Execute(context.Context, *job.ExecutionMessage) error
	})
	if !ok {
		return durableExportInvalid("durable export task cannot execute persisted input")
	}
	return executor.Execute(ctx, m)
}

func decodeDurableExportPayload(m *job.ExecutionMessage, value any) error {
	if m == nil {
		return durableExportInvalid("export job message required")
	}
	var raw []byte
	var err error
	switch data := m.Parameters["payload"].(type) {
	case []byte:
		raw = data
	case json.RawMessage:
		raw = data
	case string:
		raw = []byte(data)
	default:
		raw, err = json.Marshal(data)
	}
	if err != nil {
		return durableExportInvalid("invalid durable export payload")
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if err = decoder.Decode(value); err != nil {
		return durableExportInvalid("invalid durable export payload")
	}
	return nil
}

// Poll admits bounded due work from a trusted namespace catalog. Failed scopes
// are reported after other scopes are processed; they retain their due cursor.
func (h *DurableExportHost) Poll(ctx context.Context) error {
	if h.cfg.RecurringNamespaces == nil {
		return nil
	}
	namespaces, err := h.cfg.RecurringNamespaces(ctx)
	if err != nil {
		return err
	}
	if len(namespaces) > 1000 {
		return durableExportInvalid("recurring namespace catalog exceeds 1000 entries")
	}
	var failures []error
	seen := map[string]bool{}
	through := h.cfg.Now().UTC()
	for _, ns := range namespaces {
		if err := ctx.Err(); err != nil {
			return err
		}
		if seen[ns] {
			continue
		}
		seen[ns] = true
		if ns == "" {
			failures = append(failures, durableExportInvalid("empty recurring namespace"))
			continue
		}
		ids, err := h.Recurring.Due(ctx, ns, through, h.cfg.ScheduleBatch)
		if err != nil {
			failures = append(failures, err)
			continue
		}
		for _, id := range ids {
			if _, err = h.TickSchedule(ctx, ns, id, through, h.cfg.OccurrenceBatch); err != nil {
				failures = append(failures, err)
			}
		}
	}
	return errors.Join(failures...)
}

// Run owns worker and poller lifetime. Poll failures are reported to the required
// observer without advancing failed scopes or preventing other scopes' work.
// Cancellation stops active work; its unacknowledged leases recover normally.
func (h *DurableExportHost) Run(ctx context.Context) (err error) {
	if ctx == nil {
		return durableExportInvalid("durable export lifecycle context required")
	}
	if err = h.CheckReady(ctx); err != nil {
		return err
	}
	if err = h.Worker.Start(ctx); err != nil {
		return err
	}
	defer func() {
		stopCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		err = errors.Join(err, h.Worker.Stop(stopCtx))
	}()
	if h.cfg.RecurringNamespaces == nil {
		<-ctx.Done()
		return nil
	}
	ticker := time.NewTicker(h.cfg.PollInterval)
	defer ticker.Stop()
	for {
		if err = h.Poll(ctx); err != nil && ctx.Err() == nil {
			h.cfg.OnPollError(err)
		}
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

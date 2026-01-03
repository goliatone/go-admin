package quickstart

import (
	"context"
	"time"

	"github.com/goliatone/go-export/adapters/exportapi"
	"github.com/goliatone/go-export/export"
)

// AsyncRequesterFactory builds an async requester after the export service is initialized.
type AsyncRequesterFactory func(service export.Service, logger export.Logger) exportapi.AsyncRequester

// WithExportAsyncRequester configures async export requests (for 202 + status/download URLs).
func WithExportAsyncRequester(factory AsyncRequesterFactory) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.asyncRequesterFactory = factory
	}
}

// WithExportAsyncInProcess enables in-process async exports using a background goroutine.
// This is suitable for demos; production should use a job runner/queue.
func WithExportAsyncInProcess(timeout time.Duration) ExportBundleOption {
	return func(opts *exportBundleOptions) {
		if opts == nil {
			return
		}
		opts.asyncRequesterFactory = func(service export.Service, logger export.Logger) exportapi.AsyncRequester {
			return inProcessRequester{
				service: service,
				logger:  logger,
				timeout: timeout,
			}
		}
	}
}

type inProcessRequester struct {
	service export.Service
	logger  export.Logger
	timeout time.Duration
}

func (r inProcessRequester) RequestExport(ctx context.Context, actor export.Actor, req export.ExportRequest) (export.ExportRecord, error) {
	if r.service == nil {
		return export.ExportRecord{}, export.NewError(export.KindNotImpl, "export service not configured", nil)
	}

	asyncReq := req
	asyncReq.Delivery = export.DeliveryAsync
	asyncReq.Output = nil

	record, err := r.service.RequestExport(ctx, actor, asyncReq)
	if err != nil {
		return record, err
	}

	go func() {
		execCtx := context.Background()
		var cancel context.CancelFunc
		if r.timeout > 0 {
			execCtx, cancel = context.WithTimeout(execCtx, r.timeout)
			defer cancel()
		}
		if _, err := r.service.GenerateExport(execCtx, actor, record.ID, asyncReq); err != nil {
			logger := r.logger
			if logger == nil {
				logger = export.NopLogger{}
			}
			logger.Errorf("async export failed: %v", err)
		}
	}()

	return record, nil
}

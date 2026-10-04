// Package datamodule exposes the shared synthetic dataset reference adapter
// for the kitchen-sink application. Its implementation lives in the root module
// so library conformance tests do not depend on a separately published example.
package datamodule

import reference "github.com/goliatone/go-admin/data/examples/datamodule"

const (
	TargetID            = reference.TargetID
	OrdersReportSurface = reference.OrdersReportSurface
)

type Record = reference.Record
type Runtime = reference.Runtime
type RuntimeOptions = reference.RuntimeOptions
type OrdersReport = reference.OrdersReport

func Hash(value string) string { return reference.Hash(value) }

func Open(filename string) (*Runtime, error) { return reference.Open(filename) }

func OpenWithOptions(filename string, options RuntimeOptions) (*Runtime, error) {
	return reference.OpenWithOptions(filename, options)
}

func RenderOrdersReport(report OrdersReport) ([]byte, error) {
	return reference.RenderOrdersReport(report)
}

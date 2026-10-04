package datamodule

import (
	"bytes"
	"html/template"
)

// The synthetic orders report is an ordinary application view. The active
// report page and the Data module's isolated preview render this same
// fragment over the same OrdersReport model, so a preview shows exactly what
// the application would show once the prepared data is active. The view is
// read-only: it offers no edit, export or other mutation control. Its layout
// rules travel with it and reuse the console tokens of the page around it.

var ordersReportTemplate = template.Must(template.New("orders-report").Parse(`<section class="orders-report" aria-labelledby="orders-report-title" data-orders-report>
  <style>
    .orders-report { display: flex; flex-direction: column; gap: 16px; min-width: 0; color: var(--console-text); }
    .orders-report__title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; }
    .orders-report__intro { margin: 4px 0 0; color: var(--console-text-muted); }
    .orders-report__summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 0; }
    .orders-report__metric { padding: 12px 16px; border: 1px solid var(--console-border); border-radius: var(--console-radius-surface); background: var(--console-surface); }
    .orders-report__metric dt { color: var(--console-text-muted); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    .orders-report__metric dd { margin: 4px 0 0; font-size: 24px; line-height: 32px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .orders-report__unit { font-size: 14px; font-weight: 400; color: var(--console-text-muted); white-space: nowrap; }
    .orders-report__table-wrap { overflow-x: auto; border: 1px solid var(--console-border); border-radius: var(--console-radius-surface); background: var(--console-surface); }
    .orders-report__caption { padding: 12px 16px; caption-side: top; text-align: left; font-weight: 600; }
    .orders-report__table .orders-report__number { text-align: right; font-variant-numeric: tabular-nums; }
    @media (max-width: 640px) { .orders-report__table .orders-report__number { text-align: left; } }
    .orders-report__empty { background: var(--console-surface); }
    .orders-report__empty-title { margin: 0 0 4px; color: var(--console-text); font-weight: 600; }
  </style>
  <header class="orders-report__head">
    <h1 class="orders-report__title" id="orders-report-title">Synthetic orders report</h1>
    <p class="orders-report__intro">Orders in the synthetic orders data, with their local day and amount.</p>
  </header>
  <dl class="orders-report__summary">
    <div class="orders-report__metric"><dt>Orders</dt><dd data-report-order-count>{{.OrderCount}}</dd></div>
    <div class="orders-report__metric"><dt>Total amount</dt><dd><span data-report-amount-total>{{.AmountTotal}}</span> <span class="orders-report__unit">{{.Unit}}</span></dd></div>
  </dl>
  {{- if .Orders}}
  <div class="orders-report__table-wrap">
    <table class="console-table orders-report__table">
      <caption class="orders-report__caption">Orders by order ID</caption>
      <thead><tr><th scope="col">Order</th><th scope="col">Local day</th><th scope="col" class="orders-report__number">Amount</th></tr></thead>
      <tbody>
        {{- range .Orders}}
        <tr data-report-order><td data-label="Order"><code>{{.ID}}</code></td><td data-label="Local day">{{.LocalDay}}</td><td data-label="Amount" class="orders-report__number">{{.Amount}}</td></tr>
        {{- end}}
      </tbody>
    </table>
  </div>
  {{- else}}
  <div class="console-empty orders-report__empty" data-report-empty>
    <p class="orders-report__empty-title">No orders</p>
    <p>This data has no orders, so the report lists no rows and its total is 0.</p>
  </div>
  {{- end}}
</section>`))

// RenderOrdersReport renders the report view fragment. Values are escaped by
// html/template; the fragment carries no document, script, form or link.
func RenderOrdersReport(report OrdersReport) ([]byte, error) {
	if report.Orders == nil {
		report.Orders = []Record{}
	}
	var out bytes.Buffer
	if err := ordersReportTemplate.Execute(&out, report); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

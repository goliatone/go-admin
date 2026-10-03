package datamodule

import (
	"strings"
	"testing"
)

func TestOrdersReportViewRendersReadyRowsAndQuietEmptyState(t *testing.T) {
	ready, err := RenderOrdersReport(OrdersReport{Orders: []Record{{ID: "order-1", Amount: 120, LocalDay: "2026-01-01"}, {ID: "order-2", Amount: 80, LocalDay: "2026-01-01"}, {ID: "order-3", Amount: 50, LocalDay: "2026-01-01"}},
		OrderCount: 3, AmountTotal: 250, Unit: "fixture amount"})
	if err != nil {
		t.Fatal(err)
	}
	html := string(ready)
	for _, want := range []string{`<h1 class="orders-report__title" id="orders-report-title">Synthetic orders report</h1>`, `data-report-order-count>3</dd>`,
		`data-report-amount-total>250</span> <span class="orders-report__unit">fixture amount</span>`, `<td data-label="Order"><code>order-2</code></td>`} {
		if !strings.Contains(html, want) {
			t.Fatalf("ready report lacks %q:\n%s", want, html)
		}
	}
	if got := strings.Count(html, "data-report-order>"); got != 3 || strings.Contains(html, "data-report-empty") {
		t.Fatalf("ready rows %d:\n%s", got, html)
	}
	quiet, err := RenderOrdersReport(OrdersReport{Unit: "fixture amount"})
	if err != nil {
		t.Fatal(err)
	}
	html = string(quiet)
	if !strings.Contains(html, "data-report-empty") || !strings.Contains(html, "data-report-order-count>0</dd>") || strings.Contains(html, "<table") {
		t.Fatalf("quiet report is not the empty state:\n%s", html)
	}
}

func TestOrdersReportViewEscapesValuesAndOffersNoMutation(t *testing.T) {
	hostile := `<img src=x onerror="alert(1)">`
	out, err := RenderOrdersReport(OrdersReport{Orders: []Record{{ID: hostile, Amount: 1, LocalDay: hostile}}, OrderCount: 1, AmountTotal: 1, Unit: hostile})
	if err != nil {
		t.Fatal(err)
	}
	html := strings.ToLower(string(out))
	if strings.Contains(html, "<img") {
		t.Fatalf("report values were not escaped:\n%s", out)
	}
	// A read-only application view: no form, button, link or script.
	for _, unwanted := range []string{"<form", "<button", "<a ", "<script", "<input"} {
		if strings.Contains(html, unwanted) {
			t.Fatalf("report view offers %q", unwanted)
		}
	}
}

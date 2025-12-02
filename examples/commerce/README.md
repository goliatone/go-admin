## Commerce Example

This example shows a small e-commerce admin with users, products, and orders backed by in-memory stores.

### Run it

```bash
cd examples/commerce
/Users/goliatone/.g/go/bin/go run .
```

Visit `http://localhost:8081/admin` and include `X-User-ID` (and optional `X-User-Role`) headers when hitting APIs to satisfy the demo auth guard.

### What’s wired

- Dashboard widget `commerce.widget.sales_overview` with seeded orders/products/revenue stats.
- Panels: `users`, `products`, and `orders` under `/admin/api/<panel>`.
- Navigation from the commerce module (dashboard + panels) via `/admin/api/navigation`.
- Search adapters for all three entities at `/admin/api/search?query=<q>`.
- Commands: `commerce.restock_low` (CLI) and `commerce.daily_report` (cron-enabled, exposed through `/admin/api/jobs`).

### Handy requests

```bash
# List users (ensure header for mock auth)
curl -H "X-User-ID: demo" http://localhost:8081/admin/api/users

# Trigger search
curl -H "X-User-ID: demo" "http://localhost:8081/admin/api/search?query=hoodie"

# Inspect jobs (cron hooks)
curl -H "X-User-ID: demo" http://localhost:8081/admin/api/jobs
```

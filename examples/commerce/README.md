## Commerce Example

This example shows a small e-commerce admin with users, products, and orders backed by in-memory stores. It includes a lightweight demo UI for visual interaction.

### Run it

```bash
cd examples/commerce
go run .
```

### Demo UI

Open `http://localhost:8081/` in your browser. On first load, paste a token from the startup logs when prompted. The UI provides:

- **Dashboard**: Sales overview with order count, products, and revenue
- **Users**: List/create/edit customers with loyalty tiers
- **Products**: Manage inventory with SKUs and pricing
- **Orders**: View and manage order status

The token is saved to localStorage for convenience. Pass `?token=<TOKEN>` as a URL parameter for direct access.

### API Access

APIs require `Authorization: Bearer <token>` header. Startup logs print demo tokens for seeded users.

### What’s wired

- Dashboard widget `commerce.widget.sales_overview` with seeded orders/products/revenue stats.
- Panels: `users`, `products`, and `orders` under `/admin/api/panels/<panel>`.
- Navigation from the commerce module (dashboard + panels) via `/admin/api/navigation`.
- Search adapters for all three entities at `/admin/api/search?query=<q>`.
- Commands: `commerce.restock_low` (CLI) and `commerce.daily_report` (cron-enabled, exposed through `/admin/api/jobs`).

### Handy requests

```bash
# List users
curl -H "Authorization: Bearer <token>" http://localhost:8081/admin/api/panels/users

# Trigger search
curl -H "Authorization: Bearer <token>" "http://localhost:8081/admin/api/search?query=hoodie"

# Inspect jobs (cron hooks)
curl -H "Authorization: Bearer <token>" http://localhost:8081/admin/api/jobs
```

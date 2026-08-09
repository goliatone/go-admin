# @goliatone/go-admin-client

Public browser contracts for applications built with go-admin.

The package publishes ESM JavaScript and TypeScript declarations through an explicit export map. Application-specific modules are intentionally excluded.

```ts
import { httpRequest } from '@goliatone/go-admin-client/shared/transport/http-client';
import { createSSEClient } from '@goliatone/go-admin-client/services/sse-client';
```

Panel list consumers can provide an explicit capability contract:

```ts
import { DataGrid, type DataGridCapabilities } from '@goliatone/go-admin-client/datatable';

const capabilities: DataGridCapabilities = {
  selection: false,
  bulk: false,
  export: false,
};

new DataGrid({ tableId, apiEndpoint, columns, capabilities });
```

All three booleans are required when the object is present. DataGrid normalizes
`selection` to `bulk || export`, skips disabled structure and lifecycle binding,
and preserves the legacy all-enabled behavior when `capabilities` is omitted.

Row-action structure follows the configured action policy. Default actions and
their column remain enabled for compatibility. Set `useDefaultActions: false`
without a `rowActions` provider to omit the action header, filter, and body cells
and exclude that fixed column from loading, error, empty, and grouped colspans.
A custom `rowActions` provider retains the action column even when default
actions are disabled.

Use the typed `onStateChange` callback for application-specific loading, ready,
empty, and error announcements. The callback runs after ready, empty, and error
content is rendered, and it also reports loading when stale rows intentionally
remain visible. Callback failures are isolated from the grid refresh lifecycle.

```ts
new DataGrid({
  tableId,
  apiEndpoint,
  columns,
  onStateChange(state) {
    status.textContent = messages[state];
  },
});
```

See the repository compatibility matrix before coordinating browser-client and Go module upgrades.

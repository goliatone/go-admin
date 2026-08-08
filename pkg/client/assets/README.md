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

See the repository compatibility matrix before coordinating browser-client and Go module upgrades.

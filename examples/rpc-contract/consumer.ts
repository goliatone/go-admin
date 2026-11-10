import type { RPCClient } from "./provider/rpc_client.js";
import { httpRequestWith } from "./admin-transport/http-client.js";
import { createDispatcher, createEndpoints } from "./generated/contracts.js";
import type {
  CommandID, DispatchCallback, DispatchRequest, DispatchResponse,
  InvokeCallback, Method, MethodRequests, MethodOutputs, SuccessEnvelope,
} from "./generated/contracts.js";

// The proof stages provider types from the published Go module and this existing
// admin transport source. Applications resolve these imports from their assets.
export function prepareBrowserFetch(fetchImpl: typeof fetch): typeof fetch {
  return (input, init) => httpRequestWith(fetchImpl, input, init ?? {});
}

export function bind(client: RPCClient) {
  const invoke: InvokeCallback = <K extends Method>(method: K, request: MethodRequests[K]) =>
    client.call<SuccessEnvelope<MethodOutputs[K]>, MethodRequests[K]>(method, request);
  const dispatch: DispatchCallback = <K extends CommandID>(request: DispatchRequest<K>) =>
    client.call<SuccessEnvelope<DispatchResponse<K>>, DispatchRequest<K>>("admin.commands.dispatch", request);
  return { call: createEndpoints(invoke), dispatch: createDispatcher(dispatch), dynamic: client };
}

export async function updateResource(client: RPCClient) {
  const response = await bind(client).dispatch("resources.update", {
    resourceId: "resource-a", dryRun: false, resource: { displayName: "Example" },
    count: 1, revision: "18446744073709551615",
  });
  if (!("data" in response)) return { state: "unknown" as const };
  const outcome = response.data;
  if (!outcome.receipt.Accepted) return { state: "not-accepted" as const };
  if (outcome.receipt.Mode === "queued") return { state: "accepted" as const, receipt: outcome.receipt };
  if (!("result" in outcome)) return { state: "accepted" as const, receipt: outcome.receipt };
  return { state: "completed" as const, result: outcome.result };
}
// A rejected network promise after a mutation has an unknown outcome. This
// recipe never retries automatically; an idempotency hint is not deduplication.

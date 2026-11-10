import { bind } from "./consumer.js";
import type { RPCClient } from "./provider/rpc_client.js";
import type { DispatchRequest, DispatchResponse, SuccessEnvelope } from "./generated/contracts.js";

export function compileContract(client: RPCClient) {
  const api = bind(client);
  const input = { resourceId: "resource-a", dryRun: true, resource: { displayName: "nested" }, count: 1, revision: "18446744073709551615" };
  void api.dispatch("resources.update", input, {ids:["selection"], options:{Mode:"queued", Delay:1, RunAt:null, IdempotencyKey:"hint", DedupPolicy:"ignore",CorrelationID:"hint",Metadata:{trace:"trace"}},meta:{requestId:"hint"}});
  void api.call("resources.update.typed", input);
  void api.call("resources.get", {resourceId:"resource-a"});
  // @ts-expect-error unknown command ID
  void api.dispatch("resources.missing", input);
  // @ts-expect-error method names are checked independently
  void api.call("resources.missing", input);
  // @ts-expect-error Go uint64,string is a public string
  void api.dispatch("resources.update", {...input, revision:123});
  // @ts-expect-error camel-case input field is required
  void api.dispatch("resources.update", {resourceId:"resource-a", dry_run:true,resource:input.resource,count:1,revision:"1"});
  // @ts-expect-error nested public JSON name is preserved
  void api.dispatch("resources.update", {...input, resource:{display_name:"wrong"}});
  // @ts-expect-error typed query cannot accept a mutation payload
  void api.call("resources.get", {resourceId:"resource-a",dryRun:true});
  void api.dispatch("resources.touch",input).then(response=>{
    if (response.data) {
      // @ts-expect-error receipt-only commands promise no result
      const result: string = response.data.result;
      void result;
    }
  });
  void api.call("resources.update.typed",input).then(response=>{
    // @ts-expect-error success data can be omitted
    const applied: boolean = response.data.applied;
    void applied;
  });
}
export const canonical: DispatchRequest<"resources.update"> = {data:{command_id:"resources.update",name:"legacy-alias",payload:{resourceId:"resource-a",dryRun:false,resource:{displayName:""},count:0,revision:"0"},ids:[],options:{Mode:"inline",IdempotencyKey:"",DedupPolicy:"",Delay:0,RunAt:null,CorrelationID:"",Metadata:null}}};
export const optionalFields: SuccessEnvelope<DispatchResponse<"resources.update">> = {data:{receipt:{Accepted:true,Mode:"queued",CommandID:"resources.update",DispatchID:"receipt",EnqueuedAt:null,CorrelationID:""},status_reference:"jobs/receipt",validation_errors:[{path:"resource.displayName",code:"example",message:"public",details:{limit:3}}]}};

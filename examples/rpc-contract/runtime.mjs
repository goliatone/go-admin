import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HTTPRPCClient, RPCClientError } from "./rpc-bundle.mjs";
import { bind, prepareBrowserFetch, updateResource } from "./js/consumer.js";
const info = JSON.parse(await readFile(process.argv[2], "utf8"));
const wire = [];
globalThis.location = new URL(info.endpoint);
globalThis.window = {location: globalThis.location};
globalThis.document = {querySelector: () => ({getAttribute: () => "fixture-csrf"})};
const realFetch = globalThis.fetch;
const capture = async (url, init) => {
  assert.equal(new Headers(init.headers).get("X-CSRF-Token"), "fixture-csrf");
  const response = await realFetch(url, init);
  wire.push({request:JSON.parse(init.body), status:response.status, response:await response.clone().json()});
  return response;
};
function client(token=info.token, fetchImpl=capture) {
  return new HTTPRPCClient({endpoint:info.endpoint,headers:{Authorization:`Bearer ${token}`,"X-Correlation-ID":"transport-correlation"},requestInit:{credentials:"same-origin"},fetchImpl:prepareBrowserFetch(fetchImpl)});
}
const api=bind(client());
const input={resourceId:"resource-a",dryRun:true,resource:{displayName:"nested"},count:9007199254740991,revision:"18446744073709551615"};
const response=await api.dispatch("resources.update",input,{ids:["selection"],options:{IdempotencyKey:"hint",CorrelationID:"forged",Metadata:{actor_id:"forged"}},meta:{actorId:"forged",tenant:"forged",correlationId:"envelope"}});
assert.ok("data" in response);
assert.deepEqual(response.data.result.input,input);
assert.equal(response.data.result.data,"application-data");
assert.equal(response.data.result.result,"application-result");
assert.equal(response.data.receipt.CorrelationID,"transport-correlation");
assert.deepEqual(wire.at(-1).request.params.data.ids,["selection"]);
const dedicated=await api.call("resources.update.typed",input);
assert.deepEqual(dedicated.data,response.data.result);
const queued=await api.dispatch("resources.update",input,{options:{Mode:"queued"}});
assert.equal(queued.data.receipt.Mode,"queued");assert.equal(queued.data.receipt.Accepted,true);assert.ok(!("result" in queued.data));
assert.equal(queued.data.receipt.EnqueuedAt,"2026-01-01T00:00:00Z");
assert.ok(!("status_reference" in queued.data));assert.ok(!("validation_errors" in queued.data));
const receipt=await api.dispatch("resources.touch",input);
assert.equal(receipt.data.receipt.Mode,"inline");assert.ok(!("result" in receipt.data));
for (const [name,value] of Object.entries({null:null,false:false,zero:0,empty:"",array:[],object:{},domain:{data:"business",result:false}})) {
  const out=await api.call("resources.wire",{case:name});assert.ok("data" in out,name);assert.deepEqual(out.data,value,name);
}
assert.ok(!("data" in await api.call("resources.wire",{case:"absent"})));
const status=await api.call("resources.wire",{case:"status"});assert.equal(status.data.status_reference,"jobs/status-example");assert.equal(status.data.validation_errors[0].path,"resource.displayName");
const failure=await api.dispatch("resources.update",{...input,scenario:"failure"});assert.equal(failure.data.result.failed,true);
for(const [scenario,code] of [["conflict","CONFLICT"],["cancel","CANCELED"]]) {
  await assert.rejects(api.dispatch("resources.update",{...input,scenario}),error=>error instanceof RPCClientError && error.code===code && !error.message.includes("private"));
}
await assert.rejects(bind(client(info.deniedToken)).dispatch("resources.update",input),error=>error instanceof RPCClientError&&error.code==="FORBIDDEN");
await assert.rejects(bind(client("invalid")).call("resources.get",{resourceId:"resource-a"}),error=>error instanceof RPCClientError&&error.status===401);
// Explicit dynamic fallback retains canonical aliases and command_id precedence.
const dynamic=await api.dynamic.call("admin.commands.dispatch",{data:{name:"resources.legacy",payload:input}});assert.deepEqual(dynamic.data.result.input,input);
// Send ambiguous wrappers as raw wire bytes; ordinary JSON.stringify cannot
// represent repeated members. The shipped client must report RPC_INVALID_PARAMS,
// and the shared service must remain unchanged.
const duplicateBefore=await api.call("resources.get",{resourceId:"resource-a"});
const safe=JSON.stringify(input);
const mutating=JSON.stringify({...input,dryRun:false});
for (const params of [
  `{"data":{"command_id":"resources.update","payload":${safe},"payload":${mutating}}}`,
  `{"data":{"command_id":"resources.update","payload":{"actor_id":"forged"},"payload":${mutating}}}`,
  `{"data":{"command_id":"resources.update","payload":${safe},"PAYLOAD":${mutating}}}`,
  `{"data":{"command_id":"resources.update","payload":${safe}},"DATA":{"payload":${mutating}}}`,
]) {
  const ambiguous=bind(client(info.token,(url,init)=>capture(url,{...init,body:`{"method":"admin.commands.dispatch","params":${params}}`})));
  await assert.rejects(ambiguous.dispatch("resources.update",input),error=>error instanceof RPCClientError&&error.code==="RPC_INVALID_PARAMS"&&error.status===400);
}
const duplicateAfter=await api.call("resources.get",{resourceId:"resource-a"});
assert.equal(duplicateAfter.data.writes,duplicateBefore.data.writes);
// Actual response loss after commit: consume and discard the real response,
// then surface a network failure. The application reports unknown and does not retry.
const before=await api.call("resources.get",{resourceId:"resource-a"});let attempts=0;
const lost=client(info.token,async (url,init)=>{attempts++;const response=await realFetch(url,init);await response.arrayBuffer();throw new TypeError("simulated response loss");});
let state="";try {await updateResource(lost);} catch(error) {assert.ok(error instanceof TypeError);state="unknown";}
assert.equal(state,"unknown");assert.equal(attempts,1);
const after=await api.call("resources.get",{resourceId:"resource-a"});assert.equal(after.data.writes,before.data.writes+1);
const completed=await updateResource(client());assert.equal(completed.state,"completed");
console.log(JSON.stringify({status:"PASS",requests:wire.length,lostResponseAttempts:attempts,wire}));

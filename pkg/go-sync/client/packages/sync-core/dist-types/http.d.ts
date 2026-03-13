import type { MutationResponse, ResourceRef, ResourceSnapshot, SyncEnvelopeError } from "./contracts";
export declare function parseReadEnvelope<T>(ref: ResourceRef, payload: unknown): ResourceSnapshot<T>;
export declare function parseMutationEnvelope<T>(ref: ResourceRef, payload: unknown): MutationResponse<T>;
export declare function parseErrorEnvelope<T>(ref: ResourceRef, payload: unknown): SyncEnvelopeError<T>;

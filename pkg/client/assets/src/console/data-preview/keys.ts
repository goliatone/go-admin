// Where a console identity's remembered preview launches live (see store.ts).
// Dependency-free, so the Data explorer can forget them on denial before the
// application preview module was ever loaded.

export const LAUNCH_STORE_PREFIX = 'go-admin:data-preview:v1:';

/** Remembered launches belong to one console identity: application, environment, actor and scope. */
export function launchStoreScope(identity: { application_id: string; environment_id: string; actor_id: string; scope_key: string } | null | undefined): string {
  return identity ? [identity.application_id, identity.environment_id, identity.actor_id, identity.scope_key].join('\u0000') : '';
}

export function launchStoreKey(scope: string): string {
  return `${LAUNCH_STORE_PREFIX}${scope || 'default'}`;
}

/** Forget a scope's remembered launches; blocked storage holds nothing to forget. */
export function forgetLaunches(scope: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(launchStoreKey(scope));
  } catch {
    // Blocked storage: nothing was remembered.
  }
}

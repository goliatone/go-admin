// Storage key scheme for identity-namespaced console state. Kept in its own
// module so lightweight consumers (the deferred Debug toolbar bootstrap) can
// share it without loading the preferences implementation.

const KEY_PREFIX = 'go-admin:console:';

/** Fully qualified storage key for a preference in an identity namespace. */
export function consolePreferenceKey(namespace: string, name: string): string {
  return `${KEY_PREFIX}${namespace}:${name}`;
}

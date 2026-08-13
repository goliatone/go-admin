export type RetryableModuleLoader<T> = {
  load: () => Promise<T>;
  reset: () => void;
};

/** Cache one in-flight/resolved module and clear failures so a later interaction can retry. */
export function createRetryableModuleLoader<T>(
  importer: () => Promise<T>
): RetryableModuleLoader<T> {
  let pending: Promise<T> | null = null;
  return {
    load: () => {
      if (!pending) {
        pending = importer().catch((error) => {
          pending = null;
          throw error;
        });
      }
      return pending;
    },
    reset: () => { pending = null; },
  };
}

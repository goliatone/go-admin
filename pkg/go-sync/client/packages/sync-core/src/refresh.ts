import type { ResourceSnapshot, SyncResource } from "./contracts";

export type RefreshPolicyTrigger =
  | "initial_load"
  | "route_reentry"
  | "window_focus"
  | "conflict_acknowledged";

export interface RefreshEventTargetLike {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface RefreshVisibilityTargetLike {
  visibilityState?: string;
}

export interface RefreshPolicyOptions<T> {
  focusTarget?: RefreshEventTargetLike | null;
  visibilityTarget?: RefreshVisibilityTargetLike | null;
  onError?: (error: unknown, trigger: RefreshPolicyTrigger) => void;
  refreshOptions?: {
    force?: boolean;
  };
}

export interface SyncRefreshPolicy<T> {
  start(): Promise<ResourceSnapshot<T> | null>;
  stop(): void;
  trigger(trigger: RefreshPolicyTrigger): Promise<ResourceSnapshot<T> | null>;
  refreshOnRouteReentry(): Promise<ResourceSnapshot<T> | null>;
  refreshOnFocus(): Promise<ResourceSnapshot<T> | null>;
  refreshAfterConflictAcknowledgement(): Promise<ResourceSnapshot<T> | null>;
}

export function createRefreshPolicy<T>(
  resource: SyncResource<T>,
  options: RefreshPolicyOptions<T> = {},
): SyncRefreshPolicy<T> {
  const focusTarget = options.focusTarget ?? resolveGlobalFocusTarget();
  const visibilityTarget = options.visibilityTarget ?? resolveGlobalVisibilityTarget();
  const refreshOptions = {
    force: options.refreshOptions?.force ?? true,
  };

  let active = false;
  let inFlight: Promise<ResourceSnapshot<T> | null> | null = null;

  const handleFocus = () => {
    if (!active || !isVisible(visibilityTarget)) {
      return;
    }
    void runTrigger("window_focus").catch(() => {});
  };

  return {
    async start() {
      if (!active && focusTarget) {
        focusTarget.addEventListener("focus", handleFocus);
      }
      active = true;
      return runTrigger("initial_load");
    },
    stop() {
      if (active && focusTarget) {
        focusTarget.removeEventListener("focus", handleFocus);
      }
      active = false;
    },
    trigger(trigger: RefreshPolicyTrigger) {
      return runTrigger(trigger);
    },
    refreshOnRouteReentry() {
      return runTrigger("route_reentry");
    },
    refreshOnFocus() {
      return runTrigger("window_focus");
    },
    refreshAfterConflictAcknowledgement() {
      return runTrigger("conflict_acknowledged");
    },
  };

  function runTrigger(trigger: RefreshPolicyTrigger): Promise<ResourceSnapshot<T> | null> {
    if (inFlight) {
      return inFlight;
    }

    inFlight = executeTrigger(trigger)
      .catch((error) => {
        options.onError?.(error, trigger);
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }

  async function executeTrigger(trigger: RefreshPolicyTrigger): Promise<ResourceSnapshot<T> | null> {
    const hasSnapshot = resource.getSnapshot() !== null;
    if (trigger === "initial_load" && !hasSnapshot) {
      return resource.load();
    }
    if (!hasSnapshot) {
      return resource.load();
    }
    return resource.refresh(refreshOptions);
  }
}

function resolveGlobalFocusTarget(): RefreshEventTargetLike | null {
  const candidate = globalThis as { window?: RefreshEventTargetLike };
  return candidate.window ?? null;
}

function resolveGlobalVisibilityTarget(): RefreshVisibilityTargetLike | null {
  const candidate = globalThis as { document?: RefreshVisibilityTargetLike };
  return candidate.document ?? null;
}

function isVisible(target: RefreshVisibilityTargetLike | null): boolean {
  if (!target || typeof target.visibilityState !== "string") {
    return true;
  }
  return target.visibilityState !== "hidden";
}

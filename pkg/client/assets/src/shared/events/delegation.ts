export type DelegatedEventHandler = (event: Event, matched: HTMLElement) => void;

export function addDelegatedEventListener(
  root: Document | HTMLElement,
  eventName: string,
  selector: string,
  handler: DelegatedEventHandler,
  options?: AddEventListenerOptions,
): () => void {
  const listener = (event: Event) => {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }
    const matched = target.closest(selector);
    if (!matched || !(matched instanceof HTMLElement)) {
      return;
    }
    handler(event, matched);
  };

  root.addEventListener(eventName, listener, options);
  return () => root.removeEventListener(eventName, listener, options);
}

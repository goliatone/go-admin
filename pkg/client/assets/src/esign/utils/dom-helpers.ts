/**
 * E-Sign DOM Helpers
 * Utilities for DOM manipulation, element selection, and event handling
 */

/**
 * Safely query selector that returns null instead of throwing
 */
export function qs<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T | null {
  try {
    return parent.querySelector<T>(selector);
  } catch {
    return null;
  }
}

/**
 * Query all matching elements
 */
export function qsa<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T[] {
  try {
    return Array.from(parent.querySelectorAll<T>(selector));
  } catch {
    return [];
  }
}

/**
 * Get element by ID with type safety
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Create an element with attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string | undefined>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        element.setAttribute(key, value);
      }
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    }
  }

  return element;
}

/**
 * Add event listener with automatic cleanup on AbortSignal
 */
export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | Document | Window,
  event: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions & { signal?: AbortSignal }
): () => void {
  element.addEventListener(event, handler as EventListener, options);
  return () => element.removeEventListener(event, handler as EventListener, options);
}

/**
 * Add delegated event listener
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  parent: HTMLElement | Document,
  selector: string,
  event: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K], target: HTMLElement) => void,
  options?: AddEventListenerOptions
): () => void {
  const delegatedHandler = (ev: Event) => {
    const target = (ev.target as HTMLElement).closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target as HTMLElement, ev as HTMLElementEventMap[K], target as HTMLElement);
    }
  };

  parent.addEventListener(event, delegatedHandler, options);
  return () => parent.removeEventListener(event, delegatedHandler, options);
}

/**
 * Run callback when DOM is ready
 */
export function onReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

/**
 * Show element (remove hidden classes)
 */
export function show(element: HTMLElement | null): void {
  if (!element) return;
  element.classList.remove('hidden', 'invisible');
  element.style.display = '';
}

/**
 * Hide element (add hidden class)
 */
export function hide(element: HTMLElement | null): void {
  if (!element) return;
  element.classList.add('hidden');
}

/**
 * Toggle element visibility
 */
export function toggle(element: HTMLElement | null, visible?: boolean): void {
  if (!element) return;
  const shouldShow = visible ?? element.classList.contains('hidden');
  if (shouldShow) {
    show(element);
  } else {
    hide(element);
  }
}

/**
 * Set element loading state
 */
export function setLoading(
  element: HTMLElement | null,
  loading: boolean,
  options?: { spinnerClass?: string }
): void {
  if (!element) return;

  if (loading) {
    element.setAttribute('aria-busy', 'true');
    element.classList.add('opacity-50', 'pointer-events-none');
    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      element.disabled = true;
    }
  } else {
    element.removeAttribute('aria-busy');
    element.classList.remove('opacity-50', 'pointer-events-none');
    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      element.disabled = false;
    }
  }
}

/**
 * Update text content of element by data attribute
 */
export function updateDataText(
  key: string,
  value: string | number,
  parent: ParentNode = document
): void {
  const element = qs(`[data-esign-${key}]`, parent);
  if (element) {
    element.textContent = String(value);
  }
}

/**
 * Update multiple data text elements
 */
export function updateDataTexts(
  values: Record<string, string | number>,
  parent: ParentNode = document
): void {
  for (const [key, value] of Object.entries(values)) {
    updateDataText(key, value, parent);
  }
}

/**
 * Extract page config from script tag or data attribute
 */
export function getPageConfig<T extends Record<string, unknown>>(
  selector = '[data-esign-page]',
  configAttr = 'data-esign-config'
): T | null {
  const element = qs(selector);
  if (!element) return null;

  // Try data attribute first
  const configStr = element.getAttribute(configAttr);
  if (configStr) {
    try {
      return JSON.parse(configStr) as T;
    } catch {
      console.warn('Failed to parse page config from attribute:', configStr);
    }
  }

  // Try script tag with type="application/json"
  const scriptEl = qs<HTMLScriptElement>(
    'script[type="application/json"]',
    element
  );
  if (scriptEl?.textContent) {
    try {
      return JSON.parse(scriptEl.textContent) as T;
    } catch {
      console.warn('Failed to parse page config from script:', scriptEl.textContent);
    }
  }

  return null;
}

/**
 * Announce message to screen readers
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcer =
    qs(`[aria-live="${priority}"]`) ||
    (() => {
      const el = createElement('div', {
        'aria-live': priority,
        'aria-atomic': 'true',
        class: 'sr-only',
      });
      document.body.appendChild(el);
      return el;
    })();

  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

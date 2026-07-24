// Shadow DOM styles for the debug FAB (Floating Action Button)
// Self-contained CSS that won't leak to or from the host page

export const fabStyles = `
  :host {
    --fab-bg: #1e1e2e;
    --fab-bg-hover: #313244;
    --fab-border: #45475a;
    --fab-text: #cdd6f4;
    --fab-text-muted: #6c7086;
    --fab-accent: #89b4fa;
    --fab-success: #a6e3a1;
    --fab-warning: #f9e2af;
    --fab-error: #f38ba8;
    --fab-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 99998;
    font-family: var(--fab-font);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: auto;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .fab {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--fab-bg);
    border: 1px solid var(--fab-border);
    border-radius: 24px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: visible;
    height: 48px;
    min-width: 48px;
  }

  .fab:hover {
    background: var(--fab-bg-hover);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }

  .fab:focus-visible {
    outline: 2px solid var(--fab-accent);
    outline-offset: 3px;
  }

  .fab.hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8) translateY(20px);
  }

  /* Collapsed state - icon only */
  .fab-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  .fab-collapsed.has-identity {
    width: auto;
    max-width: min(360px, calc(100vw - 32px));
    padding: 0 14px 0 10px;
    gap: 10px;
  }

  /* Environment chip + instance name read as one identity unit. */
  .fab-identity {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .fab-persona-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    overflow: hidden;
    border: 1px solid var(--fab-border);
    border-radius: 7px;
    background: var(--persona-background, rgba(255, 255, 255, 0.08));
    color: var(--persona-foreground, var(--fab-text));
    font-size: 9px;
    font-weight: 800;
  }

  .fab-persona-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fab-identity-env {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--fab-border);
    background: rgba(255, 255, 255, 0.05);
    color: var(--fab-text);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.09em;
    line-height: 1.3;
    white-space: nowrap;
  }

  /* The dot and tint carry the environment color. The label stays on the
     high-contrast text token because a host may configure any hex value. */
  @supports (color: color-mix(in srgb, red 10%, transparent)) {
    .fab-identity-env {
      border-color: color-mix(in srgb, var(--fab-environment, #64748b) 50%, transparent);
      background: color-mix(in srgb, var(--fab-environment, #64748b) 18%, transparent);
    }
  }

  .fab-identity-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--fab-environment, #64748b);
    box-shadow: 0 0 6px color-mix(in srgb, var(--fab-environment, #64748b) 70%, transparent);
  }

  /* Only one of the two environment spellings is ever visible. */
  .fab-identity-env-short {
    display: none;
  }

  .fab-identity-name {
    max-width: 200px;
    overflow: hidden;
    color: var(--fab-text);
    font-size: 11px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fab-icon {
    width: 24px;
    height: 24px;
    color: var(--fab-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-icon svg {
    width: 100%;
    height: 100%;
  }

  /* Connection status dot - positioned at bottom-right of icon area */
  /* Icon is 24x24 centered in 48x48 container: icon spans 12px-36px both axes */
  /* Dot overlaps icon's bottom-right corner */
  .fab-status-dot {
    position: absolute;
    bottom: 11px;
    left: 40px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--fab-bg);
    background: var(--fab-text-muted);
    transition: background 0.2s, box-shadow 0.2s;
    z-index: 1;
  }

  /* With an identity chip the collapsed row starts earlier, so the connection
     dot follows the icon instead of colliding with the environment chip. */
  .fab.has-identity .fab-status-dot {
    left: 26px;
    bottom: 10px;
  }

  .fab[data-status="connected"] .fab-status-dot {
    background: var(--fab-success);
    box-shadow: 0 0 6px var(--fab-success);
  }

  .fab[data-status="disconnected"] .fab-status-dot {
    background: var(--fab-text-muted);
  }

  .fab[data-status="reconnecting"] .fab-status-dot {
    background: var(--fab-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  .fab[data-status="error"] .fab-status-dot {
    background: var(--fab-error);
    box-shadow: 0 0 6px var(--fab-error);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Expanded state - counters */
  .fab-expanded {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 16px;
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fab:hover .fab-expanded,
  .fab.is-hovered .fab-expanded,
  .fab:focus-visible .fab-expanded {
    max-width: 300px;
    opacity: 1;
    padding-left: 4px;
  }

  .fab-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 36px;
    padding: 4px 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.15s;
  }

  .fab-counter.has-items {
    background: rgba(137, 180, 250, 0.15);
  }

  .fab-counter.has-slow {
    background: rgba(249, 226, 175, 0.15);
  }

  .fab-counter.has-errors {
    background: rgba(243, 139, 168, 0.15);
  }

  .counter-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--fab-text);
    font-variant-numeric: tabular-nums;
  }

  .fab-counter.has-items .counter-value {
    color: var(--fab-accent);
  }

  .fab-counter.has-slow .counter-value {
    color: var(--fab-warning);
  }

  .fab-counter.has-errors .counter-value {
    color: var(--fab-error);
  }

  .counter-label {
    font-size: 9px;
    color: var(--fab-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @media (prefers-reduced-motion: reduce) {
    .fab,
    .fab-expanded,
    .fab-status-dot {
      transition: none;
    }

    .fab:hover {
      transform: none;
    }

    .fab[data-status="reconnecting"] .fab-status-dot {
      animation: none;
    }
  }

  /* Responsive */
  @media (max-width: 480px) {
    :host {
      bottom: 12px;
      right: 12px;
    }

    .fab {
      height: 44px;
      min-width: 44px;
    }

    .fab-collapsed {
      width: 44px;
      height: 44px;
    }

    .fab-collapsed.has-identity {
      width: auto;
      max-width: calc(100vw - 24px);
      padding: 0 12px 0 8px;
      gap: 8px;
    }

    /* Trade the spelled-out environment for its short token before the
       instance name starts losing characters. */
    .fab-identity-env-full {
      display: none;
    }

    .fab-identity-env-short {
      display: inline;
    }

    .fab-identity-name {
      max-width: 110px;
    }

    .fab-icon {
      width: 20px;
      height: 20px;
    }

    .fab-status-dot {
      width: 8px;
      height: 8px;
      bottom: 11px;
      left: 40px;
    }

    .fab.has-identity .fab-status-dot {
      left: 22px;
      bottom: 10px;
    }

    .fab-counter {
      min-width: 32px;
      padding: 3px 6px;
    }

    .counter-value {
      font-size: 12px;
    }

    .counter-label {
      font-size: 8px;
    }
  }

  /* Very narrow viewports keep the environment signal and drop the name. */
  @media (max-width: 380px) {
    .fab-identity-name {
      display: none;
    }

    .fab-collapsed.has-identity {
      gap: 6px;
    }
  }
`;

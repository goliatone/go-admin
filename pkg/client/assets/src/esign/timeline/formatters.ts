/**
 * Shared timeline timestamp formatting helpers.
 */

export function formatTimestamp(ts: string): string {
  if (!ts) {
    return '-';
  }
  try {
    const date = new Date(ts);
    return (
      date.toLocaleDateString() +
      ' at ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return ts;
  }
}

export function formatRelativeTime(ts: string): string {
  if (!ts) {
    return '';
  }
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatTimestamp(ts);
  } catch {
    return ts;
  }
}

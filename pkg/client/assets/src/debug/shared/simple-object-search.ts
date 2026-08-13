export function isJsonPathExpression(search: string): boolean {
  if (!search) return false;
  if (search.startsWith('$')) return true;
  if (/\[\d+\]/.test(search) || /\[['"]/.test(search)) return true;
  if (/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(search)) return true;
  return search.includes('..') || search.includes('*');
}

export function normalizeToJsonPath(search: string): string {
  if (!search) return '$';
  return search.startsWith('$') ? search : `$.${search}`;
}

export function filterByKeyMatch(
  data: Record<string, unknown>,
  search: string
): Record<string, unknown> {
  if (!search || !data) return data || {};
  const needle = search.toLowerCase();
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => key.toLowerCase().includes(needle))
  );
}

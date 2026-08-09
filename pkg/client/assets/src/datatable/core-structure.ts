// @ts-nocheck

export function hasActionColumn(grid: any): boolean {
  return typeof grid.config.rowActions === 'function' || grid.config.useDefaultActions !== false;
}

export function fixedColumnCount(grid: any): number {
  return (hasActionColumn(grid) ? 1 : 0) + (grid.isCapabilityEnabled('selection') ? 1 : 0);
}

export function structuralColumnCount(grid: any): number {
  return Math.max(1, (grid.config.columns?.length || 0) + fixedColumnCount(grid));
}

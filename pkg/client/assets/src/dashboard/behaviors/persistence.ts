/**
 * Default persistence behavior using fetch API
 */

import type { PersistenceBehavior, LayoutPreferences } from '../types.js';

export class DefaultPersistenceBehavior implements PersistenceBehavior {
  async save(endpoint: string, layout: LayoutPreferences): Promise<void> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(layout),
    });

    if (!response.ok) {
      throw new Error(`Failed to save layout: ${response.statusText}`);
    }
  }

  async load(endpoint: string): Promise<LayoutPreferences | null> {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to load layout preferences:', error);
      return null;
    }
  }
}

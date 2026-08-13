/**
 * Default persistence behavior using fetch API
 */

import { createLogger } from '../../shared/logger.js';

import type { PersistenceBehavior, LayoutPreferences } from '../types.js';
import { httpRequest } from '../../shared/transport/http-client.js';

const logger = createLogger("DashboardPersistence");

export class DefaultPersistenceBehavior implements PersistenceBehavior {
  async save(endpoint: string, layout: LayoutPreferences): Promise<void> {
    const response = await httpRequest(endpoint, {
      method: 'POST',
      json: layout,
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
      logger.warn('Failed to load layout preferences:', error);
      return null;
    }
  }
}

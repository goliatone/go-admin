/**
 * Default persistence behavior using fetch API
 */
import type { PersistenceBehavior, LayoutPreferences } from '../types.js';
export declare class DefaultPersistenceBehavior implements PersistenceBehavior {
    save(endpoint: string, layout: LayoutPreferences): Promise<void>;
    load(endpoint: string): Promise<LayoutPreferences | null>;
}
//# sourceMappingURL=persistence.d.ts.map
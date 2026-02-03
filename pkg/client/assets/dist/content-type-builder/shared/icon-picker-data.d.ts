/**
 * Icon Picker Data
 *
 * Static emoji set (~200 curated entries) and SVG icon key list for the
 * built-in Emoji and Icons tabs. Kept in a separate file so the data
 * can be tree-shaken or lazy-loaded if needed.
 */
import type { IconTab } from './icon-picker';
export interface EmojiEntry {
    emoji: string;
    name: string;
    keywords?: string;
}
export interface EmojiCategory {
    id: string;
    label: string;
    emoji: string;
    entries: EmojiEntry[];
}
export declare const EMOJI_CATEGORIES: EmojiCategory[];
export declare const SVG_ICON_KEYS: string[];
/** Build the built-in Emoji tab from EMOJI_CATEGORIES. */
export declare function getBuiltinEmojiTab(): IconTab;
/** Build the built-in Icons tab from SVG_ICONS in field-type-picker.ts. */
export declare function getBuiltinIconsTab(): IconTab;
//# sourceMappingURL=icon-picker-data.d.ts.map
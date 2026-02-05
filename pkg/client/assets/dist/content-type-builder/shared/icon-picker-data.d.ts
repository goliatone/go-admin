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
interface IconoirEntry {
    value: string;
    label: string;
    keywords?: string;
    category: string;
}
export declare const ICONOIR_SIDEBAR_ICONS: IconoirEntry[];
/** Build the built-in Iconoir tab from ICONOIR_SIDEBAR_ICONS. */
export declare function getBuiltinIconoirTab(): IconTab;
export declare const SVG_ICON_KEYS: string[];
/** Build the built-in Emoji tab from EMOJI_CATEGORIES. */
export declare function getBuiltinEmojiTab(): IconTab;
/** Build the built-in Icons tab from SVG_ICONS in field-type-picker.ts. */
export declare function getBuiltinIconsTab(): IconTab;
export {};
//# sourceMappingURL=icon-picker-data.d.ts.map
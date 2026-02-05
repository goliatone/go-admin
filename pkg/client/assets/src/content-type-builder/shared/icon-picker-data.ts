/**
 * Icon Picker Data
 *
 * Static emoji set (~200 curated entries) and SVG icon key list for the
 * built-in Emoji and Icons tabs. Kept in a separate file so the data
 * can be tree-shaken or lazy-loaded if needed.
 */

import { iconForKey } from '../field-type-picker';
import type { IconTab, IconEntry } from './icon-picker';

// ---------------------------------------------------------------------------
// Emoji Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Emoji Data (~200 curated entries)
// ---------------------------------------------------------------------------

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    emoji: '😀',
    entries: [
      { emoji: '😀', name: 'grinning face', keywords: 'happy smile' },
      { emoji: '😃', name: 'smiley', keywords: 'happy face' },
      { emoji: '😄', name: 'smile', keywords: 'happy joy' },
      { emoji: '😁', name: 'grin', keywords: 'happy teeth' },
      { emoji: '😅', name: 'sweat smile', keywords: 'nervous relief' },
      { emoji: '😂', name: 'joy', keywords: 'laugh tears funny' },
      { emoji: '🤣', name: 'rofl', keywords: 'laugh rolling' },
      { emoji: '😊', name: 'blush', keywords: 'happy shy' },
      { emoji: '😇', name: 'innocent', keywords: 'angel halo' },
      { emoji: '😍', name: 'heart eyes', keywords: 'love crush' },
      { emoji: '🤩', name: 'star struck', keywords: 'wow excited' },
      { emoji: '😘', name: 'kissing heart', keywords: 'love kiss' },
      { emoji: '🤔', name: 'thinking', keywords: 'consider wonder hmm' },
      { emoji: '🤗', name: 'hugging', keywords: 'hug embrace warm' },
      { emoji: '😎', name: 'sunglasses', keywords: 'cool confident' },
      { emoji: '🥳', name: 'partying', keywords: 'celebrate birthday party' },
      { emoji: '😤', name: 'triumph', keywords: 'frustrated angry huff' },
      { emoji: '😢', name: 'cry', keywords: 'sad tear' },
      { emoji: '😱', name: 'scream', keywords: 'fear shock horror' },
      { emoji: '🤯', name: 'exploding head', keywords: 'mind blown shock' },
      { emoji: '😴', name: 'sleeping', keywords: 'zzz tired rest' },
      { emoji: '🤮', name: 'vomiting', keywords: 'sick disgusting' },
      { emoji: '🥺', name: 'pleading', keywords: 'puppy eyes beg' },
      { emoji: '😈', name: 'smiling imp', keywords: 'devil evil mischief' },
      { emoji: '💀', name: 'skull', keywords: 'dead death skeleton' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    emoji: '👋',
    entries: [
      { emoji: '👋', name: 'wave', keywords: 'hello hi greeting' },
      { emoji: '👍', name: 'thumbs up', keywords: 'approve like yes good' },
      { emoji: '👎', name: 'thumbs down', keywords: 'reject dislike no bad' },
      { emoji: '👏', name: 'clap', keywords: 'applause congrats' },
      { emoji: '🙌', name: 'raised hands', keywords: 'celebrate hooray' },
      { emoji: '🤝', name: 'handshake', keywords: 'deal agreement' },
      { emoji: '✋', name: 'raised hand', keywords: 'stop high five' },
      { emoji: '✌️', name: 'peace', keywords: 'victory two' },
      { emoji: '🤞', name: 'crossed fingers', keywords: 'luck hope wish' },
      { emoji: '💪', name: 'flexed biceps', keywords: 'strong power muscle' },
      { emoji: '👀', name: 'eyes', keywords: 'look see watch' },
      { emoji: '👁️', name: 'eye', keywords: 'look see vision' },
      { emoji: '🧠', name: 'brain', keywords: 'think smart intelligence' },
      { emoji: '❤️', name: 'red heart', keywords: 'love like' },
      { emoji: '🔥', name: 'fire', keywords: 'hot flame lit popular' },
      { emoji: '✨', name: 'sparkles', keywords: 'stars magic new shiny' },
      { emoji: '💫', name: 'dizzy', keywords: 'star shooting' },
      { emoji: '💥', name: 'collision', keywords: 'boom bang explosion' },
      { emoji: '💬', name: 'speech bubble', keywords: 'comment chat message' },
      { emoji: '💡', name: 'light bulb', keywords: 'idea thought bright' },
    ],
  },
  {
    id: 'animals-nature',
    label: 'Nature',
    emoji: '🌿',
    entries: [
      { emoji: '🐶', name: 'dog face', keywords: 'pet puppy' },
      { emoji: '🐱', name: 'cat face', keywords: 'pet kitten' },
      { emoji: '🐻', name: 'bear', keywords: 'animal' },
      { emoji: '🦊', name: 'fox', keywords: 'clever sly' },
      { emoji: '🦁', name: 'lion', keywords: 'king brave' },
      { emoji: '🐸', name: 'frog', keywords: 'toad' },
      { emoji: '🦋', name: 'butterfly', keywords: 'insect beauty' },
      { emoji: '🐝', name: 'honeybee', keywords: 'buzz insect' },
      { emoji: '🌸', name: 'cherry blossom', keywords: 'flower spring pink' },
      { emoji: '🌺', name: 'hibiscus', keywords: 'flower tropical' },
      { emoji: '🌻', name: 'sunflower', keywords: 'flower sun yellow' },
      { emoji: '🌹', name: 'rose', keywords: 'flower love red' },
      { emoji: '🌲', name: 'evergreen tree', keywords: 'pine forest' },
      { emoji: '🌿', name: 'herb', keywords: 'plant leaf green' },
      { emoji: '🍀', name: 'four leaf clover', keywords: 'luck lucky irish' },
      { emoji: '🌊', name: 'wave', keywords: 'ocean sea water surf' },
      { emoji: '⛰️', name: 'mountain', keywords: 'peak hill' },
      { emoji: '🌈', name: 'rainbow', keywords: 'colors pride' },
      { emoji: '☀️', name: 'sun', keywords: 'sunny bright warm weather' },
      { emoji: '🌙', name: 'crescent moon', keywords: 'night sleep' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍕',
    entries: [
      { emoji: '🍕', name: 'pizza', keywords: 'food slice' },
      { emoji: '🍔', name: 'hamburger', keywords: 'burger food' },
      { emoji: '☕', name: 'coffee', keywords: 'drink hot tea cup' },
      { emoji: '🍺', name: 'beer', keywords: 'drink alcohol mug' },
      { emoji: '🍷', name: 'wine', keywords: 'drink glass red' },
      { emoji: '🎂', name: 'birthday cake', keywords: 'dessert party celebrate' },
      { emoji: '🍰', name: 'shortcake', keywords: 'dessert sweet' },
      { emoji: '🍩', name: 'doughnut', keywords: 'donut dessert sweet' },
      { emoji: '🍎', name: 'red apple', keywords: 'fruit health' },
      { emoji: '🍋', name: 'lemon', keywords: 'fruit citrus sour' },
      { emoji: '🍉', name: 'watermelon', keywords: 'fruit summer' },
      { emoji: '🌶️', name: 'hot pepper', keywords: 'spicy chili' },
      { emoji: '🥑', name: 'avocado', keywords: 'fruit green' },
      { emoji: '🍿', name: 'popcorn', keywords: 'movie snack' },
      { emoji: '🧁', name: 'cupcake', keywords: 'dessert sweet muffin' },
    ],
  },
  {
    id: 'travel',
    label: 'Travel',
    emoji: '✈️',
    entries: [
      { emoji: '✈️', name: 'airplane', keywords: 'travel flight fly' },
      { emoji: '🚀', name: 'rocket', keywords: 'launch space ship fast' },
      { emoji: '🚗', name: 'car', keywords: 'auto vehicle drive' },
      { emoji: '🚲', name: 'bicycle', keywords: 'bike cycle pedal' },
      { emoji: '🏠', name: 'house', keywords: 'home building' },
      { emoji: '🏢', name: 'office building', keywords: 'work corporate' },
      { emoji: '🏭', name: 'factory', keywords: 'industry manufacturing' },
      { emoji: '🏥', name: 'hospital', keywords: 'health medical doctor' },
      { emoji: '🏫', name: 'school', keywords: 'education learn' },
      { emoji: '🏰', name: 'castle', keywords: 'medieval fortress' },
      { emoji: '⛪', name: 'church', keywords: 'religion worship' },
      { emoji: '🗽', name: 'statue of liberty', keywords: 'new york freedom' },
      { emoji: '🌍', name: 'globe europe africa', keywords: 'earth world map' },
      { emoji: '🌏', name: 'globe asia', keywords: 'earth world map' },
      { emoji: '🗺️', name: 'world map', keywords: 'earth globe travel' },
    ],
  },
  {
    id: 'activities',
    label: 'Activities',
    emoji: '⚽',
    entries: [
      { emoji: '⚽', name: 'soccer', keywords: 'football sport ball' },
      { emoji: '🏀', name: 'basketball', keywords: 'sport ball hoop' },
      { emoji: '🎮', name: 'video game', keywords: 'gaming controller play' },
      { emoji: '🎯', name: 'direct hit', keywords: 'target bullseye goal' },
      { emoji: '🎲', name: 'game die', keywords: 'dice random chance' },
      { emoji: '🧩', name: 'puzzle', keywords: 'piece jigsaw game' },
      { emoji: '🎨', name: 'artist palette', keywords: 'art paint draw color' },
      { emoji: '🎵', name: 'musical note', keywords: 'music song sound' },
      { emoji: '🎸', name: 'guitar', keywords: 'music instrument rock' },
      { emoji: '🎬', name: 'clapper board', keywords: 'movie film cinema' },
      { emoji: '📸', name: 'camera flash', keywords: 'photo picture' },
      { emoji: '🏆', name: 'trophy', keywords: 'win prize award champion' },
      { emoji: '🥇', name: 'gold medal', keywords: 'first winner' },
      { emoji: '🎪', name: 'circus tent', keywords: 'carnival fun' },
      { emoji: '🎭', name: 'performing arts', keywords: 'theater drama masks' },
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    emoji: '📦',
    entries: [
      { emoji: '📰', name: 'newspaper', keywords: 'news article press media' },
      { emoji: '📄', name: 'page', keywords: 'document file paper' },
      { emoji: '📋', name: 'clipboard', keywords: 'list copy paste' },
      { emoji: '📌', name: 'pushpin', keywords: 'pin location mark' },
      { emoji: '📎', name: 'paperclip', keywords: 'attach clip' },
      { emoji: '🔗', name: 'link', keywords: 'chain url href' },
      { emoji: '📦', name: 'package', keywords: 'box shipping delivery' },
      { emoji: '🗂️', name: 'card index', keywords: 'folder organize dividers' },
      { emoji: '📁', name: 'file folder', keywords: 'directory' },
      { emoji: '📂', name: 'open folder', keywords: 'directory files' },
      { emoji: '📝', name: 'memo', keywords: 'note write edit pencil' },
      { emoji: '✏️', name: 'pencil', keywords: 'write edit draw' },
      { emoji: '🖊️', name: 'pen', keywords: 'write sign' },
      { emoji: '📐', name: 'triangular ruler', keywords: 'measure geometry' },
      { emoji: '📏', name: 'straight ruler', keywords: 'measure length' },
      { emoji: '🔍', name: 'magnifying glass', keywords: 'search find zoom' },
      { emoji: '🔒', name: 'locked', keywords: 'secure private padlock' },
      { emoji: '🔓', name: 'unlocked', keywords: 'open access' },
      { emoji: '🔑', name: 'key', keywords: 'unlock password access' },
      { emoji: '🔧', name: 'wrench', keywords: 'tool fix settings' },
      { emoji: '🔨', name: 'hammer', keywords: 'tool build construct' },
      { emoji: '⚙️', name: 'gear', keywords: 'settings config cog' },
      { emoji: '🧲', name: 'magnet', keywords: 'attract pull' },
      { emoji: '💾', name: 'floppy disk', keywords: 'save storage' },
      { emoji: '💻', name: 'laptop', keywords: 'computer device' },
      { emoji: '🖥️', name: 'desktop computer', keywords: 'monitor screen' },
      { emoji: '📱', name: 'mobile phone', keywords: 'cell smartphone device' },
      { emoji: '🖨️', name: 'printer', keywords: 'print output' },
      { emoji: '📷', name: 'camera', keywords: 'photo picture' },
      { emoji: '🎙️', name: 'microphone', keywords: 'audio record podcast' },
      { emoji: '📡', name: 'satellite antenna', keywords: 'signal broadcast' },
      { emoji: '🔔', name: 'bell', keywords: 'notification alert ring' },
      { emoji: '📊', name: 'bar chart', keywords: 'graph statistics data' },
      { emoji: '📈', name: 'chart increasing', keywords: 'graph growth up trend' },
      { emoji: '📉', name: 'chart decreasing', keywords: 'graph down decline' },
      { emoji: '🗓️', name: 'calendar', keywords: 'date schedule event' },
      { emoji: '⏰', name: 'alarm clock', keywords: 'time timer' },
      { emoji: '⏱️', name: 'stopwatch', keywords: 'time timer speed' },
      { emoji: '🧪', name: 'test tube', keywords: 'science lab experiment' },
      { emoji: '💊', name: 'pill', keywords: 'medicine health drug' },
      { emoji: '🛒', name: 'shopping cart', keywords: 'buy store ecommerce' },
      { emoji: '💰', name: 'money bag', keywords: 'cash dollar rich finance' },
      { emoji: '💳', name: 'credit card', keywords: 'payment buy charge' },
      { emoji: '📮', name: 'postbox', keywords: 'mail letter send' },
      { emoji: '📬', name: 'open mailbox', keywords: 'email inbox receive' },
      { emoji: '🏷️', name: 'label', keywords: 'tag price category' },
      { emoji: '🧾', name: 'receipt', keywords: 'invoice bill purchase' },
      { emoji: '📚', name: 'books', keywords: 'library read study' },
      { emoji: '🎁', name: 'wrapped gift', keywords: 'present box surprise' },
      { emoji: '🪄', name: 'magic wand', keywords: 'wizard spell sparkle' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    emoji: '⚡',
    entries: [
      { emoji: '⚡', name: 'zap', keywords: 'lightning bolt electric power' },
      { emoji: '✅', name: 'check mark', keywords: 'done complete yes success' },
      { emoji: '❌', name: 'cross mark', keywords: 'no wrong delete remove' },
      { emoji: '⭐', name: 'star', keywords: 'favorite bookmark rating' },
      { emoji: '🌟', name: 'glowing star', keywords: 'sparkle shine bright' },
      { emoji: '💠', name: 'diamond', keywords: 'shape gem crystal' },
      { emoji: '🔶', name: 'large orange diamond', keywords: 'shape' },
      { emoji: '🔷', name: 'large blue diamond', keywords: 'shape' },
      { emoji: '🔴', name: 'red circle', keywords: 'dot round' },
      { emoji: '🟢', name: 'green circle', keywords: 'dot round' },
      { emoji: '🔵', name: 'blue circle', keywords: 'dot round' },
      { emoji: '🟡', name: 'yellow circle', keywords: 'dot round' },
      { emoji: '🟣', name: 'purple circle', keywords: 'dot round' },
      { emoji: '⬛', name: 'black square', keywords: 'shape' },
      { emoji: '⬜', name: 'white square', keywords: 'shape' },
      { emoji: '▶️', name: 'play button', keywords: 'start forward' },
      { emoji: '⏸️', name: 'pause button', keywords: 'stop wait' },
      { emoji: '⏹️', name: 'stop button', keywords: 'halt end' },
      { emoji: '♻️', name: 'recycling symbol', keywords: 'eco green recycle' },
      { emoji: '⚠️', name: 'warning', keywords: 'caution alert danger' },
      { emoji: '🚫', name: 'prohibited', keywords: 'no ban forbidden stop' },
      { emoji: 'ℹ️', name: 'information', keywords: 'info help about' },
      { emoji: '❓', name: 'question mark', keywords: 'help what why' },
      { emoji: '❗', name: 'exclamation mark', keywords: 'alert important bang' },
      { emoji: '➕', name: 'plus', keywords: 'add new create' },
      { emoji: '➖', name: 'minus', keywords: 'remove subtract delete' },
      { emoji: '➡️', name: 'right arrow', keywords: 'forward next direction' },
      { emoji: '⬅️', name: 'left arrow', keywords: 'back previous direction' },
      { emoji: '⬆️', name: 'up arrow', keywords: 'top direction' },
      { emoji: '⬇️', name: 'down arrow', keywords: 'bottom direction' },
      { emoji: '↩️', name: 'right arrow curving left', keywords: 'return reply back undo' },
      { emoji: '🔀', name: 'shuffle', keywords: 'random mix' },
      { emoji: '🔁', name: 'repeat', keywords: 'loop cycle' },
      { emoji: '♾️', name: 'infinity', keywords: 'forever unlimited' },
      { emoji: '🏁', name: 'checkered flag', keywords: 'finish race end' },
      { emoji: '🚩', name: 'triangular flag', keywords: 'report mark milestone' },
      { emoji: '🔰', name: 'Japanese symbol for beginner', keywords: 'new start' },
      { emoji: '💲', name: 'heavy dollar sign', keywords: 'money currency price' },
      { emoji: '#️⃣', name: 'hash', keywords: 'number pound tag' },
      { emoji: '🔣', name: 'input symbols', keywords: 'character special' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Iconoir Sidebar Icons (~50 curated for navigation / sidebar use)
// ---------------------------------------------------------------------------

interface IconoirEntry {
  value: string;
  label: string;
  keywords?: string;
  category: string;
}

export const ICONOIR_SIDEBAR_ICONS: IconoirEntry[] = [
  // Content & Documents
  { value: 'page', label: 'Page', keywords: 'document paper', category: 'Content' },
  { value: 'page-edit', label: 'Page Edit', keywords: 'document write', category: 'Content' },
  { value: 'journal', label: 'Journal', keywords: 'book notebook blog', category: 'Content' },
  { value: 'book', label: 'Book', keywords: 'read documentation', category: 'Content' },
  { value: 'clipboard', label: 'Clipboard', keywords: 'copy paste list', category: 'Content' },
  { value: 'edit-pencil', label: 'Edit', keywords: 'write pencil compose', category: 'Content' },
  { value: 'post', label: 'Post', keywords: 'article blog entry', category: 'Content' },
  // Objects & Layout
  { value: 'cube', label: 'Cube', keywords: 'box 3d model block', category: 'Objects' },
  { value: 'view-grid', label: 'Grid', keywords: 'layout blocks tiles', category: 'Objects' },
  { value: 'dashboard', label: 'Dashboard', keywords: 'home overview panel', category: 'Objects' },
  { value: 'folder', label: 'Folder', keywords: 'directory files', category: 'Objects' },
  { value: 'archive', label: 'Archive', keywords: 'box storage', category: 'Objects' },
  { value: 'table-rows', label: 'Table', keywords: 'list rows data', category: 'Objects' },
  { value: 'puzzle', label: 'Puzzle', keywords: 'piece component module', category: 'Objects' },
  // People & Auth
  { value: 'user', label: 'User', keywords: 'person account profile', category: 'People' },
  { value: 'users', label: 'Users', keywords: 'people group team', category: 'People' },
  { value: 'user-circle', label: 'User Circle', keywords: 'profile avatar', category: 'People' },
  { value: 'shield', label: 'Shield', keywords: 'security auth role', category: 'People' },
  { value: 'community', label: 'Community', keywords: 'group organization', category: 'People' },
  { value: 'lock', label: 'Lock', keywords: 'secure private', category: 'People' },
  // Commerce & Business
  { value: 'building', label: 'Building', keywords: 'office company tenant', category: 'Business' },
  { value: 'briefcase', label: 'Briefcase', keywords: 'work business', category: 'Business' },
  { value: 'cart', label: 'Cart', keywords: 'shop ecommerce buy', category: 'Business' },
  { value: 'credit-card', label: 'Credit Card', keywords: 'payment money', category: 'Business' },
  { value: 'gift', label: 'Gift', keywords: 'present reward', category: 'Business' },
  { value: 'shop', label: 'Shop', keywords: 'store ecommerce', category: 'Business' },
  // Media
  { value: 'media-image', label: 'Image', keywords: 'photo picture', category: 'Media' },
  { value: 'camera', label: 'Camera', keywords: 'photo picture', category: 'Media' },
  { value: 'play', label: 'Play', keywords: 'video media', category: 'Media' },
  { value: 'music-note', label: 'Music', keywords: 'audio song', category: 'Media' },
  { value: 'attachment', label: 'Attachment', keywords: 'file clip', category: 'Media' },
  // Communication
  { value: 'bell', label: 'Bell', keywords: 'notification alert', category: 'Communication' },
  { value: 'chat-bubble', label: 'Chat', keywords: 'message comment', category: 'Communication' },
  { value: 'mail', label: 'Mail', keywords: 'email message', category: 'Communication' },
  { value: 'megaphone', label: 'Megaphone', keywords: 'announce broadcast', category: 'Communication' },
  { value: 'send', label: 'Send', keywords: 'share submit', category: 'Communication' },
  // System & Settings
  { value: 'settings', label: 'Settings', keywords: 'config gear cog', category: 'System' },
  { value: 'switch-on', label: 'Toggle', keywords: 'switch feature flag', category: 'System' },
  { value: 'bug', label: 'Bug', keywords: 'debug error issue', category: 'System' },
  { value: 'clock', label: 'Clock', keywords: 'time schedule activity', category: 'System' },
  { value: 'database', label: 'Database', keywords: 'storage data', category: 'System' },
  { value: 'code', label: 'Code', keywords: 'developer programming', category: 'System' },
  { value: 'terminal', label: 'Terminal', keywords: 'console command line', category: 'System' },
  // Misc & Navigation
  { value: 'star', label: 'Star', keywords: 'favorite bookmark rating', category: 'Misc' },
  { value: 'heart', label: 'Heart', keywords: 'love favorite', category: 'Misc' },
  { value: 'bookmark', label: 'Bookmark', keywords: 'save favorite', category: 'Misc' },
  { value: 'pin-alt', label: 'Pin', keywords: 'location map', category: 'Misc' },
  { value: 'link', label: 'Link', keywords: 'url chain href', category: 'Misc' },
  { value: 'search', label: 'Search', keywords: 'find magnifier', category: 'Misc' },
  { value: 'download', label: 'Download', keywords: 'save get export', category: 'Misc' },
  { value: 'cloud', label: 'Cloud', keywords: 'upload sync', category: 'Misc' },
  { value: 'flash', label: 'Flash', keywords: 'lightning bolt fast', category: 'Misc' },
  { value: 'calendar', label: 'Calendar', keywords: 'date event schedule', category: 'Misc' },
  { value: 'graph-up', label: 'Analytics', keywords: 'chart statistics', category: 'Misc' },
  { value: 'color-picker', label: 'Theme', keywords: 'color palette style', category: 'Misc' },
  { value: 'globe', label: 'Globe', keywords: 'world international web', category: 'Misc' },
  { value: 'rocket', label: 'Rocket', keywords: 'launch deploy fast', category: 'Misc' },
  { value: 'flag', label: 'Flag', keywords: 'mark milestone report', category: 'Misc' },
  { value: 'trash', label: 'Trash', keywords: 'delete remove', category: 'Misc' },
];

/** Build the built-in Iconoir tab from ICONOIR_SIDEBAR_ICONS. */
export function getBuiltinIconoirTab(): IconTab {
  const entries: IconEntry[] = [];
  const categories: { id: string; label: string; startIndex: number }[] = [];

  const catOrder = ['Content', 'Objects', 'People', 'Business', 'Media', 'Communication', 'System', 'Misc'];
  for (const catName of catOrder) {
    const catEntries = ICONOIR_SIDEBAR_ICONS.filter((e) => e.category === catName);
    if (catEntries.length === 0) continue;
    categories.push({ id: catName.toLowerCase(), label: catName, startIndex: entries.length });
    for (const e of catEntries) {
      entries.push({
        value: e.value,
        label: e.label,
        keywords: e.keywords,
        display: `<i class="iconoir-${e.value}" style="font-size:18px"></i>`,
      });
    }
  }

  return {
    id: 'iconoir',
    label: 'Sidebar',
    icon: '🧭',
    entries,
    categories,
  };
}

// ---------------------------------------------------------------------------
// SVG Icon Keys (from field-type-picker.ts, excluding cat-* internal icons)
// ---------------------------------------------------------------------------

export const SVG_ICON_KEYS: string[] = [
  'text', 'textarea', 'rich-text', 'markdown', 'code',
  'number', 'integer', 'currency', 'percentage',
  'select', 'radio', 'checkbox', 'chips', 'toggle',
  'date', 'time', 'datetime',
  'media-picker', 'media-gallery', 'file-upload',
  'reference', 'references', 'user',
  'group', 'repeater', 'blocks',
  'json', 'slug', 'color', 'location',
];

// ---------------------------------------------------------------------------
// Tab Builders
// ---------------------------------------------------------------------------

/** Build the built-in Emoji tab from EMOJI_CATEGORIES. */
export function getBuiltinEmojiTab(): IconTab {
  const entries: IconEntry[] = [];
  const categories: { id: string; label: string; startIndex: number }[] = [];

  for (const cat of EMOJI_CATEGORIES) {
    categories.push({ id: cat.id, label: cat.label, startIndex: entries.length });
    for (const e of cat.entries) {
      entries.push({
        value: e.emoji,
        label: e.name,
        keywords: e.keywords,
        display: e.emoji,
      });
    }
  }

  return {
    id: 'emoji',
    label: 'Emoji',
    icon: '😀',
    entries,
    categories,
  };
}

/** Build the built-in Icons tab from SVG_ICONS in field-type-picker.ts. */
export function getBuiltinIconsTab(): IconTab {
  const entries: IconEntry[] = [];
  for (const key of SVG_ICON_KEYS) {
    const svg = iconForKey(key);
    if (!svg) continue;
    entries.push({
      value: key,
      label: key.replace(/-/g, ' '),
      keywords: key.replace(/-/g, ' '),
      display: svg,
    });
  }

  return {
    id: 'icons',
    label: 'Icons',
    icon: '◇',
    entries,
  };
}

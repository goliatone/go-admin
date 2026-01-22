/**
 * User Renderer
 * Specialized renderer for user search results with avatar, name, email, and role
 */

import type { SearchResult, ResultRenderer, UserRendererConfig } from '../types.js';

const DEFAULT_CONFIG: UserRendererConfig = {
  showDescription: true,
  showIcon: true,
  itemClass: 'px-4 py-3 hover:bg-gray-50',
  selectedClass: 'bg-blue-50',
  avatarField: 'avatar',
  emailField: 'email',
  roleField: 'role',
  showAvatarPlaceholder: true,
};

export class UserRenderer<T = unknown> implements ResultRenderer<T> {
  protected config: UserRendererConfig;

  constructor(config: Partial<UserRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  render(result: SearchResult<T>, isSelected: boolean): string {
    const baseClass = this.config.itemClass || '';
    const selectedClass = isSelected ? this.config.selectedClass || '' : '';
    const className = `${baseClass} ${selectedClass}`.trim();

    const metadata = result.metadata || {};
    const avatar = this.getMetadataValue(metadata, this.config.avatarField || 'avatar');
    const email = this.getMetadataValue(metadata, this.config.emailField || 'email');
    const role = this.getMetadataValue(metadata, this.config.roleField || 'role');

    const avatarHtml = this.renderAvatar(avatar, result.label);
    const roleHtml = role ? this.renderRole(role) : '';
    const emailHtml = email ? `<p class="text-xs text-gray-500 truncate">${this.escapeHtml(email)}</p>` : '';

    return `
      <div class="${className}">
        <div class="flex items-center gap-3">
          ${avatarHtml}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(result.label)}</p>
              ${roleHtml}
            </div>
            ${emailHtml}
          </div>
        </div>
      </div>
    `;
  }

  protected renderAvatar(avatar: string | undefined, name: string): string {
    if (avatar) {
      return `<img src="${this.escapeHtml(avatar)}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />`;
    }

    if (!this.config.showAvatarPlaceholder) {
      return '';
    }

    // Generate initials placeholder
    const initials = this.getInitials(name);
    const bgColor = this.getColorForName(name);

    return `
      <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium" style="background-color: ${bgColor}">
        ${this.escapeHtml(initials)}
      </div>
    `;
  }

  protected renderRole(role: string): string {
    const roleColors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      owner: 'bg-blue-100 text-blue-800',
      editor: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
      default: 'bg-gray-100 text-gray-600',
    };

    const colorClass = roleColors[role.toLowerCase()] || roleColors.default;

    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}">${this.escapeHtml(role)}</span>`;
  }

  protected getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  protected getColorForName(name: string): string {
    // Generate a consistent color based on the name
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  protected getMetadataValue(metadata: Record<string, unknown>, field: string): string | undefined {
    const value = metadata[field];
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

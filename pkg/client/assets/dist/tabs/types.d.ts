/**
 * Tab panel types for resource detail views
 */
export interface TabLink extends HTMLAnchorElement {
    dataset: DOMStringMap & {
        tabId: string;
        renderMode: string;
    };
}
export interface TabPanelContainer extends HTMLElement {
    dataset: DOMStringMap & {
        basePath: string;
        apiBasePath: string;
        panel: string;
        recordId: string;
        activeTab: string;
        defaultTab: string;
    };
}
export interface TabPanelPayload {
    tab?: TabPanel;
    record?: Record<string, unknown>;
    fields?: FieldDefinition[];
    resource_label?: string;
    resource?: string;
}
export interface TabPanel {
    id?: string;
    kind: 'details' | 'dashboard_area' | 'cms_area' | 'panel' | 'template';
    area_code?: string;
    widgets?: Widget[];
    empty_message?: string;
    href?: string;
    panel?: string;
    template?: string;
    html?: string;
}
export interface Widget {
    id?: string;
    definition?: string;
    title?: string;
    span?: number;
    metadata?: {
        layout?: {
            width?: number;
        };
    };
    config?: {
        title?: string;
    };
    data?: WidgetData;
}
export interface WidgetData {
    title?: string;
    values?: Record<string, unknown>;
    sections?: ProfileSection[];
    entries?: ActivityEntry[];
    total?: number;
    active?: number;
    new_today?: number;
}
export interface ProfileSection {
    label?: string;
    fields?: ProfileField[];
}
export interface ProfileField {
    key?: string;
    label?: string;
    value?: unknown;
    type?: 'text' | 'badge' | 'status' | 'verified' | 'date' | 'relative';
    verified?: boolean;
    hide_if_empty?: boolean;
}
export interface FieldDefinition {
    label: string;
    value?: unknown;
}
export interface ActivityEntry {
    actor?: string;
    action?: string;
    object?: string;
    created_at?: string;
}
export interface TabControllerOptions {
    onTabChange?: (tabId: string) => void;
    onError?: (error: Error) => void;
}
//# sourceMappingURL=types.d.ts.map
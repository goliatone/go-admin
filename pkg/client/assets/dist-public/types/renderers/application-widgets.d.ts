export interface ApplicationWidgetRenderer<TWidget = unknown> {
    render(widget: TWidget): string;
    title?: string | ((widget: TWidget) => string);
}
export declare function registerApplicationWidgetRenderer<TWidget = unknown>(definition: string, renderer: ApplicationWidgetRenderer<TWidget>): () => void;
export declare function resolveApplicationWidgetRenderer<TWidget = unknown>(definition?: string): ApplicationWidgetRenderer<TWidget> | undefined;
export declare function unregisterApplicationWidgetRenderer(definition: string): boolean;
export declare function resolveApplicationWidgetTitle<TWidget = unknown>(definition: string | undefined, widget: TWidget): string | undefined;
//# sourceMappingURL=application-widgets.d.ts.map
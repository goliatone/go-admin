/**
 * Toast notification types and interfaces
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;  // milliseconds, 0 = manual dismiss only
  dismissible?: boolean;
}

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Toast notifier interface
 * Implementations can be injected into DataGrid and other components
 */
export interface ToastNotifier {
  /**
   * Show a toast notification
   */
  show(options: ToastOptions): void;

  /**
   * Show a success toast
   */
  success(message: string, duration?: number): void;

  /**
   * Show an error toast
   */
  error(message: string, duration?: number): void;

  /**
   * Show a warning toast
   */
  warning(message: string, duration?: number): void;

  /**
   * Show an info toast
   */
  info(message: string, duration?: number): void;

  /**
   * Show a confirmation dialog (non-blocking alternative to window.confirm)
   * Returns a Promise that resolves to true if confirmed, false if cancelled
   */
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
}

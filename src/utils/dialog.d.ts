declare module '@/utils/dialog' {
  export function showAlert(
    message: string,
    options?: { title?: string; confirmText?: string }
  ): Promise<boolean>;
  export function showConfirm(
    message: string,
    options?: { title?: string; confirmText?: string; cancelText?: string }
  ): Promise<boolean>;
}

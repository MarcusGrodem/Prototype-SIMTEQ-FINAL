import { toast } from 'sonner';

export const UNDO_TOAST_DURATION_MS = 5000;

export function showUndoDeleteToast(message: string, undo: () => void | Promise<void>) {
  toast.success(message, {
    duration: UNDO_TOAST_DURATION_MS,
    action: {
      label: 'Undo',
      onClick: () => {
        void undo();
      },
    },
  });
}

export function showUploadFailureToast(message: string, retry: () => void | Promise<void>) {
  toast.error(message, {
    action: {
      label: 'Retry',
      onClick: () => {
        void retry();
      },
    },
  });
}

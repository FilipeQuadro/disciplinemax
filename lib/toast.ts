import { toast } from "react-hot-toast";

/**
 * Toast with retry action — shows error and a callable retry.
 */
export function errorToast(message: string, retryFn?: () => void) {
  if (retryFn) {
    toast.error(`${message} — Toque para tentar novamente`, {
      duration: 8000,
    });
  } else {
    toast.error(message);
  }
}

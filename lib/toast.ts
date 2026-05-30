import { toast } from "react-hot-toast";

/**
 * Show an error toast with optional retry suggestion.
 */
export function errorToast(message: string, retryFn?: () => void) {
  if (retryFn) {
    toast.error(`${message} — Tente novamente`, { duration: 8000 });
  } else {
    toast.error(message, { duration: 8000 });
  }
}

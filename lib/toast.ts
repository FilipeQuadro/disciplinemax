import { toast } from "react-hot-toast";

/**
 * Show an error toast. If retryFn is provided, the message suggests retrying.
 */
export function errorToast(message: string, retryFn?: () => void) {
  toast.error(retryFn ? `${message} — Clique para tentar novamente` : message, {
    duration: 8000,
  });
}

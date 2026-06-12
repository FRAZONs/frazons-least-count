import { useCallback, useSyncExternalStore } from "react";

const toastStore = {
  listeners: new Set(),
  toasts: [],

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  getSnapshot() {
    return this.toasts;
  },

  notify() {
    this.listeners.forEach((listener) => listener());
  },

  add(toast) {
    const id = Date.now() + Math.random();
    this.toasts = [...this.toasts, { ...toast, id }];
    this.notify();
    return id;
  },

  remove(id) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.notify();
  }
};

export function useToast() {
  const toasts = useSyncExternalStore(
    (listener) => toastStore.subscribe(listener),
    () => toastStore.getSnapshot()
  );

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = toastStore.add({ message, type });
    if (duration > 0) {
      setTimeout(() => toastStore.remove(id), duration);
    }
    return id;
  }, []);

  const success = useCallback(
    (message, duration = 3000) => showToast(message, "success", duration),
    [showToast]
  );
  const error = useCallback(
    (message, duration = 4000) => showToast(message, "error", duration),
    [showToast]
  );
  const info = useCallback(
    (message, duration = 3000) => showToast(message, "info", duration),
    [showToast]
  );
  const warning = useCallback(
    (message, duration = 3500) => showToast(message, "warning", duration),
    [showToast]
  );
  const dismiss = useCallback((id) => toastStore.remove(id), []);

  return { showToast, success, error, info, warning, dismiss, toasts };
}

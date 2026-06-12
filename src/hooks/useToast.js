import { useState, useCallback } from "react";

const toastStore = {
  listeners: [],
  toasts: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notify(listeners) {
    listeners.forEach((listener) => listener([...this.toasts]));
  },

  add(toast) {
    const id = Date.now() + Math.random();
    this.toasts.push({ ...toast, id });
    this.notify(this.listeners);
    return id;
  },

  remove(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify(this.listeners);
  }
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const unsubscribe = useCallback(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  // Subscribe on mount
  if (toasts.length === 0 && toastStore.toasts.length > 0) {
    setToasts([...toastStore.toasts]);
  }

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = toastStore.add({ message, type });
    if (duration > 0) {
      setTimeout(() => toastStore.remove(id), duration);
    }
    return id;
  }, []);

  const success = useCallback((message, duration = 3000) => {
    return showToast(message, "success", duration);
  }, [showToast]);

  const error = useCallback((message, duration = 4000) => {
    return showToast(message, "error", duration);
  }, [showToast]);

  const info = useCallback((message, duration = 3000) => {
    return showToast(message, "info", duration);
  }, [showToast]);

  const warning = useCallback((message, duration = 3500) => {
    return showToast(message, "warning", duration);
  }, [showToast]);

  const dismiss = useCallback((id) => {
    toastStore.remove(id);
  }, []);

  return { showToast, success, error, info, warning, dismiss, toasts: toastStore.toasts };
}

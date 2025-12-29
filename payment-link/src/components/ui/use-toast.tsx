"use client";

import { useCallback, useEffect, useState } from "react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const toast = useCallback((options: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...options }]);
  }, []);

  const ToastContainer = () => (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-lg flex-col gap-3 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md border px-4 py-3 shadow ${t.variant === "destructive" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-900"}`}
        >
          {t.title ? <div className="font-semibold">{t.title}</div> : null}
          {t.description ? <div className="text-sm text-slate-700">{t.description}</div> : null}
        </div>
      ))}
    </div>
  );

  return { toast, ToastContainer };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Notification } from "@/lib/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = async () => {
    try {
      const { count } = await api.unreadNotificationsCount();
      setCount(count);
    } catch {
      /* silencieux */
    }
  };

  useEffect(() => {
    void refreshCount();
    const id = setInterval(refreshCount, 30000); // poll léger
    return () => clearInterval(id);
  }, []);

  // Ferme au clic extérieur
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        setItems(await api.listNotifications(false));
      } catch {
        /* silencieux */
      }
    }
  };

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, lu: true })));
      setCount(0);
    } catch {
      /* silencieux */
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {count > 0 && (
              <button onClick={markAll} className="text-xs text-brand-700 hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">Aucune notification</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-3 text-sm ${n.lu ? "bg-white" : "bg-brand-50/40"}`}
                >
                  <p className="text-slate-700">{n.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{relativeTime(n.created_at)}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

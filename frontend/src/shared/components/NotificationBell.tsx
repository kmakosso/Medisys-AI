import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/shared/api/notifications.api";
import { relativeTime } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";
import type { NotificationItem } from "@/shared/types";

export function NotificationBell({ theme = "patient" }: { theme?: "patient" | "pro" }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      setCount(await notificationsApi.unreadCount());
    } catch {
      /* silencieux */
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 30000);
    return () => window.clearInterval(id);
  }, []);

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
        setItems(await notificationsApi.list(false));
      } catch {
        /* silencieux */
      }
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, lu: true })));
      setCount(0);
    } catch {
      /* silencieux */
    }
  };

  const iconColor = theme === "pro" ? "text-pro-accent hover:bg-white/10" : "text-slate-600 hover:bg-slate-100";

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Notifications" className={cn("relative rounded-md p-2", iconColor)}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <button onClick={markAll} className="text-xs text-patient hover:underline">
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
                  className={cn(
                    "border-b border-slate-50 px-4 py-3 text-sm",
                    !n.lu && "bg-patient-50/40",
                  )}
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

import type { LucideIcon } from "lucide-react";

export function StatsCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
            accent ? "bg-pro-accent/15 text-pro-accent" : "bg-pro/10 text-pro"
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

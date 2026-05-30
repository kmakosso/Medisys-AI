import { cn } from "@/shared/utils/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <span
        className={cn(
          "h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-patient",
          className,
        )}
      />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

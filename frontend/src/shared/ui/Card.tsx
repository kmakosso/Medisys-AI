import { cn } from "@/shared/utils/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5", className)}>{children}</div>
  );
}

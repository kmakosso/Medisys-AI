import { cn } from "@/shared/utils/cn";
import type { StatutRDV } from "@/shared/types";

const STATUT_CONFIG: Record<StatutRDV, { label: string; cls: string }> = {
  demande: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
  confirme: { label: "Confirmé", cls: "bg-patient-50 text-patient-700" },
  annule: { label: "Annulé", cls: "bg-red-100 text-red-700" },
  termine: { label: "Terminé", cls: "bg-slate-200 text-slate-700" },
};

export function StatutBadge({ statut }: { statut: StatutRDV }) {
  const c = STATUT_CONFIG[statut];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", c.cls)}>
      {c.label}
    </span>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

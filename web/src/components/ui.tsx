import { dayLabel, formatHeure, initials } from "@/lib/format";

// Avatar médecin avec initiales et couleur déterministe
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

export function Avatar({
  prenom,
  nom,
  size = "md",
}: {
  prenom: string;
  nom: string;
  size?: "sm" | "md" | "lg";
}) {
  const idx = (prenom.charCodeAt(0) + nom.charCodeAt(0)) % AVATAR_COLORS.length;
  const dim = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_COLORS[idx]} ${dim}`}
    >
      {initials(prenom, nom)}
    </div>
  );
}

// Badge "prochain créneau dispo"
export function DispoBadge({ iso }: { iso: string | null | undefined }) {
  if (!iso) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        Aucune dispo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      Dès {dayLabel(iso)} à {formatHeure(iso)}
    </span>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

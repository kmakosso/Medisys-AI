import { cn } from "@/shared/utils/cn";

const COLORS = [
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
  className,
}: {
  prenom: string;
  nom: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
  const idx = ((prenom.charCodeAt(0) || 0) + (nom.charCodeAt(0) || 0)) % COLORS.length;
  const dim = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        COLORS[idx],
        dim,
        className,
      )}
    >
      {initials}
    </div>
  );
}

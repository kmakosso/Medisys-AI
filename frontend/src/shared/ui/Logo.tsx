import { cn } from "@/shared/utils/cn";

/** Logo MedisysAI : croix médicale + nom. `pro` ajoute le badge Pro. */
export function Logo({
  pro = false,
  className,
  onDark = false,
}: {
  pro?: boolean;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold", className)}>
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-white",
          pro ? "bg-gradient-to-br from-pro to-pro-accent" : "bg-patient",
        )}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 4h-4v6H4v4h6v6h4v-6h6v-4h-6z" />
        </svg>
      </span>
      <span className={cn(onDark ? "text-white" : pro ? "text-pro" : "text-slate-900")}>
        Medisys<span className={pro ? "text-pro-accent" : "text-patient"}>AI</span>
        {pro && <span className="ml-1 align-top text-xs font-bold text-pro-accent">PRO</span>}
      </span>
    </span>
  );
}

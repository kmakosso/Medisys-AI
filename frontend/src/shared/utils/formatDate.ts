const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dayFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const heureFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso));
export const formatDay = (iso: string): string => dayFmt.format(new Date(iso));
export const formatHeure = (iso: string): string => heureFmt.format(new Date(iso));

export const formatCreneau = (debut: string, fin: string): string =>
  `${dayFmt.format(new Date(debut))} de ${heureFmt.format(new Date(debut))} à ${heureFmt.format(
    new Date(fin),
  )}`;

/** Clé jour locale YYYY-MM-DD pour regrouper. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export function calculerAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const diff = Date.now() - naissance.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function formatFCFA(montant: number | null | undefined): string | null {
  if (montant == null) return null;
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

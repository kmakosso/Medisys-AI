// Helpers de formatage (dates, libellés de statut).

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCreneau(debut: string, fin: string): string {
  const d = new Date(debut);
  const f = new Date(fin);
  return `${dateFmt.format(d)} – ${timeFmt.format(f)}`;
}

export function formatDateTime(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export const STATUT_LABELS: Record<string, string> = {
  demande: "Demandé",
  confirme: "Confirmé",
  annule: "Annulé",
  termine: "Terminé",
};

export const STATUT_STYLES: Record<string, string> = {
  demande: "bg-amber-100 text-amber-800",
  confirme: "bg-brand-100 text-brand-800",
  annule: "bg-red-100 text-red-700",
  termine: "bg-slate-200 text-slate-700",
};

export const TYPE_ENTREE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  ordonnance: "Ordonnance",
  resultat: "Résultat",
  note: "Note",
};

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

const dayLabelFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Clé de regroupement par jour (YYYY-MM-DD en heure locale). */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function dayLabel(iso: string): string {
  return dayLabelFmt.format(new Date(iso));
}

/** Heure seule "09:30". */
export function formatHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatFCFA(montant: number | null | undefined): string | null {
  if (montant == null) return null;
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

export function initials(prenom: string, nom: string): string {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
}

/** Temps relatif court pour les notifications ("il y a 3 min"). */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const JOURS_SEMAINE = JOURS.map((label, value) => ({ value, label }));

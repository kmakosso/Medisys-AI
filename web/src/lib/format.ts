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

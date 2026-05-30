import { Link } from "react-router-dom";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { formatDay, formatHeure, formatFCFA } from "@/shared/utils/formatDate";
import type { MedecinListItem } from "@/shared/types";

export function DoctorCard({ m }: { m: MedecinListItem }) {
  return (
    <Link
      to={`/app/book/${m.id}`}
      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-patient hover:shadow-sm"
    >
      <Avatar prenom={m.prenom} nom={m.nom} size="lg" />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900">Dr {m.prenom} {m.nom}</h3>
        <p className="text-sm font-medium text-patient-700">{m.specialite}</p>
        <div className="mt-1 space-y-0.5 text-sm text-slate-500">
          {m.structure_sante && <p className="truncate">{m.structure_sante}</p>}
          {m.ville && <p>{m.ville}</p>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {m.prochain_creneau ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-patient-50 px-2.5 py-1 text-xs font-medium text-patient-700">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Dès {formatDay(m.prochain_creneau)} à {formatHeure(m.prochain_creneau)}
            </span>
          ) : (
            <Badge>Aucune dispo</Badge>
          )}
          {formatFCFA(m.tarif_fcfa) && <Badge>{formatFCFA(m.tarif_fcfa)}</Badge>}
        </div>
      </div>
    </Link>
  );
}

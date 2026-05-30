import { Link } from "react-router-dom";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { StatutBadge } from "@/shared/ui/Badge";
import { formatCreneau } from "@/shared/utils/formatDate";
import type { Disponibilite, PatientProfile, RendezVous, StatutRDV } from "@/shared/types";

export function AppointmentModal({
  rdv,
  patient,
  slot,
  onClose,
  onAction,
  acting,
}: {
  rdv: RendezVous | null;
  patient?: PatientProfile;
  slot?: Disponibilite;
  onClose: () => void;
  onAction: (id: string, statut: StatutRDV) => void;
  acting: boolean;
}) {
  if (!rdv) return null;
  const canConfirm = rdv.statut === "demande";
  const canFinish = rdv.statut === "confirme";
  const canCancel = rdv.statut === "demande" || rdv.statut === "confirme";

  return (
    <Modal open={Boolean(rdv)} onClose={onClose} title="Rendez-vous">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900">
            {patient ? `${patient.prenom} ${patient.nom}` : "Patient"}
          </span>
          <StatutBadge statut={rdv.statut} />
        </div>
        {slot && <p className="text-sm text-slate-600">{formatCreneau(slot.debut, slot.fin)}</p>}
        {patient?.telephone && <p className="text-sm text-slate-500">📞 {patient.telephone}</p>}
        {rdv.motif && <p className="text-sm text-slate-500">Motif : {rdv.motif}</p>}

        {patient && (
          <Link
            to={`/pro/patients/${patient.id}/dossier`}
            className="inline-block text-sm font-medium text-pro hover:underline"
          >
            Voir le dossier patient →
          </Link>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {canConfirm && (
            <Button variant="success" size="sm" loading={acting} onClick={() => onAction(rdv.id, "confirme")}>
              Confirmer
            </Button>
          )}
          {canFinish && (
            <Button variant="pro" size="sm" loading={acting} onClick={() => onAction(rdv.id, "termine")}>
              Marquer terminé
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => onAction(rdv.id, "annule")}>
              Annuler
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

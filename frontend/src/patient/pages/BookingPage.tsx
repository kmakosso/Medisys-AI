import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMedecin, useMedecinDisponibilites, useMedecinMotifs } from "@/shared/hooks/useMedecins";
import { useCreateRdv } from "@/shared/hooks/useRdv";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Select, Textarea } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { dayKey, formatDay, formatHeure, formatFCFA } from "@/shared/utils/formatDate";
import type { Disponibilite } from "@/shared/types";

export function BookingPage() {
  const { medecinId } = useParams<{ medecinId: string }>();
  const navigate = useNavigate();
  const { data: medecin, isLoading, isError, refetch } = useMedecin(medecinId);
  const { data: slots = [] } = useMedecinDisponibilites(medecinId, true);
  const { data: motifs = [] } = useMedecinMotifs(medecinId);
  const createRdv = useCreateRdv();

  const [selected, setSelected] = useState<Disponibilite | null>(null);
  const [motif, setMotif] = useState("");
  const [done, setDone] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, Disponibilite[]>();
    for (const s of [...slots].sort((a, b) => a.debut.localeCompare(b.debut))) {
      const k = dayKey(s.debut);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  const confirm = async () => {
    if (!selected) return;
    try {
      await createRdv.mutateAsync({ creneauId: selected.id, motif: motif || undefined });
      setDone(true);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Réservation impossible."));
    }
  };

  if (isLoading) return <Spinner label="Chargement…" />;
  if (isError || !medecin) return <ErrorState onRetry={() => refetch()} />;

  if (done) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 animate-pop text-success" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Rendez-vous demandé !</h1>
        <p className="mt-2 text-slate-600">
          Votre demande a été envoyée au Dr {medecin.prenom} {medecin.nom}. Vous serez notifié de la
          confirmation.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => navigate("/app/dashboard")}>Voir mes rendez-vous</Button>
          <Link to="/app/search"><Button variant="outline">Nouvelle recherche</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/app/search" className="mb-4 inline-flex items-center gap-1 text-sm text-patient hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <Avatar prenom={medecin.prenom} nom={medecin.nom} size="lg" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Dr {medecin.prenom} {medecin.nom}</h1>
              <p className="font-medium text-patient-700">{medecin.specialite}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
            {medecin.structure_sante && <p>🏥 {medecin.structure_sante}</p>}
            {medecin.adresse && <p>📍 {medecin.adresse}</p>}
            {medecin.ville && <p>🌍 {medecin.ville}</p>}
            {medecin.langues && <p>🗣️ {medecin.langues.split(",").join(", ")}</p>}
            {formatFCFA(medecin.tarif_fcfa) && <p>💳 {formatFCFA(medecin.tarif_fcfa)}</p>}
          </dl>
          {medecin.bio && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h2 className="mb-1 text-sm font-semibold text-slate-900">À propos</h2>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{medecin.bio}</p>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Choisir un créneau</h2>

          {byDay.length === 0 ? (
            <p className="text-slate-500">Aucun créneau disponible pour le moment.</p>
          ) : (
            <div className="space-y-5">
              {byDay.map(([k, daySlots]) => (
                <div key={k}>
                  <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700">{formatDay(daySlots[0].debut)}</h3>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                          selected?.id === s.id
                            ? "border-patient bg-patient text-white"
                            : "border-patient-100 bg-patient-50 text-patient-700 hover:bg-patient-100"
                        }`}
                      >
                        {formatHeure(s.debut)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              {motifs.length > 0 && (
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Motif</label>
                  <Select value={motif} onChange={(e) => setMotif(e.target.value)} className="max-w-sm">
                    <option value="">— Sélectionner —</option>
                    {motifs.map((mo) => (
                      <option key={mo.id} value={mo.libelle}>{mo.libelle} ({mo.duree_minutes} min)</option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Précisions (optionnel)</label>
                <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="Décrivez le motif…" />
              </div>
              <Button onClick={confirm} loading={createRdv.isPending}>
                Confirmer le {formatDay(selected.debut)} à {formatHeure(selected.debut)}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

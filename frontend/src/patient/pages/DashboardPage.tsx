import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { rdvApi } from "@/shared/api/rdv.api";
import { medecinsApi } from "@/shared/api/medecins.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { StatutBadge } from "@/shared/ui/Badge";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { formatCreneau } from "@/shared/utils/formatDate";
import type { Disponibilite, MedecinProfile, RendezVous } from "@/shared/types";

export function DashboardPage() {
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [medecins, setMedecins] = useState<Record<string, MedecinProfile>>({});
  const [slots, setSlots] = useState<Record<string, Disponibilite>>({});
  const [tab, setTab] = useState<"avenir" | "passes">("avenir");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await rdvApi.list({ size: 100 });
      setRdvs(page.items);
      const ids = Array.from(new Set(page.items.map((r) => r.medecin_id)));
      const mMap: Record<string, MedecinProfile> = {};
      const sMap: Record<string, Disponibilite> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const [m, ds] = await Promise.all([
              medecinsApi.get(id),
              medecinsApi.disponibilites(id, false),
            ]);
            mMap[id] = m;
            for (const d of ds) sMap[d.id] = d;
          } catch {
            /* ignore */
          }
        }),
      );
      setMedecins(mMap);
      setSlots(sMap);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isUpcoming = (r: RendezVous) => {
    if (r.statut === "annule" || r.statut === "termine") return false;
    const s = slots[r.creneau_id];
    return !s || new Date(s.debut).getTime() >= Date.now();
  };

  const { avenir, passes, prochain } = useMemo(() => {
    const a = rdvs.filter(isUpcoming);
    const p = rdvs.filter((r) => !isUpcoming(r));
    const byDate = (r: RendezVous) => slots[r.creneau_id]?.debut ?? r.created_at;
    a.sort((x, y) => byDate(x).localeCompare(byDate(y)));
    p.sort((x, y) => byDate(y).localeCompare(byDate(x)));
    return { avenir: a, passes: p, prochain: a[0] ?? null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdvs, slots]);

  const cancel = async (id: string) => {
    setActing(id);
    try {
      const u = await rdvApi.updateStatut(id, "annule");
      setRdvs((prev) => prev.map((r) => (r.id === id ? u : r)));
      toast.success("Rendez-vous annulé.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  const list = tab === "avenir" ? avenir : passes;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Bonjour 👋</h1>
        <Link to="/app/search">
          <Button><CalendarPlus className="h-4 w-4" /> Prendre un rendez-vous</Button>
        </Link>
      </div>

      {/* Prochain RDV en évidence */}
      {prochain && (
        <Card className="border-patient-100 bg-patient-50/40">
          <p className="mb-2 text-sm font-medium text-patient-700">Votre prochain rendez-vous</p>
          <RdvRow
            r={prochain}
            medecin={medecins[prochain.medecin_id]}
            slot={slots[prochain.creneau_id]}
            onCancel={cancel}
            acting={acting === prochain.id}
          />
        </Card>
      )}

      {/* Tabs */}
      <div>
        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {([["avenir", `À venir (${avenir.length})`], ["passes", `Historique (${passes.length})`]] as const).map(
            ([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === k ? "border-patient text-patient-700" : "border-transparent text-slate-500"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {list.length === 0 ? (
          <p className="text-slate-500">Aucun rendez-vous {tab === "avenir" ? "à venir" : "passé"}.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => (
              <Card key={r.id}>
                <RdvRow
                  r={r}
                  medecin={medecins[r.medecin_id]}
                  slot={slots[r.creneau_id]}
                  onCancel={cancel}
                  acting={acting === r.id}
                />
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RdvRow({
  r,
  medecin,
  slot,
  onCancel,
  acting,
}: {
  r: RendezVous;
  medecin?: MedecinProfile;
  slot?: Disponibilite;
  onCancel: (id: string) => void;
  acting: boolean;
}) {
  const canCancel = r.statut === "demande" || r.statut === "confirme";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-3">
        {medecin && <Avatar prenom={medecin.prenom} nom={medecin.nom} />}
        <div>
          <p className="font-semibold text-slate-900">
            {medecin ? `Dr ${medecin.prenom} ${medecin.nom}` : "Médecin"}
            {medecin && <span className="ml-2 text-sm font-normal text-patient-700">{medecin.specialite}</span>}
          </p>
          {slot && <p className="text-sm text-slate-600">{formatCreneau(slot.debut, slot.fin)}</p>}
          {r.motif && <p className="text-sm text-slate-500">Motif : {r.motif}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatutBadge statut={r.statut} />
        {canCancel && (
          <Button variant="danger" size="sm" loading={acting} onClick={() => onCancel(r.id)}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}

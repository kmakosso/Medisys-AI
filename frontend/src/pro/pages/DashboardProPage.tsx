import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { medecinsApi } from "@/shared/api/medecins.api";
import { rdvApi } from "@/shared/api/rdv.api";
import { patientsApi } from "@/shared/api/patients.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { StatsCard } from "@/pro/components/StatsCard";
import { StatutBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { dayKey, formatHeure } from "@/shared/utils/formatDate";
import type { Disponibilite, MedecinProfile, PatientProfile, RendezVous } from "@/shared/types";

export function DashboardProPage() {
  const [me, setMe] = useState<MedecinProfile | null>(null);
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [slots, setSlots] = useState<Record<string, Disponibilite>>({});
  const [patients, setPatients] = useState<Record<string, PatientProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await medecinsApi.me();
      setMe(profile);
      const [page, ds] = await Promise.all([
        rdvApi.list({ size: 100 }),
        medecinsApi.disponibilites(profile.id, false),
      ]);
      setRdvs(page.items);
      const sMap: Record<string, Disponibilite> = {};
      for (const d of ds) sMap[d.id] = d;
      setSlots(sMap);
      const pids = Array.from(new Set(page.items.map((r) => r.patient_id)));
      const pMap: Record<string, PatientProfile> = {};
      await Promise.all(
        pids.map(async (id) => {
          try {
            pMap[id] = await patientsApi.get(id);
          } catch {
            /* ignore */
          }
        }),
      );
      setPatients(pMap);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const today = dayKey(new Date().toISOString());

  const stats = useMemo(() => {
    const todayRdv = rdvs.filter((r) => {
      const s = slots[r.creneau_id];
      return s && dayKey(s.debut) === today && r.statut !== "annule";
    });
    const pending = rdvs.filter((r) => r.statut === "demande");
    return {
      today: todayRdv,
      pending,
      patients: new Set(rdvs.map((r) => r.patient_id)).size,
    };
  }, [rdvs, slots, today]);

  const act = async (id: string, statut: "confirme" | "annule") => {
    setActing(id);
    try {
      const u = await rdvApi.updateStatut(id, statut);
      setRdvs((prev) => prev.map((r) => (r.id === id ? u : r)));
      toast.success(statut === "confirme" ? "Rendez-vous confirmé." : "Rendez-vous refusé.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  const patientName = (id: string) => {
    const p = patients[id];
    return p ? `${p.prenom} ${p.nom}` : "Patient";
  };

  const sortedToday = [...stats.today].sort((a, b) =>
    (slots[a.creneau_id]?.debut ?? "").localeCompare(slots[b.creneau_id]?.debut ?? ""),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour Dr {me?.prenom} {me?.nom}
        </h1>
        <p className="text-slate-500">
          Vous avez <strong>{stats.today.length}</strong> rendez-vous aujourd&apos;hui.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={CalendarDays} label="RDV aujourd'hui" value={stats.today.length} accent />
        <StatsCard icon={CalendarClock} label="En attente" value={stats.pending.length} />
        <StatsCard icon={Users} label="Patients" value={stats.patients} />
        <StatsCard icon={Clock} label="Total RDV" value={rdvs.length} />
      </div>

      {/* Demandes à confirmer */}
      {stats.pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Demandes à confirmer</h2>
          <ul className="space-y-2">
            {stats.pending.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900">{patientName(r.patient_id)}</p>
                  {slots[r.creneau_id] && (
                    <p className="text-sm text-slate-500">{formatHeure(slots[r.creneau_id].debut)} · {r.motif ?? "Sans motif"}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" loading={acting === r.id} onClick={() => act(r.id, "confirme")}>
                    Confirmer
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => act(r.id, "annule")}>Refuser</Button>
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      {/* Agenda du jour */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Agenda du jour</h2>
        {sortedToday.length === 0 ? (
          <p className="text-slate-500">Aucun rendez-vous aujourd&apos;hui.</p>
        ) : (
          <ul className="space-y-2">
            {sortedToday.map((r) => (
              <Card key={r.id} className="flex items-center gap-4 p-4">
                <span className="font-mono text-sm font-semibold text-pro">
                  {slots[r.creneau_id] && formatHeure(slots[r.creneau_id].debut)}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{patientName(r.patient_id)}</p>
                  {r.motif && <p className="text-sm text-slate-500">{r.motif}</p>}
                </div>
                <StatutBadge statut={r.statut} />
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

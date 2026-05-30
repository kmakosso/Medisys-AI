import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { medecinsApi } from "@/shared/api/medecins.api";
import { rdvApi } from "@/shared/api/rdv.api";
import { patientsApi } from "@/shared/api/patients.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { AppointmentModal } from "@/pro/components/AppointmentModal";
import { dayKey, formatHeure } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";
import type { Disponibilite, PatientProfile, RendezVous, StatutRDV } from "@/shared/types";

const STATUT_COLOR: Record<StatutRDV, string> = {
  confirme: "bg-patient text-white",
  demande: "bg-amber-400 text-white",
  annule: "bg-slate-300 text-slate-600 line-through",
  termine: "bg-success text-white",
};

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // lundi = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function AgendaPage() {
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [slots, setSlots] = useState<Disponibilite[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientProfile>>({});
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RendezVous | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await medecinsApi.me();
      const [page, ds] = await Promise.all([
        rdvApi.list({ size: 200 }),
        medecinsApi.disponibilites(me.id, false),
      ]);
      setRdvs(page.items);
      setSlots(ds);
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

  const slotById = useMemo(() => {
    const m: Record<string, Disponibilite> = {};
    for (const s of slots) m[s.id] = s;
    return m;
  }, [slots]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)),
    [weekStart],
  );

  // Événements (RDV non annulés) par jour
  const eventsByDay = useMemo(() => {
    const map: Record<string, RendezVous[]> = {};
    for (const r of rdvs) {
      const s = slotById[r.creneau_id];
      if (!s) continue;
      const k = dayKey(s.debut);
      (map[k] ??= []).push(r);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => slotById[a.creneau_id].debut.localeCompare(slotById[b.creneau_id].debut));
    }
    return map;
  }, [rdvs, slotById]);

  const act = async (id: string, statut: StatutRDV) => {
    setActing(true);
    try {
      const u = await rdvApi.updateStatut(id, statut);
      setRdvs((prev) => prev.map((r) => (r.id === id ? u : r)));
      setSelected(u);
      toast.success("Rendez-vous mis à jour.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <Spinner label="Chargement de l'agenda…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const monthLabel = weekStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold capitalize text-slate-900">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Cette semaine
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((d, i) => {
          const k = dayKey(d.toISOString());
          const events = eventsByDay[k] ?? [];
          const isToday = k === dayKey(new Date().toISOString());
          return (
            <div key={k} className={cn("rounded-xl border bg-white p-2", isToday ? "border-pro" : "border-slate-200")}>
              <div className={cn("mb-2 text-center text-xs font-semibold", isToday ? "text-pro" : "text-slate-500")}>
                {JOURS[i].slice(0, 3)} {d.getDate()}
              </div>
              <div className="space-y-1">
                {events.length === 0 ? (
                  <p className="py-2 text-center text-[10px] text-slate-300">—</p>
                ) : (
                  events.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={cn("w-full rounded-md px-2 py-1 text-left text-xs font-medium", STATUT_COLOR[r.statut])}
                    >
                      {formatHeure(slotById[r.creneau_id].debut)}{" "}
                      {patients[r.patient_id]?.nom ?? ""}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-patient" /> Confirmé</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-amber-400" /> En attente</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-success" /> Terminé</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-slate-300" /> Annulé</span>
      </div>

      <AppointmentModal
        rdv={selected}
        patient={selected ? patients[selected.patient_id] : undefined}
        slot={selected ? slotById[selected.creneau_id] : undefined}
        onClose={() => setSelected(null)}
        onAction={act}
        acting={acting}
      />
    </div>
  );
}

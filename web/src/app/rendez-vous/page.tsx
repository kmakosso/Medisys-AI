"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayLabel, formatCreneau, formatHeure, STATUT_LABELS, STATUT_STYLES } from "@/lib/format";
import { Avatar, Spinner } from "@/components/ui";
import type { Disponibilite, MedecinListItem, RendezVous } from "@/lib/types";

export default function RendezVousPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [medecins, setMedecins] = useState<Record<string, MedecinListItem>>({});
  const [slotMap, setSlotMap] = useState<Record<string, Disponibilite>>({});
  const [slotsByMedecin, setSlotsByMedecin] = useState<Record<string, Disponibilite[]>>({});
  const [tab, setTab] = useState<"avenir" | "passes">("avenir");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reschedFor, setReschedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await api.listRendezVous({ size: 100 });
      setRdvs(page.items);

      const medIds = Array.from(new Set(page.items.map((r) => r.medecin_id)));
      const sMap: Record<string, Disponibilite> = {};
      const byMed: Record<string, Disponibilite[]> = {};
      const mMap: Record<string, MedecinListItem> = {};

      await Promise.all(
        medIds.map(async (id) => {
          try {
            const [m, slots] = await Promise.all([
              api.getMedecin(id),
              api.listAllDisponibilites(id),
            ]);
            mMap[id] = m;
            byMed[id] = slots.filter((s) => s.statut === "libre").sort((a, b) => a.debut.localeCompare(b.debut));
            for (const s of slots) sMap[s.id] = s;
          } catch {
            /* ignore */
          }
        }),
      );
      setMedecins(mMap);
      setSlotMap(sMap);
      setSlotsByMedecin(byMed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isUpcoming = (r: RendezVous): boolean => {
    if (r.statut === "annule" || r.statut === "termine") return false;
    const slot = slotMap[r.creneau_id];
    if (!slot) return true;
    return new Date(slot.debut).getTime() >= Date.now();
  };

  const { avenir, passes } = useMemo(() => {
    const a: RendezVous[] = [];
    const p: RendezVous[] = [];
    for (const r of rdvs) (isUpcoming(r) ? a : p).push(r);
    const byDate = (r: RendezVous) => slotMap[r.creneau_id]?.debut ?? r.created_at;
    a.sort((x, y) => byDate(x).localeCompare(byDate(y)));
    p.sort((x, y) => byDate(y).localeCompare(byDate(x)));
    return { avenir: a, passes: p };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdvs, slotMap]);

  const handleCancel = async (id: string) => {
    setActingId(id);
    try {
      const updated = await api.updateRendezVousStatut(id, "annule");
      setRdvs((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Annulation impossible.");
    } finally {
      setActingId(null);
    }
  };

  const handleReschedule = async (rdvId: string, newSlotId: string) => {
    setActingId(rdvId);
    try {
      const updated = await api.rescheduleRendezVous(rdvId, newSlotId);
      setReschedFor(null);
      // recharge pour refléter les changements de créneaux
      setRdvs((prev) => prev.map((r) => (r.id === rdvId ? updated : r)));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reprogrammation impossible.");
    } finally {
      setActingId(null);
    }
  };

  if (authLoading || (!user && loading)) return <Spinner />;
  if (!user) return null;

  const list = tab === "avenir" ? avenir : passes;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Mes rendez-vous</h1>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {([
          ["avenir", `À venir (${avenir.length})`],
          ["passes", `Passés (${passes.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Aucun rendez-vous {tab === "avenir" ? "à venir" : "passé"}.</p>
          {tab === "avenir" && (
            <Link
              href="/medecins"
              className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Prendre rendez-vous
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const m = medecins[r.medecin_id];
            const slot = slotMap[r.creneau_id];
            const canAct = r.statut === "demande" || r.statut === "confirme";
            const freeSlots = slotsByMedecin[r.medecin_id] ?? [];
            return (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    {m && <Avatar prenom={m.prenom} nom={m.nom} />}
                    <div>
                      <p className="font-semibold text-slate-900">
                        {m ? `Dr ${m.prenom} ${m.nom}` : "Médecin"}
                        {m && <span className="ml-2 text-sm font-normal text-brand-700">{m.specialite}</span>}
                      </p>
                      {slot && <p className="text-sm text-slate-700">{formatCreneau(slot.debut, slot.fin)}</p>}
                      {r.motif && <p className="text-sm text-slate-500">Motif : {r.motif}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUT_STYLES[r.statut] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATUT_LABELS[r.statut] ?? r.statut}
                    </span>
                    {canAct && (
                      <>
                        <button
                          onClick={() => setReschedFor(reschedFor === r.id ? null : r.id)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Reprogrammer
                        </button>
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={actingId === r.id}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Panneau de reprogrammation */}
                {reschedFor === r.id && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">Choisir un nouveau créneau :</p>
                    {freeSlots.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun créneau libre chez ce médecin.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {freeSlots.slice(0, 24).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleReschedule(r.id, s.id)}
                            disabled={actingId === r.id}
                            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                          >
                            {dayLabel(s.debut)} {formatHeure(s.debut)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

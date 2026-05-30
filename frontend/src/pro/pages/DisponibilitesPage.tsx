import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { medecinsApi } from "@/shared/api/medecins.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input, Label } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { dayKey, formatDay, formatHeure } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";
import type { Disponibilite } from "@/shared/types";

const JOURS = [
  { v: 0, l: "Lun" }, { v: 1, l: "Mar" }, { v: 2, l: "Mer" }, { v: 3, l: "Jeu" },
  { v: 4, l: "Ven" }, { v: 5, l: "Sam" }, { v: 6, l: "Dim" },
];

export function DisponibilitesPage() {
  const [medecinId, setMedecinId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Disponibilite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [jours, setJours] = useState<number[]>([0, 1, 2, 3, 4]);
  const [hDebut, setHDebut] = useState("09:00");
  const [hFin, setHFin] = useState("17:00");
  const [duree, setDuree] = useState(30);
  const [dDebut, setDDebut] = useState("");
  const [dFin, setDFin] = useState("");

  const [unitDebut, setUnitDebut] = useState("");
  const [unitFin, setUnitFin] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await medecinsApi.me();
      setMedecinId(me.id);
      const ds = await medecinsApi.disponibilites(me.id, false);
      ds.sort((a, b) => a.debut.localeCompare(b.debut));
      setSlots(ds);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Disponibilite[]>();
    for (const s of slots) {
      const k = dayKey(s.debut);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  const toggleJour = (v: number) =>
    setJours((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jours.length === 0 || !dDebut || !dFin) {
      toast.error("Choisissez des jours et une période.");
      return;
    }
    setBusy(true);
    try {
      const created = await medecinsApi.createRecurringDisponibilites({
        jours_semaine: jours, heure_debut: hDebut, heure_fin: hFin,
        duree_minutes: duree, date_debut: dDebut, date_fin: dFin,
      });
      toast.success(`${created.length} créneau(x) généré(s).`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitDebut || !unitFin) return;
    if (new Date(unitFin) <= new Date(unitDebut)) {
      toast.error("La fin doit être après le début.");
      return;
    }
    setBusy(true);
    try {
      await medecinsApi.createDisponibilite(new Date(unitDebut).toISOString(), new Date(unitFin).toISOString());
      setUnitDebut(""); setUnitFin("");
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await medecinsApi.deleteDisponibilite(id);
      setSlots((p) => p.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Spinner label="Chargement…" />;
  if (error || !medecinId) return <ErrorState message={error ?? undefined} onRetry={load} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mes disponibilités</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Générer des créneaux récurrents</h2>
        <form onSubmit={generate}>
          <div className="mb-3 flex flex-wrap gap-2">
            {JOURS.map((j) => (
              <button
                key={j.v}
                type="button"
                onClick={() => toggleJour(j.v)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm",
                  jours.includes(j.v) ? "bg-pro text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
                )}
              >
                {j.l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>De</Label><Input type="time" value={hDebut} onChange={(e) => setHDebut(e.target.value)} className="w-32" /></div>
            <div><Label>À</Label><Input type="time" value={hFin} onChange={(e) => setHFin(e.target.value)} className="w-32" /></div>
            <div><Label>Durée (min)</Label><Input type="number" min={5} max={240} step={5} value={duree} onChange={(e) => setDuree(Number(e.target.value))} className="w-24" /></div>
            <div><Label>Du</Label><Input type="date" value={dDebut} onChange={(e) => setDDebut(e.target.value)} className="w-40" /></div>
            <div><Label>Au</Label><Input type="date" value={dFin} onChange={(e) => setDFin(e.target.value)} className="w-40" /></div>
            <Button type="submit" variant="pro" loading={busy}>Générer</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Ajouter un créneau ponctuel</h2>
        <form onSubmit={addUnit} className="flex flex-wrap items-end gap-3">
          <div><Label>Début</Label><Input type="datetime-local" value={unitDebut} onChange={(e) => setUnitDebut(e.target.value)} /></div>
          <div><Label>Fin</Label><Input type="datetime-local" value={unitFin} onChange={(e) => setUnitFin(e.target.value)} /></div>
          <Button type="submit" variant="outline" loading={busy}>Ajouter</Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Créneaux ({slots.length})</h2>
        {byDay.length === 0 ? (
          <p className="text-slate-500">Aucun créneau.</p>
        ) : (
          <div className="space-y-4">
            {byDay.map(([k, daySlots]) => (
              <div key={k}>
                <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700">{formatDay(daySlots[0].debut)}</h3>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <span
                      key={s.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm",
                        s.statut === "libre" ? "border-success/30 bg-success/10 text-success" : "border-patient-100 bg-patient-50 text-patient-700",
                      )}
                    >
                      {formatHeure(s.debut)}
                      {s.statut === "libre" ? (
                        <button onClick={() => remove(s.id)} className="ml-1 text-slate-400 hover:text-danger" title="Supprimer">✕</button>
                      ) : (
                        <span className="ml-1 text-[10px] uppercase">réservé</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { medecinsApi } from "@/shared/api/medecins.api";
import { rdvApi } from "@/shared/api/rdv.api";
import { patientsApi } from "@/shared/api/patients.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Avatar } from "@/shared/ui/Avatar";
import { Input } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { calculerAge } from "@/shared/utils/formatDate";
import type { PatientProfile } from "@/shared/types";

export function PatientListPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await medecinsApi.me();
      const page = await rdvApi.list({ size: 200 });
      const ids = Array.from(new Set(page.items.map((r) => r.patient_id)));
      const list: PatientProfile[] = [];
      await Promise.all(
        ids.map(async (id) => {
          try {
            list.push(await patientsApi.get(id));
          } catch {
            /* ignore */
          }
        }),
      );
      list.sort((a, b) => a.nom.localeCompare(b.nom));
      setPatients(list);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return patients.filter((p) => `${p.prenom} ${p.nom}`.toLowerCase().includes(term));
  }, [patients, q]);

  if (loading) return <Spinner label="Chargement des patients…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Mes patients</h1>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-500">Aucun patient.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/pro/patients/${p.id}/dossier`}
              className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50"
            >
              <Avatar prenom={p.prenom} nom={p.nom} size="sm" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{p.prenom} {p.nom}</p>
                <p className="text-xs text-slate-500">
                  {[calculerAge(p.date_naissance) ? `${calculerAge(p.date_naissance)} ans` : null, p.ville, p.telephone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="text-sm text-pro">Dossier →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { patientsApi } from "@/shared/api/patients.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input, Label, Select } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { normalizePhoneSN } from "@/shared/utils/formatPhone";
import { VILLES_SENEGAL } from "@/shared/utils/formatPhone";

export function ProfilePage() {
  const [form, setForm] = useState({
    prenom: "", nom: "", date_naissance: "", sexe: "", telephone: "", adresse: "", ville: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await patientsApi.me();
        setForm({
          prenom: p.prenom ?? "", nom: p.nom ?? "", date_naissance: p.date_naissance ?? "",
          sexe: p.sexe ?? "", telephone: p.telephone ?? "", adresse: p.adresse ?? "", ville: p.ville ?? "",
        });
      } catch (err) {
        toast.error(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const up = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientsApi.updateMe({
        prenom: form.prenom, nom: form.nom,
        date_naissance: form.date_naissance || null,
        sexe: form.sexe || null,
        telephone: form.telephone ? normalizePhoneSN(form.telephone) : null,
        adresse: form.adresse || null, ville: form.ville || null,
      });
      toast.success("Profil mis à jour.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Chargement…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Mon profil</h1>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prénom</Label><Input value={form.prenom} onChange={up("prenom")} /></div>
            <div><Label>Nom</Label><Input value={form.nom} onChange={up("nom")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date de naissance</Label><Input type="date" value={form.date_naissance} onChange={up("date_naissance")} /></div>
            <div>
              <Label>Sexe</Label>
              <Select value={form.sexe} onChange={up("sexe")}>
                <option value="">—</option>
                <option value="masculin">Masculin</option>
                <option value="feminin">Féminin</option>
                <option value="autre">Autre</option>
              </Select>
            </div>
          </div>
          <div><Label>Téléphone</Label><Input value={form.telephone} onChange={up("telephone")} placeholder="+221 77 123 45 67" /></div>
          <div><Label>Adresse</Label><Input value={form.adresse} onChange={up("adresse")} /></div>
          <div>
            <Label>Ville</Label>
            <Select value={form.ville} onChange={up("ville")}>
              <option value="">—</option>
              {VILLES_SENEGAL.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
          <Button type="submit" loading={saving}>Enregistrer</Button>
        </form>
      </Card>

      <Link
        to="/app/profil/sante"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-patient"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-patient-50 text-patient">
          <HeartPulse className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-slate-900">Mon profil de santé</p>
          <p className="text-sm text-slate-500">Groupe sanguin, allergies, antécédents, vaccinations…</p>
        </div>
      </Link>
    </div>
  );
}

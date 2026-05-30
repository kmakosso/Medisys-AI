import { useEffect, useState } from "react";
import { toast } from "sonner";
import { medecinsApi } from "@/shared/api/medecins.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input, Label, Textarea } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { normalizePhoneSN } from "@/shared/utils/formatPhone";
import type { Motif } from "@/shared/types";

export function ProfileProPage() {
  const [form, setForm] = useState({
    prenom: "", nom: "", specialite: "", numero_ordre: "", structure_sante: "",
    telephone: "", ville: "", adresse: "", langues: "", tarif_fcfa: "", bio: "",
  });
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [newMotif, setNewMotif] = useState("");
  const [newDuree, setNewDuree] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const m = await medecinsApi.me();
      setForm({
        prenom: m.prenom ?? "", nom: m.nom ?? "", specialite: m.specialite ?? "",
        numero_ordre: m.numero_ordre ?? "", structure_sante: m.structure_sante ?? "",
        telephone: m.telephone ?? "", ville: m.ville ?? "", adresse: m.adresse ?? "",
        langues: m.langues ?? "", tarif_fcfa: m.tarif_fcfa != null ? String(m.tarif_fcfa) : "", bio: m.bio ?? "",
      });
      setMotifs(await medecinsApi.myMotifs());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const up = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await medecinsApi.updateMe({
        prenom: form.prenom, nom: form.nom, specialite: form.specialite,
        numero_ordre: form.numero_ordre || null, structure_sante: form.structure_sante || null,
        telephone: form.telephone ? normalizePhoneSN(form.telephone) : null,
        ville: form.ville || null, adresse: form.adresse || null, langues: form.langues || null,
        tarif_fcfa: form.tarif_fcfa ? Number(form.tarif_fcfa) : null, bio: form.bio || null,
      });
      toast.success("Profil mis à jour.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addMotif = async () => {
    if (!newMotif.trim()) return;
    try {
      const m = await medecinsApi.createMotif(newMotif, newDuree);
      setMotifs((p) => [...p, m]);
      setNewMotif(""); setNewDuree(30);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const delMotif = async (id: string) => {
    try {
      await medecinsApi.deleteMotif(id);
      setMotifs((p) => p.filter((m) => m.id !== id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Spinner label="Chargement…" />;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>

      <Card>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prénom</Label><Input value={form.prenom} onChange={up("prenom")} /></div>
            <div><Label>Nom</Label><Input value={form.nom} onChange={up("nom")} /></div>
          </div>
          <div><Label>Spécialité</Label><Input value={form.specialite} onChange={up("specialite")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>N° d&apos;ordre</Label><Input value={form.numero_ordre} onChange={up("numero_ordre")} /></div>
            <div><Label>Ville</Label><Input value={form.ville} onChange={up("ville")} /></div>
          </div>
          <div><Label>Structure de santé</Label><Input value={form.structure_sante} onChange={up("structure_sante")} /></div>
          <div><Label>Adresse du cabinet</Label><Input value={form.adresse} onChange={up("adresse")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Langues</Label><Input value={form.langues} onChange={up("langues")} placeholder="Français, Wolof" /></div>
            <div><Label>Tarif (FCFA)</Label><Input type="number" min={0} step={500} value={form.tarif_fcfa} onChange={up("tarif_fcfa")} /></div>
          </div>
          <div><Label>Téléphone</Label><Input value={form.telephone} onChange={up("telephone")} placeholder="+221 77 123 45 67" /></div>
          <div><Label>Présentation</Label><Textarea rows={4} value={form.bio} onChange={up("bio")} /></div>
          <Button type="submit" variant="pro" loading={saving}>Enregistrer</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Motifs de consultation</h2>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="flex-1"><Label>Libellé</Label><Input value={newMotif} onChange={(e) => setNewMotif(e.target.value)} placeholder="Ex : Première consultation" /></div>
          <div><Label>Durée (min)</Label><Input type="number" min={5} max={240} step={5} value={newDuree} onChange={(e) => setNewDuree(Number(e.target.value))} className="w-24" /></div>
          <Button type="button" variant="outline" onClick={addMotif}>Ajouter</Button>
        </div>
        {motifs.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun motif.</p>
        ) : (
          <ul className="space-y-2">
            {motifs.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">{m.libelle} · {m.duree_minutes} min</span>
                <button onClick={() => delMotif(m.id)} className="text-sm text-danger hover:underline">Supprimer</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

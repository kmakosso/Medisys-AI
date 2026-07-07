import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock, Plus, Syringe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { patientsApi } from "@/shared/api/patients.api";
import { santeApi } from "@/shared/api/sante.api";
import { medecinsApi } from "@/shared/api/medecins.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input, Label, Select, Textarea } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { TagsInput } from "@/patient/components/TagsInput";
import { cn } from "@/shared/utils/cn";
import { formatDate } from "@/shared/utils/formatDate";
import type { GroupeSanguin, MedecinListItem, SanteProfil, VaccinationEntry } from "@/shared/types";

const GROUPES: GroupeSanguin[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-slate-900">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </Card>
  );
}

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-2 text-xs font-medium text-success">Enregistré ✓</span>;
}

export function ProfilSantePage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [profil, setProfil] = useState<SanteProfil | null>(null);
  const [vaccinations, setVaccinations] = useState<VaccinationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);

  const [traitements, setTraitements] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");

  const [medecinQuery, setMedecinQuery] = useState("");
  const [medecinResults, setMedecinResults] = useState<MedecinListItem[]>([]);
  const [medecinTraitantNom, setMedecinTraitantNom] = useState<string | null>(null);

  const [vaccModal, setVaccModal] = useState(false);
  const [vaccNom, setVaccNom] = useState("");
  const [vaccDate, setVaccDate] = useState("");
  const [vaccRappel, setVaccRappel] = useState("");
  const [savingVacc, setSavingVacc] = useState(false);

  const savedTimer = useRef<number>();

  const flashSaved = (field: string) => {
    setSavedField(field);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavedField(null), 2000);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await patientsApi.me();
      setPatientId(me.id);
      const [sp, vaccs] = await Promise.all([
        santeApi.get(me.id),
        santeApi.listVaccinations(me.id),
      ]);
      setProfil(sp);
      setVaccinations(vaccs);
      setTraitements(sp.traitements_en_cours ?? "");
      setContactNom(sp.contact_urgence_nom ?? "");
      setContactPrenom(sp.contact_urgence_prenom ?? "");
      setContactTel(sp.contact_urgence_telephone ?? "");
      if (sp.medecin_traitant_id) {
        try {
          const m = await medecinsApi.get(sp.medecin_traitant_id);
          setMedecinTraitantNom(`Dr ${m.prenom} ${m.nom}`);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (medecinQuery.trim().length < 2) {
      setMedecinResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        setMedecinResults(await medecinsApi.search({ q: medecinQuery, size: 5 }));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [medecinQuery]);

  const save = async (field: string, payload: Record<string, unknown>) => {
    if (!patientId) return;
    try {
      const updated = await santeApi.update(patientId, payload);
      setProfil(updated);
      flashSaved(field);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Enregistrement impossible."));
    }
  };

  const chooseMedecinTraitant = (m: MedecinListItem) => {
    setMedecinTraitantNom(`Dr ${m.prenom} ${m.nom}`);
    setMedecinQuery("");
    setMedecinResults([]);
    void save("medecin", { medecin_traitant_id: m.id });
  };

  const addVaccination = async () => {
    if (!patientId || !vaccNom.trim() || !vaccDate) return;
    setSavingVacc(true);
    try {
      const v = await santeApi.addVaccination(patientId, {
        vaccin: vaccNom,
        date_administration: vaccDate,
        prochain_rappel: vaccRappel || null,
      });
      setVaccinations((prev) => [...prev, v]);
      setVaccModal(false);
      setVaccNom("");
      setVaccDate("");
      setVaccRappel("");
      toast.success("Vaccin ajouté au carnet.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingVacc(false);
    }
  };

  const removeVaccination = async (id: string) => {
    if (!patientId) return;
    try {
      await santeApi.deleteVaccination(patientId, id);
      setVaccinations((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Spinner label="Chargement du profil de santé…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profil) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Mon profil de santé</h1>
      <p className="mb-6 flex items-center gap-1.5 text-sm text-success">
        <Lock className="h-4 w-4" />
        Ces données ne sont partagées qu&apos;avec les médecins ayant un rendez-vous confirmé avec vous.
      </p>

      <div className="space-y-3">
        <Section title="Groupe sanguin" defaultOpen>
          <Label>
            Groupe sanguin <SavedBadge show={savedField === "groupe_sanguin"} />
          </Label>
          <Select
            value={profil.groupe_sanguin ?? ""}
            onChange={(e) => save("groupe_sanguin", { groupe_sanguin: e.target.value || null })}
            className="max-w-xs"
          >
            <option value="">—</option>
            {GROUPES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Section>

        <Section title="Allergies">
          <Label>
            Allergies connues <SavedBadge show={savedField === "allergies"} />
          </Label>
          <TagsInput
            value={profil.allergies}
            onChange={(tags) => save("allergies", { allergies: tags })}
            placeholder="Ex : Pénicilline, Arachides…"
          />
        </Section>

        <Section title="Antécédents médicaux">
          <Label>
            Antécédents <SavedBadge show={savedField === "antecedents"} />
          </Label>
          <TagsInput
            value={profil.antecedents}
            onChange={(tags) => save("antecedents", { antecedents: tags })}
            placeholder="Ex : Diabète type 2…"
          />
        </Section>

        <Section title="Maladies chroniques">
          <Label>
            Maladies chroniques <SavedBadge show={savedField === "maladies_chroniques"} />
          </Label>
          <TagsInput
            value={profil.maladies_chroniques}
            onChange={(tags) => save("maladies_chroniques", { maladies_chroniques: tags })}
            placeholder="Ex : Hypertension…"
          />
        </Section>

        <Section title="Traitements en cours">
          <Label>
            Médicaments actuels <SavedBadge show={savedField === "traitements"} />
          </Label>
          <Textarea
            rows={3}
            value={traitements}
            onChange={(e) => setTraitements(e.target.value)}
            onBlur={() => save("traitements", { traitements_en_cours: traitements || null })}
            placeholder="Liste des médicaments pris régulièrement…"
          />
        </Section>

        <Section title="Médecin traitant">
          <Label>
            Rechercher un médecin <SavedBadge show={savedField === "medecin"} />
          </Label>
          {medecinTraitantNom && (
            <p className="mb-2 text-sm text-slate-600">Actuel : {medecinTraitantNom}</p>
          )}
          <div className="relative">
            <Input
              value={medecinQuery}
              onChange={(e) => setMedecinQuery(e.target.value)}
              placeholder="Nom du médecin…"
            />
            {medecinResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                {medecinResults.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => chooseMedecinTraitant(m)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      Dr {m.prenom} {m.nom} <span className="text-slate-400">· {m.specialite}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Personne à contacter">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                Prénom <SavedBadge show={savedField === "contact_prenom"} />
              </Label>
              <Input
                value={contactPrenom}
                onChange={(e) => setContactPrenom(e.target.value)}
                onBlur={() => save("contact_prenom", { contact_urgence_prenom: contactPrenom || null })}
              />
            </div>
            <div>
              <Label>
                Nom <SavedBadge show={savedField === "contact_nom"} />
              </Label>
              <Input
                value={contactNom}
                onChange={(e) => setContactNom(e.target.value)}
                onBlur={() => save("contact_nom", { contact_urgence_nom: contactNom || null })}
              />
            </div>
          </div>
          <div className="mt-3">
            <Label>
              Téléphone <SavedBadge show={savedField === "contact_tel"} />
            </Label>
            <Input
              value={contactTel}
              onChange={(e) => setContactTel(e.target.value)}
              onBlur={() => save("contact_tel", { contact_urgence_telephone: contactTel || null })}
              placeholder="+221771234567"
            />
          </div>
        </Section>

        <Section title="Carnet de vaccination">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setVaccModal(true)}>
              <Plus className="h-4 w-4" /> Ajouter un vaccin
            </Button>
          </div>
          {vaccinations.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun vaccin enregistré.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-1.5 font-medium">Vaccin</th>
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Prochain rappel</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {vaccinations.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50">
                    <td className="py-2">{v.vaccin}</td>
                    <td className="py-2 text-slate-600">{formatDate(v.date_administration)}</td>
                    <td className="py-2 text-slate-600">
                      {v.prochain_rappel ? formatDate(v.prochain_rappel) : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => removeVaccination(v.id)}
                        aria-label={`Supprimer ${v.vaccin}`}
                        className="text-slate-400 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <Modal open={vaccModal} onClose={() => setVaccModal(false)} title="Ajouter un vaccin">
        <div className="space-y-3">
          <div>
            <Label htmlFor="vacc-nom">
              <Syringe className="mr-1 inline h-4 w-4" /> Vaccin
            </Label>
            <Input id="vacc-nom" value={vaccNom} onChange={(e) => setVaccNom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vacc-date">Date d&apos;administration</Label>
            <Input id="vacc-date" type="date" value={vaccDate} onChange={(e) => setVaccDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vacc-rappel">Prochain rappel (optionnel)</Label>
            <Input id="vacc-rappel" type="date" value={vaccRappel} onChange={(e) => setVaccRappel(e.target.value)} />
          </div>
          <Button className="w-full" loading={savingVacc} onClick={addVaccination} disabled={!vaccNom || !vaccDate}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

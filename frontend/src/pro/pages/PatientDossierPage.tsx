import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FilePlus2, HeartPulse, MessageCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { patientsApi } from "@/shared/api/patients.api";
import { dossierApi } from "@/shared/api/dossier.api";
import { documentsApi } from "@/shared/api/documents.api";
import { messagesApi } from "@/shared/api/messages.api";
import { santeApi } from "@/shared/api/sante.api";
import { rdvApi } from "@/shared/api/rdv.api";
import { medecinsApi } from "@/shared/api/medecins.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { StatutBadge } from "@/shared/ui/Badge";
import { Modal } from "@/shared/ui/Modal";
import { Label, Select, Textarea } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { DocumentCard } from "@/patient/components/DocumentCard";
import { downloadBlob } from "@/shared/utils/downloadBlob";
import { calculerAge, formatDate, formatDateTime } from "@/shared/utils/formatDate";
import type {
  Disponibilite,
  DocumentItem,
  EntreeDossier,
  PatientProfile,
  RendezVous,
  SanteProfil,
  TypeDocument,
  TypeEntree,
  VaccinationEntry,
} from "@/shared/types";

const TYPES: { value: TypeEntree; label: string }[] = [
  { value: "consultation", label: "Consultation" },
  { value: "ordonnance", label: "Ordonnance" },
  { value: "resultat", label: "Résultat" },
  { value: "note", label: "Note" },
];

const DOC_TYPES: { value: TypeDocument; label: string }[] = [
  { value: "ordonnance", label: "Ordonnance" },
  { value: "resultat", label: "Résultat" },
  { value: "compte_rendu", label: "Compte rendu" },
  { value: "certificat", label: "Certificat" },
  { value: "autre", label: "Autre" },
];

export function PatientDossierPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [entrees, setEntrees] = useState<EntreeDossier[]>([]);
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [slots, setSlots] = useState<Record<string, Disponibilite>>({});
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [sante, setSante] = useState<SanteProfil | null>(null);
  const [vaccinations, setVaccinations] = useState<VaccinationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [type, setType] = useState<TypeEntree>("consultation");
  const [contenu, setContenu] = useState("");
  const [saving, setSaving] = useState(false);

  const [docType, setDocType] = useState<TypeDocument>("ordonnance");
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, me] = await Promise.all([patientsApi.get(patientId), medecinsApi.me()]);
      setPatient(p);
      const [ds, page, documents] = await Promise.all([
        medecinsApi.disponibilites(me.id, false),
        rdvApi.list({ size: 200 }),
        documentsApi.list(patientId),
      ]);
      const sMap: Record<string, Disponibilite> = {};
      for (const s of ds) sMap[s.id] = s;
      setSlots(sMap);
      setRdvs(page.items.filter((r) => r.patient_id === patientId));
      setDocs(documents);
      try {
        const [sp, vaccs] = await Promise.all([
          santeApi.get(patientId),
          santeApi.listVaccinations(patientId),
        ]);
        setSante(sp);
        setVaccinations(vaccs);
      } catch {
        // Pas de RDV confirmé/terminé (403) ou profil vide — non bloquant
        setSante(null);
      }
      try {
        const dossier = await dossierApi.get(patientId);
        setEntrees([...dossier.entrees].sort((a, b) => b.date_entree.localeCompare(a.date_entree)));
      } catch (e) {
        const msg = apiErrorMessage(e);
        // 404 = dossier vide
        if (!/404|introuvab|non trouv/i.test(msg)) throw e;
        setEntrees([]);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const doc = await documentsApi.upload(patientId, file, docType);
      setDocs((prev) => [doc, ...prev]);
      toast.success("Document envoyé au patient.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Envoi impossible."));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    if (!patientId) return;
    setDownloadingId(doc.id);
    try {
      const blob = await documentsApi.download(patientId, doc.id);
      downloadBlob(blob, doc.nom_fichier);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Téléchargement impossible."));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleContact = async () => {
    if (!patientId) return;
    setContacting(true);
    try {
      await messagesApi.startConversation({ patientId });
      navigate("/pro/messages");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Un rendez-vous confirmé est requis."));
    } finally {
      setContacting(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const addEntree = async () => {
    if (!patientId || !contenu.trim()) return;
    setSaving(true);
    try {
      const e = await dossierApi.addEntree(patientId, type, contenu);
      setEntrees((prev) => [e, ...prev]);
      setContenu("");
      setModal(false);
      toast.success("Entrée ajoutée au dossier.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const age = useMemo(() => calculerAge(patient?.date_naissance ?? null), [patient]);

  if (loading) return <Spinner label="Chargement du dossier…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!patient) return null;

  return (
    <div>
      <Link to="/pro/patients" className="mb-4 inline-flex items-center gap-1 text-sm text-pro hover:underline">
        <ArrowLeft className="h-4 w-4" /> Mes patients
      </Link>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Avatar prenom={patient.prenom} nom={patient.nom} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">{patient.prenom} {patient.nom}</h1>
              <p className="text-sm text-slate-500">
                {[age ? `${age} ans` : null, patient.sexe, patient.telephone, patient.ville]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" loading={contacting} onClick={handleContact}>
            <MessageCircle className="h-4 w-4" /> Contacter
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dossier */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Dossier médical</h2>
              <Button variant="pro" size="sm" onClick={() => setModal(true)}>
                <FilePlus2 className="h-4 w-4" /> Ajouter une entrée
              </Button>
            </div>
            {entrees.length === 0 ? (
              <p className="text-slate-500">Aucune entrée pour le moment.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {entrees.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-pro" />
                    <Card className="p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="rounded-md bg-pro/10 px-2 py-0.5 text-xs font-medium text-pro">
                          {TYPES.find((t) => t.value === e.type_entree)?.label ?? e.type_entree}
                        </span>
                        <span className="text-xs text-slate-400">{formatDateTime(e.date_entree)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{e.contenu}</p>
                    </Card>
                  </li>
              ))}
            </ol>
          )}
          </div>

          {/* Documents */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Documents</h2>
              <div className="flex items-center gap-2">
                <Select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as TypeDocument)}
                  className="w-40"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Button variant="pro" size="sm" loading={uploading} onClick={handleUploadClick}>
                  <Upload className="h-4 w-4" /> Envoyer au patient
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            {docs.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun document pour ce patient.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => (
                  <DocumentCard
                    key={d.id}
                    doc={d}
                    onDownload={handleDownload}
                    downloading={downloadingId === d.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Historique RDV */}
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">Rendez-vous</h2>
          {rdvs.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun rendez-vous.</p>
          ) : (
            <ul className="space-y-2">
              {rdvs.map((r) => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {slots[r.creneau_id] ? formatDateTime(slots[r.creneau_id].debut) : "—"}
                    </span>
                    <StatutBadge statut={r.statut} />
                  </div>
                  {r.motif && <p className="mt-1 text-xs text-slate-500">{r.motif}</p>}
                </Card>
              ))}
            </ul>
          )}

          {/* Profil de santé (lecture seule) */}
          {sante && (
            <div className="mt-6">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-slate-900">
                <HeartPulse className="h-4 w-4 text-pro" /> Profil de santé
              </h2>
              <Card className="space-y-3 p-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Groupe sanguin : </span>
                  {sante.groupe_sanguin ?? "—"}
                </div>
                {sante.allergies.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-700">Allergies : </span>
                    {sante.allergies.join(", ")}
                  </div>
                )}
                {sante.antecedents.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-700">Antécédents : </span>
                    {sante.antecedents.join(", ")}
                  </div>
                )}
                {sante.maladies_chroniques.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-700">Maladies chroniques : </span>
                    {sante.maladies_chroniques.join(", ")}
                  </div>
                )}
                {sante.traitements_en_cours && (
                  <div>
                    <span className="font-medium text-slate-700">Traitements : </span>
                    {sante.traitements_en_cours}
                  </div>
                )}
                {(sante.contact_urgence_nom || sante.contact_urgence_telephone) && (
                  <div>
                    <span className="font-medium text-slate-700">Contact urgence : </span>
                    {[sante.contact_urgence_prenom, sante.contact_urgence_nom, sante.contact_urgence_telephone]
                      .filter(Boolean)
                      .join(" ")}
                  </div>
                )}
                {vaccinations.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-700">Vaccinations : </span>
                    <ul className="mt-1 space-y-0.5 text-slate-600">
                      {vaccinations.map((v) => (
                        <li key={v.id}>
                          {v.vaccin} — {formatDate(v.date_administration)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle entrée au dossier">
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as TypeEntree)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Contenu (chiffré au repos)</Label>
            <Textarea rows={5} value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Observations, prescription…" />
          </div>
          <Button variant="pro" className="w-full" loading={saving} onClick={addEntree}>
            Enregistrer l&apos;entrée
          </Button>
        </div>
      </Modal>
    </div>
  );
}

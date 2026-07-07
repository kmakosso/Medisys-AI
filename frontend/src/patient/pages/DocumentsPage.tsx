import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { patientsApi } from "@/shared/api/patients.api";
import { documentsApi } from "@/shared/api/documents.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Input";
import { SkeletonCards } from "@/shared/ui/Skeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { DocumentCard } from "@/patient/components/DocumentCard";
import { downloadBlob } from "@/shared/utils/downloadBlob";
import type { DocumentItem, TypeDocument } from "@/shared/types";

const TYPES: { value: TypeDocument; label: string }[] = [
  { value: "ordonnance", label: "Ordonnance" },
  { value: "resultat", label: "Résultat" },
  { value: "compte_rendu", label: "Compte rendu" },
  { value: "certificat", label: "Certificat" },
  { value: "autre", label: "Autre" },
];

export function DocumentsPage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<TypeDocument>("autre");
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await patientsApi.me();
      setPatientId(me.id);
      setDocs(await documentsApi.list(me.id));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
      const doc = await documentsApi.upload(patientId, file, uploadType);
      setDocs((prev) => [doc, ...prev]);
      toast.success("Document ajouté.");
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

  if (loading) return <SkeletonCards count={3} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Mes documents</h1>
        <div className="flex items-center gap-2">
          <Select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as TypeDocument)}
            className="w-40"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Button onClick={handleUploadClick} loading={uploading}>
            <Upload className="h-4 w-4" /> Ajouter un document
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Aucun document pour le moment. Vos ordonnances et comptes rendus apparaîtront ici.
        </div>
      ) : (
        <div className="space-y-3">
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
  );
}

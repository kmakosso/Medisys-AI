import { FileText, Download } from "lucide-react";
import { formatDate } from "@/shared/utils/formatDate";
import type { DocumentItem } from "@/shared/types";

const TYPE_LABELS: Record<string, string> = {
  ordonnance: "Ordonnance",
  resultat: "Résultat",
  compte_rendu: "Compte rendu",
  certificat: "Certificat",
  autre: "Autre",
};

export function DocumentCard({
  doc,
  onDownload,
  downloading,
}: {
  doc: DocumentItem;
  onDownload: (doc: DocumentItem) => void;
  downloading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-patient-50 text-patient">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{doc.nom_fichier}</p>
        <p className="text-xs text-slate-500">
          {TYPE_LABELS[doc.type_document] ?? doc.type_document}
          {doc.emetteur_nom ? ` · ${doc.emetteur_nom}` : ""} · {formatDate(doc.created_at)}
        </p>
      </div>
      <button
        onClick={() => onDownload(doc)}
        disabled={downloading}
        aria-label={`Télécharger ${doc.nom_fichier}`}
        className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

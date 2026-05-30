import { useState } from "react";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/Button";

/** Carte "Téléconsultation — bientôt disponible" (stub commun patient/médecin). */
export function TeleconsultationStub({ theme = "patient" }: { theme?: "patient" | "pro" }) {
  const [notified, setNotified] = useState(false);

  const notify = () => {
    // L'enregistrement réel de la préférence se fera via l'API en v2.1 backend.
    setNotified(true);
    toast.success("Nous vous avertirons dès que la téléconsultation sera disponible.");
  };

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-6 text-center ${
        theme === "pro" ? "border-pro-accent/30 bg-pro-card/40" : "border-patient-100 bg-patient-50/50"
      }`}
    >
      <Video className={`mx-auto mb-3 h-10 w-10 ${theme === "pro" ? "text-pro-accent" : "text-patient"}`} />
      <h3 className="font-semibold text-slate-900">Téléconsultation</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
        Cette fonctionnalité sera disponible prochainement sur MedisysAI.
      </p>
      <div className="mt-4">
        <Button
          variant={theme === "pro" ? "accent" : "primary"}
          size="sm"
          disabled={notified}
          onClick={notify}
        >
          {notified ? "Vous serez averti ✓" : "M'avertir quand disponible"}
        </Button>
      </div>
    </div>
  );
}

import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

/** État d'erreur réutilisable avec bouton Réessayer. */
export function ErrorState({
  message = "Une erreur est survenue.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center">
      <AlertCircle className="h-8 w-8 text-danger" />
      <p className="text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";

/** Bandeau sticky affiché quand l'utilisateur est hors-ligne. */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
    >
      <WifiOff className="h-4 w-4" />
      Vous êtes hors-ligne. Certaines données peuvent ne pas être à jour.
    </div>
  );
}

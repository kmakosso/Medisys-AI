import { Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import { Link } from "react-router-dom";
import { couleurSpecialite } from "@/shared/utils/geo";
import { formatDay, formatHeure } from "@/shared/utils/formatDate";
import type { MedecinListItem } from "@/shared/types";

function makeIcon(color: string) {
  return divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:26px;height:26px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

export function DoctorMarker({
  medecin,
  position,
}: {
  medecin: MedecinListItem;
  position: [number, number];
}) {
  const icon = makeIcon(couleurSpecialite(medecin.specialite));

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-900">
            Dr {medecin.prenom} {medecin.nom}
          </p>
          <p className="text-sm text-patient-700">{medecin.specialite}</p>
          {medecin.structure_sante && (
            <p className="mt-1 text-xs text-slate-500">{medecin.structure_sante}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {medecin.prochain_creneau
              ? `Dès ${formatDay(medecin.prochain_creneau)} à ${formatHeure(medecin.prochain_creneau)}`
              : "Aucune disponibilité"}
          </p>
          <Link
            to={`/app/book/${medecin.id}`}
            className="mt-2 inline-block rounded-md bg-patient px-3 py-1.5 text-xs font-medium text-white hover:bg-patient-600"
          >
            Prendre rendez-vous
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

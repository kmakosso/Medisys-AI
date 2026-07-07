import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DoctorMarker } from "./DoctorMarker";
import { resolveCoords, DAKAR_CENTER } from "@/shared/utils/geo";
import type { MedecinListItem } from "@/shared/types";

function RecenterMap({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

export function MedecinsMap({
  medecins,
  center = DAKAR_CENTER,
  zoom = 12,
}: {
  medecins: MedecinListItem[];
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <RecenterMap center={center} zoom={zoom} />
      {medecins.map((m) => {
        const pos = resolveCoords(m.latitude, m.longitude, m.ville);
        if (!pos) return null;
        return <DoctorMarker key={m.id} medecin={m} position={pos} />;
      })}
    </MapContainer>
  );
}

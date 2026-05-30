import { useQuery } from "@tanstack/react-query";
import { medecinsApi, type MedecinSearchParams } from "@/shared/api/medecins.api";

export function useMedecinsSearch(params: MedecinSearchParams) {
  return useQuery({
    queryKey: ["medecins", params],
    queryFn: () => medecinsApi.search(params),
  });
}

export function useMedecin(id: string | undefined) {
  return useQuery({
    queryKey: ["medecin", id],
    queryFn: () => medecinsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useMedecinDisponibilites(id: string | undefined, libreOnly = true) {
  return useQuery({
    queryKey: ["disponibilites", id, libreOnly],
    queryFn: () => medecinsApi.disponibilites(id as string, libreOnly),
    enabled: Boolean(id),
  });
}

export function useMedecinMotifs(id: string | undefined) {
  return useQuery({
    queryKey: ["motifs", id],
    queryFn: () => medecinsApi.motifs(id as string),
    enabled: Boolean(id),
  });
}

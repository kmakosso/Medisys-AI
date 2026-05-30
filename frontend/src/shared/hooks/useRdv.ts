import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rdvApi } from "@/shared/api/rdv.api";
import type { StatutRDV } from "@/shared/types";

export function useRendezVous() {
  return useQuery({
    queryKey: ["rendez-vous"],
    queryFn: () => rdvApi.list({ size: 100 }),
  });
}

export function useCreateRdv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ creneauId, motif }: { creneauId: string; motif?: string }) =>
      rdvApi.create(creneauId, motif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rendez-vous"] });
      qc.invalidateQueries({ queryKey: ["disponibilites"] });
    },
  });
}

export function useUpdateRdvStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: StatutRDV }) =>
      rdvApi.updateStatut(id, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rendez-vous"] });
      qc.invalidateQueries({ queryKey: ["disponibilites"] });
    },
  });
}

export function useRescheduleRdv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nouveauCreneauId }: { id: string; nouveauCreneauId: string }) =>
      rdvApi.reschedule(id, nouveauCreneauId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rendez-vous"] });
      qc.invalidateQueries({ queryKey: ["disponibilites"] });
    },
  });
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCreneau } from "@/lib/format";
import type { Disponibilite, MedecinProfile } from "@/lib/types";

export default function MedecinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [medecin, setMedecin] = useState<MedecinProfile | null>(null);
  const [slots, setSlots] = useState<Disponibilite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // état de réservation
  const [motif, setMotif] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const loadSlots = async () => {
    const dispos = await api.listDisponibilites(id);
    setSlots(dispos);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m] = await Promise.all([api.getMedecin(id)]);
        setMedecin(m);
        await loadSlots();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBook = async (slotId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    setBookingId(slotId);
    setFeedback(null);
    try {
      await api.createRendezVous({ creneau_id: slotId, motif: motif || undefined });
      setFeedback({ type: "ok", msg: "Rendez-vous demandé ! Retrouvez-le dans « Mes rendez-vous »." });
      setMotif("");
      await loadSlots(); // le créneau réservé disparaît de la liste
    } catch (err) {
      setFeedback({
        type: "err",
        msg: err instanceof ApiError ? err.message : "Réservation impossible.",
      });
    } finally {
      setBookingId(null);
    }
  };

  if (loading) return <p className="text-slate-500">Chargement…</p>;
  if (error) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!medecin) return null;

  return (
    <div>
      <Link href="/medecins" className="mb-4 inline-block text-sm text-brand-700 hover:underline">
        ← Retour aux médecins
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Dr {medecin.prenom} {medecin.nom}
        </h1>
        <p className="font-medium text-brand-700">{medecin.specialite}</p>
        <div className="mt-2 space-y-0.5 text-sm text-slate-600">
          {medecin.structure_sante && <p>🏥 {medecin.structure_sante}</p>}
          {medecin.ville && <p>📍 {medecin.ville}</p>}
          {medecin.numero_ordre && <p>N° d&apos;ordre : {medecin.numero_ordre}</p>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Créneaux disponibles</h2>

        {feedback && (
          <div
            className={`mb-4 rounded-md px-3 py-2 text-sm ${
              feedback.type === "ok" ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-700"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {user && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Motif (optionnel)
            </label>
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : consultation de suivi"
              className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}

        {slots.length === 0 ? (
          <p className="text-slate-500">Aucun créneau disponible pour le moment.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <span className="text-sm text-slate-700">{formatCreneau(s.debut, s.fin)}</span>
                <button
                  onClick={() => handleBook(s.id)}
                  disabled={bookingId === s.id}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {bookingId === s.id ? "…" : user ? "Réserver" : "Se connecter"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!user && (
          <p className="mt-4 text-sm text-slate-500">
            <Link href="/login" className="font-medium text-brand-700 hover:underline">
              Connectez-vous
            </Link>{" "}
            pour réserver un créneau.
          </p>
        )}
      </section>
    </div>
  );
}

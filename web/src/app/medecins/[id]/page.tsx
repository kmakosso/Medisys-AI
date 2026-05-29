"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayKey, dayLabel, formatFCFA, formatHeure } from "@/lib/format";
import { Avatar, Spinner } from "@/components/ui";
import type { Disponibilite, MedecinProfile, Motif } from "@/lib/types";

export default function MedecinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [medecin, setMedecin] = useState<MedecinProfile | null>(null);
  const [slots, setSlots] = useState<Disponibilite[]>([]);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const loadSlots = async () => setSlots(await api.listDisponibilites(id));

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, mt] = await Promise.all([api.getMedecin(id), api.listMotifs(id)]);
        setMedecin(m);
        setMotifs(mt);
        await loadSlots();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Regroupe les créneaux par jour
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Disponibilite[]>();
    for (const s of [...slots].sort((a, b) => a.debut.localeCompare(b.debut))) {
      const k = dayKey(s.debut);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

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
      await loadSlots();
    } catch (err) {
      setFeedback({ type: "err", msg: err instanceof ApiError ? err.message : "Réservation impossible." });
    } finally {
      setBookingId(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!medecin) return null;

  return (
    <div>
      <Link href="/medecins" className="mb-4 inline-block text-sm text-brand-700 hover:underline">
        ← Retour aux médecins
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne profil */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <Avatar prenom={medecin.prenom} nom={medecin.nom} size="lg" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Dr {medecin.prenom} {medecin.nom}
                </h1>
                <p className="font-medium text-brand-700">{medecin.specialite}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              {medecin.structure_sante && <p>🏥 {medecin.structure_sante}</p>}
              {medecin.adresse && <p>📍 {medecin.adresse}</p>}
              {medecin.ville && <p>🌍 {medecin.ville}</p>}
              {medecin.langues && <p>🗣️ {medecin.langues.split(",").join(", ")}</p>}
              {formatFCFA(medecin.tarif_fcfa) && <p>💳 {formatFCFA(medecin.tarif_fcfa)}</p>}
              {medecin.numero_ordre && <p className="text-slate-400">N° d&apos;ordre : {medecin.numero_ordre}</p>}
            </dl>

            {medecin.bio && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">À propos</h2>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{medecin.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne réservation */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Prendre rendez-vous</h2>

            {feedback && (
              <div
                className={`mb-4 rounded-md px-3 py-2 text-sm ${
                  feedback.type === "ok" ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-700"
                }`}
              >
                {feedback.msg}
              </div>
            )}

            {user && motifs.length > 0 && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Motif</label>
                <select
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">— Sélectionner —</option>
                  {motifs.map((mo) => (
                    <option key={mo.id} value={mo.libelle}>
                      {mo.libelle} ({mo.duree_minutes} min)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {slotsByDay.length === 0 ? (
              <p className="text-slate-500">Aucun créneau disponible pour le moment.</p>
            ) : (
              <div className="space-y-5">
                {slotsByDay.map(([key, daySlots]) => (
                  <div key={key}>
                    <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700">
                      {dayLabel(daySlots[0].debut)}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleBook(s.id)}
                          disabled={bookingId === s.id}
                          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                        >
                          {bookingId === s.id ? "…" : formatHeure(s.debut)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!user && (
              <p className="mt-4 text-sm text-slate-500">
                <Link href="/login" className="font-medium text-brand-700 hover:underline">
                  Connectez-vous
                </Link>{" "}
                pour réserver un créneau.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

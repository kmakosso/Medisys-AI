import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { messagesApi } from "@/shared/api/messages.api";
import { rdvApi } from "@/shared/api/rdv.api";
import { medecinsApi } from "@/shared/api/medecins.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { cn } from "@/shared/utils/cn";
import { formatHeure } from "@/shared/utils/formatDate";
import type { Conversation, MedecinListItem, Message } from "@/shared/types";

export function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [newConvOpen, setNewConvOpen] = useState(false);
  const [eligibleMedecins, setEligibleMedecins] = useState<MedecinListItem[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      setConversations(await messagesApi.listConversations());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  const openConversation = async (conv: Conversation) => {
    setSelected(conv);
    setLoadingMessages(true);
    try {
      setMessages(await messagesApi.getMessages(conv.id));
      // Marque comme lu localement (le backend le fait aussi côté serveur)
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, non_lus: 0 } : c)),
      );
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      const msg = await messagesApi.sendMessage(selected.id, draft.trim());
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const openNewConversation = async () => {
    setNewConvOpen(true);
    setLoadingEligible(true);
    try {
      const page = await rdvApi.list({ size: 200 });
      const confirmedOrDone = page.items.filter(
        (r) => r.statut === "confirme" || r.statut === "termine",
      );
      const ids = Array.from(new Set(confirmedOrDone.map((r) => r.medecin_id)));
      const existing = new Set(conversations.map((c) => c.medecin_id));
      const list: MedecinListItem[] = [];
      await Promise.all(
        ids
          .filter((id) => !existing.has(id))
          .map(async (id) => {
            try {
              const m = await medecinsApi.get(id);
              list.push(m);
            } catch {
              /* ignore */
            }
          }),
      );
      setEligibleMedecins(list);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoadingEligible(false);
    }
  };

  const startConversation = async (medecinId: string) => {
    try {
      const conv = await messagesApi.startConversation({ medecinId });
      setNewConvOpen(false);
      await loadConversations();
      await openConversation(conv);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Un rendez-vous confirmé est requis."));
    }
  };

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [conversations],
  );

  if (loading) return <Spinner label="Chargement des messages…" />;
  if (error) return <ErrorState message={error} onRetry={loadConversations} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
      {/* Liste des conversations */}
      <div className={cn("lg:block", selected ? "hidden" : "block")}>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Messages</h1>
          <Button size="sm" onClick={openNewConversation}>
            <Plus className="h-4 w-4" /> Nouveau
          </Button>
        </div>
        {sortedConversations.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucune conversation. Vous pouvez contacter un médecin après un rendez-vous confirmé.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sortedConversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openConversation(c)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                    selected?.id === c.id
                      ? "border-patient bg-patient-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <Avatar
                    prenom={c.interlocuteur_nom?.split(" ")[0] ?? "?"}
                    nom={c.interlocuteur_nom?.split(" ").slice(-1)[0] ?? "?"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {c.interlocuteur_nom ?? "Interlocuteur"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {c.dernier_message ?? "Aucun message"}
                    </p>
                  </div>
                  {c.non_lus > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                      {c.non_lus}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fenêtre de chat */}
      <div className={cn("flex flex-col rounded-2xl border border-slate-200 bg-white", selected ? "flex" : "hidden lg:flex")}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-400">
            Sélectionnez une conversation.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-100 p-4">
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
                aria-label="Retour"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-slate-900">{selected.interlocuteur_nom}</span>
            </div>

            <div className="flex items-start gap-2 border-b border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Cette messagerie ne remplace pas une consultation médicale.
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 420 }}>
              {loadingMessages ? (
                <Spinner label="Chargement…" />
              ) : (
                messages.map((m) => {
                  const mine = m.sender_user_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                          mine ? "bg-patient text-white" : "bg-slate-100 text-slate-800",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.contenu}</p>
                        <p className={cn("mt-1 text-[10px]", mine ? "text-patient-50" : "text-slate-400")}>
                          {formatHeure(m.created_at)}
                          {mine && m.lu ? " · lu" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="flex items-center gap-2 border-t border-slate-100 p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire un message…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-patient focus:ring-2 focus:ring-patient/20"
              />
              <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>

      <Modal open={newConvOpen} onClose={() => setNewConvOpen(false)} title="Nouvelle conversation">
        {loadingEligible ? (
          <Spinner label="Chargement…" />
        ) : eligibleMedecins.length === 0 ? (
          <p className="text-sm text-slate-500">
            Vous n&apos;avez aucun médecin disponible à contacter (rendez-vous confirmé requis).
          </p>
        ) : (
          <ul className="space-y-2">
            {eligibleMedecins.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => startConversation(m.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <Avatar prenom={m.prenom} nom={m.nom} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Dr {m.prenom} {m.nom}
                    </p>
                    <p className="text-xs text-slate-500">{m.specialite}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

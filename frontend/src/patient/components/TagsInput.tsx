import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/** Saisie de tags dynamiques (allergies, antécédents…). Entrée ou virgule pour ajouter. */
export function TagsInput({
  value,
  onChange,
  placeholder = "Ajouter puis Entrée",
  id,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-patient focus-within:ring-2 focus-within:ring-patient/20",
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-patient-50 px-2 py-1 text-xs font-medium text-patient-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            aria-label={`Retirer ${tag}`}
            className="text-patient-700/60 hover:text-danger"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

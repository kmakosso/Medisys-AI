import { useRef } from "react";
import { cn } from "@/shared/utils/cn";

/** Saisie de code à N cases (style code SMS). */
export function OtpInput({
  length = 6,
  value,
  onChange,
  theme = "patient",
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  theme?: "patient" | "pro";
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setChar = (i: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[i] = digit;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (text) {
      e.preventDefault();
      onChange(text);
      refs.current[Math.min(text.length, length - 1)]?.focus();
    }
  };

  const ring = theme === "pro" ? "focus:border-pro-accent focus:ring-pro-accent/30" : "focus:border-patient focus:ring-patient/20";

  return (
    <div className="flex justify-center gap-2" onPaste={onPaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`Chiffre ${i + 1}`}
          className={cn(
            "h-12 w-11 rounded-lg border border-slate-300 text-center text-lg font-semibold text-slate-900 outline-none transition focus:ring-2",
            ring,
          )}
        />
      ))}
    </div>
  );
}

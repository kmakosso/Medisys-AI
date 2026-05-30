/** Indicateur de force du mot de passe (faible / moyen / fort). */
export function scorePassword(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: "Très faible", color: "bg-red-400", width: "w-1/4" },
  { label: "Faible", color: "bg-orange-400", width: "w-2/4" },
  { label: "Moyen", color: "bg-amber-400", width: "w-3/4" },
  { label: "Fort", color: "bg-success", width: "w-full" },
];

export function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = Math.max(1, scorePassword(password));
  const level = LEVELS[score - 1];
  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${level.color} ${level.width} transition-all`} />
      </div>
      <p className="mt-1 text-xs text-slate-500">Sécurité : {level.label}</p>
    </div>
  );
}

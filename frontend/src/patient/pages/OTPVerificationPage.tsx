import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { OtpInput } from "@/shared/ui/OtpInput";
import { formatPhoneSN } from "@/shared/utils/formatPhone";

// ⚠️ OTP simulé côté front : le backend n'a pas (encore) de service SMS.
// Code de démonstration : 123456. À brancher sur un vrai OTP en v3.
const DEMO_CODE = "123456";

export function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as { phone?: string } | null)?.phone ?? null;

  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  const verify = () => {
    if (code.length !== 6) return;
    if (code === DEMO_CODE) {
      toast.success("Numéro vérifié !");
      navigate("/app/dashboard");
    } else {
      setError("Code incorrect. (Démo : 123456)");
    }
  };

  const resend = () => {
    setSeconds(60);
    setError(null);
    toast.info("Nouveau code envoyé (démo : 123456).");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4">
      <Logo />
      <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Vérification du numéro</h1>
        <p className="mt-2 text-sm text-slate-600">
          Un code à 6 chiffres a été envoyé au{" "}
          <span className="font-medium">{phone ? formatPhoneSN(phone) : "votre numéro"}</span>.
        </p>

        <div className="my-6">
          <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} />
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <Button className="w-full" onClick={verify} disabled={code.length !== 6}>
          Vérifier
        </Button>

        <div className="mt-4 text-sm text-slate-500">
          {seconds > 0 ? (
            <span>Renvoyer le code dans {seconds}s</span>
          ) : (
            <button onClick={resend} className="font-medium text-patient hover:underline">
              Renvoyer le code
            </button>
          )}
        </div>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Démo : saisissez <strong>123456</strong> (service SMS prévu en v3).
        </p>
      </div>
    </div>
  );
}

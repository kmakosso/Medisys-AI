import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/useAuth";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { FieldError, Input, Label } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { OtpInput } from "@/shared/ui/OtpInput";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
type Form = z.infer<typeof schema>;

// ⚠️ 2FA simulée côté front (le backend n'a pas encore de 2FA). Code démo : 654321.
const DEMO_2FA = "654321";

export function LoginProPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(120);
  const [otpError, setOtpError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!twoFAOpen || seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [twoFAOpen, seconds]);

  const onSubmit = async (data: Form) => {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      if (user.role !== "medecin" && user.role !== "admin") {
        toast.error("Ce compte n'est pas un compte professionnel.");
        logout();
        return;
      }
      // Étape 2FA obligatoire (simulée)
      setSeconds(120);
      setCode("");
      setOtpError(null);
      setTwoFAOpen(true);
      toast.info("Code 2FA envoyé (démo : 654321).");
    } catch (err) {
      setServerError(apiErrorMessage(err, "Identifiants invalides."));
    }
  };

  const verify2FA = () => {
    if (seconds <= 0) {
      setOtpError("Code expiré. Renvoyez un nouveau code.");
      return;
    }
    if (code === DEMO_2FA) {
      navigate("/pro/dashboard");
    } else {
      setOtpError("Code incorrect. (Démo : 654321)");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pro px-4 text-white">
      <Logo pro onDark />
      <div className="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-pro-card p-8 shadow-xl">
        <h1 className="mb-1 text-xl font-bold">Connexion professionnelle</h1>
        <p className="mb-6 text-sm text-slate-400">Authentification sécurisée à deux facteurs.</p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-slate-300">Email</Label>
            <Input className="bg-white/5 text-white" type="email" placeholder="dr.exemple@medisysai.sn" {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label className="text-slate-300">Mot de passe</Label>
            <Input className="bg-white/5 text-white" type="password" placeholder="••••••••" {...register("password")} />
            <FieldError message={errors.password?.message} />
          </div>
          <Button type="submit" variant="accent" className="w-full" loading={isSubmitting}>
            Se connecter
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/pro/forgot-password" className="text-pro-accent hover:underline">
            Mot de passe oublié ?
          </Link>
        </p>
      </div>

      <Link to="/login" className="mt-6 text-sm text-slate-400 hover:text-white">
        ← Espace patient MedisysAI
      </Link>

      {/* Modal 2FA */}
      <Modal open={twoFAOpen} onClose={() => setTwoFAOpen(false)} title="Vérification en deux étapes">
        <p className="mb-4 text-sm text-slate-600">
          Saisissez le code à 6 chiffres envoyé sur votre appareil de confiance.
        </p>
        <OtpInput value={code} onChange={(v) => { setCode(v); setOtpError(null); }} theme="pro" />
        {otpError && <p className="mt-3 text-center text-sm text-danger">{otpError}</p>}
        <p className="mt-3 text-center text-xs text-slate-400">
          {seconds > 0 ? `Code valable ${seconds}s` : "Code expiré"}
        </p>
        <Button variant="pro" className="mt-4 w-full" onClick={verify2FA} disabled={code.length !== 6}>
          Valider
        </Button>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          Démo : code <strong>654321</strong> (2FA réelle prévue en v3).
        </p>
      </Modal>
    </div>
  );
}

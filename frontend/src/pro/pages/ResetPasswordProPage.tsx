import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import axios from "axios";
import { authApi } from "@/shared/api/auth.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { FieldError, Input, Label } from "@/shared/ui/Input";
import { PasswordStrengthBar } from "@/patient/components/PasswordStrengthBar";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "8 caractères minimum")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });
type Form = z.infer<typeof schema>;

export function ResetPasswordProPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });
  const pwd = watch("password") ?? "";

  const onSubmit = async (data: Form) => {
    if (!token) return;
    try {
      await authApi.resetPassword(token, data.password);
      toast.success("Mot de passe modifié. Reconnectez-vous (2FA requise).");
      navigate("/pro/login");
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 410)) {
        setExpired(true);
      } else {
        toast.error(apiErrorMessage(err, "Réinitialisation impossible."));
      }
    }
  };

  const invalid = !token || expired;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pro px-4 text-white">
      <Logo pro onDark />
      <div className="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-pro-card p-8 shadow-xl">
        {invalid ? (
          <div className="text-center">
            <h1 className="text-xl font-bold">{token ? "Lien expiré" : "Lien invalide"}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {token
                ? "Ce lien a expiré ou a déjà été utilisé."
                : "Ce lien de réinitialisation est incomplet."}
            </p>
            <Link
              to="/pro/forgot-password"
              className="mt-4 inline-block rounded-lg bg-pro-accent px-4 py-2 text-sm font-medium text-white hover:bg-pro-accent/90"
            >
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold">Nouveau mot de passe</h1>
            <p className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
              Si vous n&apos;êtes pas à l&apos;origine de cette demande, contactez immédiatement
              l&apos;administrateur.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label className="text-slate-300">Nouveau mot de passe</Label>
                <Input className="bg-white/5 text-white" type="password" {...register("password")} />
                <PasswordStrengthBar password={pwd} />
                <FieldError message={errors.password?.message} />
              </div>
              <div>
                <Label className="text-slate-300">Confirmation</Label>
                <Input className="bg-white/5 text-white" type="password" {...register("confirm")} />
                <FieldError message={errors.confirm?.message} />
              </div>
              <Button type="submit" variant="accent" className="w-full" loading={isSubmitting}>
                Réinitialiser
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

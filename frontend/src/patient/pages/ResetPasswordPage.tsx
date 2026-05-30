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

export function ResetPasswordPage() {
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

  if (!token) {
    return (
      <ResetError
        title="Lien invalide"
        message="Ce lien de réinitialisation est incomplet."
      />
    );
  }

  const onSubmit = async (data: Form) => {
    try {
      await authApi.resetPassword(token, data.password);
      toast.success("Mot de passe modifié, reconnectez-vous.");
      navigate("/login");
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 410)) {
        setExpired(true);
      } else {
        toast.error(apiErrorMessage(err, "Réinitialisation impossible."));
      }
    }
  };

  if (expired) {
    return (
      <ResetError
        title="Lien expiré"
        message="Ce lien de réinitialisation a expiré ou a déjà été utilisé."
        showRequestNew
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4">
      <Link to="/" className="mb-6"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Nouveau mot de passe</h1>
        <p className="mb-6 text-sm text-slate-500">Choisissez un mot de passe sécurisé.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" {...register("password")} />
            <PasswordStrengthBar password={pwd} />
            <FieldError message={errors.password?.message} />
          </div>
          <div>
            <Label>Confirmation</Label>
            <Input type="password" {...register("confirm")} />
            <FieldError message={errors.confirm?.message} />
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Réinitialiser
          </Button>
        </form>
      </div>
    </div>
  );
}

function ResetError({
  title,
  message,
  showRequestNew,
}: {
  title: string;
  message: string;
  showRequestNew?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4">
      <Logo />
      <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {showRequestNew && (
          <Link
            to="/forgot-password"
            className="mt-4 inline-block rounded-lg bg-patient px-4 py-2 text-sm font-medium text-white hover:bg-patient-600"
          >
            Demander un nouveau lien
          </Link>
        )}
      </div>
    </div>
  );
}

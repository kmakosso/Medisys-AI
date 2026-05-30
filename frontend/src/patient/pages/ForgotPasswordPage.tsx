import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { authApi } from "@/shared/api/auth.api";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { FieldError, Input, Label } from "@/shared/ui/Input";

const schema = z.object({ email: z.string().email("Email invalide") });
type Form = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    // On ne révèle jamais si l'email existe : succès quoi qu'il arrive.
    try {
      await authApi.forgotPassword(data.email);
    } catch {
      /* silencieux — anti-énumération */
    } finally {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4">
      <Link to="/" className="mb-6"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-3 h-12 w-12 text-success" />
            <h1 className="text-xl font-bold text-slate-900">Vérifiez votre boîte mail</h1>
            <p className="mt-2 text-sm text-slate-600">
              Si un compte est associé à cette adresse, vous recevrez un lien de
              réinitialisation valable 15 minutes.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-medium text-patient hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold text-slate-900">Mot de passe oublié</h1>
            <p className="mb-6 text-sm text-slate-500">
              Saisissez votre email, nous vous enverrons un lien de réinitialisation.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="vous@exemple.sn" {...register("email")} />
                <FieldError message={errors.email?.message} />
              </div>
              <Button type="submit" className="w-full" loading={isSubmitting}>
                Envoyer le lien
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-600">
              <Link to="/login" className="font-medium text-patient hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

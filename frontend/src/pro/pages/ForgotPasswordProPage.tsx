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

export function ForgotPasswordProPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await authApi.forgotPassword(data.email);
    } catch {
      /* anti-énumération */
    } finally {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pro px-4 text-white">
      <Logo pro onDark />
      <div className="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-pro-card p-8 shadow-xl">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-3 h-12 w-12 text-pro-accent" />
            <h1 className="text-xl font-bold">Vérifiez votre boîte mail</h1>
            <p className="mt-2 text-sm text-slate-300">
              Si un compte professionnel est associé à cette adresse, un lien de
              réinitialisation valable 15 minutes vous a été envoyé.
            </p>
            <Link to="/pro/login" className="mt-4 inline-block text-sm font-medium text-pro-accent hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold">Mot de passe oublié</h1>
            <p className="mb-6 text-sm text-slate-400">
              Réinitialisation du compte professionnel.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label className="text-slate-300">Email</Label>
                <Input className="bg-white/5 text-white" type="email" {...register("email")} />
                <FieldError message={errors.email?.message} />
              </div>
              <Button type="submit" variant="accent" className="w-full" loading={isSubmitting}>
                Envoyer le lien
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-400">
              <Link to="/pro/login" className="font-medium text-pro-accent hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

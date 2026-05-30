import { useState } from "react";
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

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      if (user.role !== "patient") {
        toast.error("Ce compte n'est pas un compte patient. Utilisez MedisysAI Pro.");
        return;
      }
      navigate("/app/dashboard");
    } catch (err) {
      setServerError(apiErrorMessage(err, "Connexion impossible."));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4">
      <Link to="/" className="mb-6">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-slate-900">Connexion</h1>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="vous@exemple.sn" {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            <FieldError message={errors.password?.message} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" {...register("remember")} className="rounded border-slate-300" />
              Se souvenir de moi
            </label>
            <span className="text-slate-400">Mot de passe oublié ?</span>
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Se connecter
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Pas encore de compte ?{" "}
          <Link to="/register" className="font-medium text-patient hover:underline">
            Inscrivez-vous
          </Link>
        </p>
      </div>

      <Link to="/pro/login" className="mt-6 text-sm text-slate-500 hover:text-pro">
        Vous êtes médecin ? → Accéder à MedisysAI Pro
      </Link>
    </div>
  );
}

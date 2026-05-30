import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/shared/hooks/useAuth";
import { patientsApi } from "@/shared/api/patients.api";
import { apiErrorMessage } from "@/shared/api/axiosClient";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { FieldError, Input, Label } from "@/shared/ui/Input";
import { normalizePhoneSN } from "@/shared/utils/formatPhone";

const schema = z
  .object({
    prenom: z.string().min(1, "Prénom requis"),
    nom: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    telephone: z
      .string()
      .min(9, "Numéro requis")
      .refine((v) => /^[0-9\s]{9,12}$/.test(v), "Numéro sénégalais invalide (9 chiffres)"),
    date_naissance: z.string().optional(),
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

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setServerError(null);
    const phone = normalizePhoneSN(data.telephone);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        nom: data.nom,
        prenom: data.prenom,
      });
      // Complète le profil (téléphone, date de naissance) — best effort
      try {
        await patientsApi.updateMe({
          telephone: phone,
          date_naissance: data.date_naissance || null,
        });
      } catch {
        /* non bloquant */
      }
      navigate(`/verify-otp?via=sms`, { state: { phone } });
    } catch (err) {
      setServerError(apiErrorMessage(err, "Inscription impossible."));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4 py-8">
      <Link to="/" className="mb-6">
        <Logo />
      </Link>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Créer un compte patient</h1>
        <p className="mb-6 text-sm text-slate-500">
          Un code de vérification vous sera envoyé par SMS.
        </p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prénom</Label>
              <Input {...register("prenom")} />
              <FieldError message={errors.prenom?.message} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input {...register("nom")} />
              <FieldError message={errors.nom?.message} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" placeholder="vous@exemple.sn" {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                🇸🇳 +221
              </span>
              <Input className="rounded-l-none" placeholder="77 123 45 67" {...register("telephone")} />
            </div>
            <FieldError message={errors.telephone?.message} />
          </div>
          <div>
            <Label>Date de naissance</Label>
            <Input type="date" {...register("date_naissance")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mot de passe</Label>
              <Input type="password" {...register("password")} />
              <FieldError message={errors.password?.message} />
            </div>
            <div>
              <Label>Confirmation</Label>
              <Input type="password" {...register("confirm")} />
              <FieldError message={errors.confirm?.message} />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Créer mon compte
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-medium text-patient hover:underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}

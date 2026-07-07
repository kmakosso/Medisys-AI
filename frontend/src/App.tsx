import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { PatientRoute, ProRoute } from "@/shared/components/guards";

// Patient — public
import { LandingPage } from "@/patient/pages/LandingPage";
import { LoginPage } from "@/patient/pages/LoginPage";
import { RegisterPage } from "@/patient/pages/RegisterPage";
import { OTPVerificationPage } from "@/patient/pages/OTPVerificationPage";
import { ForgotPasswordPage } from "@/patient/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/patient/pages/ResetPasswordPage";
// Patient — protégé
import { PatientLayout } from "@/patient/layouts/PatientLayout";
import { DashboardPage } from "@/patient/pages/DashboardPage";
import { SearchPage } from "@/patient/pages/SearchPage";
import { BookingPage } from "@/patient/pages/BookingPage";
import { ProfilePage } from "@/patient/pages/ProfilePage";
import { MessagesPage } from "@/patient/pages/MessagesPage";
import { DocumentsPage } from "@/patient/pages/DocumentsPage";

// Pro — public
import { LandingProPage } from "@/pro/pages/LandingProPage";
import { LoginProPage } from "@/pro/pages/LoginProPage";
import { ForgotPasswordProPage } from "@/pro/pages/ForgotPasswordProPage";
import { ResetPasswordProPage } from "@/pro/pages/ResetPasswordProPage";
// Pro — protégé
import { ProLayout } from "@/pro/layouts/ProLayout";
import { DashboardProPage } from "@/pro/pages/DashboardProPage";
import { AgendaPage } from "@/pro/pages/AgendaPage";
import { PatientListPage } from "@/pro/pages/PatientListPage";
import { PatientDossierPage } from "@/pro/pages/PatientDossierPage";
import { DisponibilitesPage } from "@/pro/pages/DisponibilitesPage";
import { ProfileProPage } from "@/pro/pages/ProfileProPage";
import { MessagesProPage } from "@/pro/pages/MessagesProPage";

export default function App() {
  const { initSession } = useAuth();
  useEffect(() => {
    void initSession();
  }, [initSession]);

  return (
    <Routes>
      {/* ─── Portail patient (public) ─── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<OTPVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ─── Portail patient (protégé) ─── */}
      <Route
        path="/app"
        element={
          <PatientRoute>
            <PatientLayout />
          </PatientRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="book/:medecinId" element={<BookingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
      </Route>

      {/* ─── Portail Pro (public) ─── */}
      <Route path="/pro" element={<LandingProPage />} />
      <Route path="/pro/login" element={<LoginProPage />} />
      <Route path="/pro/forgot-password" element={<ForgotPasswordProPage />} />
      <Route path="/pro/reset-password" element={<ResetPasswordProPage />} />

      {/* ─── Portail Pro (protégé) ─── */}
      <Route
        path="/pro"
        element={
          <ProRoute>
            <ProLayout />
          </ProRoute>
        }
      >
        <Route path="dashboard" element={<DashboardProPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="patients" element={<PatientListPage />} />
        <Route path="patients/:patientId/dossier" element={<PatientDossierPage />} />
        <Route path="disponibilites" element={<DisponibilitesPage />} />
        <Route path="profile" element={<ProfileProPage />} />
        <Route path="messages" element={<MessagesProPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

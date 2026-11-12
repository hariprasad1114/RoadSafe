import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute, ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LandingPage } from "@/pages/landing/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { PredictPage } from "@/pages/predict/PredictPage";
import { HotspotsPage } from "@/pages/hotspots/HotspotsPage";
import { AnalysisPage } from "@/pages/analysis/AnalysisPage";
import { RecommendationsPage } from "@/pages/recommendations/RecommendationsPage";
import { DatasetPage } from "@/pages/dataset/DatasetPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    path: "/app",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      { path: "predict", element: <PredictPage /> },
      { path: "hotspots", element: <HotspotsPage /> },
      {
        path: "analysis",
        element: (
          <ProtectedRoute>
            <AnalysisPage />
          </ProtectedRoute>
        ),
      },
      { path: "recommendations", element: <RecommendationsPage /> },
      {
        path: "dataset",
        element: (
          <AdminRoute>
            <DatasetPage />
          </AdminRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}

import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import { UserProvider } from "../feature/context/users/UserProvider";
import { DashboardProvider } from "../feature/context/dashboard/DashboardProvider";
import { PatientsProvider } from "../feature/context/patients/PatientsProvider";
import { QuestionSetsProvider } from "../feature/context/questionSets/QuestionSetsProvider";
import { InterviewLinksProvider } from "../feature/context/interviewLinks/InterviewLinksProvider";
import { SessionsProvider } from "../feature/context/sessions/SessionsProvider";

import ProtectedLayout from "../feature/components/layouts/ProtectedLayout";
import PublicRoute from "../feature/components/layouts/PublicRoute";

const LandingPage = lazy(() => import("../feature/landing/pages/LandingPage"));
const LoginPage = lazy(() => import("../feature/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../feature/auth/pages/RegisterPage"));
const DashboardPage = lazy(() => import("../feature/dashboard/pages/DashboardPage"));
const PatientsPage = lazy(() => import("../feature/patients/pages/PatientPage"));
const PatientDetailsPage = lazy(() => import("../feature/patients/pages/PatientDetailsPage"));
const QuestionSetsPage = lazy(() => import("../feature/questionSets/pages/QuestionSetsPage"));
const InterviewLinksPage = lazy(() => import("../feature/interviewLinks/pages/InterviewLinksPage"));
const SessionReviewPage = lazy(() => import("../feature/sessionReview/pages/SessionReviewPage"));
const ReportsPage = lazy(() => import("../feature/reports/pages/ReportsPage"));
const SettingsPage = lazy(() => import("../feature/settings/pages/SettingsPage"));

// Interview flow — public, no auth required
const ConsentPage = lazy(() => import("../feature/interview/pages/ConsentPage"));
const InterviewRoom = lazy(() => import("../feature/interview/pages/InterviewRoomPage"));
const ProcessingPage = lazy(() => import("../feature/interview/pages/ProcessingPage"));
const ResultsPage = lazy(() => import("../feature/interview/pages/ResultsPage"));
const RecommendationPage = lazy(() => import("../feature/interview/pages/RecommendationPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function AppRoutes() {
  return (
    <UserProvider>
      <PatientsProvider>
        <SessionsProvider>
          <Routes>
            {/* Landing — always accessible */}
            <Route path="/" element={<SuspenseWrap><LandingPage /></SuspenseWrap>} />

            {/* Interview flow — public, client-facing, no auth required */}
            <Route path="/interview/:token" element={<SuspenseWrap><ConsentPage /></SuspenseWrap>} />
            <Route path="/interview/:token/room" element={<SuspenseWrap><InterviewRoom /></SuspenseWrap>} />
            <Route path="/interview/:token/processing" element={<SuspenseWrap><ProcessingPage /></SuspenseWrap>} />
            <Route path="/interview/:token/results" element={<SuspenseWrap><ResultsPage /></SuspenseWrap>} />
            <Route path="/interview/:token/recommendation" element={<SuspenseWrap><RecommendationPage /></SuspenseWrap>} />

            {/* Auth routes — redirect to dashboard if already logged in */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<SuspenseWrap><LoginPage /></SuspenseWrap>} />
              <Route path="/register" element={<SuspenseWrap><RegisterPage /></SuspenseWrap>} />
            </Route>

            {/* Protected routes */}
            <Route element={
              <DashboardProvider>
                <QuestionSetsProvider>
                  <InterviewLinksProvider>
                    <ProtectedLayout />
                  </InterviewLinksProvider>
                </QuestionSetsProvider>
              </DashboardProvider>
            }>
              <Route path="/dashboard" element={<SuspenseWrap><DashboardPage /></SuspenseWrap>} />
              <Route path="/patients" element={<SuspenseWrap><PatientsPage /></SuspenseWrap>} />
              <Route path="/patients/:id" element={<SuspenseWrap><PatientDetailsPage /></SuspenseWrap>} />
              <Route path="/question-sets" element={<SuspenseWrap><QuestionSetsPage /></SuspenseWrap>} />
              <Route path="/interview-links" element={<SuspenseWrap><InterviewLinksPage /></SuspenseWrap>} />
              <Route path="/sessions/:id" element={<SuspenseWrap><SessionReviewPage /></SuspenseWrap>} />
              <Route path="/reports" element={<SuspenseWrap><ReportsPage /></SuspenseWrap>} />
              <Route path="/settings" element={<SuspenseWrap><SettingsPage /></SuspenseWrap>} />
            </Route>
          </Routes>
        </SessionsProvider>
      </PatientsProvider>
    </UserProvider>
  );
}

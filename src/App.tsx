import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { AuthPage } from './pages/Auth';
import { OnboardingPage } from './pages/Onboarding';
import { HomePage } from './pages/Home';
import { LessonIntroPage } from './pages/LessonIntro';
import { ExercisePage } from './pages/Exercise';
import { ReviewPage } from './pages/Review';
import { LessonCompletePage } from './pages/LessonComplete';
import { ResumePage } from './pages/Resume';
import { VocabularyPage } from './pages/Vocabulary';
import { WordCardPage } from './pages/WordCard';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';
import { LearningSettingsPage } from './pages/LearningSettings';
import { AdminPage } from './pages/Admin';
import { NotFoundPage } from './pages/NotFound';
import { Layout } from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user && !user.is_onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.is_onboarded) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<HomePage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="vocabulary/:wordId" element={<WordCardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/learning" element={<LearningSettingsPage />} />
        </Route>
        
        <Route path="/lesson/new" element={<ProtectedRoute><LessonIntroPage /></ProtectedRoute>} />
        <Route path="/lesson/:lessonId/exercise/:exerciseId" element={<ProtectedRoute><ExercisePage /></ProtectedRoute>} />
        <Route path="/lesson/:lessonId/review/:exerciseId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
        <Route path="/lesson/:lessonId/complete" element={<ProtectedRoute><LessonCompletePage /></ProtectedRoute>} />
        <Route path="/lesson/resume/:lessonId" element={<ProtectedRoute><ResumePage /></ProtectedRoute>} />
        
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

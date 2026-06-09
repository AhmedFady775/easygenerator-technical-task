import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { SignIn } from './pages/SignIn';
import { AppPage } from './pages/AppPage';
import { AuthProvider } from './components/AuthProvider';
import { useAuth } from './hooks/useAuth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/signin" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/app" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <SignIn />
              </PublicRoute>
            }
          />
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <AppPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

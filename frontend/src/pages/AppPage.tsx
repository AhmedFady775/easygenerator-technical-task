import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout as apiLogout } from '../api/auth';

export function AppPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiLogout(); // revoke refresh token on server
    } finally {
      logout();          // clear client state regardless
      navigate('/signin');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">EasyGenerator</span>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <button onClick={() => void handleLogout()} className="btn btn-outline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="welcome-card">
          <h1>Welcome to the application.</h1>
          <p className="welcome-sub">
            Hello, <strong>{user?.name}</strong>! You're signed in as{' '}
            <strong>{user?.email}</strong>.
          </p>
        </div>
      </main>
    </div>
  );
}

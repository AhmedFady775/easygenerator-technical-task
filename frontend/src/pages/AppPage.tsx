import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout as apiLogout } from '../api/auth';

export function AppPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      logout();
      navigate('/signin', { replace: true });
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-8">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <span className="text-base font-bold text-gray-900 tracking-tight">EasyGenerator</span>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
              <span className="text-xs text-gray-400">{user?.email}</span>
            </div>
            <button
              onClick={() => void handleLogout()}
              className="ml-2 rounded-md border border-gray-200 px-3.5 py-1.5 text-sm text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        {/* Background orbs */}
        <div className="animate-float      pointer-events-none absolute -top-20 -left-20   h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="animate-float-slow pointer-events-none absolute -bottom-24 -right-24 h-112 w-md rounded-full bg-blue-100/50 blur-3xl" />
        <div className="animate-drift      pointer-events-none absolute top-1/3 left-1/2   h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-100/40 blur-2xl" />

        <div className="relative text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to the application.
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
        </div>
      </main>
    </div>
  );
}

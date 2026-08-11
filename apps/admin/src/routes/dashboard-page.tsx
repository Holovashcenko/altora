import { useAuth } from '../auth/auth-context';

/** Placeholder home route — replaced by the real dashboard in Restaurant management. */
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Altora</h1>
          <p>
            Signed in as {user?.name} ({user?.role}).
          </p>
        </div>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <p>Restaurant OS — admin shell.</p>
    </main>
  );
}

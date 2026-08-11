import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';

/** Gates its child routes; anonymous visitors are sent to `/login`. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="auth-status">Loading…</p>;
  }

  if (status === 'anonymous') {
    // `from` lets the login page return the user to where they were headed.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

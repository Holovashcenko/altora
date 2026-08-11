import { Navigate, Route, Routes } from 'react-router-dom';

import { DashboardPage } from './routes/dashboard-page';
import { LoginPage } from './routes/login-page';
import { ProtectedRoute } from './routes/protected-route';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

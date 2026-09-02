import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import CreateLinkModal from './components/CreateLinkModal';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { authApi } from './api/auth';

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastCreatedLink, setLastCreatedLink] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi
        .getProfile()
        .then((profile) => setUser(profile))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    const refresh = localStorage.getItem('refresh_token');
    authApi.logout(refresh);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const handleLinkCreated = (newLink) => {
    setLastCreatedLink(newLink);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Initializing...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        <CreateLinkModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onLinkCreated={handleLinkCreated}
        />

        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={setUser} />
            }
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/" replace /> : <RegisterPage onLoginSuccess={setUser} />
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <DashboardPage
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                  lastCreatedLink={lastCreatedLink}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics/:linkId"
            element={
              <ProtectedRoute user={user}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
